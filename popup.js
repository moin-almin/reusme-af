document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Get DOM elements - only the ones that actually exist in popup.html
  const updateResumeButton = document.getElementById('update-resume');
  const fillFormButton = document.getElementById('fill-form');
  
  // Handle fill form button - put this first to make it the primary action
  if (fillFormButton) {
    console.log('Fill form button found');
    fillFormButton.addEventListener('click', async () => {
      console.log('Fill form button clicked');
      
      try {
        // Show visual feedback that button was clicked
        fillFormButton.textContent = "Filling Form...";
        fillFormButton.disabled = true;
        
        const resumeData = await getResume();
        
        if (!resumeData || Object.keys(resumeData).length === 0) {
          console.log('No resume data found');
          alert('No resume data found. Please update your resume first.');
          chrome.tabs.create({ url: 'resume.html' });
          fillFormButton.textContent = "Fill Form";
          fillFormButton.disabled = false;
          return;
        }
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0] || !tabs[0].id) {
            console.error('No active tab found');
            alert('No active tab found. Please try again.');
            fillFormButton.textContent = "Fill Form";
            fillFormButton.disabled = false;
            return;
          }
          
          // Execute the injection script that will inject our form filler
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: injectFormFiller,
            args: [resumeData]
          }).then((results) => {
            if (results && results[0] && results[0].result) {
              console.log('Form filling complete', results[0].result);
              
              // Check if there was a rate limit error
              if (results[0].result.aiError === 'rate_limit') {
                fillFormButton.textContent = "Form Filled! (AI Unavailable)";
                // Show a warning about rate limit
                alert('OpenAI API rate limit exceeded. Form was filled using the default method. Try again later or check your API settings in the Resume menu.');
              } else {
                fillFormButton.textContent = "Form Filled!";
              }
              
              setTimeout(() => {
                fillFormButton.textContent = "Fill Form";
                fillFormButton.disabled = false;
              }, 2000);
            } else {
              console.error('No results from form filling');
              fillFormButton.textContent = "Fill Form";
              fillFormButton.disabled = false;
              alert('Form filling completed with no results. Check the console for details.');
            }
          }).catch((error) => {
            console.error('Error executing form fill script:', error);
            alert(`Error filling form: ${error.message}\nMake sure you're on a page with a form.`);
            fillFormButton.textContent = "Fill Form";
            fillFormButton.disabled = false;
          });
        });
      } catch (error) {
        console.error('Error retrieving resume data:', error);
        alert('Error retrieving your resume data. Please try again.');
        fillFormButton.textContent = "Fill Form";
        fillFormButton.disabled = false;
      }
    });
  } else {
    console.error('Fill form button not found');
  }
  
  // Open resume page when update button is clicked
  if (updateResumeButton) {
    console.log('Update resume button found');
    updateResumeButton.addEventListener('click', () => {
      console.log('Update resume button clicked');
      chrome.tabs.create({ url: 'resume.html' });
    });
  } else {
    console.error('Update resume button not found in the DOM');
  }
});

