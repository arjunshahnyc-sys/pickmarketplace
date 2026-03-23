// Pick - Background Service Worker

const API_BASE = 'https://pickdeals.vercel.app';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Pick] Extension installed');

  // Initialize storage
  chrome.storage.local.set({
    totalSaved: 0,
    dealsFound: 0,
    settings: {
      enabled: true,
      showWidget: true,
      notifications: true
    }
  });
});

// Listen for tab updates to clear old data
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear previous product data when navigating
    chrome.storage.local.remove(['currentProduct', 'alternatives']);
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH_PRODUCT') {
    // Call API to search for product alternatives
    searchProduct(message.query)
      .then(results => sendResponse({ status: 'ok', results }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));

    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_STATS') {
    chrome.storage.local.get(['totalSaved', 'dealsFound'], (data) => {
      sendResponse({
        totalSaved: data.totalSaved || 0,
        dealsFound: data.dealsFound || 0
      });
    });
    return true;
  }

  if (message.type === 'TRACK_SAVINGS') {
    chrome.storage.local.get(['totalSaved', 'dealsFound'], (data) => {
      chrome.storage.local.set({
        totalSaved: (data.totalSaved || 0) + message.amount,
        dealsFound: (data.dealsFound || 0) + 1
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});

// Search for product alternatives via API
async function searchProduct(query) {
  try {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[Pick] API error:', error);
    throw error;
  }
}
