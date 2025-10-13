// Footer year
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

/* ===== Header behavior: transparent over hero, turns solid at waypoint ===== */
(() => {
  const header = document.querySelector('header');
  if (!header) return;

  if (document.body.classList.contains('page')) {
    header.classList.add('scrolled'); // subpages stay solid
    return;
  }

  const trigger = document.querySelector('.header-fade-trigger') || document.querySelector('.hero');
  const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  const EXTRA_EARLY = 110;

  const io = new IntersectionObserver(
    ([entry]) => {
      header.classList.toggle('scrolled', !entry.isIntersecting);
    },
    { root: null, rootMargin: `-${headerH + EXTRA_EARLY}px 0px 0px 0px`, threshold: 0 }
  );

  if (trigger) io.observe(trigger);
})();

/* =================== Background video autoplay + fade-in =================== */
(() => {
  const vid = document.querySelector('.video-bg video');
  if (!vid) return;

  vid.muted = true;
  vid.autoplay = true;
  vid.loop = true;
  vid.preload = 'auto';
  vid.setAttribute('playsinline', '');

  const tryPlay = () => {
    const p = vid.play();
    if (p && p.catch) p.catch(() => {/* ignore and retry on next event */});
  };

  vid.addEventListener('loadeddata', () => { vid.classList.add('loaded'); tryPlay(); });
  vid.addEventListener('canplay', tryPlay);
  vid.addEventListener('canplaythrough', tryPlay);

  ['pointerdown','touchstart','keydown','scroll'].forEach(evt =>
    window.addEventListener(evt, tryPlay, { once:true })
  );

  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
  window.addEventListener('load', tryPlay);
  tryPlay();
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
