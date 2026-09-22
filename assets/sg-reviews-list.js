(function () {
  const instances = new WeakMap();

  function getSortValues(item) {
    return {
      rating: Number(item.getAttribute('data-rating')) || 0,
      date: Date.parse(item.getAttribute('data-date') || '') || 0,
      verified: item.getAttribute('data-verified') === '1' ? 1 : 0,
      media: item.getAttribute('data-has-media') === '1' ? 1 : 0,
    };
  }

  function sortItems(items, sortKey) {
    return [...items].sort((a, b) => {
      const av = getSortValues(a);
      const bv = getSortValues(b);
      switch (sortKey) {
        case 'rating-asc':
          return av.rating - bv.rating || bv.date - av.date;
        case 'media':
          return bv.media - av.media || bv.rating - av.rating || bv.date - av.date;
        case 'recent':
          return bv.date - av.date;
        case 'verified':
          return bv.verified - av.verified || bv.rating - av.rating || bv.date - av.date;
        default:
          return bv.rating - av.rating || bv.date - av.date;
      }
    });
  }

  function voteStorageKey(section, reviewId) {
    const sectionId = section.getAttribute('data-section-id') || 'reviews';
    return `sg-review-vote-${sectionId}-${reviewId}`;
  }

  function readVoteStorage(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function writeVoteStorage(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* private mode / blocked storage */
    }
  }

  function restoreVotes(section) {
    section.querySelectorAll('[data-sg-review-item]').forEach((item) => {
      const reviewId = item.getAttribute('data-review-id');
      const yesBtn = item.querySelector('[data-sg-vote="yes"]');
      const noBtn = item.querySelector('[data-sg-vote="no"]');
      if (!reviewId || !yesBtn || !noBtn) return;

      const yesCount = yesBtn.querySelector('[data-sg-vote-number]');
      const noCount = noBtn.querySelector('[data-sg-vote-number]');
      const stored = readVoteStorage(voteStorageKey(section, reviewId));
      if (!stored) return;

      if (yesCount && stored.yes != null) yesCount.textContent = String(stored.yes);
      if (noCount && stored.no != null) noCount.textContent = String(stored.no);
      if (stored.userVote === 'yes' || stored.userVote === 'no') {
        yesBtn.disabled = true;
        noBtn.disabled = true;
        yesBtn.classList.toggle('is-voted', stored.userVote === 'yes');
        noBtn.classList.toggle('is-voted', stored.userVote === 'no');
      }
    });
  }

  function castVote(section, btn) {
    if (!btn || btn.disabled) return;

    const item = btn.closest('[data-sg-review-item]');
    if (!item) return;

    const reviewId = item.getAttribute('data-review-id');
    const voteType = btn.getAttribute('data-sg-vote');
    if (!reviewId || (voteType !== 'yes' && voteType !== 'no')) return;

    const yesBtn = item.querySelector('[data-sg-vote="yes"]');
    const noBtn = item.querySelector('[data-sg-vote="no"]');
    if (!yesBtn || !noBtn) return;

    const countEl = btn.querySelector('[data-sg-vote-number]');
    if (!countEl) return;

    const nextCount = (parseInt(countEl.textContent, 10) || 0) + 1;
    countEl.textContent = String(nextCount);

    yesBtn.disabled = true;
    noBtn.disabled = true;
    yesBtn.classList.toggle('is-voted', voteType === 'yes');
    noBtn.classList.toggle('is-voted', voteType === 'no');
    yesBtn.setAttribute('aria-pressed', voteType === 'yes' ? 'true' : 'false');
    noBtn.setAttribute('aria-pressed', voteType === 'no' ? 'true' : 'false');

    const yesCount = yesBtn.querySelector('[data-sg-vote-number]');
    const noCount = noBtn.querySelector('[data-sg-vote-number]');

    writeVoteStorage(voteStorageKey(section, reviewId), {
      yes: parseInt(yesCount?.textContent || '0', 10) || 0,
      no: parseInt(noCount?.textContent || '0', 10) || 0,
      userVote: voteType,
    });
  }

  function bindVotes(section, signal) {
    restoreVotes(section);

    section.querySelectorAll('[data-sg-vote]').forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          castVote(section, btn);
        },
        { signal }
      );
    });
  }

  function destroySection(section) {
    const state = instances.get(section);
    if (!state) return;
    state.abortController?.abort();
    window.removeEventListener('resize', state.resizeHandler);
    document.removeEventListener('click', state.onDocClick);
    instances.delete(section);
  }

  function initSection(section) {
    if (!(section instanceof HTMLElement)) return;
    destroySection(section);

    const abortController = new AbortController();
    const { signal } = abortController;

    bindVotes(section, signal);

    const topicsRow = section.querySelector('[data-sg-topics-row]');
    const tagsWrap = section.querySelector('[data-sg-review-tags]');
    const toggle = section.querySelector('[data-sg-tags-toggle]');
    const searchInput = section.querySelector('.sg-reviews-list__search');
    const emptyState = section.querySelector('[data-sg-reviews-empty]');
    const itemsContainer = section.querySelector('[data-sg-review-items]');
    const sortRoot = section.querySelector('[data-sg-sort]');
    const sortTrigger = section.querySelector('[data-sg-sort-trigger]');
    const sortPanel = section.querySelector('[data-sg-sort-panel]');
    const sortValue = section.querySelector('[data-sg-sort-value]');
    const sortOptions = [...section.querySelectorAll('[data-sort]')];

    let reviewItems = [...section.querySelectorAll('[data-sg-review-item]')];
    let userExpanded = false;
    let activeTopic = '';
    let activeSort = 'rating-desc';
    let sortOpen = false;
    let currentPage = 1;

    const paginationNav = section.querySelector('[data-sg-pagination]');
    const pageCountSetting = Number(paginationNav?.getAttribute('data-page-count')) || 5;
    const prevPageBtn = section.querySelector('[data-sg-page-prev]');
    const nextPageBtn = section.querySelector('[data-sg-page-next]');
    const pageButtons = [...section.querySelectorAll('[data-sg-page]')];

    const getMatchedItems = () =>
      reviewItems.filter((item) => item.getAttribute('data-sg-filter-match') !== 'false');

    const getTotalPages = () => {
      const count = getMatchedItems().length;
      if (count === 0) return 1;
      const perPage = Math.max(1, Math.ceil(count / pageCountSetting));
      return Math.ceil(count / perPage);
    };

    const applyPagination = () => {
      const matched = getMatchedItems();
      const totalPages = getTotalPages();
      const perPage = Math.max(1, Math.ceil(matched.length / totalPages));

      currentPage = Math.max(1, Math.min(currentPage, totalPages));

      matched.forEach((item, index) => {
        const page = Math.floor(index / perPage) + 1;
        item.hidden = page !== currentPage;
      });

      pageButtons.forEach((btn) => {
        const page = Number(btn.getAttribute('data-sg-page') || 0);
        const inRange = page > 0 && page <= totalPages;
        const isActive = page === currentPage;
        btn.hidden = !inRange;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-current', isActive ? 'page' : 'false');
        btn.disabled = !inRange;
      });

      if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
      if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
      if (paginationNav) paginationNav.hidden = matched.length === 0;
    };

    const applySort = () => {
      if (!itemsContainer) return;
      reviewItems = sortItems(reviewItems, activeSort);
      reviewItems.forEach((item) => itemsContainer.appendChild(item));
    };

    const applyFilters = () => {
      const query = (searchInput?.value || '').trim().toLowerCase();
      const topic = activeTopic.toLowerCase();
      let visibleCount = 0;

      reviewItems.forEach((item) => {
        const text =
          item.getAttribute('data-review-text')?.toLowerCase() ||
          item.querySelector('.sg-reviews-list__text')?.textContent?.toLowerCase() ||
          '';
        const show = (!query || text.includes(query)) && (!topic || text.includes(topic));
        item.setAttribute('data-sg-filter-match', show ? 'true' : 'false');
        if (!show) item.hidden = true;
        if (show) visibleCount += 1;
      });

      if (emptyState) emptyState.hidden = visibleCount > 0;
      currentPage = 1;
      applyPagination();
    };

    const getVisibleCount = () => (window.innerWidth < 750 ? 5 : 8);

    const syncToggle = () => {
      if (!topicsRow || !toggle || !tagsWrap) return;
      const tags = [...tagsWrap.querySelectorAll('[data-sg-review-tag]')];
      const visibleCollapsed = getVisibleCount();
      topicsRow.classList.toggle('is-expanded', userExpanded);

      if (tags.length <= visibleCollapsed) {
        toggle.hidden = true;
        tags.forEach((tag) => {
          tag.hidden = false;
        });
        return;
      }

      toggle.hidden = false;
      tags.forEach((tag, index) => {
        tag.hidden = !userExpanded && index >= visibleCollapsed;
      });
      toggle.textContent = userExpanded
        ? toggle.dataset.showLess || 'Show less'
        : toggle.dataset.showMore || 'Show more';
    };

    if (toggle) {
      toggle.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          userExpanded = !userExpanded;
          syncToggle();
        },
        { signal }
      );
    }

    tagsWrap?.querySelectorAll('[data-sg-review-tag]').forEach((tag) => {
      if (!(tag instanceof HTMLButtonElement)) return;
      tag.addEventListener('click', (event) => {
        event.preventDefault();
        const label = tag.textContent?.trim() || '';
        if (activeTopic === label) {
          activeTopic = '';
          tag.classList.remove('is-active');
          tag.setAttribute('aria-pressed', 'false');
        } else {
          tagsWrap.querySelectorAll('[data-sg-review-tag]').forEach((t) => {
            t.classList.remove('is-active');
            t.setAttribute('aria-pressed', 'false');
          });
          activeTopic = label;
          tag.classList.add('is-active');
          tag.setAttribute('aria-pressed', 'true');
        }
        applyFilters();
      }, { signal });
    });

    searchInput?.addEventListener('input', applyFilters, { signal });

    if (sortTrigger) {
      sortTrigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        sortOpen = !sortOpen;
        sortTrigger.setAttribute('aria-expanded', sortOpen ? 'true' : 'false');
        sortTrigger.classList.toggle('is-open', sortOpen);
        if (sortPanel) sortPanel.hidden = !sortOpen;
      }, { signal });
    }

    sortOptions.forEach((option) => {
      option.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        activeSort = option.getAttribute('data-sort') || 'rating-desc';
        const label = option.querySelector('span')?.textContent?.trim() || '';
        sortOptions.forEach((btn) => {
          const selected = btn === option;
          btn.classList.toggle('is-selected', selected);
          btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        if (sortValue) sortValue.textContent = label;
        applySort();
        applyFilters();
        sortOpen = false;
        sortTrigger?.classList.remove('is-open');
        sortTrigger?.setAttribute('aria-expanded', 'false');
        if (sortPanel) sortPanel.hidden = true;
      }, { signal });
    });

    const onDocClick = (event) => {
      if (!sortOpen || !sortRoot || !(event.target instanceof Node)) return;
      if (!sortRoot.contains(event.target)) {
        sortOpen = false;
        sortTrigger?.classList.remove('is-open');
        sortTrigger?.setAttribute('aria-expanded', 'false');
        if (sortPanel) sortPanel.hidden = true;
      }
    };

    document.addEventListener('click', onDocClick);
    const resizeHandler = () => syncToggle();
    window.addEventListener('resize', resizeHandler, { passive: true });

    pageButtons.forEach((btn) => {
      btn.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          currentPage = Number(btn.getAttribute('data-sg-page')) || 1;
          applyPagination();
        },
        { signal }
      );
    });

    prevPageBtn?.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        currentPage = Math.max(1, currentPage - 1);
        applyPagination();
      },
      { signal }
    );

    nextPageBtn?.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        currentPage = Math.min(getTotalPages(), currentPage + 1);
        applyPagination();
      },
      { signal }
    );

    instances.set(section, { resizeHandler, onDocClick, abortController });

    applySort();
    syncToggle();
    applyFilters();
  }

  function initAll(root) {
    root.querySelectorAll('[data-sg-reviews-list]').forEach((section) => {
      initSection(section);
    });
  }

  function boot() {
    initAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target instanceof HTMLElement) initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    if (event.target instanceof HTMLElement) {
      event.target.querySelectorAll('[data-sg-reviews-list]').forEach((section) => {
        destroySection(section);
      });
    }
  });
})();
