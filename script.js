/* ============================================================
   AUREON SYSTEMS — script.js
   Modules: navbar, mobile menu, scroll reveal, counters,
            accordion, cursor glow, card tilt, smooth anchor scroll
   ============================================================ */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (!prefersReducedMotion) {
      initCursorGlow();
      initCardTilt();
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

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
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

    const cards = document.querySelectorAll('.card, .project-card, .testimonial');

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
})();
