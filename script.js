/* ============================================================
   AUREON SYSTEMS — script.js
   Modules: navbar, mobile menu, scroll reveal, counters,
            accordion, cursor glow, card tilt, parallax,
            portfolio carousel, smooth anchor scroll
   ============================================================ */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared project lightbox instance — built once, reused by every
  // card the portfolio carousel opens (see openProjectPreview).
  let projectLightbox = null;

  /* ---------------------------------------------------------
     Utility: run once DOM is ready
  --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initYear();
    initNavbar();
    initMobileMenu();
    initSmoothAnchors();
    initScrollReveal();
    initCounters();
    initAccordion();
    initProjectLightbox();
    initPortfolioCarousel();
    if (!prefersReducedMotion) {
      initCursorGlow();
      initCardTilt();
      initParallax();
    }
  });

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     Navbar: background changes on scroll
  --------------------------------------------------------- */
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const toggleState = () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 24);
    };

    toggleState();
    window.addEventListener('scroll', toggleState, { passive: true });
  }

  /* ---------------------------------------------------------
     Mobile menu toggle
  --------------------------------------------------------- */
  function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  /* ---------------------------------------------------------
     Smooth scroll for in-page anchors (accounts for fixed navbar)
  --------------------------------------------------------- */
  function initSmoothAnchors() {
    const navbarHeight = document.getElementById('navbar')?.offsetHeight || 76;

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - (navbarHeight - 1);
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal via IntersectionObserver
  --------------------------------------------------------- */
  function initScrollReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Elements ease in on entry and ease back out on exit — in either
    // scroll direction — rather than revealing once and staying static.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     Animated stat counters (trigger once, when in view)
  --------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const animateCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1600;
      const start = performance.now();

      if (prefersReducedMotion) {
        el.textContent = target + suffix;
        return;
      }

      const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = easeOutExpo(progress);
        const value = Math.round(target * eased);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     FAQ accordion (single-open, animated height)
  --------------------------------------------------------- */
  function initAccordion() {
    const items = document.querySelectorAll('.accordion__item');
    if (!items.length) return;

    items.forEach((item) => {
      const trigger = item.querySelector('.accordion__trigger');
      const panel = item.querySelector('.accordion__panel');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';

        // Close all other panels
        items.forEach((other) => {
          if (other === item) return;
          const otherTrigger = other.querySelector('.accordion__trigger');
          const otherPanel = other.querySelector('.accordion__panel');
          if (!otherTrigger || !otherPanel) return;
          otherTrigger.setAttribute('aria-expanded', 'false');
          otherPanel.style.maxHeight = null;
        });

        // Toggle current
        trigger.setAttribute('aria-expanded', String(!isOpen));
        panel.style.maxHeight = isOpen ? null : `${panel.scrollHeight}px`;
      });
    });
  }

  /* ---------------------------------------------------------
     Project cards: click opens a centered lightbox — blurred
     backdrop, a "Voltar" button, and a curved 3D ribbon
     carousel of screenshots. One shared lightbox is built once
     and reused; each card just hands it a fresh image list.
  --------------------------------------------------------- */
  function initProjectCarousels() {
    const cards = document.querySelectorAll('.project-card[data-images]');
    if (!cards.length) return;

    const lightbox = buildProjectLightbox();
    document.body.appendChild(lightbox.root);

    cards.forEach((card) => {
      let images = [];
      try {
        images = JSON.parse(card.getAttribute('data-images') || '[]');
      } catch (err) {
        images = [];
      }
      if (!images.length) return;

      const projectName = card.querySelector('h3')?.textContent.trim() || 'projeto';

      const open = (e) => {
        if (e) e.stopPropagation();
        lightbox.open(images, projectName);
      };

      card.querySelector('.project-card__expand-toggle')?.addEventListener('click', open);

      // Clicking anywhere on the card (outside the tech-stack
      // footer) also opens the lightbox.
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-card__footer')) return;
        open(e);
      });
    });
  }

  /* ---------------------------------------------------------
     Builds the shared lightbox: blurred backdrop + centered
     panel with a "Voltar" button and a stage where a fresh
     carousel is mounted each time it opens.
  --------------------------------------------------------- */
  function buildProjectLightbox() {
    const root = document.createElement('div');
    root.className = 'lightbox';
    root.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'lightbox__backdrop';

    const panel = document.createElement('div');
    panel.className = 'lightbox__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = document.createElement('div');
    head.className = 'lightbox__head';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox__close';
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Voltar</span>';

    const titleEl = document.createElement('p');
    titleEl.className = 'lightbox__title';

    head.append(closeBtn, titleEl);

    const stageWrap = document.createElement('div');
    stageWrap.className = 'lightbox__stage-wrap';

    panel.append(head, stageWrap);
    root.append(backdrop, panel);

    let lastFocused = null;
    let onResize = null;

    const onKeydown = (e) => { if (e.key === 'Escape') close(); };

    function close() {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      window.removeEventListener('keydown', onKeydown);
      if (onResize) window.removeEventListener('resize', onResize);
      onResize = null;
      stageWrap.innerHTML = '';
      if (lastFocused) lastFocused.focus();
    }

    function open(images, projectName) {
      lastFocused = document.activeElement;
      titleEl.textContent = projectName;
      stageWrap.innerHTML = '';
      const carousel = buildCarousel3D(images, projectName);
      stageWrap.appendChild(carousel.root);

      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      window.addEventListener('keydown', onKeydown);
      onResize = () => carousel.layout();
      window.addEventListener('resize', onResize, { passive: true });
      requestAnimationFrame(() => carousel.root.focus());
    }

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    return { root, open, close };
  }

  /* ---------------------------------------------------------
     Builds a curved "ribbon" 3D carousel (DOM + behavior) for
     a given list of image paths. Cards bow away from the
     center on a virtual curve — translate/rotateX/rotateY/
     rotateZ/scale — pure CSS transforms, GPU-composited, no
     layout thrashing on frame. Returns { root, layout }.
  --------------------------------------------------------- */
  function buildCarousel3D(images, projectName) {
    const root = document.createElement('div');
    root.className = 'carousel3d';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carrossel');
    root.setAttribute('aria-label', `Capturas de tela — ${projectName}`);
    root.tabIndex = 0;

    const stage = document.createElement('div');
    stage.className = 'carousel3d__stage';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel3d__nav carousel3d__nav--prev';
    prevBtn.setAttribute('aria-label', 'Captura anterior');
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel3d__nav carousel3d__nav--next';
    nextBtn.setAttribute('aria-label', 'Próxima captura');
    nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const dots = document.createElement('div');
    dots.className = 'carousel3d__dots';

    const count = images.length;
    let current = 0;

    const slides = images.map((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel3d__slide';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `Captura de tela ${i + 1} de ${projectName}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        slide.classList.add('carousel3d__slide--placeholder');
        slide.textContent = 'Prévia em breve';
      });

      slide.appendChild(img);
      slide.addEventListener('click', () => goTo(i));
      stage.appendChild(slide);
      return slide;
    });

    const dotEls = images.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel3d__dot';
      dot.setAttribute('aria-label', `Ir para captura ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dots.appendChild(dot);
      return dot;
    });

    root.append(prevBtn, stage, nextBtn, dots);

    // Circular placement: each slide sits on a point of a virtual
    // circle (sin/cos), facing tangent to it. This is what makes
    // the side slides curve INWARD and read as connected segments
    // of a ring/cylinder, rather than fanning outward.
    function layout() {
      const isMobile = window.innerWidth < 640;
      const angleStep = isMobile ? 10 : 32; // degrees between slides, around the circle
      const radius    = isMobile ? 210 : 720; // virtual circle radius in px
      const bank      = isMobile ? 0  : -5;  // subtle roll, like a wheel banking

      slides.forEach((slide, i) => {
        let offset = i - current;
        if (offset > count / 2) offset -= count;
        if (offset < -count / 2) offset += count;

        const abs = Math.abs(offset);
        const angleDeg = offset * angleStep;
        const angleRad = angleDeg * Math.PI / 180;

        const tx = Math.sin(angleRad) * radius;
        const tz = (Math.cos(angleRad) - 1) * radius;
        const scale = Math.max(1 - abs * 0.12, 0.6);
        const opacity = abs > 2 ? 0 : Math.max(1 - abs * 0.3, 0);

        slide.style.transform =
          `translate3d(${tx}px, 0, ${tz}px) ` +
          `rotateY(${-angleDeg}deg) ` +
          `rotateZ(${-Math.sin(angleRad) * bank}deg) ` +
          `scale(${scale})`;
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(20 - abs);
        slide.style.pointerEvents = abs <= 1 ? 'auto' : 'none';
        slide.classList.toggle('is-active', offset === 0);
      });

      dotEls.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      prevBtn.disabled = count <= 1;
      nextBtn.disabled = count <= 1;
    }

    function goTo(index) {
      current = ((index % count) + count) % count;
      layout();
    }

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });

    // Swipe: Pointer Events unify mouse-drag and touch in one path.
    let dragStartX = null;
    let dragging = false;

    stage.addEventListener('pointerdown', (e) => {
      dragStartX = e.clientX;
      dragging = true;
    });

    const endDrag = (e) => {
      if (!dragging || dragStartX === null) return;
      const delta = e.clientX - dragStartX;
      if (Math.abs(delta) > 40) goTo(current + (delta < 0 ? 1 : -1));
      dragging = false;
      dragStartX = null;
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointerleave', () => { dragging = false; dragStartX = null; });

    layout();

    return { root, layout };
  }

  /* ---------------------------------------------------------
     Ambient cursor glow (desktop pointer only)
  --------------------------------------------------------- */
  function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let raf = null;

    window.addEventListener('pointermove', (e) => {
      glow.classList.add('is-active');
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.setProperty('--x', `${e.clientX}px`);
        glow.style.setProperty('--y', `${e.clientY}px`);
        raf = null;
      });
    });

    document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
  }

  /* ---------------------------------------------------------
     Subtle card tilt + gradient-follow-cursor on hover
  --------------------------------------------------------- */
  function initCardTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = document.querySelectorAll('.card, .testimonial');

    cards.forEach((card) => {
      let bounds = null;

      const onEnter = () => { bounds = card.getBoundingClientRect(); };

      const onMove = (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        const px = (x / bounds.width) * 100;
        const py = (y / bounds.height) * 100;

        card.style.setProperty('--mx', `${px}%`);
        card.style.setProperty('--my', `${py}%`);

        if (card.classList.contains('card')) {
          const rotateX = ((y / bounds.height) - 0.5) * -4;
          const rotateY = ((x / bounds.width) - 0.5) * 4;
          card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
      };

      const onLeave = () => {
        bounds = null;
        card.style.transform = '';
      };

      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
    });
  }

  /* ---------------------------------------------------------
     Parallax: background layers drift at a fraction of scroll
     speed, eased with a lerp each frame so the motion reads as
     smooth momentum rather than a 1:1 scroll-jack. Purely
     transform-based (GPU composited), only ever active while
     something is actually moving.
  --------------------------------------------------------- */
  function initParallax() {
    const nodes = document.querySelectorAll('[data-parallax]');
    if (!nodes.length) return;

    const layers = Array.from(nodes).map((el) => ({
      el,
      speed: parseFloat(el.getAttribute('data-parallax')) || 0,
      current: 0,
      target: 0,
    }));

    const LERP = 0.09;
    let rafId = null;

    const readScroll = () => {
      const y = window.scrollY;
      layers.forEach((layer) => { layer.target = y * layer.speed; });
    };

    const tick = () => {
      let stillMoving = false;

      layers.forEach((layer) => {
        const delta = layer.target - layer.current;
        if (Math.abs(delta) > 0.05) {
          layer.current += delta * LERP;
          stillMoving = true;
        } else {
          layer.current = layer.target;
        }
        layer.el.style.transform = `translate3d(0, ${layer.current.toFixed(2)}px, 0)`;
      });

      rafId = stillMoving ? requestAnimationFrame(tick) : null;
    };

    const onScroll = () => {
      readScroll();
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    readScroll();
    layers.forEach((layer) => { layer.current = layer.target; });
    tick();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', readScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     Portfolio carousel — free, physical, infinite.

     There is no "snap to card" state anywhere in here. Position
     is a single continuous value that only ever changes two
     ways: a 1:1 drag follows the pointer exactly, and releasing
     hands it to a friction-based momentum loop that decays the
     velocity captured during the drag until it's imperceptible.
     Nothing ever forces it to stop on a card boundary — it just
     runs out of energy wherever that happens to be, like a heavy
     object sliding to a stop.

     Architecture:
     - The authored slides are cloned into one buffer copy on
       each side (three copies total). `position` is free to
       drift anywhere, but every time it applies a new position
       the track silently wraps it back by exactly one loop's
       width whenever it nears either edge of the buffer. Because
       the copies are identical, the wrap is invisible — there is
       no discrete "index" to keep in sync, just a position that
       never runs out of road.
     - A single rAF loop only runs during momentum (post-release
       coasting); dragging updates position directly on every
       pointermove for a 1:1 feel with zero input lag.
     - Each frame, every slide's distance from the viewport
       center drives a --proximity custom property (scale /
       opacity / focus) and a small inner parallax offset on its
       media, text and tech-icon layers.
  --------------------------------------------------------- */
  function initPortfolioCarousel() {
    const root = document.querySelector('[data-portfolio]');
    if (!root) return;

    const viewport = root.querySelector('[data-portfolio-viewport]');
    const track = root.querySelector('[data-portfolio-track]');
    const prevBtn = root.querySelector('[data-portfolio-prev]');
    const nextBtn = root.querySelector('[data-portfolio-next]');
    if (!viewport || !track) return;

    const COPIES_EACH_SIDE = 1;      // 3 copies total: buffer / home / buffer
    const FRICTION = 0.945;          // velocity decay per ~16.6ms frame — lower = stops sooner
    const STOP_VELOCITY = 0.02;      // px/ms — below this the motion is imperceptible
    const MAX_FRAME_MS = 48;         // clamp dt so a stalled tab can't produce a huge jump
    const CLICK_DRAG_THRESHOLD = 6;  // px of movement before a pointerup stops counting as a click
    const NUDGE_VELOCITY = 1.3;      // px/ms kick used by the prev/next buttons
    const ACTIVE_PROXIMITY = 0.7;    // how centered a slide must be to read as "in focus"
    const MEDIA_PARALLAX_PX = 20;
    const CONTENT_PARALLAX_PX = 10;
    const TECH_PARALLAX_PX = 5;

    const { realCount, homeStart } = buildInfiniteLoop(track, COPIES_EACH_SIDE);
    const slides = Array.from(track.querySelectorAll('[data-portfolio-slide]'));

    let itemWidth = 0;
    let loopWidth = 0;
    let position = 0;
    let velocity = 0; // px/ms
    let hasMeasuredOnce = false;

    let isDragging = false;
    let dragLocked = false;
    let dragAborted = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragBasePosition = 0;
    let lastSampleX = 0;
    let lastSampleTime = 0;
    let pointerId = null;
    let suppressNextClick = false;

    let momentumRAF = null;
    let lastFrameTime = null;

    /* Keeps position inside a two-loop-wide safe band so the
       three rendered copies always have real content under the
       viewport, no matter how far or how fast it's dragged. */
    function wrap(pos) {
      while (pos <= -loopWidth * 2) pos += loopWidth;
      while (pos > 0) pos -= loopWidth;
      return pos;
    }

    function applyPosition(pos) {
      position = wrap(pos);
      track.style.transform = `translate3d(${position.toFixed(2)}px, 0, 0)`;
      updateSlideStates();
    }

    function updateSlideStates() {
      const viewportCenter = viewport.clientWidth / 2;

      slides.forEach((slide, index) => {
        const slideCenter = position + index * itemWidth + itemWidth / 2;
        const offsetPx = slideCenter - viewportCenter;
        const offsetRatio = offsetPx / itemWidth;
        const proximity = Math.max(0, 1 - Math.abs(offsetRatio));

        slide.style.setProperty('--proximity', proximity.toFixed(3));

        const card = slide.firstElementChild;
        if (!card) return;
        card.dataset.active = proximity > ACTIVE_PROXIMITY ? 'true' : 'false';

        const media = card.querySelector('[data-layer="media"]');
        const content = card.querySelector('[data-layer="content"]');
        const tech = card.querySelector('[data-layer="tech"]');

        if (proximity > 0.02 && !prefersReducedMotion) {
          const ratio = Math.max(-1, Math.min(1, offsetRatio));
          if (media) media.style.transform = `translate3d(${(ratio * -MEDIA_PARALLAX_PX).toFixed(1)}px, 0, 0)`;
          if (content) content.style.transform = `translate3d(${(ratio * -CONTENT_PARALLAX_PX).toFixed(1)}px, 0, 0)`;
          if (tech) tech.style.transform = `translate3d(${(ratio * -TECH_PARALLAX_PX).toFixed(1)}px, 0, 0)`;
        } else {
          if (media) media.style.transform = '';
          if (content) content.style.transform = '';
          if (tech) tech.style.transform = '';
        }
      });
    }

    function measure() {
      itemWidth = slides[0].getBoundingClientRect().width;
      loopWidth = itemWidth * realCount;

      if (!hasMeasuredOnce) {
        position = (viewport.clientWidth / 2) - (homeStart * itemWidth) - (itemWidth / 2);
        hasMeasuredOnce = true;
      }

      applyPosition(position);
    }

    function stopMomentum() {
      if (momentumRAF !== null) {
        cancelAnimationFrame(momentumRAF);
        momentumRAF = null;
      }
      lastFrameTime = null;
    }

    function startMomentum() {
      if (prefersReducedMotion) { velocity = 0; return; }
      if (momentumRAF !== null) return;
      lastFrameTime = null;
      momentumRAF = requestAnimationFrame(momentumTick);
    }

    /* Pure friction decay — no target, no snapping. It just
       integrates position by velocity every frame and lets
       velocity bleed off until it's too small to notice. */
    function momentumTick(now) {
      if (lastFrameTime === null) lastFrameTime = now;
      const dt = Math.min(now - lastFrameTime, MAX_FRAME_MS);
      lastFrameTime = now;

      applyPosition(position + velocity * dt);
      velocity *= Math.pow(FRICTION, dt / 16.6667);

      if (Math.abs(velocity) > STOP_VELOCITY) {
        momentumRAF = requestAnimationFrame(momentumTick);
      } else {
        velocity = 0;
        momentumRAF = null;
        lastFrameTime = null;
      }
    }

    function nudge(direction) {
      stopMomentum();
      velocity = direction * NUDGE_VELOCITY;
      startMomentum();
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      stopMomentum();
      isDragging = true;
      dragLocked = false;
      dragAborted = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragBasePosition = position;
      lastSampleX = e.clientX;
      lastSampleTime = performance.now();
      velocity = 0;
      pointerId = e.pointerId;
      // A new gesture starting means any previous drag's suppression
      // window is over — mouseup landing on a different element than
      // mousedown never fires a click at all, so a stale "true" here
      // would otherwise swallow this next, entirely unrelated click.
      suppressNextClick = false;
    }

    function onPointerMove(e) {
      if (!isDragging || dragAborted) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (!dragLocked) {
        if (Math.abs(dx) < CLICK_DRAG_THRESHOLD && Math.abs(dy) < CLICK_DRAG_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          dragAborted = true;
          isDragging = false;
          return;
        }
        dragLocked = true;
        viewport.setPointerCapture(pointerId);
        viewport.classList.add('is-dragging');
      }

      e.preventDefault();
      applyPosition(dragBasePosition + dx);

      const now = performance.now();
      const dt = now - lastSampleTime;
      if (dt > 4) {
        velocity = (e.clientX - lastSampleX) / dt;
        lastSampleX = e.clientX;
        lastSampleTime = now;
      }
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove('is-dragging');
      if (pointerId !== null && viewport.hasPointerCapture && viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }

      if (!dragLocked) return;
      suppressNextClick = true;
      startMomentum();
    }

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);

    track.querySelectorAll('img').forEach((img) => {
      img.addEventListener('dragstart', (e) => e.preventDefault());
    });

    if (prevBtn) prevBtn.addEventListener('click', () => nudge(1));
    if (nextBtn) nextBtn.addEventListener('click', () => nudge(-1));

    slides.forEach((slide) => {
      const card = slide.firstElementChild;
      if (!card) return;

      card.addEventListener('click', (e) => {
        if (suppressNextClick) {
          suppressNextClick = false;
          return;
        }
        if (e.target.closest('.project-card__footer')) return;
        openProjectPreview(card);
      });
    });

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(1); }
    });

    window.addEventListener('resize', measure, { passive: true });

    measure();
  }

  /* Clones the authored slides into one buffer copy on each side
     so the track always has real content to show while position
     drifts, in either direction. Returns the real slide count and
     the index where the interactive "home" copy begins. */
  function buildInfiniteLoop(track, copiesEachSide) {
    const originals = Array.from(track.children);
    const realCount = originals.length;
    const fragment = document.createDocumentFragment();

    const appendCopy = (interactive) => {
      originals.forEach((slide) => {
        const node = interactive ? slide : slide.cloneNode(true);
        if (!interactive) {
          node.setAttribute('aria-hidden', 'true');
          node.querySelectorAll('[tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
        }
        fragment.appendChild(node);
      });
    };

    for (let i = 0; i < copiesEachSide; i += 1) appendCopy(false);
    appendCopy(true);
    for (let i = 0; i < copiesEachSide; i += 1) appendCopy(false);

    track.innerHTML = '';
    track.appendChild(fragment);

    return { realCount, homeStart: copiesEachSide * realCount };
  }

  /* Reuses the shared project lightbox built by initProjectLightbox.
     Reads the card's own data-images (JSON array) and title — no
     separate open/close bookkeeping here, the lightbox owns that. */
  function openProjectPreview(card) {
    if (!projectLightbox) return;
    let images = [];
    try {
      images = JSON.parse(card.getAttribute('data-images') || '[]');
    } catch (err) {
      images = [];
    }
    if (!images.length) return;
    const projectName = card.querySelector('h3')?.textContent.trim() || 'projeto';
    projectLightbox.open(images, projectName);
  }

  /* ---------------------------------------------------------
     Project lightbox — blurred backdrop, a "Voltar" button, and
     a curved 3D ribbon carousel of screenshots. Built once and
     reused; openProjectPreview just hands it a fresh image list.
     Ported as-is from the standalone screenshot-preview build —
     the portfolio carousel only supplies the click that calls it.
  --------------------------------------------------------- */
  function initProjectLightbox() {
    projectLightbox = buildProjectLightbox();
    document.body.appendChild(projectLightbox.root);
  }

  function buildProjectLightbox() {
    const root = document.createElement('div');
    root.className = 'lightbox';
    root.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'lightbox__backdrop';

    const panel = document.createElement('div');
    panel.className = 'lightbox__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = document.createElement('div');
    head.className = 'lightbox__head';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox__close';
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Voltar</span>';

    const titleEl = document.createElement('p');
    titleEl.className = 'lightbox__title';

    head.append(closeBtn, titleEl);

    const stageWrap = document.createElement('div');
    stageWrap.className = 'lightbox__stage-wrap';

    panel.append(head, stageWrap);
    root.append(backdrop, panel);

    let lastFocused = null;
    let onResize = null;

    const onKeydown = (e) => { if (e.key === 'Escape') close(); };

    function close() {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      window.removeEventListener('keydown', onKeydown);
      if (onResize) window.removeEventListener('resize', onResize);
      onResize = null;
      stageWrap.innerHTML = '';
      if (lastFocused) lastFocused.focus();
    }

    function open(images, projectName) {
      lastFocused = document.activeElement;
      titleEl.textContent = projectName;
      stageWrap.innerHTML = '';
      const carousel = buildCarousel3D(images, projectName);
      stageWrap.appendChild(carousel.root);

      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      window.addEventListener('keydown', onKeydown);
      onResize = () => carousel.layout();
      window.addEventListener('resize', onResize, { passive: true });
      requestAnimationFrame(() => carousel.root.focus());
    }

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    return { root, open, close };
  }

  /* ---------------------------------------------------------
     Builds a curved "ribbon" 3D carousel (DOM + behavior) for
     a given list of image paths. Cards bow away from the
     center on a virtual curve — translate/rotateX/rotateY/
     rotateZ/scale — pure CSS transforms, GPU-composited, no
     layout thrashing on frame. Returns { root, layout }.
  --------------------------------------------------------- */
  function buildCarousel3D(images, projectName) {
    const root = document.createElement('div');
    root.className = 'carousel3d';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carrossel');
    root.setAttribute('aria-label', `Capturas de tela — ${projectName}`);
    root.tabIndex = 0;

    const stage = document.createElement('div');
    stage.className = 'carousel3d__stage';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel3d__nav carousel3d__nav--prev';
    prevBtn.setAttribute('aria-label', 'Captura anterior');
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel3d__nav carousel3d__nav--next';
    nextBtn.setAttribute('aria-label', 'Próxima captura');
    nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const dots = document.createElement('div');
    dots.className = 'carousel3d__dots';

    const count = images.length;
    let current = 0;

    const slides = images.map((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel3d__slide';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `Captura de tela ${i + 1} de ${projectName}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        slide.classList.add('carousel3d__slide--placeholder');
        slide.textContent = 'Prévia em breve';
      });

      slide.appendChild(img);
      slide.addEventListener('click', () => goTo(i));
      stage.appendChild(slide);
      return slide;
    });

    const dotEls = images.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel3d__dot';
      dot.setAttribute('aria-label', `Ir para captura ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dots.appendChild(dot);
      return dot;
    });

    root.append(prevBtn, stage, nextBtn, dots);

    // Circular placement: each slide sits on a point of a virtual
    // circle (sin/cos), facing tangent to it. This is what makes
    // the side slides curve INWARD and read as connected segments
    // of a ring/cylinder, rather than fanning outward.
    function layout() {
      const isMobile = window.innerWidth < 640;
      const angleStep = isMobile ? 10 : 32; // degrees between slides, around the circle
      const radius    = isMobile ? 210 : 720; // virtual circle radius in px
      const bank      = isMobile ? 0  : -5;  // subtle roll, like a wheel banking

      slides.forEach((slide, i) => {
        let offset = i - current;
        if (offset > count / 2) offset -= count;
        if (offset < -count / 2) offset += count;

        const abs = Math.abs(offset);
        const angleDeg = offset * angleStep;
        const angleRad = angleDeg * Math.PI / 180;

        const tx = Math.sin(angleRad) * radius;
        const tz = (Math.cos(angleRad) - 1) * radius;
        const scale = Math.max(1 - abs * 0.12, 0.6);
        const opacity = abs > 2 ? 0 : Math.max(1 - abs * 0.3, 0);

        slide.style.transform =
          `translate3d(${tx}px, 0, ${tz}px) ` +
          `rotateY(${-angleDeg}deg) ` +
          `rotateZ(${-Math.sin(angleRad) * bank}deg) ` +
          `scale(${scale})`;
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(20 - abs);
        slide.style.pointerEvents = abs <= 1 ? 'auto' : 'none';
        slide.classList.toggle('is-active', offset === 0);
      });

      dotEls.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      prevBtn.disabled = count <= 1;
      nextBtn.disabled = count <= 1;
    }

    function goTo(index) {
      current = ((index % count) + count) % count;
      layout();
    }

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });

    // Swipe: Pointer Events unify mouse-drag and touch in one path.
    let dragStartX = null;
    let dragging = false;

    stage.addEventListener('pointerdown', (e) => {
      dragStartX = e.clientX;
      dragging = true;
    });

    const endDrag = (e) => {
      if (!dragging || dragStartX === null) return;
      const delta = e.clientX - dragStartX;
      if (Math.abs(delta) > 40) goTo(current + (delta < 0 ? 1 : -1));
      dragging = false;
      dragStartX = null;
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointerleave', () => { dragging = false; dragStartX = null; });

    layout();

    return { root, layout };
  }
})();