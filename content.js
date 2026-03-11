/**
 * Tracker Viewer - Content Script
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
  let renderPending = false;

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
  // Summary text generation
  // ============================================================
  function generateSummaryText(data) {
    const date = new Date().toLocaleString('de-DE');
    const lines = [
      '=== TRACKER VIEWER ===',
      `Website: ${location.href}`,
      `Datum: ${date}`,
      `Aktive Tracker: ${data.totalTrackers}`,
      `Anfragen: ${data.totalRequests}`,
      '', '--- Tracker-Liste ---', ''
    ];

    for (const tracker of data.trackers) {
      lines.push(`${tracker.name}`);
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

      lines.push('');
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
          <span>Tracker Viewer &mdash; Zusammenfassung</span>
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
    let html = `
      <div class="ts-header">
        <div class="ts-header-top">
          <div class="ts-title">
            Tracker Viewer
          </div>
          <button class="ts-close-btn" id="ts-close">&#10005;</button>
        </div>
        <div class="ts-stats">
          <span class="ts-stat"><span class="ts-stat-number">${data.totalTrackers}</span> Tracker</span>
          <span class="ts-stat"><span class="ts-stat-number">${data.totalRequests}</span> Anfragen</span>
        </div>
      </div>

      <div class="ts-action-bar">
        <button class="ts-action-btn summary" id="ts-show-summary">Zusammenfassung</button>
      </div>
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

    if (data.trackers.length === 0) {
      html += `
        <div class="ts-empty">
          <div class="ts-empty-icon">&#9989;</div>
          <div class="ts-empty-text">Keine Tracker auf dieser Seite</div>
        </div>
      `;
    } else {
      for (const tracker of data.trackers) {
        html += renderTrackerItem(tracker);
      }
    }

    html += '</div>';
    sidebar.innerHTML = html;
    attachEventListeners(data);
  }

  function renderTrackerItem(tracker) {
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
      <div class="ts-tracker-item">
        <div class="ts-tracker-header">
          <div class="ts-tracker-name-area">
            <div class="ts-tracker-name">${esc(tracker.name)}</div>
            <div class="ts-tracker-company">${esc(tracker.company)} &mdash; ${esc(tracker.hostname)}</div>
          </div>
          <div class="ts-tracker-right">
            <span class="ts-tracker-badge" style="background:${color}">${esc(tracker.category)}</span>
            <span class="ts-tracker-requests">${tracker.requestCount}x</span>
          </div>
        </div>
        ${dataHtml ? `
          <div class="ts-sent-data">
            <button class="ts-data-toggle">&#9654; Was wird gesendet?</button>
            <div class="ts-data-details">${dataHtml}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ============================================================
  // Event listeners (attached after render)
  // ============================================================
  function attachEventListeners(data) {
    sidebar.querySelector('#ts-close')?.addEventListener('click', () => toggleSidebar());
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
