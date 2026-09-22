/**
 * Collection sidebar — accordion parents; subcategory links use full page navigation.
 */
class SgCollectionSidebar extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.#onClick);

    const toggle = this.querySelector('[data-sg-sidebar-toggle]');
    const nav = this.querySelector('.sg-collection-sidebar__nav');
    toggle?.addEventListener('click', () => {
      const isOpen = nav?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#onClick);
  }

  #onClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const parentToggle = event.target.closest('[data-sg-sidebar-parent-toggle]');
    if (!parentToggle) return;

    event.preventDefault();
    this.#toggleParentGroup(parentToggle);
  };

  /**
   * @param {Element} parentToggle
   */
  #toggleParentGroup(parentToggle) {
    const group = parentToggle.closest('.sg-collection-sidebar__group');
    if (!group) return;

    const wasExpanded = group.classList.contains('is-expanded');

    this.querySelectorAll('.sg-collection-sidebar__group.is-expanded').forEach((openGroup) => {
      openGroup.classList.remove('is-expanded');
      const btn = openGroup.querySelector('[data-sg-sidebar-parent-toggle]');
      btn?.setAttribute('aria-expanded', 'false');
    });

    if (!wasExpanded) {
      group.classList.add('is-expanded');
      parentToggle.setAttribute('aria-expanded', 'true');
    }
  }
}

if (!customElements.get('sg-collection-sidebar')) {
  customElements.define('sg-collection-sidebar', SgCollectionSidebar);
}
