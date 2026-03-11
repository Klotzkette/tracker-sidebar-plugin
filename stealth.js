/**
 * Stealth-Modul: Generiert pseudonymisierte Fake-Daten für blockierte Tracker.
 *
 * Statt Tracker einfach zu blockieren (was sie erkennen können), liefern wir
 * ihnen plausibel aussehende, aber komplett nutzlose Fake-Daten zurück.
 * Der Tracker "denkt", er hat echte Daten erhalten, aber alles ist Datensalat.
 *
 * DATENSCHUTZ: Alles wird lokal generiert. Kein Byte verlässt den Browser.
 */

// Pseudo-random hex string (deterministic per session to look consistent)
function fakeHex(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

// Fake UUID
function fakeUUID() {
  return `${fakeHex(8)}-${fakeHex(4)}-4${fakeHex(3)}-${['8','9','a','b'][Math.floor(Math.random()*4)]}${fakeHex(3)}-${fakeHex(12)}`;
}

// Fake Google Analytics-style client ID
function fakeGAClientId() {
  return `${Math.floor(Math.random() * 9e8) + 1e8}.${Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30)}`;
}

// Fake Facebook-style pixel data
function fakeFBPixelId() {
  return String(Math.floor(Math.random() * 9e14) + 1e14);
}

// Generate a fake JS response that looks like a real tracker response
// but does absolutely nothing useful. The tracker's error handling will
// silently swallow it because there are no syntax errors.
function generateFakeTrackerJS(hostname) {
  const fakeId = fakeHex(16);
  const fakeSession = fakeUUID();
  const ts = Date.now();

  // Return valid JS that defines expected globals with garbage data.
  // This prevents "X is not defined" errors that could break the page.
  return `
/* tracker-sidebar: stealth response for ${hostname} */
(function(){
  var _sid="${fakeSession}";
  var _cid="${fakeGAClientId()}";
  var _ts=${ts};
  var _q=[];
  var _noop=function(){return _q};
  /* Google Analytics / GTM stubs */
  if(typeof window.ga==='undefined'){window.ga=_noop;window.ga.q=_q;window.ga.l=_ts}
  if(typeof window.gtag==='undefined'){window.gtag=function(){_q.push(arguments)}}
  if(typeof window.dataLayer==='undefined'){window.dataLayer=[]}
  /* Facebook Pixel stub */
  if(typeof window.fbq==='undefined'){window.fbq=_noop;window.fbq.queue=_q;window.fbq.version='2.0';window._fbq=window.fbq}
  /* Generic tracker stubs */
  if(typeof window._satellite==='undefined'){window._satellite={track:_noop,getVar:_noop,setVar:_noop}}
  if(typeof window.mixpanel==='undefined'){window.mixpanel={track:_noop,identify:_noop,reset:_noop,people:{set:_noop}}}
  if(typeof window.amplitude==='undefined'){window.amplitude={getInstance:function(){return{logEvent:_noop,setUserId:_noop,init:_noop}}}}
  if(typeof window.hj==='undefined'){window.hj=_noop;window._hjSettings={hjid:${Math.floor(Math.random()*9e5)},hjsv:6}}
  if(typeof window.clarity==='undefined'){window.clarity=_noop}
  if(typeof window.ttq==='undefined'){window.ttq={track:_noop,page:_noop,identify:_noop,instances:_noop,debug:_noop,on:_noop,off:_noop,once:_noop,ready:_noop,alias:_noop,group:_noop,enableCookie:_noop,disableCookie:_noop}}
  if(typeof window.pintrk==='undefined'){window.pintrk=_noop}
  if(typeof window.twq==='undefined'){window.twq=_noop}
  if(typeof window.lintrk==='undefined'){window.lintrk=_noop}
  if(typeof window.snaptr==='undefined'){window.snaptr=_noop}
})();
`.trim();
}

// Generate a fake XHR/beacon response (JSON that looks like a tracker response)
function generateFakeXHRResponse() {
  return JSON.stringify({
    status: "ok",
    id: fakeUUID(),
    ts: Date.now(),
    ack: 1
  });
}

// Generate a fake tracking pixel (valid 1x1 transparent GIF)
const FAKE_PIXEL_GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Generate a fake iframe content (empty HTML that looks like a served page)
function generateFakeIframeHTML() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head><body></body></html>`;
}

// Build data URIs for each resource type
function getStealthRedirectURL(resourceType, hostname) {
  switch (resourceType) {
    case 'script':
      // Encode the fake JS as a data URI
      return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(generateFakeTrackerJS(hostname));
    case 'image':
    case 'ping':
      // Transparent 1x1 GIF
      return 'data:image/gif;base64,' + FAKE_PIXEL_GIF;
    case 'xmlhttprequest':
      // Fake JSON response
      return 'data:application/json;charset=utf-8,' + encodeURIComponent(generateFakeXHRResponse());
    case 'sub_frame':
      // Fake empty iframe
      return 'data:text/html;charset=utf-8,' + encodeURIComponent(generateFakeIframeHTML());
    case 'stylesheet':
      // Empty but valid CSS
      return 'data:text/css,/* stealth */';
    default:
      // Empty text for anything else
      return 'data:text/plain,';
  }
}

// Make available globally
if (typeof globalThis !== 'undefined') {
  globalThis.getStealthRedirectURL = getStealthRedirectURL;
  globalThis.generateFakeTrackerJS = generateFakeTrackerJS;
  globalThis.FAKE_PIXEL_GIF = FAKE_PIXEL_GIF;
}