// This function will be injected into the page
// It contains all the necessary code for form filling
function injectFormFiller(resumeData) {
  console.log('Form filler injected');
  let fillingMethod = 'default'; // Track which method was used
  let fillingStatus = { success: true, error: null }; // Track filling status
  
  // Define these arrays in the global scope of the injected script
  let filledFields = [];
  let skippedFields = [];
  
  try {
    if (!resumeData) {
      console.error('No resume data provided to injectFormFiller');
      return { success: false, message: 'No resume data provided' };
    }
    
    // First try filling common fields
    let filledFieldsCount = fillAllFields(resumeData);
    
    // Then try detecting specific fields with heuristics
    const detectedFields = detectFields();
    if (detectedFields && detectedFields.length > 0) {
      console.log(`Found ${detectedFields.length} fields to fill intelligently`);
      
      // Try to use AI for field analysis if available
      analyzeFieldsWithAI(detectedFields, resumeData)
        .then(aiMappings => {
          if (aiMappings && aiMappings.length > 0) {
            console.log('Using AI-suggested field mappings', aiMappings);
            fillingMethod = 'openai';
            console.log('FILLING METHOD: OpenAI AI-powered analysis');
            
            aiMappings.forEach(mapping => {
              const element = document.getElementById(mapping.fieldId) || 
                              document.querySelector(`[name="${mapping.fieldName}"]`);
              
              if (element && mapping.resumeValue) {
                element.value = mapping.resumeValue;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                highlightField(element);
                filledFieldsCount++;
              }
            });
          } else {
            // Fallback to heuristic method if AI analysis unavailable
            console.log('FILLING METHOD: Default heuristic matching (AI returned no results)');
            detectedFields.forEach(field => {
              const filled = fillDetectedField(field.id, field.name, field.type, resumeData);
              if (filled) filledFieldsCount++;
            });
          }
        })
        .catch(error => {
          console.error('Error using AI for form analysis, falling back to heuristics', error);
          
          // Check if this was a rate limit error
          if (error.message && error.message.includes('429')) {
            console.log('FILLING METHOD: Default heuristic matching (AI rate limit)');
            fillingStatus.error = 'rate_limit';
          } else {
            console.log('FILLING METHOD: Default heuristic matching (AI error)');
          }
          
          // Fallback to regular method
          detectedFields.forEach(field => {
            const filled = fillDetectedField(field.id, field.name, field.type, resumeData);
            if (filled) filledFieldsCount++;
          });
        });
    } else {
      console.log('FILLING METHOD: Default heuristic matching (no fields detected)');
    }
    
    return { 
      success: true, 
      message: `Filled ${filledFieldsCount} fields successfully`,
      fieldsCount: filledFieldsCount,
      method: fillingMethod,
      aiError: fillingStatus.error
    };
  } catch (error) {
    console.error('Error in form filler:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
  
  // Function to analyze fields using OpenAI
  async function analyzeFieldsWithAI(fields, resumeData) {
    try {
      // Your OpenAI API key would be stored in extension storage
      const apiKey = await getOpenAIKey();
      
      if (!apiKey) {
        console.log('No OpenAI API key found, skipping AI analysis');
        return null;
      }
      
      // Format fields and resume data for the API
      const prompt = {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an assistant that analyzes form fields and maps them to resume data. Return only a JSON array with field mappings."
          },
          {
            role: "user",
            content: `Analyze these form fields and match them with the resume data. Return a JSON array with objects containing fieldId, fieldName, and the appropriate resumeValue.
            
            Form Fields:
            ${JSON.stringify(fields, null, 2)}
            
            Resume Data:
            ${JSON.stringify(resumeData, null, 2)}`
          }
        ]
      };
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(prompt)
      });
      
      if (!response.ok) {
        const status = response.status;
        
        // Handle rate limiting errors specifically
        if (status === 429) {
          console.warn('OpenAI API rate limit exceeded. Try again later or upgrade your OpenAI plan.');
          throw new Error('Rate limit exceeded (429): OpenAI API is temporarily unavailable due to too many requests');
        }
        
        throw new Error(`OpenAI API error: ${status}`);
      }
      
      const data = await response.json();
      
      // Parse the response to get mappings
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        // Extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      return null;
    } catch (error) {
      // Log specific error for rate limiting
      if (error.message && error.message.includes('429')) {
        console.error('OpenAI API rate limit error: You may need to wait or upgrade your API plan');
      } else {
        console.error('Error calling OpenAI API:', error);
      }
      return null;
    }
  }
  
  // Helper function to get OpenAI API key from storage
  async function getOpenAIKey() {
    return new Promise((resolve) => {
      // This would need to be implemented in your storage.js
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['openai_api_key'], (result) => {
          resolve(result.openai_api_key || null);
        });
      } else {
        resolve(null);
      }
    });
  }
  
  // Function to fill all common fields
  function fillAllFields(resumeData) {
    if (!resumeData) return 0;
    console.log('Filling all fields with resume data');
    
    // Add logging for debugging
    console.log('Available resume data:', Object.keys(resumeData).join(', '));
    
    let filledCount = 0;
    let skippedCount = 0;
    
    // Create more specific field mappings to prevent overfilling
    const fieldMap = {
      company: {
        priority: 1, // Higher priority - fill first
        selectors: [
          'input[name*="company" i]',
          'input[id*="company" i]',
          'input[name*="employer" i]',
          'input[id*="employer" i]',
          'input[name*="organization" i]',
          'input[id*="organization" i]',
          'input[name*="business" i]',
          'input[id*="business" i]'
        ],
        value: resumeData.experience && resumeData.experience.length > 0 ? resumeData.experience[0].company : ''
      },
      name: { 
        priority: 2, // Lower priority - fill after company fields
        selectors: [
          'input[name="name" i]', 
          'input[name="full_name" i]', 
          'input[name="fullName" i]', 
          'input[name="first_name" i]', 
          'input[id="name" i]', 
          'input[id="full_name" i]', 
          'input[id="fullName" i]',
          'input[placeholder="Full Name" i]',
          // Explicitly exclude company-related fields
          'input[name*="name" i]:not([name*="company" i]):not([name*="org" i]):not([name*="business" i]):not([name*="city" i]):not([name*="state" i]):not([name*="zip" i]):not([name*="postal" i])'
        ], 
        value: resumeData.fullName 
      },
      email: { 
        priority: 3,
        selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]'], 
        value: resumeData.email 
      },
      phone: { 
        priority: 3,
        selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]', 'input[name*="mobile" i]', 'input[id*="mobile" i]'], 
        value: resumeData.phone 
      },
      address: { 
        priority: 3,
        selectors: [
          'input[name*="address" i]:not([name*="city" i]):not([name*="state" i]):not([name*="zip" i]):not([name*="postal" i])', 
          'input[id*="address" i]:not([id*="city" i]):not([id*="state" i]):not([id*="zip" i]):not([id*="postal" i])', 
          'input[placeholder*="address" i]:not([placeholder*="city" i]):not([placeholder*="state" i]):not([placeholder*="zip" i]):not([placeholder*="postal" i])',
          'textarea[name*="address" i]',
          'textarea[id*="address" i]'
        ], 
        value: resumeData.address 
      }
    };
    
    // Fill fields in priority order
    // This ensures company fields are filled before name fields to avoid conflicts
    const orderedFields = Object.entries(fieldMap)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    console.log('Processing fields in this order:', orderedFields.map(([key]) => key).join(', '));
    
    // Fill all fields in priority order
    orderedFields.forEach(([key, field]) => {
      if (field.value && fillFields(field.selectors, field.value, key)) {
        console.log(`Filled ${key} fields with value: ${field.value}`);
        filledCount++;
      } else if (field.value) {
        console.log(`No ${key} fields found or suitable for filling with value: ${field.value}`);
        skippedCount++;
      }
    });
    
    // Log results
    console.log(`Form filling summary: ${filledCount} fields filled, ${skippedCount} skipped`);
    if (filledFields.length > 0) {
      console.log('Filled fields:', filledFields.join(', '));
    }
    if (skippedFields.length > 0) {
      console.log('Skipped fields:', skippedFields.join(', '));
    }
    
    // Additional fields with more specific selectors
    if (resumeData.city) {
      if (fillFields([
        'input[name*="city" i]:not([name*="address" i])', 
        'input[id*="city" i]:not([id*="address" i])', 
        'input[placeholder*="city" i]:not([placeholder*="address" i])'
      ], resumeData.city)) {
        filledCount++;
      }
    }
    
    if (resumeData.state) {
      if (fillFields([
        'input[name*="state" i]:not([name*="address" i])', 
        'input[id*="state" i]:not([id*="address" i])', 
        'input[placeholder*="state" i]:not([placeholder*="address" i])', 
        'select[name*="state" i]', 
        'select[id*="state" i]'
      ], resumeData.state)) {
        filledCount++;
      }
    }
    
    if (resumeData.zipCode) {
      if (fillFields([
        'input[name*="zip" i]:not([name*="address" i])', 
        'input[id*="zip" i]:not([id*="address" i])', 
        'input[placeholder*="zip" i]:not([placeholder*="address" i])', 
        'input[name*="postal" i]:not([name*="address" i])', 
        'input[id*="postal" i]:not([id*="address" i])',
        'input[name*="code" i][name*="postal" i]',
        'input[id*="code" i][id*="postal" i]'
      ], resumeData.zipCode)) {
        filledCount++;
      }
    }
    
    // Education fields
    if (resumeData.education && resumeData.education.length > 0) {
      const edu = resumeData.education[0]; // Use first education entry
      
      if (fillFields(['input[name*="university" i]', 'input[id*="university" i]', 'input[name*="school" i]', 'input[id*="school" i]', 'input[name*="college" i]', 'input[id*="college" i]'], edu.university)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="degree" i]', 'input[id*="degree" i]', 'select[name*="degree" i]', 'select[id*="degree" i]'], edu.degree)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="major" i]', 'input[id*="major" i]', 'input[name*="field" i]', 'input[id*="field" i]'], edu.major)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="graduation" i]', 'input[id*="graduation" i]', 'input[name*="grad_date" i]', 'input[id*="grad_date" i]'], edu.graduationDate)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="gpa" i]', 'input[id*="gpa" i]'], edu.gpa)) {
        filledCount++;
      }
    }
    
    // Experience fields
    if (resumeData.experience && resumeData.experience.length > 0) {
      const exp = resumeData.experience[0]; // Use first experience entry
      
      if (fillFields(['input[name*="company" i]', 'input[id*="company" i]', 'input[name*="employer" i]', 'input[id*="employer" i]'], exp.company)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="title" i]', 'input[id*="title" i]', 'input[name*="position" i]', 'input[id*="position" i]', 'input[name*="role" i]', 'input[id*="role" i]'], exp.jobTitle)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="start_date" i]', 'input[id*="start_date" i]', 'input[name*="from" i]', 'input[id*="from" i]'], exp.startDate)) {
        filledCount++;
      }
      
      if (fillFields(['input[name*="end_date" i]', 'input[id*="end_date" i]', 'input[name*="to" i]', 'input[id*="to" i]'], exp.endDate)) {
        filledCount++;
      }
      
      if (fillFields(['textarea[name*="responsibilities" i]', 'textarea[id*="responsibilities" i]', 'textarea[name*="description" i]', 'textarea[id*="description" i]', 'textarea[name*="duties" i]', 'textarea[id*="duties" i]'], exp.responsibilities)) {
        filledCount++;
      }
    }
    
    // Skills
    if (resumeData.skills) {
      if (fillFields(['textarea[name*="skills" i]', 'textarea[id*="skills" i]', 'input[name*="skills" i]', 'input[id*="skills" i]'], resumeData.skills)) {
        filledCount++;
      }
    }
    
    return filledCount;
  }

  // Function to fill fields matched by selectors
  function fillFields(selectors, value, fieldType) {
    if (!value) return false;
    
    let foundAny = false;
    let filledAny = false;
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;
      
      foundAny = true;
      console.log(`Found ${elements.length} elements matching selector: ${selector}`);
      
      elements.forEach(element => {
        // Log the field we're trying to fill
        console.log(`Attempting to fill ${fieldType} into:`, element.id || element.name || 'unnamed element');
        
        // Additional validation check to make sure we're not filling the wrong field type
        if (!isAppropriateFieldForValue(element, value, fieldType)) {
          console.log(`SKIPPED: ${element.id || element.name} is inappropriate for ${fieldType} value: ${value}`);
          skippedFields.push(`${element.id || element.name} (${fieldType})`);
          return;
        }
        
        if (element.tagName === 'SELECT') {
          // Handle dropdown menus
          const options = Array.from(element.options);
          const option = options.find(opt => 
            opt.value.toLowerCase().includes(value.toLowerCase()) || 
            opt.text.toLowerCase().includes(value.toLowerCase())
          );
          
          if (option) {
            element.value = option.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledAny = true;
            
            // Highlight the field
            highlightField(element);
          }
        } else {
          // Handle text inputs and textareas
          // Save original value for logging
          const originalValue = element.value;
          
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledAny = true;
          
          // Log the change
          console.log(`FILLED: ${element.id || element.name} with ${fieldType} value. Changed from "${originalValue}" to "${value}"`);
          filledFields.push(`${element.id || element.name} (${fieldType})`);
          
          // Highlight the field
          highlightField(element);
        }
      });
      
      // If we found at least one element with this selector, we can stop
      if (elements.length > 0 && filledAny) return true;
    }
    
    if (foundAny && !filledAny) {
      console.log(`Found fields matching ${fieldType} selectors but none were appropriate for the value`);
    } else if (!foundAny) {
      console.log(`No fields found matching any ${fieldType} selectors`);
    }
    
    return filledAny;
  }

  // Helper function to check if a field is appropriate for the value we're trying to fill
  function isAppropriateFieldForValue(element, value, fieldType) {
    // Get field context (label, placeholder, etc.)
    const fieldContext = getFieldContext(element);
    const idName = (element.id || element.name || '').toLowerCase();
    
    // Log field details for debugging
    console.log(`Field context check: id/name="${idName}", context="${fieldContext}", value="${value}", type="${fieldType}"`);
    
    // Check for company fields that shouldn't contain personal name
    const isCompanyField = 
      /\bcompany\b/i.test(idName) || 
      /\bcompany\b/i.test(fieldContext) ||
      /\borganization\b/i.test(idName) || 
      /\borganization\b/i.test(fieldContext) ||
      /\bbusiness\b/i.test(idName) || 
      /\bbusiness\b/i.test(fieldContext) ||
      /\bemployer\b/i.test(idName) || 
      /\bemployer\b/i.test(fieldContext);
    
    // Check for name fields that shouldn't contain company info
    const isNameField = 
      /\bname\b/i.test(idName) && 
      !/\bcompany\b/i.test(idName) && 
      !/\bbusiness\b/i.test(idName) && 
      !/\borganization\b/i.test(idName) &&
      !/\bfirst\b/i.test(idName) && 
      !/\blast\b/i.test(idName);
    
    // Check if this looks like a person's name
    const isPersonName = /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/.test(value);
    
    // Check if the value looks like an address (contains digits and words)
    const looksLikeAddress = /\d+.+\w+/.test(value);
    
    // If trying to fill a name into a company field, reject
    if (isCompanyField && isPersonName) {
      return false;
    }
    
    // If trying to fill what looks like a company into a name field
    // Most company names contain Inc, LLC, Corp, etc.
    if (isNameField && /Inc|LLC|Corp|Company|Ltd/i.test(value)) {
      return false;
    }
    
    // Prevent filling addresses into non-address fields
    if (looksLikeAddress && 
        !/address|street|location/i.test(idName) && 
        !/address|street|location/i.test(fieldContext)) {
      return false;
    }
    
    // For email validation, make sure the field should accept an email
    if (value.includes('@') && 
        !/email/i.test(idName) && 
        !/email/i.test(fieldContext) && 
        element.type !== 'email') {
      return false;
    }
    
    return true;
  }

  // Function to detect form fields on the current page
  function detectFields() {
    console.log('Detecting fields on current page');
    const fields = [];
    
    // Input fields
    document.querySelectorAll('input').forEach(input => {
      // Skip hidden or submit inputs
      if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
        return;
      }
      
      // Try to find a label for this input
      let label = '';
      const labelElement = document.querySelector(`label[for="${input.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
      
      fields.push({
        id: input.id,
        name: input.name,
        type: input.type,
        label: label,
        placeholder: input.placeholder
      });
    });
    
    // Textareas
    document.querySelectorAll('textarea').forEach(textarea => {
      let label = '';
      const labelElement = document.querySelector(`label[for="${textarea.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
      
      fields.push({
        id: textarea.id,
        name: textarea.name,
        type: 'textarea',
        label: label,
        placeholder: textarea.placeholder
      });
    });
    
    // Select elements
    document.querySelectorAll('select').forEach(select => {
      let label = '';
      const labelElement = document.querySelector(`label[for="${select.id}"]`);
      if (labelElement) {
        label = labelElement.textContent.trim();
      }
      
      fields.push({
        id: select.id,
        name: select.name,
        type: 'select',
        label: label
      });
    });
    
    console.log(`Found ${fields.length} fields on the page`);
    return fields;
  }

  // Function to fill a specific detected field
  function fillDetectedField(id, name, type, resumeData) {
    if (!resumeData) return false;
    console.log(`Filling detected field: ${id || name}`);
    
    // Find element by id or name
    let element;
    if (id) {
      element = document.getElementById(id);
    } else if (name) {
      element = document.querySelector(`[name="${name}"]`);
    }
    
    if (!element) {
      console.log('Element not found');
      return false;
    }
    
    // Get field context - look at label, placeholder, etc.
    const fieldContext = getFieldContext(element);
    const idName = (id || name || '').toLowerCase();
    
    // Guess the kind of field based on context and id/name
    let value = null;
    
    // More specific field detection logic for address fields
    const isAddressField = /\baddress\b/i.test(idName) || 
                          /\baddress\b/i.test(fieldContext) ||
                          /\bstreet\b/i.test(idName) || 
                          /\bstreet\b/i.test(fieldContext);
                          
    const isCityField = /\bcity\b/i.test(idName) || 
                        /\bcity\b/i.test(fieldContext) ||
                        /\btown\b/i.test(idName) || 
                        /\btown\b/i.test(fieldContext);
                        
    const isStateField = /\bstate\b/i.test(idName) || 
                         /\bstate\b/i.test(fieldContext) ||
                         /\bprovince\b/i.test(idName) || 
                         /\bprovince\b/i.test(fieldContext);
                         
    const isZipField = /\bzip\b/i.test(idName) || 
                       /\bzip\b/i.test(fieldContext) ||
                       /\bpostal\b/i.test(idName) || 
                       /\bpostal\b/i.test(fieldContext) ||
                       /\bcode\b/i.test(idName) && /\bpostal\b/i.test(idName);
                       
    const isCompanyField = /\bcompany\b/i.test(idName) || 
                          /\bcompany\b/i.test(fieldContext) ||
                          /\borganization\b/i.test(idName) || 
                          /\borganization\b/i.test(fieldContext) ||
                          /\bbusiness\b/i.test(idName) || 
                          /\bbusiness\b/i.test(fieldContext) ||
                          /\bemployer\b/i.test(idName) || 
                          /\bemployer\b/i.test(fieldContext);
    
    if (isAddressField && !isCityField && !isStateField && !isZipField) {
      value = resumeData.address;
    } else if (isCityField && !isAddressField) {
      value = resumeData.city;
    } else if (isStateField && !isAddressField) {
      value = resumeData.state;
    } else if (isZipField && !isAddressField) {
      value = resumeData.zipCode;
    } else if (isCompanyField) {
      // Handle company fields specifically
      value = resumeData.experience && resumeData.experience.length > 0 ? resumeData.experience[0].company : '';
    } else if (/\bname\b/i.test(idName) && !/city|state|zip|postal|code|company|organization|business|employer/i.test(idName)) {
      // More strict name matching - look for exact "name" and exclude more categories
      value = resumeData.fullName;
    } else if (/email/i.test(idName)) {
      value = resumeData.email;
    } else if (/phone|mobile/i.test(idName)) {
      value = resumeData.phone;
    } else if (/university|school|college/i.test(idName) && resumeData.education && resumeData.education[0]) {
      value = resumeData.education[0].university;
    } else if (/degree/i.test(idName) && resumeData.education && resumeData.education[0]) {
      value = resumeData.education[0].degree;
    } else if (/major|field/i.test(idName) && resumeData.education && resumeData.education[0]) {
      value = resumeData.education[0].major;
    } else if (/graduation|grad_date/i.test(idName) && resumeData.education && resumeData.education[0]) {
      value = resumeData.education[0].graduationDate;
    } else if (/gpa/i.test(idName) && resumeData.education && resumeData.education[0]) {
      value = resumeData.education[0].gpa;
    } else if (/company|employer/i.test(idName) && resumeData.experience && resumeData.experience[0]) {
      value = resumeData.experience[0].company;
    } else if (/title|position|role/i.test(idName) && resumeData.experience && resumeData.experience[0]) {
      value = resumeData.experience[0].jobTitle;
    } else if (/start_date|from/i.test(idName) && resumeData.experience && resumeData.experience[0]) {
      value = resumeData.experience[0].startDate;
    } else if (/end_date|to/i.test(idName) && resumeData.experience && resumeData.experience[0]) {
      value = resumeData.experience[0].endDate;
    } else if (/responsibilities|description|duties/i.test(idName) && resumeData.experience && resumeData.experience[0]) {
      value = resumeData.experience[0].responsibilities;
    } else if (/skills/i.test(idName)) {
      value = resumeData.skills;
    }
    
    if (value !== null) {
      console.log(`Setting value: ${value}`);
      
      if (element.tagName === 'SELECT') {
        // Handle dropdown menus
        const options = Array.from(element.options);
        const option = options.find(opt => 
          opt.value.toLowerCase().includes(value.toLowerCase()) || 
          opt.text.toLowerCase().includes(value.toLowerCase())
        );
        
        if (option) {
          element.value = option.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          highlightField(element);
          return true;
        }
      } else {
        // Handle text inputs and textareas
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        highlightField(element);
        return true;
      }
    } else {
      console.log('No matching value found for this field');
    }
    
    return false;
  }
  
  // Helper function to get more context about a field
  function getFieldContext(element) {
    let context = '';
    
    // Check for label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        context += label.textContent.trim() + ' ';
      }
    }
    
    // Check for placeholder
    if (element.placeholder) {
      context += element.placeholder + ' ';
    }
    
    // Check for aria-label
    if (element.getAttribute('aria-label')) {
      context += element.getAttribute('aria-label') + ' ';
    }
    
    // Check for parent elements with labels
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent; i++) { // Check up to 3 levels up
      const labels = parent.querySelectorAll('label');
      labels.forEach(label => {
        if (!label.getAttribute('for') || label.getAttribute('for') === element.id) {
          context += label.textContent.trim() + ' ';
        }
      });
      
      // Check for headings near the field
      const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        context += heading.textContent.trim() + ' ';
      });
      
      parent = parent.parentElement;
    }
    
    return context.toLowerCase();
  }
  
  // Helper function to highlight filled fields
  function highlightField(element) {
    // Save original background
    const originalBackground = element.style.backgroundColor;
    const originalTransition = element.style.transition;
    
    // Add highlight effect
    element.style.transition = 'background-color 0.3s ease';
    element.style.backgroundColor = '#e6f7ff';
    
    // Remove highlight after animation
    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
      
      // Remove transition after animation completes
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 1000);
  }
} 