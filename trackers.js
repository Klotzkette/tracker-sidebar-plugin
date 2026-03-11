/**
 * Tracker-Datenbank - Rein lokale Erkennung
 * Diese Liste wird nur lokal im Browser verwendet, um Tracker zu identifizieren.
 * Es findet keinerlei Kommunikation mit externen Servern statt.
 */

// Known tracker domains and their categories
const TRACKER_DATABASE = {
  // Google
  "google-analytics.com": { name: "Google Analytics", category: "Analytics", company: "Google" },
  "googletagmanager.com": { name: "Google Tag Manager", category: "Tag Manager", company: "Google" },
  "googleadservices.com": { name: "Google Ads", category: "Werbung", company: "Google" },
  "googlesyndication.com": { name: "Google AdSense", category: "Werbung", company: "Google" },
  "doubleclick.net": { name: "DoubleClick", category: "Werbung", company: "Google" },
  "googletagservices.com": { name: "Google Tag Services", category: "Tag Manager", company: "Google" },
  "pagead2.googlesyndication.com": { name: "Google PageAd", category: "Werbung", company: "Google" },
  "youtube.com": { name: "YouTube", category: "Einbettung", company: "Google" },
  "ytimg.com": { name: "YouTube Images", category: "Einbettung", company: "Google" },
  "gstatic.com": { name: "Google Static", category: "CDN", company: "Google" },
  "recaptcha.net": { name: "reCAPTCHA", category: "Sicherheit", company: "Google" },
  "firebaseinstallations.googleapis.com": { name: "Firebase", category: "Analytics", company: "Google" },
  "analytics.google.com": { name: "Google Analytics 4", category: "Analytics", company: "Google" },

  // Facebook / Meta
  "facebook.com": { name: "Facebook", category: "Social Tracking", company: "Meta" },
  "facebook.net": { name: "Facebook SDK", category: "Social Tracking", company: "Meta" },
  "fbcdn.net": { name: "Facebook CDN", category: "Social Tracking", company: "Meta" },
  "instagram.com": { name: "Instagram", category: "Social Tracking", company: "Meta" },
  "connect.facebook.net": { name: "Facebook Connect", category: "Social Tracking", company: "Meta" },
  "pixel.facebook.com": { name: "Facebook Pixel", category: "Werbung", company: "Meta" },
  "graph.facebook.com": { name: "Facebook Graph API", category: "Social Tracking", company: "Meta" },

  // Microsoft / LinkedIn
  "clarity.ms": { name: "Microsoft Clarity", category: "Analytics", company: "Microsoft" },
  "bing.com": { name: "Bing", category: "Werbung", company: "Microsoft" },
  "bat.bing.com": { name: "Bing Ads", category: "Werbung", company: "Microsoft" },
  "linkedin.com": { name: "LinkedIn", category: "Social Tracking", company: "Microsoft" },
  "ads.linkedin.com": { name: "LinkedIn Ads", category: "Werbung", company: "Microsoft" },

  // Twitter / X
  "twitter.com": { name: "Twitter/X", category: "Social Tracking", company: "X Corp" },
  "t.co": { name: "Twitter Link Tracker", category: "Social Tracking", company: "X Corp" },
  "platform.twitter.com": { name: "Twitter Platform", category: "Social Tracking", company: "X Corp" },
  "ads-twitter.com": { name: "Twitter Ads", category: "Werbung", company: "X Corp" },

  // Amazon
  "amazon-adsystem.com": { name: "Amazon Ads", category: "Werbung", company: "Amazon" },
  "alexa.com": { name: "Alexa Analytics", category: "Analytics", company: "Amazon" },
  "assoc-amazon.com": { name: "Amazon Associates", category: "Affiliate", company: "Amazon" },

  // Adobe
  "omtrdc.net": { name: "Adobe Analytics", category: "Analytics", company: "Adobe" },
  "demdex.net": { name: "Adobe Audience Manager", category: "Werbung", company: "Adobe" },
  "everesttech.net": { name: "Adobe Advertising Cloud", category: "Werbung", company: "Adobe" },
  "adobedtm.com": { name: "Adobe DTM", category: "Tag Manager", company: "Adobe" },

  // Analytics / Tracking Services
  "hotjar.com": { name: "Hotjar", category: "Analytics", company: "Hotjar" },
  "mouseflow.com": { name: "Mouseflow", category: "Analytics", company: "Mouseflow" },
  "mixpanel.com": { name: "Mixpanel", category: "Analytics", company: "Mixpanel" },
  "segment.io": { name: "Segment", category: "Analytics", company: "Twilio" },
  "segment.com": { name: "Segment", category: "Analytics", company: "Twilio" },
  "amplitude.com": { name: "Amplitude", category: "Analytics", company: "Amplitude" },
  "heap.io": { name: "Heap", category: "Analytics", company: "Heap" },
  "fullstory.com": { name: "FullStory", category: "Analytics", company: "FullStory" },
  "crazyegg.com": { name: "Crazy Egg", category: "Analytics", company: "Crazy Egg" },
  "matomo.cloud": { name: "Matomo", category: "Analytics", company: "Matomo" },
  "plausible.io": { name: "Plausible", category: "Analytics", company: "Plausible" },
  "newrelic.com": { name: "New Relic", category: "Performance", company: "New Relic" },
  "nr-data.net": { name: "New Relic Data", category: "Performance", company: "New Relic" },
  "sentry.io": { name: "Sentry", category: "Fehlertracking", company: "Sentry" },
  "bugsnag.com": { name: "Bugsnag", category: "Fehlertracking", company: "Bugsnag" },

  // Advertising Networks
  "criteo.com": { name: "Criteo", category: "Werbung", company: "Criteo" },
  "criteo.net": { name: "Criteo", category: "Werbung", company: "Criteo" },
  "taboola.com": { name: "Taboola", category: "Werbung", company: "Taboola" },
  "outbrain.com": { name: "Outbrain", category: "Werbung", company: "Outbrain" },
  "adnxs.com": { name: "AppNexus", category: "Werbung", company: "Xandr" },
  "rubiconproject.com": { name: "Rubicon Project", category: "Werbung", company: "Magnite" },
  "pubmatic.com": { name: "PubMatic", category: "Werbung", company: "PubMatic" },
  "openx.net": { name: "OpenX", category: "Werbung", company: "OpenX" },
  "casalemedia.com": { name: "Index Exchange", category: "Werbung", company: "Index Exchange" },
  "bidswitch.net": { name: "Bidswitch", category: "Werbung", company: "IPONWEB" },
  "adform.net": { name: "Adform", category: "Werbung", company: "Adform" },
  "smartadserver.com": { name: "Smart AdServer", category: "Werbung", company: "Equativ" },
  "tradedoubler.com": { name: "TradeDoubler", category: "Affiliate", company: "TradeDoubler" },
  "mediaplex.com": { name: "Mediaplex", category: "Werbung", company: "Conversant" },
  "quantserve.com": { name: "Quantcast", category: "Werbung", company: "Quantcast" },
  "scorecardresearch.com": { name: "Scorecard Research", category: "Analytics", company: "comScore" },
  "bluekai.com": { name: "Oracle BlueKai", category: "Werbung", company: "Oracle" },
  "addthis.com": { name: "AddThis", category: "Social Sharing", company: "Oracle" },
  "sharethis.com": { name: "ShareThis", category: "Social Sharing", company: "ShareThis" },

  // Consent / CMP
  "cookiebot.com": { name: "Cookiebot", category: "Consent", company: "Usercentrics" },
  "onetrust.com": { name: "OneTrust", category: "Consent", company: "OneTrust" },
  "cookielaw.org": { name: "OneTrust CookieLaw", category: "Consent", company: "OneTrust" },
  "usercentrics.eu": { name: "Usercentrics", category: "Consent", company: "Usercentrics" },
  "trustarc.com": { name: "TrustArc", category: "Consent", company: "TrustArc" },
  "consensu.org": { name: "IAB Consent", category: "Consent", company: "IAB" },

  // CDN / Fonts (often used for tracking)
  "cloudflare.com": { name: "Cloudflare", category: "CDN", company: "Cloudflare" },
  "cdn.jsdelivr.net": { name: "jsDelivr", category: "CDN", company: "jsDelivr" },
  "unpkg.com": { name: "unpkg", category: "CDN", company: "unpkg" },

  // Chat / Support
  "intercom.io": { name: "Intercom", category: "Chat/Support", company: "Intercom" },
  "zendesk.com": { name: "Zendesk", category: "Chat/Support", company: "Zendesk" },
  "tawk.to": { name: "Tawk.to", category: "Chat/Support", company: "Tawk.to" },
  "drift.com": { name: "Drift", category: "Chat/Support", company: "Drift" },
  "hubspot.com": { name: "HubSpot", category: "Marketing", company: "HubSpot" },
  "hs-analytics.net": { name: "HubSpot Analytics", category: "Analytics", company: "HubSpot" },
  "hs-scripts.com": { name: "HubSpot Scripts", category: "Marketing", company: "HubSpot" },

  // TikTok
  "tiktok.com": { name: "TikTok", category: "Social Tracking", company: "ByteDance" },
  "byteoversea.com": { name: "TikTok/ByteDance", category: "Social Tracking", company: "ByteDance" },

  // Snapchat
  "snapchat.com": { name: "Snapchat", category: "Social Tracking", company: "Snap" },
  "sc-static.net": { name: "Snapchat Static", category: "Social Tracking", company: "Snap" },

  // Pinterest
  "pinterest.com": { name: "Pinterest", category: "Social Tracking", company: "Pinterest" },
  "pinimg.com": { name: "Pinterest Images", category: "Social Tracking", company: "Pinterest" }
};

