(function () {
  'use strict';

  function getCalendlyUrl() {
    var root = document.querySelector('[data-sg-consulenza-calendly-url]');
    return root ? root.getAttribute('data-sg-consulenza-calendly-url') : '';
  }

  function ensureCalendlyScript(callback) {
    if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
      callback();
      return;
    }

    var existing = document.querySelector('script[data-sg-calendly-loader]');
    if (existing) {
      existing.addEventListener('load', callback, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.setAttribute('data-sg-calendly-loader', 'true');
    script.addEventListener('load', callback, { once: true });
    document.body.appendChild(script);
  }

  function getScrollOffset() {
    var header = document.querySelector('#header-group') || document.querySelector('header-component');
    return header ? header.offsetHeight + 12 : 12;
  }

  function openBookingPopup() {
    var url = getCalendlyUrl();
    if (!url) {
      scrollToBooking();
      return;
    }

    ensureCalendlyScript(function () {
      window.Calendly.initPopupWidget({ url: url });
    });
  }

  function scrollToBooking() {
    var target = document.getElementById('consulenza-booking');
    if (!target) return;

    var top = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function handleTrigger(trigger) {
    if (!trigger || trigger.disabled) return;

    var action = trigger.getAttribute('data-sg-consulenza-booking');
    if (action === 'popup') {
      openBookingPopup();
      return;
    }

    scrollToBooking();
  }

  window.openBookingPopup = openBookingPopup;
  window.SgConsulenzaBooking = {
    openPopup: openBookingPopup,
    scrollToBooking: scrollToBooking
  };

  document.addEventListener(
    'click',
    function (event) {
      var trigger = event.target.closest('[data-sg-consulenza-booking]');
      if (!trigger) return;

      event.preventDefault();
      handleTrigger(trigger);
    },
    true
  );
})();
