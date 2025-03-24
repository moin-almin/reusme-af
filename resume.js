document.addEventListener('DOMContentLoaded', async () => {
  console.log('Resume page loaded');
  const resumeForm = document.getElementById('resume-form');
  const saveResumeButton = document.getElementById('save-resume');
  const addEducationButton = document.getElementById('add-education');
  const addExperienceButton = document.getElementById('add-experience');
  const educationContainer = document.getElementById('education-container');
  const experienceContainer = document.getElementById('experience-container');
  const openaiKeyInput = document.getElementById('openai-key');
  const saveKeyButton = document.getElementById('save-key');
  
  if (!resumeForm) {
    console.error('Resume form not found');
    return;
  }
  
  // Initialize tab functionality
  initializeTabs();
  
  // Initialize with stored data
  try {
    console.log('Loading saved resume data');
    const resumeData = await getResume();
    populateForm(resumeForm, resumeData);
    
    // Load saved API key if it exists
    const apiKey = await getOpenAIKey();
    if (apiKey && openaiKeyInput) {
      openaiKeyInput.value = apiKey;
      console.log('Loaded saved OpenAI API key');
    }
  } catch (error) {
    console.error('Error loading resume data:', error);
  }
  
  // Handle OpenAI API key saving
  if (saveKeyButton && openaiKeyInput) {
    saveKeyButton.addEventListener('click', async () => {
      const apiKey = openaiKeyInput.value.trim();
      
      if (!apiKey) {
        showNotification('Please enter a valid API key', 'error');
        return;
      }
      
      try {
        await saveOpenAIKey(apiKey);
        showNotification('API key saved successfully!', 'success');
      } catch (error) {
        console.error('Error saving API key:', error);
        showNotification('Error saving API key. Please try again.', 'error');
      }
    });
  }
  
  // Save resume form
  if (saveResumeButton) {
    saveResumeButton.addEventListener('click', async (event) => {
      event.preventDefault();
      console.log('Save button clicked');
      
      try {
        const formData = extractFormData(resumeForm);
        
        if (!formData || Object.keys(formData).length === 0) {
          console.error('No form data extracted');
          throw new Error('Failed to extract form data');
        }
        
        // Save data
        await saveResume(formData);
        
        // Show success message
        showNotification('Resume saved successfully!', 'success');
      } catch (error) {
        console.error('Error saving resume:', error);
        showNotification('Failed to save resume data. Please try again.', 'error');
      }
    });
  } else {
    console.error('Save resume button not found');
  }
  
  // Add education entry
  if (addEducationButton && educationContainer) {
    addEducationButton.addEventListener('click', () => {
      console.log('Adding new education entry');
      const newEntry = createEducationEntry();
      educationContainer.appendChild(newEntry);
      
      // Add remove event listener for the new entry
      const removeBtn = newEntry.querySelector('.remove-entry');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          newEntry.remove();
        });
      }
    });
  }
  
  // Add experience entry
  if (addExperienceButton && experienceContainer) {
    addExperienceButton.addEventListener('click', () => {
      console.log('Adding new experience entry');
      const newEntry = createExperienceEntry();
      experienceContainer.appendChild(newEntry);
      
      // Add remove event listener for the new entry
      const removeBtn = newEntry.querySelector('.remove-entry');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          newEntry.remove();
        });
      }
    });
  }
  
  // Add remove event listeners to existing entries
  document.querySelectorAll('.remove-entry').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.education-entry, .experience-entry').remove();
    });
  });
});

// Initialize tab functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (!tabButtons.length || !tabContents.length) {
    console.error('Tab elements not found');
    return;
  }
  
  console.log('Initializing tabs, found', tabButtons.length, 'buttons and', tabContents.length, 'content sections');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('Tab clicked:', button.getAttribute('data-tab'));
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Show corresponding content
      const tabId = button.getAttribute('data-tab');
      const tabContent = document.getElementById(`${tabId}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
      } else {
        console.error(`Tab content not found for id: ${tabId}-tab`);
      }
    });
  });
}

// Helper function to show notification
function showNotification(message, type) {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification based on type
  if (type === 'success') {
    notification.style.backgroundColor = '#50E3C2'; // Secondary color (teal)
  } else if (type === 'error') {
    notification.style.backgroundColor = '#FF5252'; // Error color
  } else if (type === 'warning') {
    notification.style.backgroundColor = '#F5A623'; // Accent color (orange)
  } else {
    notification.style.backgroundColor = '#4A90E2'; // Primary color (blue)
  }
  
  // Common styles
  notification.style.color = 'white';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '8px';
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '1000';
  notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
  notification.style.animation = 'slideIn 0.3s forwards';
  
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.5s forwards';
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

// Create a new education entry
function createEducationEntry() {
  const entry = document.createElement('div');
  entry.className = 'education-entry card';
  
  entry.innerHTML = `
    <div class="entry-header">
      <h3>Education Details</h3>
      <button type="button" class="remove-entry" title="Remove entry">×</button>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label for="university">University/College</label>
        <input type="text" class="university" name="university" placeholder="e.g. University of California">
      </div>
      <div class="field-group">
        <label for="degree">Degree</label>
        <input type="text" class="degree" name="degree" placeholder="e.g. Bachelor of Science">
      </div>
    </div>
    
    <div class="field-row">
      <div class="field-group">
        <label for="major">Major</label>
        <input type="text" class="major" name="major" placeholder="e.g. Computer Science">
      </div>
      <div class="field-group">
        <label for="graduationDate">Graduation Date</label>
        <input type="text" class="graduationDate" name="graduationDate" placeholder="e.g. May 2022">
      </div>
    </div>
    
    <div class="field-row">
      <div class="field-group">
        <label for="gpa">GPA</label>
        <input type="text" class="gpa" name="gpa" placeholder="e.g. 3.8">
      </div>
      <div class="field-group">
        <div class="spacer"></div>
      </div>
    </div>
  `;
  
  return entry;
}

// Create a new experience entry
function createExperienceEntry() {
  const entry = document.createElement('div');
  entry.className = 'experience-entry card';
  
  entry.innerHTML = `
    <div class="entry-header">
      <h3>Work Experience</h3>
      <button type="button" class="remove-entry" title="Remove entry">×</button>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label for="company">Company</label>
        <input type="text" class="company" name="company" placeholder="e.g. Acme Corporation">
      </div>
      <div class="field-group">
        <label for="jobTitle">Job Title</label>
        <input type="text" class="jobTitle" name="jobTitle" placeholder="e.g. Software Engineer">
      </div>
    </div>
    
    <div class="field-row">
      <div class="field-group">
        <label for="startDate">Start Date</label>
        <input type="text" class="startDate" name="startDate" placeholder="e.g. Jan 2020">
      </div>
      <div class="field-group">
        <label for="endDate">End Date</label>
        <input type="text" class="endDate" name="endDate" placeholder="e.g. Present">
      </div>
    </div>
    
    <div class="field-row">
      <div class="field-group full-width">
        <label for="responsibilities">Responsibilities</label>
        <textarea class="responsibilities" name="responsibilities" placeholder="Describe your key responsibilities and achievements"></textarea>
      </div>
    </div>
  `;
  
  return entry;
} 