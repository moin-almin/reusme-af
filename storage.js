/**
 * Resume data storage and retrieval functions
 */

// Save resume data to Chrome storage
function saveResume(resumeData) {
  console.log('Saving resume data:', resumeData);
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ resumeData }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving resume data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Resume data saved successfully');
        resolve();
      }
    });
  });
}

// Get resume data from Chrome storage
function getResume() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('resumeData', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving resume data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Retrieved resume data:', result.resumeData || {});
        resolve(result.resumeData || {});
      }
    });
  });
}

// Extract form values from the resume form
function extractFormData(form) {
  if (!form) {
    console.error('Form element not found');
    return {};
  }
  
  const formData = {};
  
  try {
    // Personal information
    formData.fullName = form.querySelector('#fullName')?.value || '';
    formData.email = form.querySelector('#email')?.value || '';
    formData.phone = form.querySelector('#phone')?.value || '';
    formData.address = form.querySelector('#address')?.value || '';
    formData.city = form.querySelector('#city')?.value || '';
    formData.state = form.querySelector('#state')?.value || '';
    formData.zipCode = form.querySelector('#zipCode')?.value || '';
    
    // Education
    formData.education = [];
    const educationEntries = form.querySelectorAll('.education-entry');
    educationEntries.forEach(entry => {
      formData.education.push({
        university: entry.querySelector('.university')?.value || '',
        degree: entry.querySelector('.degree')?.value || '',
        major: entry.querySelector('.major')?.value || '',
        graduationDate: entry.querySelector('.graduationDate')?.value || '',
        gpa: entry.querySelector('.gpa')?.value || ''
      });
    });
    
    // Work Experience
    formData.experience = [];
    const experienceEntries = form.querySelectorAll('.experience-entry');
    experienceEntries.forEach(entry => {
      formData.experience.push({
        company: entry.querySelector('.company')?.value || '',
        jobTitle: entry.querySelector('.jobTitle')?.value || '',
        startDate: entry.querySelector('.startDate')?.value || '',
        endDate: entry.querySelector('.endDate')?.value || '',
        responsibilities: entry.querySelector('.responsibilities')?.value || ''
      });
    });
    
    // Skills
    formData.skills = form.querySelector('#skills')?.value || '';
    
    console.log('Extracted form data:', formData);
    return formData;
  } catch (error) {
    console.error('Error extracting form data:', error);
    return {};
  }
}

// Populate form with saved resume data
function populateForm(form, resumeData) {
  if (!form) {
    console.error('Form element not found for populating data');
    return;
  }
  
  if (!resumeData) {
    console.log('No resume data to populate form with');
    return;
  }
  
  try {
    console.log('Populating form with resume data:', resumeData);
    
    // Personal information
    if (resumeData.fullName) form.querySelector('#fullName').value = resumeData.fullName;
    if (resumeData.email) form.querySelector('#email').value = resumeData.email;
    if (resumeData.phone) form.querySelector('#phone').value = resumeData.phone;
    if (resumeData.address) form.querySelector('#address').value = resumeData.address;
    if (resumeData.city) form.querySelector('#city').value = resumeData.city;
    if (resumeData.state) form.querySelector('#state').value = resumeData.state;
    if (resumeData.zipCode) form.querySelector('#zipCode').value = resumeData.zipCode;
    
    // Education
    const educationContainer = form.querySelector('#education-container');
    if (educationContainer && resumeData.education && resumeData.education.length > 0) {
      // Clear existing entries
      educationContainer.innerHTML = '';
      
      // Add saved education entries
      resumeData.education.forEach(edu => {
        const entry = createEducationEntry();
        entry.querySelector('.university').value = edu.university || '';
        entry.querySelector('.degree').value = edu.degree || '';
        entry.querySelector('.major').value = edu.major || '';
        entry.querySelector('.graduationDate').value = edu.graduationDate || '';
        entry.querySelector('.gpa').value = edu.gpa || '';
        educationContainer.appendChild(entry);
      });
    }
    
    // Work Experience
    const experienceContainer = form.querySelector('#experience-container');
    if (experienceContainer && resumeData.experience && resumeData.experience.length > 0) {
      // Clear existing entries
      experienceContainer.innerHTML = '';
      
      // Add saved experience entries
      resumeData.experience.forEach(exp => {
        const entry = createExperienceEntry();
        entry.querySelector('.company').value = exp.company || '';
        entry.querySelector('.jobTitle').value = exp.jobTitle || '';
        entry.querySelector('.startDate').value = exp.startDate || '';
        entry.querySelector('.endDate').value = exp.endDate || '';
        entry.querySelector('.responsibilities').value = exp.responsibilities || '';
        experienceContainer.appendChild(entry);
      });
    }
    
    // Skills
    if (resumeData.skills) form.querySelector('#skills').value = resumeData.skills;
    
    console.log('Form populated successfully');
  } catch (error) {
    console.error('Error populating form:', error);
  }
}

// Create a new education entry element
function createEducationEntry() {
  const entry = document.createElement('div');
  entry.className = 'education-entry';
  entry.innerHTML = `
    <div class="form-group">
      <label for="university">University/College</label>
      <input type="text" class="university" name="university">
    </div>
    <div class="form-group">
      <label for="degree">Degree</label>
      <input type="text" class="degree" name="degree">
    </div>
    <div class="form-group">
      <label for="major">Major</label>
      <input type="text" class="major" name="major">
    </div>
    <div class="form-group">
      <label for="graduationDate">Graduation Date</label>
      <input type="text" class="graduationDate" name="graduationDate">
    </div>
    <div class="form-group">
      <label for="gpa">GPA</label>
      <input type="text" class="gpa" name="gpa">
    </div>
    <button type="button" class="remove-entry">Remove</button>
  `;
  return entry;
}

// Create a new experience entry element
function createExperienceEntry() {
  const entry = document.createElement('div');
  entry.className = 'experience-entry';
  entry.innerHTML = `
    <div class="form-group">
      <label for="company">Company</label>
      <input type="text" class="company" name="company">
    </div>
    <div class="form-group">
      <label for="jobTitle">Job Title</label>
      <input type="text" class="jobTitle" name="jobTitle">
    </div>
    <div class="form-group">
      <label for="startDate">Start Date</label>
      <input type="text" class="startDate" name="startDate">
    </div>
    <div class="form-group">
      <label for="endDate">End Date</label>
      <input type="text" class="endDate" name="endDate">
    </div>
    <div class="form-group">
      <label for="responsibilities">Responsibilities</label>
      <textarea class="responsibilities" name="responsibilities"></textarea>
    </div>
    <button type="button" class="remove-entry">Remove</button>
  `;
  return entry;
} 