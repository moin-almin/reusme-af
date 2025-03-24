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
              fillFormButton.textContent = "Form Filled!";
              
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
  
  try {
    if (!resumeData) {
      console.error('No resume data provided to injectFormFiller');
      return { success: false, message: 'No resume data provided' };
    }
    
    // First try filling common fields
    let filledFieldsCount = fillAllFields(resumeData);
    
    // Then try detecting specific fields
    const detectedFields = detectFields();
    if (detectedFields && detectedFields.length > 0) {
      console.log(`Found ${detectedFields.length} fields to fill intelligently`);
      
      detectedFields.forEach(field => {
        const filled = fillDetectedField(field.id, field.name, field.type, resumeData);
        if (filled) filledFieldsCount++;
      });
    }
    
    return { 
      success: true, 
      message: `Filled ${filledFieldsCount} fields successfully`,
      fieldsCount: filledFieldsCount
    };
  } catch (error) {
    console.error('Error in form filler:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
  
  // Function to fill all common fields
  function fillAllFields(resumeData) {
    if (!resumeData) return 0;
    console.log('Filling all fields with resume data');
    
    let filledCount = 0;
    
    const fieldMap = {
      name: { selectors: ['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'], value: resumeData.fullName },
      email: { selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]'], value: resumeData.email },
      phone: { selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]', 'input[name*="mobile" i]', 'input[id*="mobile" i]'], value: resumeData.phone },
      address: { selectors: ['input[name*="address" i]', 'input[id*="address" i]', 'input[placeholder*="address" i]', 'textarea[name*="address" i]', 'textarea[id*="address" i]'], value: resumeData.address }
    };
    
    // Combine address fields for complete address
    const fullAddress = `${resumeData.address || ''}, ${resumeData.city || ''}, ${resumeData.state || ''} ${resumeData.zipCode || ''}`.trim();
    fieldMap.address.value = fullAddress;
    
    // Fill all fields
    Object.values(fieldMap).forEach(field => {
      if (fillFields(field.selectors, field.value)) {
        filledCount++;
      }
    });
    
    // Additional fields not in the basic mapping
    if (resumeData.city) {
      if (fillFields(['input[name*="city" i]', 'input[id*="city" i]', 'input[placeholder*="city" i]'], resumeData.city)) {
        filledCount++;
      }
    }
    
    if (resumeData.state) {
      if (fillFields(['input[name*="state" i]', 'input[id*="state" i]', 'input[placeholder*="state" i]', 'select[name*="state" i]', 'select[id*="state" i]'], resumeData.state)) {
        filledCount++;
      }
    }
    
    if (resumeData.zipCode) {
      if (fillFields(['input[name*="zip" i]', 'input[id*="zip" i]', 'input[placeholder*="zip" i]', 'input[name*="postal" i]', 'input[id*="postal" i]'], resumeData.zipCode)) {
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

  function fillFields(selectors, value) {
    if (!value) return false;
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;
      
      let filled = false;
      
      elements.forEach(element => {
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
            filled = true;
            
            // Highlight the field
            highlightField(element);
          }
        } else {
          // Handle text inputs and textareas
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
          
          // Highlight the field
          highlightField(element);
        }
      });
      
      // If we found at least one element with this selector, we can stop
      if (elements.length > 0) return filled;
    }
    
    return false;
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
    
    // Guess the kind of field based on id/name
    let value = null;
    const idName = (id || name || '').toLowerCase();
    
    if (/name/i.test(idName)) {
      value = resumeData.fullName;
    } else if (/email/i.test(idName)) {
      value = resumeData.email;
    } else if (/phone|mobile/i.test(idName)) {
      value = resumeData.phone;
    } else if (/address/i.test(idName)) {
      value = `${resumeData.address || ''}, ${resumeData.city || ''}, ${resumeData.state || ''} ${resumeData.zipCode || ''}`.trim();
    } else if (/city/i.test(idName)) {
      value = resumeData.city;
    } else if (/state/i.test(idName)) {
      value = resumeData.state;
    } else if (/zip|postal/i.test(idName)) {
      value = resumeData.zipCode;
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