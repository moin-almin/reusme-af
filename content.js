/**
 * Content script that runs in the context of web pages.
 * This script can access the DOM of the current page.
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillField") {
    fillField(message.fieldType, message.data);
    sendResponse({ success: true });
  } else if (message.action === "detectFields") {
    const fields = detectFormFields();
    sendResponse({ fields: fields });
  }
  
  // Return true to indicate async response
  return true;
});

// Helper function to highlight filled fields
function highlightField(element) {
  // Save original background
  const originalBackground = element.style.backgroundColor;
  const originalTransition = element.style.transition;
  
  // Add highlight effect
  element.style.transition = 'background-color 0.3s ease';
  element.style.backgroundColor = '#b3e5fc';
  
  // Remove highlight after animation
  setTimeout(() => {
    element.style.backgroundColor = originalBackground;
    
    // Remove transition after animation completes
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 300);
  }, 1000);
}

// Detect common job application forms
function detectJobPortal() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase();
  
  // Check for common job portal URLs or keywords
  const portalKeywords = [
    'linkedin.com/jobs', 'indeed.com', 'glassdoor.com', 'monster.com',
    'careerbuilder', 'ziprecruiter', 'dice.com', 'lever.co', 'greenhouse.io',
    'workday', 'taleo', 'brassring', 'recruiter', 'job application', 'apply now',
    'submit application', 'employment', 'career'
  ];
  
  // Check for common form field groups that would indicate a job application
  const hasNameField = !!document.querySelector('input[name*="name" i], input[id*="name" i]');
  const hasEmailField = !!document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
  const hasResumeField = !!document.querySelector('input[type="file"][name*="resume" i], input[type="file"][name*="cv" i]');
  const hasEducationSection = bodyText.includes('education') && (bodyText.includes('degree') || bodyText.includes('university'));
  const hasExperienceSection = bodyText.includes('experience') || bodyText.includes('employment') || bodyText.includes('work history');
  
  // Check if URL contains portal keywords
  const isJobPortalURL = portalKeywords.some(keyword => url.includes(keyword));
  
  // Check if title or body contains relevant keywords
  const hasJobKeywordsInTitle = title.includes('job') || title.includes('career') || title.includes('application');
  const hasApplyKeywords = bodyText.includes('apply') || bodyText.includes('submit application') || bodyText.includes('job application');
  
  // Add a badge/notification if this is likely a job application page
  if ((isJobPortalURL || hasJobKeywordsInTitle || (hasApplyKeywords && hasNameField && hasEmailField)) &&
      (hasNameField || hasEducationSection || hasExperienceSection || hasResumeField)) {
    
    // Only add notification if it doesn't already exist
    if (!document.getElementById('resume-filler-notification')) {
      const notification = document.createElement('div');
      notification.id = 'resume-filler-notification';
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #3498db;
          color: white;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          z-index: 10000;
          font-family: Arial, sans-serif;
          max-width: 300px;
          display: flex;
          align-items: center;
          ">
          <div style="margin-right: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">Resume Form Filler</div>
            <div style="font-size: 14px;">Job application detected! Click the extension icon to fill this form.</div>
          </div>
          <div style="margin-left: 10px; cursor: pointer;" id="resume-filler-close">×</div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Add close button functionality
      document.getElementById('resume-filler-close').addEventListener('click', () => {
        notification.remove();
      });
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 8000);
    }
    
    return true;
  }
  
  return false;
} 