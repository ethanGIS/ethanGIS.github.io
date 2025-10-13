// ============================= Footer year =============================
(() => {
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();

/* ====================== Mobile menu toggle ====================== */
(() => {
  const btn  = document.querySelector('.menu-btn');
  const list = document.querySelector('header .nav nav ul'); // scoped to header row
  if (!btn || !list) return;

  // ARIA hookup
  const menuId = list.id || 'site-menu';
  if (!list.id) list.id = menuId;
  btn.setAttribute('aria-controls', menuId);
  btn.setAttribute('aria-expanded', 'false');
  list.setAttribute('aria-hidden', 'true'); // reflect initial hidden state

  const openMenu = () => {
    list.classList.add('open');
    document.body.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    list.setAttribute('aria-hidden', 'false');
  };
  const closeMenu = () => {
    list.classList.remove('open');
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    list.setAttribute('aria-hidden', 'true');
  };
  const toggleMenu = () => (list.classList.contains('open') ? closeMenu() : openMenu());

  // Toggle
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close when a link is chosen
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) closeMenu();
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!list.classList.contains('open')) return;
    if (!list.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && list.classList.contains('open')) closeMenu();
  });

  // Auto-close if we resize back to desktop
  const BREAKPOINT = 900;
  let lastIsMobile = window.innerWidth <= BREAKPOINT;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= BREAKPOINT;
    if (!isMobile && lastIsMobile) closeMenu();
    lastIsMobile = isMobile;
  });
})();

/* ================== Highlight current page in the nav ================== */
(() => {
  // normalize current file (handles /, /path/, ?q=, #hash)
  const clean = (url) => url.replace(/[?#].*$/, '').toLowerCase();
  let current = clean(location.pathname);
  if (current.endsWith('/')) current += 'index.html';
  const file = current.split('/').pop();

  document.querySelectorAll('header nav a[href]').forEach((a) => {
    const href = clean(a.getAttribute('href') || '');
    const hfile = href.split('/').pop();
    if (hfile && hfile === file) a.classList.add('active');
  });
})();

/* ===== Header behavior: transparent over hero, turns solid when past hero =====
   Uses a sentinel pinned to the *bottom* of the .hero so the flip happens exactly
   when you scroll past the video. Works across browsers and with sticky headers. */
(() => {
  const header = document.querySelector('header');
  if (!header) return;

  // Non-landing pages stay solid
  const isLanding = !document.body.classList.contains('page');
  if (!isLanding) {
    header.classList.add('scrolled');
    return;
  }

  const hero = document.querySelector('.hero');
  if (!hero) {
    header.classList.add('scrolled');
    return;
  }

  // Create a sentinel at the exact bottom of the hero (if not present)
  let sentinel = document.getElementById('header-sentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'header-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    Object.assign(sentinel.style, {
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      pointerEvents: 'none',
      opacity: '0'
    });
    hero.appendChild(sentinel);
  }

  const getHeaderH = () => {
    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10);
    return Number.isFinite(v) ? v : 72;
  };
  const applyScrolled = (scrolled) => header.classList.toggle('scrolled', scrolled);

  const attachIO = () => {
    const headerH = getHeaderH();

    if ('IntersectionObserver' in window) {
      // Flip when the bottom sentinel scrolls above the header line
      const obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => applyScrolled(!e.isIntersecting)),
        { root: null, rootMargin: `-${headerH}px 0px 0px 0px`, threshold: 0 }
      );
      obs.observe(sentinel);
    } else {
      // Fallback: compare hero bottom to header height
      const onScroll = () => {
        const bottom = hero.getBoundingClientRect().bottom;
        applyScrolled(bottom <= headerH);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
  };

  // Run and also adjust on resize (header height can change on responsive breakpoints)
  attachIO();
  window.addEventListener('resize', () => {
    // Re-run quickly on resize without duplicating observers
    applyScrolled(false);
    attachIO();
  });
})();

/* =================== Background video autoplay + fade-in =================== */
(() => {
  const vid = document.querySelector('.video-bg video');
  if (!vid) return;

  // Keep autoplay happy across mobile browsers
  vid.muted = true;
  vid.autoplay = true;
  vid.loop = true;
  vid.preload = 'auto';
  vid.setAttribute('playsinline', '');
  vid.setAttribute('webkit-playsinline', '');

  const markLoaded = () => vid.classList.add('loaded');
  const tryPlay = () => {
    const p = vid.play && vid.play();
    if (p && p.catch) p.catch(() => {/* ignore; user gesture will retry */});
  };

  // If HTML added onloadeddata inline, great. These back it up.
  vid.addEventListener('loadeddata', () => { markLoaded(); tryPlay(); }, { once: true });
  vid.addEventListener('canplay',      () => { markLoaded(); tryPlay(); }, { once: true });
  vid.addEventListener('canplaythrough', tryPlay);

  // Gentle nudges for stricter autoplay policies
  ['pointerdown','touchstart','keydown','scroll'].forEach(evt =>
    window.addEventListener(evt, tryPlay, { once:true, passive:true })
  );
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
  window.addEventListener('load', tryPlay);

  // Safety: if no event fires (some previews), lightly show the first frame
  setTimeout(() => {
    if (!vid.classList.contains('loaded')) {
      try { vid.currentTime = 0; } catch {}
      vid.style.opacity = (vid.style.opacity || '') ? vid.style.opacity : '0.001';
    }
  }, 800);
})();

/* ========================= Scroll Reveal (pop-in) ========================= */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  );

  const register = (el, defaultType = 'fade-up') => {
    if (!el) return;
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    if (!el.dataset.animate) el.dataset.animate = defaultType;
    obs.observe(el);
  };

  document.querySelectorAll('[data-animate], .reveal').forEach((el) => register(el));

  document.querySelectorAll('[data-stagger]').forEach((parent) => {
    const step = parseFloat(parent.dataset.stagger) || 0.08;
    const children = parent.querySelectorAll(
      parent.dataset.staggerChildren ||
      '[data-animate], .reveal-child, .tile, .feature, .card, li, img, .logos img'
    );
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * step}s`;
      register(child, 'fade-up');
    });
  });

  const autoSelectors = [
    '.hero .pill',
    '.hero h1',
    '.hero p.lead',
    '.hero .badges',
    '.section-title',
    '.section-sub',
    '.card',
    '.feature',
    '.cta-band',
    '.tiles .tile',
    '.logos img',
  ];
  autoSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!el.classList.contains('reveal') && !el.dataset.animate) register(el, 'fade-up');
    });
  });
})();
