// Popup script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  const tabId = tabs[0].id;

  chrome.runtime.sendMessage({ type: 'GET_TRACKER_DATA', tabId }, (data) => {
    if (data) {
      document.getElementById('tracker-count').textContent = data.totalTrackers;
      document.getElementById('request-count').textContent = data.totalRequests;
    }
  });

  chrome.storage.local.get(['blockedDomains'], (result) => {
    const blocked = result?.blockedDomains || {};
    document.getElementById('blocked-count').textContent = Object.keys(blocked).length;
  });

  // Toggle sidebar button
  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SIDEBAR' });
    window.close();
  });
});
