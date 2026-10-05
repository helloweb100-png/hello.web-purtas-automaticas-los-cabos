/* ==========================================================================
   CADENA LOS CABOS - Interacciones
   - Loader con puerta seccional que se abre
   - Scroll suave (Lenis) y barra de progreso
   - Puerta Premium que se abre al verla (y con un toque en el botón)
   - Demo del portón, videos que se reproducen al verse, contadores y línea de proceso
   - Formulario que redirige a WhatsApp

   Principios:
   - Mejora progresiva: si Lenis no carga, la página sigue completa.
   - Las animaciones de apertura (puerta y portón) NO dependen del scroll ni de librerías:
     se activan con IntersectionObserver o con un toque, por eso funcionan en cualquier móvil.
   - prefers-reduced-motion: se quita el scroll suave y los movimientos decorativos;
     la puerta y el portón siguen abriéndose, solo que más rápido.
   - Sin listeners de "scroll" crudos.
   ========================================================================== */
(() => {
  'use strict';

  const WA_NUMBER = '526241772486';
  const root = document.documentElement;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /** Ejecuta cada módulo aislado: si uno falla, el resto sigue funcionando. */
  const safe = (fn) => { try { fn(); } catch (err) { console.error('[Cadena Los Cabos]', err); } };

  let lenis = null;

  /* ------------------------------------------------------------------------
     1. ENLACES DE WHATSAPP (mensaje prellenado por CTA)
     ------------------------------------------------------------------------ */
  function initWhatsAppLinks() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });
  }

  /* ------------------------------------------------------------------------
     2. LOADER: progreso simulado + apertura de la puerta
     ------------------------------------------------------------------------ */
  function initLoader() {
    const loader = $('#loader');
    const countEl = $('#ldCount');
    if (!loader || !countEl) { root.classList.add('ready'); startScroll(); return; }

    if (!location.hash && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);
    root.classList.add('is-loading');

    const MIN_TIME = reduceMotion ? 500 : 2400;
    const MAX_TIME = 6500;
    const startTime = performance.now();
    let pageLoaded = document.readyState === 'complete';
    let finished = false;
    window.addEventListener('load', () => { pageLoaded = true; }, { once: true });

    function finish() {
      if (finished) return;
      finished = true;
      loader.classList.add('is-open');
      setTimeout(() => {
        root.classList.add('ready');
        startScroll();
      }, reduceMotion ? 0 : 380);
      setTimeout(() => {
        loader.classList.add('is-done');
        root.classList.remove('is-loading');
      }, reduceMotion ? 700 : 2100);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const ceiling = pageLoaded ? 100 : 92;
      const value = Math.min(ceiling, easeOutCubic(Math.min(1, elapsed / MIN_TIME)) * 100);
      countEl.textContent = Math.round(value);
      loader.style.setProperty('--p', value.toFixed(1));

      if ((pageLoaded && elapsed >= MIN_TIME) || elapsed >= MAX_TIME) {
        countEl.textContent = '100';
        loader.style.setProperty('--p', '100');
        setTimeout(finish, 280);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------------
     3. SCROLL SUAVE (Lenis) + BARRA DE PROGRESO
     ------------------------------------------------------------------------ */
  function initLenis() {
    if (reduceMotion || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.stop(); // se activa cuando el loader termina

    const bar = $('#progress');
    if (bar) lenis.on('scroll', ({ progress }) => bar.style.setProperty('--sp', progress.toFixed(4)));

    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  function startScroll() { if (lenis) lenis.start(); }

  /* Enlaces ancla con scroll suave y cierre del menú móvil */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = id === '#inicio' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) {
        lenis.scrollTo(id === '#inicio' ? 0 : target, { offset: -72, duration: 1.7 });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      history.pushState(null, '', id);
    });
  }

  /* ------------------------------------------------------------------------
     4. HEADER: estado al hacer scroll, menú móvil, enlace activo
     ------------------------------------------------------------------------ */
  const header = $('#siteHeader');
  const burger = $('#burger');
  const menu = $('#menu');

  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    header.classList.remove('menu-open');
    if (lenis && !root.classList.contains('is-loading')) lenis.start();
  }

  function initHeader() {
    const sentinel = $('#navSentinel');
    if (sentinel && header) {
      // El header cambia de oscuro (sobre la foto) a claro cuando se baja del tope
      new IntersectionObserver(([entry]) => {
        header.classList.toggle('is-scrolled', !entry.isIntersecting);
      }).observe(sentinel);
    }

    if (burger && menu) {
      burger.addEventListener('click', () => {
        if (menu.classList.contains('is-open')) { closeMenu(); return; }
        menu.classList.add('is-open');
        menu.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        header.classList.add('menu-open');
        if (lenis) lenis.stop();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
      window.matchMedia('(min-width: 1180px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
    }

    // Enlace activo según la sección visible
    const links = $$('.nav-links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = Array.from(map.keys()).map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const a = map.get(entry.target.id);
        if (!a) return;
        if (!entry.isIntersecting) { a.removeAttribute('aria-current'); return; }
        links.forEach((l) => l.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ------------------------------------------------------------------------
     5. APARICIÓN: texto por palabras + bloques al entrar en pantalla
     ------------------------------------------------------------------------ */
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const words = text.split(' ');
    words.forEach((word, i) => {
      const mask = document.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'wi';
      inner.style.setProperty('--wi', i);
      inner.textContent = word;
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function initReveal() {
    $$('[data-split]').forEach(splitWords);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('in');
        if (el.classList.contains('rev')) {
          // Al terminar la entrada se limpia, para que los hover propios del elemento no hereden la transición lenta
          const delay = (parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0) * 90;
          setTimeout(() => el.classList.remove('rev', 'in'), 1400 + delay);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    $$('.rev, [data-split]').forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     6. CONTADORES
     ------------------------------------------------------------------------ */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length || reduceMotion) return; // el HTML ya trae el valor final

    const format = (el, value) => {
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      el.textContent = (el.dataset.prefix || '') + value.toFixed(decimals);
    };

    els.forEach((el) => format(el, 0));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const end = parseFloat(el.dataset.count);
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1900);
          format(el, end * easeOutExpo(t));
          if (t < 1) requestAnimationFrame(step); else format(el, end);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     7. PUERTA PREMIUM: se abre al verla y se controla con un toque
     ------------------------------------------------------------------------ */
  function initDoorScene() {
    const scene = $('[data-scene]');
    const btn = $('[data-scene-btn]');
    if (!scene || !btn) return;
    const label = $('[data-scene-label]', btn);
    const frame = $('.scene-frame', scene);

    let touched = false;
    let timer = 0;

    const setOpen = (open) => {
      scene.classList.toggle('is-open', open);
      label.textContent = open ? 'Cerrar puerta' : 'Abrir puerta';
    };
    const toggle = () => {
      touched = true;
      clearTimeout(timer);
      setOpen(!scene.classList.contains('is-open'));
    };

    btn.addEventListener('click', toggle);
    frame.addEventListener('click', toggle);

    // Se abre sola cuando más de la mitad está a la vista, y se cierra al salir para repetir la animación
    new IntersectionObserver(([entry]) => {
      if (touched) return;
      clearTimeout(timer);
      if (entry.intersectionRatio >= 0.55) {
        timer = setTimeout(() => setOpen(true), 450);
      } else if (!entry.isIntersecting) {
        setOpen(false);
      }
    }, { threshold: [0, 0.55] }).observe(scene);
  }

  /* ------------------------------------------------------------------------
     8. DEMO DEL PORTÓN
     ------------------------------------------------------------------------ */
  function initGateDemo() {
    const demo = $('[data-gate]');
    const btn = $('#gateBtn');
    if (!demo || !btn) return;
    const label = $('.remote-txt', btn);

    let isOpen = false;
    let touched = false;
    let inView = false;
    let pulseTimer = 0;

    const pulse = () => {
      demo.classList.remove('is-pulsing');
      void demo.offsetWidth; // reinicia la animación
      demo.classList.add('is-pulsing');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => demo.classList.remove('is-pulsing'), 1900);
    };

    const setOpen = (value) => {
      isOpen = value;
      demo.classList.toggle('is-open', value);
      label.textContent = value ? label.dataset.open : label.dataset.closed;
      pulse();
    };

    btn.addEventListener('click', () => { touched = true; setOpen(!isOpen); });

    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0.4 }).observe(demo);

    // Mientras nadie lo toque, el portón se abre y cierra solo para mostrar qué hace
    if (!reduceMotion) {
      setInterval(() => { if (inView && !touched) setOpen(!isOpen); }, 3800);
    }
  }

  /* ------------------------------------------------------------------------
     9. LÍNEA DE PROCESO: los pasos se encienden al verlos
     ------------------------------------------------------------------------ */
  function initTimeline() {
    const timeline = $('#timeline');
    if (!timeline) return;
    const steps = $$('.tl-step', timeline);
    const horizontal = window.matchMedia('(min-width: 1024px)').matches;

    const update = () => {
      let last = -1;
      steps.forEach((s, i) => { if (s.classList.contains('is-on')) last = i; });
      timeline.style.setProperty('--p', Math.max(0, last) / (steps.length - 1));
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const index = steps.indexOf(entry.target);
        // En horizontal los 4 pasos entran a la vez: se encienden en cascada
        const delay = horizontal && !reduceMotion ? index * 450 : 0;
        setTimeout(() => { entry.target.classList.add('is-on'); update(); }, delay);
      });
    }, { threshold: 0.7, rootMargin: '0px 0px -8% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ------------------------------------------------------------------------
     10. VIDEOS: se reproducen al verse y se pausan al salir
     ------------------------------------------------------------------------ */
  function initVideos() {
    const videos = $$('video[data-autoplay]');
    if (!videos.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (!reduceMotion && !video.dataset.userPaused) video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.5 });

    videos.forEach((video) => {
      const figure = video.closest('.vid');
      const toggle = $('.vid-toggle', figure);
      video.addEventListener('play', () => {
        figure.classList.add('is-playing');
        if (toggle) toggle.setAttribute('aria-label', 'Pausar video');
      });
      video.addEventListener('pause', () => {
        figure.classList.remove('is-playing');
        if (toggle) toggle.setAttribute('aria-label', 'Reproducir video');
      });
      if (toggle) {
        toggle.addEventListener('click', () => {
          if (video.paused) { delete video.dataset.userPaused; video.play().catch(() => {}); }
          else { video.dataset.userPaused = '1'; video.pause(); }
        });
        toggle.setAttribute('aria-label', 'Reproducir video');
      }
      io.observe(video);
    });
  }

  /* ------------------------------------------------------------------------
     11. FORMULARIO: validación en línea y envío a WhatsApp
     ------------------------------------------------------------------------ */
  function initForm() {
    const form = $('#cForm');
    if (!form) return;
    const submitBtn = $('#submitBtn');
    const label = $('.btn-label', submitBtn);
    const okMsg = $('#formOk');

    const rules = {
      fn: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre completo.'),
      ft: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Escribe un teléfono de 10 dígitos para poder responderte.'),
      fs: (v) => (v ? '' : 'Elige qué necesitas.'),
    };

    const setError = (id, message) => {
      const input = $('#' + id);
      const err = $('#' + id + '-err');
      input.closest('.field').classList.toggle('has-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      err.textContent = message;
    };

    Object.keys(rules).forEach((id) => {
      const input = $('#' + id);
      const handler = () => { if (input.closest('.field').classList.contains('has-error')) setError(id, rules[id](input.value)); };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      okMsg.textContent = '';

      let firstInvalid = null;
      Object.keys(rules).forEach((id) => {
        const message = rules[id]($('#' + id).value);
        setError(id, message);
        if (message && !firstInvalid) firstInvalid = $('#' + id);
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const nombre = $('#fn').value.trim();
      const telefono = $('#ft').value.trim();
      const tipo = $('#fs').value;
      const detalles = $('#fm').value.trim();

      const text = [
        `Hola, soy ${nombre}.`,
        `Quiero cotizar: ${tipo}.`,
        detalles ? `Detalles: ${detalles}` : '',
        `Mi teléfono: ${telefono}`,
      ].filter(Boolean).join('\n');
      const url = waLink(text);

      submitBtn.disabled = true;
      label.textContent = 'Abriendo WhatsApp...';

      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url; // si el navegador bloquea la ventana, se navega en la misma pestaña

      okMsg.textContent = 'Listo. Se abrió WhatsApp con tu mensaje. ';
      const retry = document.createElement('a');
      retry.href = url; retry.target = '_blank'; retry.rel = 'noopener';
      retry.className = 'link';
      retry.textContent = 'Si no se abrió, toca aquí.';
      okMsg.appendChild(retry);

      setTimeout(() => { submitBtn.disabled = false; label.textContent = 'Enviar mi solicitud'; }, 2600);
    });
  }

  /* ------------------------------------------------------------------------
     12. WHATSAPP FLOTANTE: aviso discreto una sola vez
     ------------------------------------------------------------------------ */
  function initFloatingWhatsApp() {
    const float = $('#waFloat');
    if (!float) return;
    const show = () => {
      float.classList.add('show-tip');
      setTimeout(() => float.classList.remove('show-tip'), 5200);
    };
    const wait = setInterval(() => {
      if (root.classList.contains('ready')) { clearInterval(wait); setTimeout(show, 5000); }
    }, 400);
  }

  /* ------------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------------ */
  safe(initWhatsAppLinks);
  safe(initLenis);
  safe(initAnchors);
  safe(initHeader);
  safe(initReveal);
  safe(initCounters);
  safe(initDoorScene);
  safe(initGateDemo);
  safe(initTimeline);
  safe(initVideos);
  safe(initForm);
  safe(initFloatingWhatsApp);
  safe(initLoader);
})();