// Category colors for display
const CATEGORY_COLORS = {
  "Analytics": "#4285f4",
  "Werbung": "#ea4335",
  "Social Tracking": "#1877f2",
  "Tag Manager": "#f4b400",
  "Einbettung": "#9c27b0",
  "CDN": "#607d8b",
  "Consent": "#4caf50",
  "Chat/Support": "#00bcd4",
  "Marketing": "#ff9800",
  "Affiliate": "#795548",
  "Social Sharing": "#e91e63",
  "Sicherheit": "#2e7d32",
  "Performance": "#3f51b5",
  "Fehlertracking": "#ff5722",
  "Unbekannt": "#9e9e9e"
};

// --- Performance: Pre-build a suffix-match lookup table ---
// Sorted longest-first so more specific domains match before generic ones
const _TRACKER_DOMAINS_SORTED = Object.keys(TRACKER_DATABASE)
  .sort((a, b) => b.length - a.length);

// Fast tracker identification using sorted suffix matching + cache
const _identifyCache = new Map();
const _CACHE_MAX = 2000;

function identifyTracker(url) {
  try {
    const hostname = new URL(url).hostname;
    if (_identifyCache.has(hostname)) return _identifyCache.get(hostname);

    let result = null;
    for (const domain of _TRACKER_DOMAINS_SORTED) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        result = { ...TRACKER_DATABASE[domain], domain: hostname };
        break;
      }
    }

    // Cap cache size
    if (_identifyCache.size >= _CACHE_MAX) _identifyCache.clear();
    _identifyCache.set(hostname, result);
    return result;
  } catch {
    return null;
  }
}

