/**
 * Tracker Viewer - Background Service Worker
 *
 * DATENSCHUTZ-HINWEIS:
 * Dieses Plugin arbeitet zu 100% lokal im Browser.
 * Es werden KEINE Daten an externe Server, Dritte oder den Entwickler gesendet.
 * Alle Tracker-Analysen und Cookie-Auswertungen finden
 * ausschließlich lokal auf dem Gerät des Nutzers statt.
 */
importScripts('trackers.js');

// ============================================================
// State
// ============================================================
const tabTrackers = {};   // tabId -> { hostname -> trackerData }
const tabUrls = {};       // tabId -> pageUrl (cache to avoid async tab lookup)

// Pending UI updates: debounce to avoid spamming content scripts
const pendingUpdates = {}; // tabId -> timeoutId

// ============================================================
// Tab URL tracking (avoids expensive chrome.tabs.get in hot path)
// ============================================================
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    tabUrls[details.tabId] = details.url;
    tabTrackers[details.tabId] = {};
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) tabUrls[tabId] = changeInfo.url;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTrackers[tabId];
  delete tabUrls[tabId];
  if (pendingUpdates[tabId]) {
    clearTimeout(pendingUpdates[tabId]);
    delete pendingUpdates[tabId];
  }
});

// ============================================================
// Request interception: detect & record third-party trackers
// ============================================================
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const tabId = details.tabId;
    if (tabId < 0) return;

    const pageUrl = tabUrls[tabId];
    if (!pageUrl) return;

    const requestUrl = details.url;

    // Fast bail: same base domain = not third-party
    if (!isThirdParty(requestUrl, pageUrl)) return;

    let hostname;
    try { hostname = new URL(requestUrl).hostname; } catch { return; }

    const trackerInfo = identifyTracker(requestUrl);
    const requestData = parseRequestData(requestUrl);

    // Extract cookies from request headers
    const cookieHeader = details.requestHeaders?.find(
      h => h.name.toLowerCase() === 'cookie'
    );
    const cookies = cookieHeader ? parseCookieHeader(cookieHeader.value) : {};

    // Extract referer
    const referer = details.requestHeaders?.find(
      h => h.name.toLowerCase() === 'referer'
    )?.value || null;

    if (!tabTrackers[tabId]) tabTrackers[tabId] = {};

    const entry = {
      url: requestUrl,
      hostname,
      type: details.type,
      timestamp: Date.now(),
      trackerInfo: trackerInfo || {
        name: hostname,
        category: "Unbekannt",
        company: "Unbekannt",
        domain: hostname
      },
      sentData: {
        urlParams: requestData,
        cookies,
        referer,
        method: details.method
      }
    };

    // Group by hostname
    const existing = tabTrackers[tabId][hostname];
    if (existing) {
      existing.requests.push(entry);
      existing.requestCount++;
      Object.assign(existing.allCookies, cookies);
      Object.assign(existing.allParams, requestData);
    } else {
      tabTrackers[tabId][hostname] = {
        hostname,
        trackerInfo: entry.trackerInfo,
        requests: [entry],
        requestCount: 1,
        allCookies: { ...cookies },
        allParams: { ...requestData },
        receivedCookies: [],
        firstSeen: Date.now()
      };
    }

    // Debounced UI update (max once per 300ms per tab)
    scheduleUIUpdate(tabId);
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// ============================================================
// Response interception: capture Set-Cookie headers
// ============================================================
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const tabId = details.tabId;
    if (tabId < 0) return;

    let hostname;
    try { hostname = new URL(details.url).hostname; } catch { return; }

    const setCookies = details.responseHeaders?.filter(
      h => h.name.toLowerCase() === 'set-cookie'
    );
    if (!setCookies?.length) return;

    const tracker = tabTrackers[tabId]?.[hostname];
    if (!tracker) return;

    for (const sc of setCookies) {
      tracker.receivedCookies.push(parseSingleSetCookie(sc.value));
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ============================================================
// Debounced UI updates
// ============================================================
function scheduleUIUpdate(tabId) {
  if (pendingUpdates[tabId]) return; // already scheduled
  pendingUpdates[tabId] = setTimeout(() => {
    delete pendingUpdates[tabId];
    const summary = getTabSummary(tabId);
    chrome.tabs.sendMessage(tabId, {
      type: 'TRACKER_UPDATE',
      data: summary
    }).catch(() => {});
  }, 300);
}

// ============================================================
// Helpers
// ============================================================
function parseCookieHeader(cookieStr) {
  const cookies = {};
  if (!cookieStr) return cookies;
  const pairs = cookieStr.split(';');
  for (let i = 0; i < pairs.length; i++) {
    const eq = pairs[i].indexOf('=');
    if (eq > 0) {
      cookies[pairs[i].substring(0, eq).trim()] = pairs[i].substring(eq + 1).trim();
    }
  }
  return cookies;
}

function parseSingleSetCookie(value) {
  const parts = value.split(';');
  const eq = parts[0].indexOf('=');
  const cookie = {
    name: eq > 0 ? parts[0].substring(0, eq).trim() : parts[0].trim(),
    value: eq > 0 ? parts[0].substring(eq + 1).trim() : '',
    attributes: {}
  };
  for (let i = 1; i < parts.length; i++) {
    const aeq = parts[i].indexOf('=');
    if (aeq > 0) {
      cookie.attributes[parts[i].substring(0, aeq).trim().toLowerCase()] = parts[i].substring(aeq + 1).trim();
    } else {
      cookie.attributes[parts[i].trim().toLowerCase()] = true;
    }
  }
  return cookie;
}

function getTabSummary(tabId) {
  const trackers = tabTrackers[tabId] || {};
  const trackerList = Object.values(trackers).map(t => ({
    hostname: t.hostname,
    name: t.trackerInfo.name,
    category: t.trackerInfo.category,
    company: t.trackerInfo.company,
    requestCount: t.requestCount,
    allCookies: t.allCookies,
    allParams: t.allParams,
    receivedCookies: t.receivedCookies,
    requests: t.requests.slice(-20).map(r => ({
      url: r.url,
      type: r.type,
      method: r.sentData.method,
      timestamp: r.timestamp,
      sentData: r.sentData
    }))
  }));

  // Sort: known trackers first, then by request count
  trackerList.sort((a, b) => {
    const aKnown = a.category !== 'Unbekannt' ? 1 : 0;
    const bKnown = b.category !== 'Unbekannt' ? 1 : 0;
    if (aKnown !== bKnown) return bKnown - aKnown;
    return b.requestCount - a.requestCount;
  });

  const categories = {};
  let totalRequests = 0;
  for (const t of trackerList) {
    categories[t.category] = (categories[t.category] || 0) + 1;
    totalRequests += t.requestCount;
  }

  return {
    totalTrackers: trackerList.length,
    totalRequests,
    trackers: trackerList,
    categories
  };
}

// ============================================================
// Message handling
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TRACKER_DATA') {
    const tabId = message.tabId || sender.tab?.id;
    sendResponse(tabId ? getTabSummary(tabId) : { totalTrackers: 0, totalRequests: 0, trackers: [], categories: {} });
    return true;
  }

  if (message.type === 'GET_COOKIES_FOR_TAB') {
    const tabId = message.tabId || sender.tab?.id;
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url) { sendResponse([]); return; }
        chrome.cookies.getAll({ url: tab.url }, (cookies) => sendResponse(cookies || []));
      });
      return true;
    }
    sendResponse([]);
    return true;
  }
});
