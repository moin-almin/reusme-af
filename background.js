/**
 * Background script that runs in the extension's background context
 */

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Resume Form Filler extension installed!');
  
  // Open resume page on install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'resume.html' });
  }
  
  // Check if resume data exists, if not, open resume page
  chrome.storage.local.get('resumeData', (result) => {
    if (!result.resumeData || Object.keys(result.resumeData).length === 0) {
      chrome.tabs.create({ url: 'resume.html' });
    }
  });
});

// Check for job portals when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Execute content script to detect job portals
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: checkIfJobPortal
    });
  }
});

// Function to run in page context to check if it's a job portal
function checkIfJobPortal() {
  if (typeof detectJobPortal === 'function') {
    detectJobPortal();
  }
}

// Message handling from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Will respond asynchronously
  }
}); 