/**
 * Wer trackt wen warum wozu - Content Script
 *
 * DATENSCHUTZ: Dieses Script arbeitet ausschließlich lokal.
 * Es werden keine Daten an externe Server übermittelt.
 * Alle Informationen verbleiben im Browser des Nutzers.
 */
(function () {
  'use strict';

  // Avoid double-injection
  if (document.getElementById('tracker-sidebar-container')) return;

  // Category colors
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

  let currentData = null;
  let sidebarVisible = false;
  let blockedDomains = {};
  let renderPending = false;

  // Load blocked domains from storage
  chrome.storage?.local?.get(['blockedDomains'], (result) => {
    if (result?.blockedDomains) blockedDomains = result.blockedDomains;
  });

  // ============================================================
  // DOM Setup
  // ============================================================
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'tracker-sidebar-toggle';
  toggleBtn.innerHTML = '<span class="ts-toggle-count">0</span>';
  toggleBtn.addEventListener('click', () => toggleSidebar());
  document.documentElement.appendChild(toggleBtn);

  const sidebar = document.createElement('div');
  sidebar.id = 'tracker-sidebar-container';
  sidebar.classList.add('hidden');
  document.documentElement.appendChild(sidebar);

  // ============================================================
  // Toggle
  // ============================================================
  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
    sidebar.classList.toggle('hidden', !sidebarVisible);
    toggleBtn.classList.toggle('sidebar-open', sidebarVisible);
    if (sidebarVisible && currentData) renderSidebar(currentData);
  }

  // ============================================================
  // Blocking (with stealth - tracker gets fake data, not an error)
  // ============================================================
  function saveBlockedDomains() {
    chrome.storage?.local?.set({ blockedDomains });
  }

  function gracefulReload() {
    // Wait for declarativeNetRequest rules to be applied before reloading
    setTimeout(() => {
      try { location.reload(); } catch { window.location.href = window.location.href; }
    }, 500);
  }

  function blockDomain(hostname) {
    blockedDomains[hostname] = true;
    saveBlockedDomains();
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_RULES', blockedDomains }, () => gracefulReload());
  }

  function unblockDomain(hostname) {
    delete blockedDomains[hostname];
    saveBlockedDomains();
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_RULES', blockedDomains }, () => gracefulReload());
  }

  function blockAll(trackers) {
    for (const t of trackers) blockedDomains[t.hostname] = true;
    saveBlockedDomains();
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_RULES', blockedDomains }, () => gracefulReload());
  }

  function unblockAll() {
    blockedDomains = {};
    saveBlockedDomains();
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_RULES', blockedDomains }, () => gracefulReload());
  }

  // ============================================================
  // Summary text generation
  // ============================================================
  function generateSummaryText(data) {
    const date = new Date().toLocaleString('de-DE');
    const blockedCount = Object.keys(blockedDomains).length;
    const lines = [
      '=== WER TRACKT WEN WARUM WOZU ===',
      `Website: ${location.href}`,
      `Datum: ${date}`,
      `Aktive Tracker: ${data.totalTrackers}`,
      `Anfragen: ${data.totalRequests}`,
    ];
    if (blockedCount > 0) lines.push(`Privat geschuetzt: ${blockedCount}`);
    lines.push('', '--- Tracker-Liste ---', '');

    for (const tracker of data.trackers) {
      const isBlocked = blockedDomains[tracker.hostname];
      lines.push(`${tracker.name}${isBlocked ? ' [geschuetzt]' : ''}`);
      lines.push(`  Firma: ${tracker.company}`);
      lines.push(`  Domain: ${tracker.hostname}`);
      lines.push(`  Kategorie: ${tracker.category}`);
      lines.push(`  Requests: ${tracker.requestCount}`);

      const cookieCount = Object.keys(tracker.allCookies || {}).length;
      if (cookieCount > 0) lines.push(`  Gesendete Cookies (${cookieCount}): ${Object.keys(tracker.allCookies).join(', ')}`);

      const receivedCount = (tracker.receivedCookies || []).length;
      if (receivedCount > 0) lines.push(`  Empfangene Cookies (${receivedCount}): ${tracker.receivedCookies.map(c => c.name).join(', ')}`);

      const paramCount = Object.keys(tracker.allParams || {}).length;
      if (paramCount > 0) lines.push(`  URL-Parameter (${paramCount}): ${Object.keys(tracker.allParams).join(', ')}`);

      if (isBlocked) lines.push(`  Status: Privatsphaere geschuetzt`);
      lines.push('');
    }

    const currentHostnames = new Set(data.trackers.map(t => t.hostname));
    for (const hostname of Object.keys(blockedDomains)) {
      if (!currentHostnames.has(hostname)) {
        lines.push(`${hostname} [geschuetzt]`);
        lines.push('');
      }
    }

    lines.push('=== ENDE ===');
    return lines.join('\n');
  }

  function showSummaryOverlay(data) {
    const existing = document.getElementById('ts-summary-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ts-summary-overlay';
    overlay.innerHTML = `
      <div class="ts-summary-backdrop"></div>
      <div class="ts-summary-modal">
        <div class="ts-summary-header">
          <span>Wer trackt hier &mdash; Zusammenfassung</span>
          <button class="ts-summary-close" id="ts-summary-close">&#10005;</button>
        </div>
        <textarea class="ts-summary-text" readonly id="ts-summary-textarea">${esc(generateSummaryText(data))}</textarea>
        <div class="ts-summary-actions">
          <button class="ts-summary-copy" id="ts-summary-copy">Kopieren</button>
          <span class="ts-summary-copied" id="ts-summary-copied" style="display:none">Kopiert</span>
        </div>
      </div>
    `;
    document.documentElement.appendChild(overlay);

    overlay.querySelector('#ts-summary-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.ts-summary-backdrop').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#ts-summary-copy').addEventListener('click', () => {
      const ta = overlay.querySelector('#ts-summary-textarea');
      ta.select();
      navigator.clipboard.writeText(ta.value).then(() => {
        const label = overlay.querySelector('#ts-summary-copied');
        label.style.display = 'inline';
        setTimeout(() => { label.style.display = 'none'; }, 2000);
      });
    });
    overlay.querySelector('#ts-summary-textarea').addEventListener('focus', (e) => e.target.select());
  }

  // ============================================================
  // Utilities
  // ============================================================
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function trunc(str, max = 60) {
    if (!str) return '';
    const s = String(str);
    return s.length > max ? s.substring(0, max) + '...' : s;
  }

  // ============================================================
  // Render (throttled via requestAnimationFrame)
  // ============================================================
  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      if (sidebarVisible && currentData) renderSidebar(currentData);
    });
  }

  function renderSidebar(data) {
    const blockedCount = Object.keys(blockedDomains).length;
    const hasBlockedAny = blockedCount > 0;

    let html = `
      <div class="ts-header">
        <div class="ts-header-top">
          <div class="ts-title">
            Wer trackt wen warum wozu
          </div>
          <button class="ts-close-btn" id="ts-close">&#10005;</button>
        </div>
        <div class="ts-stats">
          <span class="ts-stat"><span class="ts-stat-number">${data.totalTrackers}</span> Tracker</span>
          <span class="ts-stat"><span class="ts-stat-number">${data.totalRequests}</span> Anfragen</span>
          ${blockedCount > 0 ? `<span class="ts-stat ts-stat-stealth"><span class="ts-stat-number">${blockedCount}</span> gesch&uuml;tzt</span>` : ''}
        </div>
      </div>

      <div class="ts-block-all-bar">
        <button class="ts-block-all-btn block" id="ts-block-all">Alle sch&uuml;tzen</button>
        ${hasBlockedAny ? `<button class="ts-block-all-btn unblock" id="ts-unblock-all">Alle zulassen</button>` : ''}
        <button class="ts-block-all-btn summary" id="ts-show-summary">Zusammenfassung</button>
      </div>

      ${hasBlockedAny ? `
        <div class="ts-stealth-banner">
          <span>Mehr Privatsph&auml;re: ${blockedCount} Tracker k&ouml;nnen dich auf dieser Seite nicht mehr verfolgen</span>
        </div>
      ` : ''}
    `;

    // Category badges
    if (data.categories && Object.keys(data.categories).length > 0) {
      html += '<div class="ts-categories">';
      for (const [cat, count] of Object.entries(data.categories)) {
        const color = CATEGORY_COLORS[cat] || '#9e9e9e';
        html += `<span class="ts-category-badge" style="background:${color}">${esc(cat)} (${count})</span>`;
      }
      html += '</div>';
    }

    // Tracker list
    html += '<div class="ts-tracker-list">';

    if (data.trackers.length === 0 && blockedCount === 0) {
      html += `
        <div class="ts-empty">
          <div class="ts-empty-icon">&#9989;</div>
          <div class="ts-empty-text">Keine Tracker auf dieser Seite</div>
        </div>
      `;
    } else {
      const currentHostnames = new Set(data.trackers.map(t => t.hostname));
      for (const tracker of data.trackers) {
        html += renderTrackerItem(tracker, !!blockedDomains[tracker.hostname]);
      }
      for (const hostname of Object.keys(blockedDomains)) {
        if (!currentHostnames.has(hostname)) {
          html += renderBlockedPlaceholder(hostname);
        }
      }
    }

    html += '</div>';
    sidebar.innerHTML = html;
    attachEventListeners(data);
  }

  function renderTrackerItem(tracker, isBlocked) {
    const color = CATEGORY_COLORS[tracker.category] || '#9e9e9e';
    const cookieCount = Object.keys(tracker.allCookies || {}).length;
    const paramCount = Object.keys(tracker.allParams || {}).length;
    const receivedCookieCount = (tracker.receivedCookies || []).length;

    // Build data details HTML
    const dataSections = [];

    if (cookieCount > 0) {
      let rows = '';
      for (const [name, value] of Object.entries(tracker.allCookies)) {
        rows += `<tr><td title="${esc(name)}">${esc(trunc(name, 30))}</td><td title="${esc(value)}">${esc(trunc(value))}</td></tr>`;
      }
      dataSections.push(`<div class="ts-data-section"><div class="ts-data-section-title">Cookies gesendet (${cookieCount})</div><table class="ts-data-table">${rows}</table></div>`);
    }

    if (receivedCookieCount > 0) {
      let rows = '';
      for (const cookie of tracker.receivedCookies) {
        const attrs = Object.keys(cookie.attributes || {}).join(', ');
        rows += `<tr><td title="${esc(cookie.name)}">${esc(trunc(cookie.name, 30))}</td><td title="${esc(cookie.value)}">${esc(trunc(cookie.value))}${attrs ? ` <span style="color:#666">(${esc(attrs)})</span>` : ''}</td></tr>`;
      }
      dataSections.push(`<div class="ts-data-section"><div class="ts-data-section-title">Cookies empfangen (${receivedCookieCount})</div><table class="ts-data-table">${rows}</table></div>`);
    }

    if (paramCount > 0) {
      let rows = '';
      for (const [name, value] of Object.entries(tracker.allParams)) {
        rows += `<tr><td title="${esc(name)}">${esc(trunc(name, 30))}</td><td title="${esc(value)}">${esc(trunc(value))}</td></tr>`;
      }
      dataSections.push(`<div class="ts-data-section"><div class="ts-data-section-title">Daten in der URL (${paramCount})</div><table class="ts-data-table">${rows}</table></div>`);
    }

    if (tracker.requests?.length > 0) {
      const types = {};
      for (const r of tracker.requests) types[r.type] = (types[r.type] || 0) + 1;
      let badges = '';
      for (const [type, count] of Object.entries(types)) {
        badges += `<span class="ts-request-type">${esc(type)} (${count})</span>`;
      }
      dataSections.push(`<div class="ts-data-section"><div class="ts-data-section-title">Art der Anfragen</div><div>${badges}</div></div>`);
    }

    if (tracker.requests?.some(r => r.sentData?.referer)) {
      const referer = tracker.requests.find(r => r.sentData?.referer)?.sentData.referer;
      dataSections.push(`<div class="ts-data-section"><div class="ts-data-section-title">Herkunft mitgeteilt</div><div style="font-size:11px;color:#d0d0e0;word-break:break-all">${esc(referer)}</div></div>`);
    }

    const dataHtml = dataSections.join('');

    return `
      <div class="ts-tracker-item ${isBlocked ? 'blocked' : ''}">
        <div class="ts-tracker-header">
          <div class="ts-tracker-name-area">
            <div class="ts-tracker-name">${esc(tracker.name)}</div>
            <div class="ts-tracker-company">${esc(tracker.company)} &mdash; ${esc(tracker.hostname)}</div>
          </div>
          <div class="ts-tracker-right">
            <span class="ts-tracker-badge" style="background:${color}">${esc(tracker.category)}</span>
            <span class="ts-tracker-requests">${tracker.requestCount}x</span>
            <label class="ts-block-toggle" title="${isBlocked ? 'Geschuetzt - klicken zum Zulassen' : 'Aktiv - klicken zum Schuetzen'}">
              <input type="checkbox" class="ts-block-input" data-hostname="${esc(tracker.hostname)}" ${isBlocked ? 'checked' : ''}>
              <span class="ts-block-slider"></span>
            </label>
          </div>
        </div>
        ${isBlocked ? '<div class="ts-blocked-label">Privatsph&auml;re gesch&uuml;tzt</div>' : ''}
        ${dataHtml ? `
          <div class="ts-sent-data">
            <button class="ts-data-toggle">&#9654; Was wird gesendet?</button>
            <div class="ts-data-details">${dataHtml}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderBlockedPlaceholder(hostname) {
    return `
      <div class="ts-tracker-item blocked">
        <div class="ts-tracker-header">
          <div class="ts-tracker-name-area">
            <div class="ts-tracker-name">${esc(hostname)}</div>
            <div class="ts-tracker-company">Geschuetzt</div>
          </div>
          <div class="ts-tracker-right">
            <span class="ts-tracker-badge" style="background:#4caf50">Geschuetzt</span>
            <label class="ts-block-toggle" title="Geschuetzt - klicken zum Zulassen">
              <input type="checkbox" class="ts-block-input" data-hostname="${esc(hostname)}" checked>
              <span class="ts-block-slider"></span>
            </label>
          </div>
        </div>
        <div class="ts-blocked-label">Privatsph&auml;re gesch&uuml;tzt &mdash; kann dich nicht verfolgen</div>
      </div>
    `;
  }

  // ============================================================
  // Event listeners (attached after render)
  // ============================================================
  function attachEventListeners(data) {
    sidebar.querySelector('#ts-close')?.addEventListener('click', () => toggleSidebar());
    sidebar.querySelector('#ts-block-all')?.addEventListener('click', () => blockAll(data.trackers));
    sidebar.querySelector('#ts-unblock-all')?.addEventListener('click', () => unblockAll());
    sidebar.querySelector('#ts-show-summary')?.addEventListener('click', () => showSummaryOverlay(data));

    sidebar.querySelectorAll('.ts-data-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const details = btn.nextElementSibling;
        if (details) {
          details.classList.toggle('open');
          btn.textContent = details.classList.contains('open') ? '\u25BE Ausblenden' : '\u25B8 Was wird gesendet?';
        }
      });
    });

    sidebar.querySelectorAll('.ts-block-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const hostname = e.target.dataset.hostname;
        if (e.target.checked) blockDomain(hostname);
        else unblockDomain(hostname);
      });
    });
  }

  // ============================================================
  // Message handling
  // ============================================================
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
      return;
    }
    if (message.type === 'TRACKER_UPDATE') {
      currentData = message.data;
      toggleBtn.innerHTML = `<span class="ts-toggle-count">${currentData.totalTrackers}</span>`;
      if (sidebarVisible) requestRender();
    }
  });

  // Initial data fetch
  chrome.runtime.sendMessage({ type: 'GET_TRACKER_DATA' }, (response) => {
    if (response) {
      currentData = response;
      toggleBtn.innerHTML = `<span class="ts-toggle-count">${response.totalTrackers}</span>`;
      if (sidebarVisible) renderSidebar(response);
    }
  });
})();
