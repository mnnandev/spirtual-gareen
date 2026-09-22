import { Component } from '@theme/component';
import { trapFocus, removeTrapFocus } from '@theme/focus';
import { onAnimationEnd, removeWillChangeOnAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages the main menu drawer.
 *
 * @typedef {object} Refs
 * @property {HTMLDetailsElement} details - The details element.
 * @property {HTMLDivElement} menuDrawer - The slideable drawer panel containing the menu.
 *
 * @extends {Component<Refs>}
 */
class HeaderDrawer extends Component {
  requiredRefs = ['details', 'menuDrawer'];

  /** @type {number} */
  #lastToggleAt = 0;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keyup', this.#onKeyUp);
    this.#setupAnimatedElementListeners();
    this.#bindSummaryToggle();
    this.addEventListener('click', this.#onDrawerSummaryClick, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.#onKeyUp);
    this.#unbindSummaryToggle();
    this.removeEventListener('click', this.#onDrawerSummaryClick, true);
  }

  /**
   * Bind a single authoritative click handler on the root hamburger summary.
   * Avoids racing the native <details> toggle and duplicate declarative handlers.
   */
  #bindSummaryToggle() {
    const summary = this.#rootSummary();
    if (!summary || summary.dataset.sgDrawerToggleBound === 'true') return;

    summary.dataset.sgDrawerToggleBound = 'true';
    summary.addEventListener('click', this.#onSummaryClick, true);
  }

  #unbindSummaryToggle() {
    const summary = this.#rootSummary();
    if (!summary) return;
    summary.removeEventListener('click', this.#onSummaryClick, true);
    delete summary.dataset.sgDrawerToggleBound;
  }

  /** @returns {HTMLElement | null} */
  #rootSummary() {
    const details = this.refs?.details;
    if (!(details instanceof HTMLDetailsElement)) return null;
    return details.querySelector(':scope > summary');
  }

  /**
   * @param {MouseEvent} event
   */
  #onSummaryClick = (event) => {
    // Ignore nested summaries inside the drawer panel
    if (event.currentTarget !== this.#rootSummary()) return;
    this.toggle(event);
  };

  /**
   * Inline drawer accordions (e.g. Categorie) use native <details> without on:click handlers.
   * On touch devices the first tap can be consumed by focus/hover; handle toggle in capture phase.
   *
   * @param {MouseEvent} event
   */
  #onDrawerSummaryClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const summary = event.target.closest('.menu-drawer summary');
    if (!(summary instanceof HTMLElement)) return;
    if (summary === this.#rootSummary()) return;
    // Declarative handlers (slide submenus) call open() — see open()
    if (summary.hasAttribute('on:click')) return;

    const details = summary.closest('details');
    if (!(details instanceof HTMLDetailsElement) || !this.contains(details)) return;
    if (details.querySelector(':scope > .menu-drawer__submenu')) return;

    event.preventDefault();
    event.stopPropagation();

    const willOpen = !details.open;
    details.open = willOpen;
    summary.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  };

  /**
   * Close the main menu drawer when the Escape key is pressed
   * @param {KeyboardEvent} event
   */
  #onKeyUp = (event) => {
    if (event.key !== 'Escape') return;

    this.#close(this.#getDetailsElement(event));
  };

  /**
   * @returns {boolean} Whether the main menu drawer is open
   */
  get isOpen() {
    return this.refs.details.hasAttribute('open') && this.refs.details.classList.contains('menu-open');
  }

  /**
   * Get the closest details element to the event target
   * @param {Event | undefined} event
   * @returns {HTMLDetailsElement}
   */
  #getDetailsElement(event) {
    if (!(event?.target instanceof Element)) return this.refs.details;

    return event.target.closest('details') ?? this.refs.details;
  }

  /**
   * Toggle the main menu drawer
   * @param {Event} [event]
   */
  toggle(event) {
    // Guard against double-invocation on the same tap (capture + bubble / dual listeners),
    // which previously made the first tap look like a no-op (open then immediate close).
    const now = performance.now();
    if (now - this.#lastToggleAt < 80) {
      if (event instanceof Event) event.preventDefault();
      return;
    }
    this.#lastToggleAt = now;

    if (event instanceof Event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isOpen) {
      this.close();
      return;
    }

    this.open();
  }

  /**
   * Open the closest drawer or the main menu drawer
   * @param {string} [target]
   * @param {Event} [event]
   */
  open(target, event) {
    const details = this.#getDetailsElement(event);
    const summary = details.querySelector('summary');

    if (!summary) return;

    const isRootDrawer = details === this.refs.details;

    if (event instanceof Event && !isRootDrawer) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Submenu panels are shown via `.menu-open > .menu-drawer__submenu` — apply on the active details.
    details.setAttribute('open', '');
    details.classList.add('menu-open');

    summary.setAttribute('aria-expanded', 'true');

    this.preventInitialAccordionAnimations(details);

    if (target) {
      this.refs.menuDrawer.classList.add('menu-drawer--has-submenu-opened');
    }

    // Wait for the drawer animation to complete before trapping focus
    const drawer = details.querySelector('.menu-drawer, .menu-drawer__submenu');
    onAnimationEnd(drawer || details, () => trapFocus(details), { subtree: false });
  }

  /**
   * Go back or close the main menu drawer
   * @param {Event} [event]
   */
  back(event) {
    this.#close(this.#getDetailsElement(event));
  }

  /**
   * Close the main menu drawer
   */
  close() {
    this.#close(this.refs.details);
  }

  /**
   * Close the closest menu or submenu that is open
   *
   * @param {HTMLDetailsElement} details
   */
  #close(details) {
    const summary = details.querySelector('summary');

    if (!summary) return;

    summary.setAttribute('aria-expanded', 'false');
    details.classList.remove('menu-open');
    this.refs.menuDrawer.classList.remove('menu-drawer--has-submenu-opened');

    // Wait for the .menu-drawer element's transition, not the entire details subtree
    // This avoids waiting for child accordion/resource-card animations which can cause issues on Firefox
    const drawer = details.querySelector('.menu-drawer, .menu-drawer__submenu');

    onAnimationEnd(
      drawer || details,
      () => {
        reset(details);
        if (details === this.refs.details) {
          removeTrapFocus();
          const openDetails = this.querySelectorAll('details[open]:not(accordion-custom > details)');
          openDetails.forEach(reset);
        } else {
          trapFocus(this.refs.details);
        }
      },
      { subtree: false }
    );
  }

  /**
   * Attach animationend event listeners to all animated elements to remove will-change after animation
   * to remove the stacking context and allow submenus to be positioned correctly
   */
  #setupAnimatedElementListeners() {
    const allAnimated = this.querySelectorAll('.menu-drawer__animated-element');
    allAnimated.forEach((element) => {
      element.addEventListener('animationend', removeWillChangeOnAnimationEnd);
    });
  }

  /**
   * Temporarily disables accordion animations to prevent unwanted transitions when the drawer opens.
   * Adds a no-animation class to accordion content elements, then removes it after 100ms to
   * re-enable animations for user interactions.
   * @param {HTMLDetailsElement} details - The details element containing the accordions
   */
  preventInitialAccordionAnimations(details) {
    const content = details.querySelectorAll('accordion-custom .details-content');

    content.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.classList.add('details-content--no-animation');
      }
    });
    setTimeout(() => {
      content.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.classList.remove('details-content--no-animation');
        }
      });
    }, 100);
  }
}

if (!customElements.get('header-drawer')) {
  customElements.define('header-drawer', HeaderDrawer);
}

/**
 * Reset an open details element to its original state
 *
 * @param {HTMLDetailsElement} element
 */
function reset(element) {
  element.classList.remove('menu-open');
  element.removeAttribute('open');
  element.querySelector('summary')?.setAttribute('aria-expanded', 'false');
}
