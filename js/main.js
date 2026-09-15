document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* Footer year */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Reveal on scroll, staggered */
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach((el, i) => {
    el.style.setProperty('--delay', `${Math.min(i % 6, 5) * 0.08}s`);
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* Nav scroll state + scroll progress bar */
  const nav = document.getElementById('nav');
  const progressBar = document.getElementById('progressBar');

  function updateProgress() {
    const h = document.documentElement;
    const scrollTop = h.scrollTop || document.body.scrollTop;
    const scrollHeight = h.scrollHeight - h.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
    updateProgress();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Highlight active nav link while scrolling */
  const sections = document.querySelectorAll('main section[id]');
  const navLinkEls = document.querySelectorAll('.nav__link');
  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinkEls.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((sec) => sectionObserver.observe(sec));
  }

  /* Cursor spotlight glow, hero only */
  const spotlight = document.getElementById('spotlight');
  const hero = document.getElementById('top');
  if (spotlight && hero && !reduceMotion && canHover) {
    hero.addEventListener('mousemove', (e) => {
      spotlight.style.setProperty('--x', `${e.clientX}px`);
      spotlight.style.setProperty('--y', `${e.clientY}px`);
      spotlight.classList.add('is-active');
    });
    hero.addEventListener('mouseleave', () => spotlight.classList.remove('is-active'));
  }

  /* Magnetic buttons */
  if (!reduceMotion && canHover) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${(x * 0.25).toFixed(1)}px, ${(y * 0.35).toFixed(1)}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* 3D tilt on cards */
  if (!reduceMotion && canHover) {
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* Hero rotating role text */
  const roleText = document.getElementById('roleText');
  if (roleText && !reduceMotion) {
    const roles = ['Full-Stack Developer', 'BSc CSE Student', 'Flutter Developer', 'Founder @ Futels', 'ML Tinkerer'];
    let idx = 0;
    roleText.style.transition = 'opacity .3s ease';
    setInterval(() => {
      idx = (idx + 1) % roles.length;
      roleText.style.opacity = '0';
      setTimeout(() => {
        roleText.textContent = roles[idx];
        roleText.style.opacity = '1';
      }, 300);
    }, 3200);
  }

  /* Stat count-up */
  const statNums = document.querySelectorAll('.stat__num');
  if (statNums.length) {
    const countUp = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const statObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            countUp(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      statNums.forEach((el) => statObserver.observe(el));
    } else {
      statNums.forEach((el) => { el.textContent = el.dataset.count; });
    }
  }

  /* Toast helper */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  /* Copy email to clipboard */
  document.querySelectorAll('.email-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied to clipboard');
      } catch (err) {
        showToast('Copy failed — email: ' + email);
      }
      btn.classList.add('is-copied');
      setTimeout(() => btn.classList.remove('is-copied'), 1500);
    });
  });
});