// Check if a request is a third-party request (cached base domain extraction)
const _baseDomainCache = new Map();

function _getBaseDomain(hostname) {
  if (_baseDomainCache.has(hostname)) return _baseDomainCache.get(hostname);
  const parts = hostname.split('.');
  const base = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
  if (_baseDomainCache.size >= _CACHE_MAX) _baseDomainCache.clear();
  _baseDomainCache.set(hostname, base);
  return base;
}

function isThirdParty(requestUrl, pageUrl) {
  try {
    const reqBase = _getBaseDomain(new URL(requestUrl).hostname);
    const pageBase = _getBaseDomain(new URL(pageUrl).hostname);
    return reqBase !== pageBase;
  } catch {
    return true;
  }
}

// Parse URL parameters to extract sent data
function parseRequestData(url) {
  try {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return {};
    const urlObj = new URL(url);
    const params = {};
    for (const [key, value] of urlObj.searchParams) {
      params[key] = value;
    }
    return params;
  } catch {
    return {};
  }
}

// Make available for both background and content scripts
if (typeof globalThis !== 'undefined') {
  globalThis.TRACKER_DATABASE = TRACKER_DATABASE;
  globalThis.CATEGORY_COLORS = CATEGORY_COLORS;
  globalThis.identifyTracker = identifyTracker;
  globalThis.isThirdParty = isThirdParty;
  globalThis.parseRequestData = parseRequestData;
}
