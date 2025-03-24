document.addEventListener('DOMContentLoaded', async () => {
  console.log('Resume page loaded');
  const resumeForm = document.getElementById('resume-form');
  const saveResumeButton = document.getElementById('save-resume');
  const addEducationButton = document.getElementById('add-education');
  const addExperienceButton = document.getElementById('add-experience');
  const educationContainer = document.getElementById('education-container');
  const experienceContainer = document.getElementById('experience-container');
  
  if (!resumeForm) {
    console.error('Resume form not found');
    return;
  }
  
  // Initialize with stored data
  try {
    console.log('Loading saved resume data');
    const resumeData = await getResume();
    populateForm(resumeForm, resumeData);
  } catch (error) {
    console.error('Error loading resume data:', error);
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
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'Resume saved successfully!';
        
        // Remove any existing success messages first
        const existingMsg = resumeForm.querySelector('.success-message');
        if (existingMsg) {
          existingMsg.remove();
        }
        
        resumeForm.appendChild(successMsg);
        
        // Remove success message after 2 seconds
        setTimeout(() => {
          successMsg.remove();
        }, 2000);
      } catch (error) {
        console.error('Error saving resume:', error);
        alert('Failed to save resume data. Please try again. Error: ' + error.message);
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
      
      // Add remove event listener
      newEntry.querySelector('.remove-entry').addEventListener('click', () => {
        newEntry.remove();
      });
    });
  }
  
  // Add experience entry
  if (addExperienceButton && experienceContainer) {
    addExperienceButton.addEventListener('click', () => {
      console.log('Adding new experience entry');
      const newEntry = createExperienceEntry();
      experienceContainer.appendChild(newEntry);
      
      // Add remove event listener
      newEntry.querySelector('.remove-entry').addEventListener('click', () => {
        newEntry.remove();
      });
    });
  }
  
  // Add remove event listeners to existing entries
  document.querySelectorAll('.remove-entry').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.education-entry, .experience-entry').remove();
    });
  });
}); 