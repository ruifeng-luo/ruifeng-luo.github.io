(function () {
  'use strict';
  var root = document.documentElement;
  var palette = window.matchMedia('(prefers-color-scheme: dark)');
  var toggle = document.getElementById('theme-toggle');
  function isDark() {
    return root.dataset.theme ? root.dataset.theme === 'dark' : palette.matches;
  }
  function updateThemeButton() {
    var dark = isDark();
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.textContent = dark ? '☀ Paper mode' : '☾ Blueprint mode';
    toggle.setAttribute('aria-label', dark ? 'Switch to light paper mode' : 'Switch to dark blueprint mode');
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.content = dark ? '#0F1B2D' : '#FBFAF6';
    });
  }
  toggle.addEventListener('click', function () {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('rl-theme', root.dataset.theme); } catch (_) {}
    updateThemeButton();
  });
  palette.addEventListener('change', updateThemeButton);
  updateThemeButton();
  document.getElementById('sheet-tools').hidden = false;

  var layerButtons = document.querySelectorAll('.layer-toggle');
  function setLayers(button, visible) {
    button.setAttribute('aria-pressed', String(visible));
    button.dataset.layers.split(' ').forEach(function (layer) {
      document.querySelectorAll('.fig0 [data-layer="' + layer + '"]').forEach(function (group) {
        group.classList.toggle('layer-hidden', !visible);
        group.setAttribute('aria-hidden', String(!visible));
      });
    });
  }
  layerButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setLayers(button, button.getAttribute('aria-pressed') !== 'true');
    });
  });
  document.getElementById('layers-reset').addEventListener('click', function () {
    layerButtons.forEach(function (button) { setLayers(button, true); });
  });
  document.getElementById('layer-tools').hidden = false;

  // One request per visible page load; local previews never change the live totals.
  var production = location.hostname === 'ruifengluo.com' || location.hostname === 'www.ruifengluo.com';
  var requested = false;
  function loadStats() {
    if (requested || document.visibilityState !== 'visible' || !production) return;
    requested = true;
    var noTrack = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 7000);
    fetch('/api/site-stats', {
      method: noTrack ? 'GET' : 'POST',
      headers: noTrack ? {} : { 'X-Site-Counter': '1' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error('Counter unavailable');
      return response.json();
    }).then(function (stats) {
      if (!Number.isSafeInteger(stats.views) || stats.views < 0 || !Number.isSafeInteger(stats.countries) || stats.countries < 0) {
        throw new Error('Invalid counter data');
      }
      document.getElementById('site-views').textContent = stats.views.toLocaleString('en-US');
      document.getElementById('site-countries').textContent = stats.countries.toLocaleString('en-US');
    }).catch(function () {
      document.querySelector('.site-log-line').title = 'Live statistics are temporarily unavailable.';
    }).finally(function () { clearTimeout(timeout); });
  }
  document.addEventListener('visibilitychange', loadStats);
  loadStats();
}());
