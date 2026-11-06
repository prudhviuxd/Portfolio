/* =========================================================
   Analytics, privacy-friendly and off by default.

   To switch it on, create a site at plausible.io (no cookies,
   no consent banner needed) and put your domain below, e.g.
   var PLAUSIBLE_DOMAIN = 'prudhviraj.design';

   With the file-downloads build, CV downloads are counted
   automatically; enquiries sent through the form are counted
   as the "Enquiry" goal (add it under Goals in Plausible).
   ========================================================= */
(function () {
  'use strict';
  var PLAUSIBLE_DOMAIN = '';
  if (!PLAUSIBLE_DOMAIN || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;

  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  var s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-domain', PLAUSIBLE_DOMAIN);
  s.src = 'https://plausible.io/js/script.file-downloads.outbound-links.js';
  document.head.appendChild(s);

  // Count successful enquiries (studio.js marks the note when the server says ok).
  var note = document.querySelector('#enquiry .form-note');
  if (note && 'MutationObserver' in window) {
    new MutationObserver(function () {
      if (note.classList.contains('is-ok')) window.plausible('Enquiry');
    }).observe(note, { attributes: true, attributeFilter: ['class'] });
  }
})();
