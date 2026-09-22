/**
 * I più richiesti — collection filter tabs (show/hide panels).
 * Same interaction pattern as sg-home-products-tabs (no AJAX).
 */
function initSgScrollRowTabs(root = document) {
  const sections = root.querySelectorAll('[data-sg-scroll-row-tabs]');

  sections.forEach((section) => {
    if (section.dataset.sgScrollTabsInit === 'true') return;
    section.dataset.sgScrollTabsInit = 'true';

    const tabList = section.querySelector('[data-sg-scroll-tabs]');
    const tabs = section.querySelectorAll('[data-sg-scroll-tab]');
    const panels = section.querySelectorAll('[data-sg-scroll-panel]');
    const viewAll = section.querySelector('[data-sg-scroll-view-all]');
    const indicator = section.querySelector('[data-sg-scroll-indicator]');

    if (!tabs.length || !panels.length) return;

    const updateIndicator = (activeTab) => {
      if (!(indicator instanceof HTMLElement) || !(activeTab instanceof HTMLElement)) return;
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    };

    const activate = (key) => {
      if (!key) return;
      let activeTab = null;

      tabs.forEach((tab) => {
        const on = tab.getAttribute('data-sg-scroll-tab') === key;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) activeTab = tab;
      });

      panels.forEach((panel) => {
        const on = panel.getAttribute('data-sg-scroll-panel') === key;
        panel.classList.toggle('is-active', on);
        if (on) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      });

      if (viewAll instanceof HTMLElement && activeTab) {
        const href = activeTab.getAttribute('data-view-all');
        if (href) viewAll.setAttribute('href', href);
      }

      updateIndicator(activeTab);

      const activePanel = section.querySelector(`[data-sg-scroll-panel="${key}"]`);
      const viewport = activePanel?.querySelector('.sg-scroll-row__viewport');
      if (viewport) viewport.scrollLeft = 0;
    };

    if (tabList) {
      tabList.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-sg-scroll-tab]');
        if (!tab || !section.contains(tab)) return;
        event.preventDefault();
        activate(tab.getAttribute('data-sg-scroll-tab'));
      });
    }

    const initial = section.querySelector('[data-sg-scroll-tab].is-active') || tabs[0];
    activate(initial?.getAttribute('data-sg-scroll-tab') || 'novita');

    window.addEventListener('resize', () => {
      const current = section.querySelector('[data-sg-scroll-tab].is-active');
      updateIndicator(current);
    });
  });
}

function bootSgScrollRowTabs() {
  initSgScrollRowTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSgScrollRowTabs, { once: true });
} else {
  bootSgScrollRowTabs();
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof Element) initSgScrollRowTabs(event.target);
});
