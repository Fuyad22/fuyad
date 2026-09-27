(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const raf = (fn) => window.requestAnimationFrame(fn);
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = $('#top');
  const heroTitle = $('#heroTitle');

  const safely = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[portfolio] ${name} failed`, err); }
  };
  const mixColor = (a, b, t) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(', ')})`;

  /* ---------- Motion preference (OS setting + footer switch) ---------- */
  const MOTION_KEY = 'fh-motion';
  const readPref = () => { try { return localStorage.getItem(MOTION_KEY); } catch (e) { return null; } };
  const writePref = (v) => { try { localStorage.setItem(MOTION_KEY, v); } catch (e) { /* storage blocked */ } };
  const motionSubs = [];
  const motion = {
    ok: !reduceMQ.matches && readPref() !== 'off',
    set(on, persist = true) {
      if (on === this.ok) return;
      this.ok = on;
      root.classList.toggle('no-motion', !on);
      if (persist) writePref(on ? 'on' : 'off');
      motionSubs.forEach((fn) => safely('motion listener', () => fn(on)));
    },
    onChange(fn) { motionSubs.push(fn); },
  };
  root.classList.toggle('no-motion', !motion.ok);
  if (reduceMQ.addEventListener) {
    reduceMQ.addEventListener('change', (e) => motion.set(!e.matches && readPref() !== 'off', false));
  }

  /* ---------- Hero entrance (runs first so nothing else can block it) ---------- */
  safely('split title', () => { if (heroTitle) splitChars(heroTitle); });
  safely('split headings', () => $$('.split-words').forEach(splitWords));

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 800))]).then(() => {
    raf(() => raf(() => {
      root.classList.add('is-loaded');
      document.dispatchEvent(new CustomEvent('portfolio:loaded'));
      setTimeout(() => { if (heroTitle) heroTitle.classList.add('chars-ready'); }, motion.ok ? 2000 : 0);
    }));
  });

  function splitChars(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const words = text.split(' ');
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const visual = document.createElement('span');
    visual.className = 'split';
    visual.setAttribute('aria-hidden', 'true');
    let i = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'word';
      const chars = Array.from(word);
      const gradient = words.length > 1 && wi === words.length - 1;
      chars.forEach((ch, ci) => {
        const c = document.createElement('span');
        c.className = gradient ? 'char char--grad' : 'char';
        c.textContent = ch;
        c.style.setProperty('--i', String(i++));
        if (gradient) {
          c.style.setProperty('--c', mixColor([129, 140, 248], [34, 211, 238], chars.length > 1 ? ci / (chars.length - 1) : 0));
        }
        w.appendChild(c);
      });
      visual.appendChild(w);
      if (wi < words.length - 1) visual.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.append(sr, visual);
  }

  function splitWords(el) {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w__i';
            inner.textContent = part;
            inner.style.setProperty('--wi', String(index++));
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  }

  /* ---------- Toast + clipboard ---------- */
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer = 0;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Email copied to clipboard');
      return true;
    } catch (err) {
      showToast(`Copy failed — ${text}`);
      return false;
    }
  }

  /* ---------- Scroll reveal, staggered per batch ---------- */
  const revealTargets = $$('.reveal, .split-words');
  const revealAll = () => revealTargets.forEach((el) => el.classList.add('is-visible'));
  safely('reveal', () => {
    $$('.skill-card').forEach((card) => {
      $$('.tag', card).forEach((tag, i) => tag.style.setProperty('--td', `${(0.25 + i * 0.045).toFixed(3)}s`));
    });
    if (!('IntersectionObserver' in window) || !motion.ok) { revealAll(); return; }
    const io = new IntersectionObserver((entries) => {
      const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      shown.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      shown.forEach((el, k) => {
        el.style.setProperty('--delay', `${Math.min(k, 6) * 0.08}s`);
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  });
  motion.onChange((on) => { if (!on) revealAll(); });

  /* ---------- Hero visibility, shared by the animated hero pieces ---------- */
  let heroVisible = true;
  const heroVisSubs = [];
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      heroVisSubs.forEach((fn) => fn(heroVisible));
    }).observe(hero);
  }

  /* ---------- Navigation ---------- */
  const nav = $('#nav');
  const navLinks = $('#navLinks');
  const navToggle = $('#navToggle');
  let menuOpen = false;

  safely('nav', () => {
    if (!nav || !navLinks) return;
    const indicator = $('.nav__indicator', nav);
    const links = $$('.nav__link', nav);
    let hovering = false;

    const setMenu = (open) => {
      menuOpen = open;
      navLinks.classList.toggle('is-open', open);
      nav.classList.toggle('menu-open', open);
      if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
    };
    if (navToggle) navToggle.addEventListener('click', () => setMenu(!menuOpen));
    links.forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenu(false);
        if (navToggle) navToggle.focus();
      }
    });
    document.addEventListener('click', (e) => { if (menuOpen && !nav.contains(e.target)) setMenu(false); });

    const activeLink = () => $('.nav__link.is-active', nav);
    const placeIndicator = (link) => {
      if (!indicator) return;
      if (!link || getComputedStyle(indicator).display === 'none') {
        indicator.classList.remove('is-visible');
        return;
      }
      const appearing = !indicator.classList.contains('is-visible');
      if (appearing) indicator.style.transition = 'none';
      indicator.style.setProperty('--x', `${link.offsetLeft}px`);
      indicator.style.setProperty('--w', `${link.offsetWidth}px`);
      if (appearing) {
        void indicator.offsetWidth;
        indicator.style.transition = '';
      }
      indicator.classList.add('is-visible');
    };
    links.forEach((link) => link.addEventListener('pointerenter', () => { hovering = true; placeIndicator(link); }));
    navLinks.addEventListener('pointerleave', () => { hovering = false; placeIndicator(activeLink()); });

    if ('IntersectionObserver' in window) {
      const sectionIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
          if (!hovering) placeIndicator(activeLink());
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach((s) => sectionIO.observe(s));
    }
    window.addEventListener('resize', () => placeIndicator(activeLink()));
    fontsReady.then(() => placeIndicator(activeLink()));
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  });

  /* ---------- Scroll: pill nav, hide-on-scroll, progress, back-to-top ---------- */
  safely('scroll effects', () => {
    const bar = $('#progressBar');
    const toTop = $('#toTop');
    const ring = $('#toTopRing');
    const RING = 2 * Math.PI * 24;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      if (nav) {
        nav.classList.toggle('is-scrolled', y > 24);
        const dy = y - lastY;
        if (Math.abs(dy) > 8) {
          if (!menuOpen && !nav.contains(document.activeElement)) nav.classList.toggle('is-hidden', dy > 0 && y > 520);
          lastY = y;
        }
        if (y <= 520) nav.classList.remove('is-hidden');
      }
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      if (ring) ring.style.strokeDashoffset = (RING * (1 - p)).toFixed(2);
      if (toTop) toTop.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; raf(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: motion.ok ? 'smooth' : 'auto' });
        const logo = $('.nav__logo');
        if (logo) logo.focus({ preventScroll: true });
      });
    }
  });

  /* ---------- Pointer effects: spotlight, magnetic, tilt, glow borders ---------- */
  safely('pointer effects', () => {
    if (!finePointer) return;

    const spotlight = $('#spotlight');
    if (spotlight && hero) {
      hero.addEventListener('pointermove', (e) => {
        spotlight.style.setProperty('--x', `${e.clientX}px`);
        spotlight.style.setProperty('--y', `${e.clientY}px`);
        spotlight.classList.add('is-active');
      }, { passive: true });
      hero.addEventListener('pointerleave', () => spotlight.classList.remove('is-active'));
    }

    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty('--bx', `${x.toFixed(0)}px`);
        el.style.setProperty('--by', `${y.toFixed(0)}px`);
        if (motion.ok) {
          el.style.transform = `translate(${((x - r.width / 2) * 0.22).toFixed(1)}px, ${((y - r.height / 2) * 0.3).toFixed(1)}px)`;
        }
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    const tilt = (el, max, glare) => {
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!motion.ok) return;
        if (!rect) rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        el.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max * 1.2).toFixed(2)}deg)`;
        if (glare) {
          glare.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
          glare.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        }
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; rect = null; });
    };
    const photo = $('#photoTilt');
    if (photo) tilt(photo, 10, $('.hero__photo-glare'));
    $$('.tilt').forEach((el) => tilt(el, 5));

    $$('.glow-group').forEach((group) => {
      const cards = $$('.glow-card', group);
      let pending = null;
      group.addEventListener('pointermove', (e) => {
        if (!pending) {
          raf(() => {
            const { clientX, clientY } = pending;
            cards.forEach((card) => {
              const r = card.getBoundingClientRect();
              card.style.setProperty('--mx', `${(clientX - r.left).toFixed(0)}px`);
              card.style.setProperty('--my', `${(clientY - r.top).toFixed(0)}px`);
            });
            pending = null;
          });
        }
        pending = e;
      }, { passive: true });
    });
  });

  /* ---------- Interactive dot field behind the hero ---------- */
  safely('dot field', () => {
    const canvas = $('#heroField');
    if (!canvas || !hero || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STOPS = [[99, 102, 241], [168, 85, 247], [34, 211, 238]];
    const colorAt = (t) => (t < 0.5 ? mixColor(STOPS[0], STOPS[1], t * 2) : mixColor(STOPS[1], STOPS[2], (t - 0.5) * 2));
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, on: false, s: 0 };
    const ripples = [];
    const hot = [];
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let pts = new Float32Array(0);
    let colColors = [];
    let running = false;
    let frame = 0;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = Math.max(26, Math.round(Math.sqrt((w * h) / 2800)));
      cols = Math.floor(w / gap) + 2;
      rows = Math.floor(h / gap) + 2;
      const ox = (w - (cols - 1) * gap) / 2;
      const oy = (h - (rows - 1) * gap) / 2;
      pts = new Float32Array(cols * rows * 2);
      let k = 0;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          pts[k++] = ox + c * gap;
          pts[k++] = oy + r * gap;
        }
      }
      colColors = Array.from({ length: cols }, (_, c) => colorAt(cols > 1 ? c / (cols - 1) : 0));
      if (!running) draw(performance.now());
    }

    function draw(now) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const live = motion.ok;
      mouse.s += ((mouse.on && live ? 1 : 0) - mouse.s) * 0.08;
      mouse.x += (mouse.tx - mouse.x) * 0.2;
      mouse.y += (mouse.ty - mouse.y) * 0.2;
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t > 1900) ripples.splice(i, 1);
      }

      const R = 180;
      const R2 = R * R;
      const strength = mouse.s;
      const useMouse = strength > 0.01;
      const mx = mouse.x;
      const my = mouse.y;
      const time = now * 0.0011;
      const nr = live ? ripples.length : 0;
      hot.length = 0;
      ctx.fillStyle = '#fff';

      let k = 0;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++, k += 2) {
          const x = pts[k];
          const y = pts[k + 1];
          let f = 0;
          let dx = 0;
          let dy = 0;
          if (useMouse) {
            const ex = x - mx;
            const ey = y - my;
            const d2 = ex * ex + ey * ey;
            if (d2 < R2) {
              const d = Math.sqrt(d2) || 1;
              const q = 1 - d / R;
              const qq = q * q * strength;
              f = qq;
              dx = (ex / d) * qq * 14;
              dy = (ey / d) * qq * 14;
            }
          }
          for (let j = 0; j < nr; j++) {
            const rp = ripples[j];
            const age = now - rp.t;
            if (age < 0) continue;
            const ex = x - rp.x;
            const ey = y - rp.y;
            const d = Math.sqrt(ex * ex + ey * ey) || 1;
            const band = (d - age * 0.6) / 46;
            if (band > -2.2 && band < 2.2) {
              const s = Math.exp(-band * band) * (1 - age / 1900);
              if (s > f) f = s;
              dx += (ex / d) * s * 9;
              dy += (ey / d) * s * 9;
            }
          }
          if (f > 0.04) {
            hot.push(x + dx, y + dy, f, c);
            continue;
          }
          const wave = live ? 0.5 + 0.5 * Math.sin(x * 0.0105 + y * 0.0075 - time) : 0.4;
          ctx.globalAlpha = 0.07 + 0.11 * wave * wave * wave;
          ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
      }
      for (let i = 0; i < hot.length; i += 4) {
        const f = hot[i + 2];
        ctx.globalAlpha = Math.min(1, 0.2 + f * 0.9);
        ctx.fillStyle = colColors[hot[i + 3]];
        ctx.beginPath();
        ctx.arc(hot[i], hot[i + 1], 0.9 + f * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      draw(now);
      frame = raf(loop);
    }
    function start() {
      if (running || !motion.ok || !heroVisible || document.hidden) return;
      running = true;
      frame = raf(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      [mouse.tx, mouse.ty] = toLocal(e);
      if (!mouse.on && mouse.s < 0.01) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.on = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.on = false; });
    hero.addEventListener('pointerdown', (e) => {
      if (!motion.ok) return;
      const [x, y] = toLocal(e);
      ripples.push({ x, y, t: performance.now() });
      if (ripples.length > 4) ripples.shift();
    });

    heroVisSubs.push((visible) => (visible ? start() : stop()));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    motion.onChange((on) => {
      if (on) { start(); return; }
      stop();
      mouse.on = false;
      mouse.s = 0;
      ripples.length = 0;
      draw(performance.now());
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(hero);
    else window.addEventListener('resize', resize);
    resize();
    start();

    document.addEventListener('portfolio:loaded', () => {
      if (!motion.ok || !heroTitle) return;
      const c = canvas.getBoundingClientRect();
      const t = heroTitle.getBoundingClientRect();
      ripples.push({ x: t.left - c.left + t.width * 0.35, y: t.top - c.top + t.height * 0.5, t: performance.now() + 450 });
    }, { once: true });
  });

  /* ---------- Rotating role, decoded character by character ---------- */
  safely('role text', () => {
    const el = $('#roleText');
    if (!el) return;
    const roles = ['Full-Stack Developer', 'BSc CSE Student', 'Flutter Developer', 'Founder @ Futels', 'ML Tinkerer'];
    const glyphs = '!<>-_\\/[]{}=+*^?#01';
    const esc = (s) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const randomGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)];
    let idx = 0;

    const scrambleTo = (text) => new Promise((resolve) => {
      const from = el.textContent;
      const len = Math.max(from.length, text.length);
      const queue = Array.from({ length: len }, (_, i) => {
        const start = Math.floor(Math.random() * 14);
        return { from: from[i] || '', to: text[i] || '', start, end: start + 6 + Math.floor(Math.random() * 14), glyph: '' };
      });
      let frameNo = 0;
      const step = () => {
        let out = '';
        let done = 0;
        queue.forEach((q) => {
          if (frameNo >= q.end) {
            done++;
            out += esc(q.to);
          } else if (frameNo >= q.start) {
            if (!q.glyph || Math.random() < 0.3) q.glyph = randomGlyph();
            out += `<span class="glyph">${esc(q.glyph)}</span>`;
          } else {
            out += esc(q.from);
          }
        });
        el.innerHTML = out;
        if (done === queue.length) resolve();
        else { frameNo++; raf(step); }
      };
      step();
    });

    const cycle = async () => {
      if (motion.ok && heroVisible && !document.hidden) {
        idx = (idx + 1) % roles.length;
        await scrambleTo(roles[idx]);
      }
      setTimeout(cycle, 2600);
    };
    document.addEventListener('portfolio:loaded', () => setTimeout(cycle, 2400), { once: true });
  });

  /* ---------- Tech marquee, speeds up and reverses with scroll ---------- */
  safely('marquee', () => {
    const track = $('#marqueeTrack');
    if (!track) return;
    const marquee = track.parentElement;
    const base = $('.marquee__list', track);
    let listW = 0;
    let x = 0;
    let dir = 1;
    let boost = 0;
    let last = 0;
    let lastScroll = window.scrollY;
    let running = false;
    let visible = false;
    let frame = 0;

    const build = () => {
      $$('[data-clone]', track).forEach((n) => n.remove());
      listW = base.getBoundingClientRect().width;
      if (!listW) return;
      const copies = Math.ceil(window.innerWidth / listW) + 1;
      for (let i = 0; i < copies; i++) {
        const clone = base.cloneNode(true);
        clone.setAttribute('data-clone', '');
        track.appendChild(clone);
      }
      x %= listW;
    };
    const tick = (now) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const sy = window.scrollY;
      const dy = sy - lastScroll;
      lastScroll = sy;
      if (dy) dir = dy > 0 ? 1 : -1;
      boost += (Math.min(Math.abs(dy), 120) / 120 - boost) * 0.08;
      x -= dir * (0.04 + boost * 0.5) * dt;
      if (x <= -listW) x += listW;
      else if (x > 0) x -= listW;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      frame = raf(tick);
    };
    const start = () => {
      if (running || !motion.ok || !visible || document.hidden || !listW) return;
      running = true;
      last = 0;
      lastScroll = window.scrollY;
      frame = raf(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    build();
    fontsReady.then(() => { build(); start(); });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      }).observe(marquee);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    motion.onChange((on) => {
      if (on) { start(); return; }
      stop();
      x = 0;
      track.style.transform = '';
    });
  });

  /* ---------- Stats: count-up + live GitHub repo count ---------- */
  safely('stats', () => {
    if (!('IntersectionObserver' in window)) return;
    const countUp = (el) => {
      if (!motion.ok) {
        el.textContent = el.dataset.count;
        el.dataset.done = '1';
        return;
      }
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1400, 1);
        const target = parseInt(el.dataset.count, 10) || 0;
        el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) raf(step);
        else el.dataset.done = '1';
      };
      raf(step);
    };
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      io.unobserve(entry.target);
    }), { threshold: 0.6 });
    $$('.stat__num[data-count]').forEach((el) => {
      if (motion.ok) el.textContent = '0';
      io.observe(el);
    });

    const repos = $('[data-github-repos]');
    if (!repos || !window.fetch) return;
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 5000);
    fetch('https://api.github.com/users/Fuyad22', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const n = data && Number(data.public_repos);
        if (!n) return;
        repos.dataset.count = String(n);
        if (repos.dataset.done) repos.textContent = String(n);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  });

  /* ---------- about-me.js types itself out ---------- */
  safely('typing', () => {
    const code = $('#aboutCode');
    if (!code || !motion.ok || !('IntersectionObserver' in window)) return;
    const pre = code.parentElement;
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const texts = nodes.map((n) => n.textContent);
    const caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');

    pre.style.minHeight = `${pre.offsetHeight}px`;
    nodes.forEach((n) => { n.textContent = ''; });
    code.insertBefore(caret, code.firstChild);
    let ni = 0;
    let ci = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      nodes.forEach((n, i) => { n.textContent = texts[i]; });
      code.appendChild(caret);
      pre.style.minHeight = '';
    };
    const tick = () => {
      if (done) return;
      if (!motion.ok) { finish(); return; }
      let budget = 3;
      let lastNode = null;
      while (budget > 0 && ni < nodes.length) {
        const t = texts[ni];
        if (ci < t.length) {
          const ch = t[ci++];
          nodes[ni].textContent = t.slice(0, ci);
          lastNode = nodes[ni];
          if (!/\s/.test(ch)) budget--;
        }
        if (ci >= t.length) { ni++; ci = 0; }
      }
      if (ni >= nodes.length) { finish(); return; }
      if (lastNode) lastNode.parentNode.insertBefore(caret, lastNode.nextSibling);
      setTimeout(tick, 24 + Math.random() * 38);
    };
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      setTimeout(tick, 450);
    }, { threshold: 0.35 });
    io.observe(pre);
    motion.onChange((on) => { if (!on) finish(); });
  });

  /* ---------- Local time in Bangladesh ---------- */
  safely('clock', () => {
    const el = $('#localTime');
    const diffEl = $('#timeDiff');
    if (!el || !window.Intl) return;
    const makeFormat = (seconds) => new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit', hour12: true,
      ...(seconds ? { second: '2-digit' } : {}),
    });
    let fmt = makeFormat(motion.ok);
    const render = () => {
      const parts = fmt.formatToParts(new Date());
      const time = parts.filter((p) => p.type !== 'dayPeriod').map((p) => p.value).join('').trim();
      const periodPart = parts.find((p) => p.type === 'dayPeriod');
      const t = document.createElement('span');
      t.textContent = time;
      const a = document.createElement('span');
      a.className = 'clock__ampm';
      a.textContent = periodPart ? periodPart.value : '';
      el.replaceChildren(t, a);
    };
    render();
    setInterval(render, 1000);
    motion.onChange((on) => { fmt = makeFormat(on); render(); });

    if (diffEl) {
      const diff = 360 + new Date().getTimezoneOffset();
      let rel = 'same time zone as you';
      if (diff !== 0) {
        const abs = Math.abs(diff);
        const span = [Math.floor(abs / 60) ? `${Math.floor(abs / 60)}h` : '', abs % 60 ? `${abs % 60}m` : ''].filter(Boolean).join(' ');
        rel = `${span} ${diff > 0 ? 'ahead of' : 'behind'} you`;
      }
      diffEl.textContent = `GMT+6 · ${rel}`;
    }
  });

  /* ---------- Project filters with FLIP re-layout ---------- */
  safely('project filters', () => {
    const grid = $('#projectsGrid');
    const wrap = $('.filters');
    if (!grid || !wrap) return;
    const buttons = $$('.filter', wrap);
    const pill = $('.filters__pill', wrap);
    const cards = $$('.card', grid);
    const status = $('#filterStatus');

    buttons.forEach((btn) => {
      const f = btn.dataset.filter;
      const n = f === 'all' ? cards.length : cards.filter((c) => c.dataset.category === f).length;
      const count = $('.filter__count', btn);
      if (count) count.textContent = String(n);
    });

    const activeBtn = () => buttons.find((b) => b.classList.contains('is-active'));
    const movePill = (btn, animate = true) => {
      if (!pill || !btn) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.setProperty('--x', `${btn.offsetLeft}px`);
      pill.style.setProperty('--w', `${btn.offsetWidth}px`);
      if (!animate) {
        void pill.offsetWidth;
        pill.style.transition = '';
      }
    };
    movePill(activeBtn(), false);
    if ('ResizeObserver' in window) new ResizeObserver(() => movePill(activeBtn(), false)).observe(wrap);

    const apply = (filter) => {
      const before = new Map();
      cards.forEach((c) => { if (!c.classList.contains('is-hidden')) before.set(c, c.getBoundingClientRect()); });
      cards.forEach((c) => {
        if (c.classList.contains('is-visible')) return;
        c.style.transition = 'none';
        c.classList.add('is-visible');
      });
      cards.forEach((c) => c.classList.toggle('is-hidden', filter !== 'all' && c.dataset.category !== filter));
      void grid.offsetWidth;
      cards.forEach((c) => { c.style.transition = ''; });

      const shown = cards.filter((c) => !c.classList.contains('is-hidden'));
      if (status) status.textContent = `Showing ${shown.length} ${shown.length === 1 ? 'project' : 'projects'}`;
      if (!motion.ok || !Element.prototype.animate) return;
      const easing = 'cubic-bezier(.16, 1, .3, 1)';
      shown.forEach((c, i) => {
        const prev = before.get(c);
        if (prev) {
          const now = c.getBoundingClientRect();
          const dx = prev.left - now.left;
          const dy = prev.top - now.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing });
          }
        } else {
          c.animate(
            [{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 600, delay: i * 40, easing, fill: 'backwards' },
          );
        }
      });
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      movePill(btn);
      apply(btn.dataset.filter);
    }));
  });

  /* ---------- Futels approval-flow illustration ---------- */
  safely('futels flow', () => {
    const flow = $('#futelsFlow');
    if (!flow) return;
    const steps = $$('.flow__step', flow);
    const n = steps.length;
    let state = -1;
    let timer = 0;
    let visible = false;

    const render = (k) => {
      state = k;
      steps.forEach((s, i) => {
        s.classList.toggle('is-done', k >= n || i < k);
        s.classList.toggle('is-active', i === k);
      });
      flow.classList.toggle('is-complete', k >= n);
    };
    const tick = () => {
      const next = state >= n ? -1 : state + 1;
      render(next);
      timer = setTimeout(tick, next >= n ? 2800 : next < 0 ? 900 : 1200);
    };
    const play = () => {
      if (timer || !motion.ok || !visible) return;
      timer = setTimeout(tick, 500);
    };
    const pause = () => {
      clearTimeout(timer);
      timer = 0;
    };

    if (!motion.ok || !('IntersectionObserver' in window)) render(n);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play(); else pause();
      }, { threshold: 0.3 }).observe(flow);
    }
    motion.onChange((on) => {
      if (on) { play(); return; }
      pause();
      render(n);
    });
  });

  /* ---------- Magnetic contact orb ---------- */
  safely('contact orb', () => {
    const orb = $('#ctaOrb');
    if (!orb || !finePointer) return;
    const area = orb.parentElement;
    const core = $('.cta-orb__core', orb);
    area.addEventListener('pointermove', (e) => {
      if (!motion.ok) return;
      const r = area.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      orb.style.transform = `translate(${(dx * 0.16).toFixed(1)}px, ${(dy * 0.16).toFixed(1)}px)`;
      if (core) core.style.transform = `translate(${(dx * 0.14).toFixed(1)}px, ${(dy * 0.14).toFixed(1)}px)`;
    });
    area.addEventListener('pointerleave', () => {
      orb.style.transform = '';
      if (core) core.style.transform = '';
    });
  });

  /* ---------- Copy-email buttons ---------- */
  safely('email copy', () => {
    $$('.email-copy').forEach((btn) => btn.addEventListener('click', async () => {
      await copyText(btn.dataset.email);
      btn.classList.add('is-copied');
      setTimeout(() => btn.classList.remove('is-copied'), 1500);
    }));
  });

  /* ---------- Cursor follower ring ---------- */
  safely('cursor', () => {
    if (!finePointer) return;
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor__ring"></div>';
    document.body.appendChild(cursor);
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let frame = 0;
    let shown = false;

    const move = () => {
      const k = motion.ok ? 0.22 : 1;
      x += (tx - x) * k;
      y += (ty - y) * k;
      cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? raf(move) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        x = tx;
        y = ty;
        shown = true;
        cursor.classList.add('is-visible');
      }
      if (!frame) frame = raf(move);
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const target = e.target instanceof Element ? e.target.closest('a, button, input, [role="option"]') : null;
      cursor.classList.toggle('is-hover', Boolean(target));
    });
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    root.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-visible');
      shown = false;
    });
  });

  /* ---------- Command palette (Ctrl/⌘ + K) ---------- */
  safely('command palette', () => {
    const palette = $('#palette');
    const input = $('#paletteInput');
    const list = $('#paletteList');
    const openBtn = $('#cmdOpen');
    if (!palette || !input || !list) return;

    const svg = (paths) => `<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    const ICONS = {
      hash: svg('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
      up: svg('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>'),
      copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
      mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
      motion: svg('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
      user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
      external: svg('<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>'),
    };
    const GMAIL = 'https://mail.google.com/mail/?view=cm&fs=1&to=fuyad@neodimensional.com';
    const openUrl = (url) => window.open(url, '_blank', 'noopener,noreferrer');
    const go = (hash) => {
      const target = $(hash);
      if (!target) return;
      target.scrollIntoView({ behavior: motion.ok ? 'smooth' : 'auto', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    const commands = [
      { group: 'Navigate', label: 'About', hint: '01', icon: 'hash', run: () => go('#about') },
      { group: 'Navigate', label: 'Skills', hint: '02', icon: 'hash', run: () => go('#skills') },
      { group: 'Navigate', label: 'Projects', hint: '03', icon: 'hash', run: () => go('#projects') },
      { group: 'Navigate', label: 'Contact', hint: '04', icon: 'hash', run: () => go('#contact') },
      { group: 'Navigate', label: 'Back to top', icon: 'up', run: () => go('#top') },
      { group: 'Actions', label: 'Copy work email', hint: 'fuyad@neodimensional.com', icon: 'copy', run: () => copyText('fuyad@neodimensional.com') },
      { group: 'Actions', label: 'Copy personal email', hint: 'fuyadhassanswe@gmail.com', icon: 'copy', run: () => copyText('fuyadhassanswe@gmail.com') },
      { group: 'Actions', label: 'Email me on Gmail', icon: 'mail', run: () => openUrl(GMAIL) },
      ...(reduceMQ.matches ? [] : [{
        group: 'Actions', label: 'Toggle animations', keywords: 'motion reduce', icon: 'motion',
        run: () => { motion.set(!motion.ok); showToast(motion.ok ? 'Animations on' : 'Animations off'); },
      }]),
      { group: 'Links', label: 'GitHub profile', icon: 'user', run: () => openUrl('https://github.com/Fuyad22') },
      { group: 'Links', label: 'LinkedIn profile', icon: 'user', run: () => openUrl('https://www.linkedin.com/in/fuyad-hassan/') },
      { group: 'Links', label: 'MUBUS — source', keywords: 'flutter bus tracker', icon: 'external', run: () => openUrl('https://github.com/Fuyad22/MUBUS') },
      { group: 'Links', label: 'Fake News Detector — source', keywords: 'python ml', icon: 'external', run: () => openUrl('https://github.com/Fuyad22/Fake-News-Detector') },
      { group: 'Links', label: 'Rent House — source', keywords: 'vue', icon: 'external', run: () => openUrl('https://github.com/Fuyad22/Rent_House') },
      { group: 'Links', label: 'Student Enrollment System — source', keywords: 'java swing', icon: 'external', run: () => openUrl('https://github.com/Fuyad22/Student_Enrollment_Project') },
      { group: 'Links', label: 'StudentLifeHub — live site', keywords: 'html', icon: 'external', run: () => openUrl('https://fuyad22.github.io/StudentLifeHub/') },
    ];

    let filtered = [];
    let active = 0;
    let lastFocus = null;

    const setActive = (i) => {
      active = i;
      $$('.palette__item', list).forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.index) === i)));
      const el = i >= 0 ? $(`#palette-opt-${i}`) : null;
      if (el) {
        input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const render = () => {
      const q = input.value.trim().toLowerCase();
      filtered = commands.filter((c) => !q || `${c.label} ${c.keywords || ''} ${c.group}`.toLowerCase().includes(q));
      list.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement('li');
        empty.className = 'palette__empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = 'No results';
        list.appendChild(empty);
        setActive(-1);
        return;
      }
      let group = '';
      filtered.forEach((c, i) => {
        if (c.group !== group) {
          group = c.group;
          const heading = document.createElement('li');
          heading.className = 'palette__group';
          heading.setAttribute('role', 'presentation');
          heading.setAttribute('aria-hidden', 'true');
          heading.textContent = group;
          list.appendChild(heading);
        }
        const item = document.createElement('li');
        item.className = 'palette__item';
        item.id = `palette-opt-${i}`;
        item.dataset.index = String(i);
        item.setAttribute('role', 'option');
        item.innerHTML = ICONS[c.icon] || '';
        const label = document.createElement('span');
        label.className = 'palette__label';
        label.textContent = c.label;
        item.appendChild(label);
        if (c.hint) {
          const hint = document.createElement('span');
          hint.className = 'palette__hint';
          hint.textContent = c.hint;
          item.appendChild(hint);
        }
        item.addEventListener('mousemove', () => { if (active !== i) setActive(i); });
        item.addEventListener('click', () => run(i));
        list.appendChild(item);
      });
      setActive(Math.min(Math.max(active, 0), filtered.length - 1));
    };

    const open = () => {
      if (!palette.hidden) return;
      lastFocus = document.activeElement;
      palette.hidden = false;
      document.body.classList.add('palette-open');
      input.value = '';
      active = 0;
      render();
      input.focus();
    };
    const close = () => {
      if (palette.hidden) return;
      palette.hidden = true;
      document.body.classList.remove('palette-open');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    };
    function run(i) {
      const cmd = filtered[i];
      if (!cmd) return;
      close();
      cmd.run();
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      const n = filtered.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setActive((active + 1) % n); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setActive((active - 1 + n) % n); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    palette.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key || '').toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.hidden) open(); else close();
      }
    });
    if (openBtn) openBtn.addEventListener('click', open);
  });

  /* ---------- Footer animations switch ---------- */
  safely('motion toggle', () => {
    const toggle = $('#motionToggle');
    if (!toggle) return;
    if (reduceMQ.matches) {
      toggle.hidden = true;
      return;
    }
    const sync = () => toggle.setAttribute('aria-checked', String(motion.ok));
    sync();
    toggle.addEventListener('click', () => {
      motion.set(!motion.ok);
      showToast(motion.ok ? 'Animations on' : 'Animations off');
    });
    motion.onChange(sync);
  });

  safely('shortcut hint', () => {
    const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
    $$('.mod-key').forEach((k) => { k.textContent = mac ? '⌘' : 'Ctrl'; });
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  root.classList.add('fh-ready');
})();
