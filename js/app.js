/* Fibonacci Estates — page interactions */
(function () {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    document.getElementById('yr').textContent = new Date().getFullYear();

    // ---------- email (obfuscated) ----------
    const mail = ['abror.husanov', 'fibestates.com'].join('@');
    $$('.email-encoded').forEach(a => { a.textContent = mail; a.href = 'mailto:' + mail; });

    // ---------- smooth scroll ----------
    let lenis = null;
    if (window.Lenis && !reduce) {
        lenis = new Lenis({ duration: 1.15, smoothWheel: true });
        if (hasGsap) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(t => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }
    window.FibScrollTo = (target) => {
        const node = typeof target === 'string' ? document.querySelector(target) : target;
        if (!node) return;
        lenis ? lenis.scrollTo(node, { offset: -10 }) : node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    };
    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.classList.contains('open-modal')) return;
        const href = a.getAttribute('href');
        if (href.length < 2) return;
        e.preventDefault();
        closeMenu();
        window.FibScrollTo(href);
    });

    // ---------- nav ----------
    const nav = $('#nav'), toggle = $('#navToggle'), links = $('#navLinks');
    function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // ---------- rail (active section) ----------
    const railLinks = $$('#rail a');
    const sections = $$('[data-section]');
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) railLinks.forEach(a => a.classList.toggle('on', a.dataset.target === en.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));

    // ---------- golden rectangle (Fibonacci tiling + spiral) ----------
    (function goldenRect() {
        const svg = $('#goldenRect');
        if (!svg) return;
        const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34];
        const u = 610 / 89; // 55+34 = 89 units wide
        // Build squares spiralling inward from the largest (55 isn't in fib list; use generic algorithm)
        const sizes = [55, 34, 21, 13, 8, 5, 3, 2, 1, 1];
        let x = 0, y = 0, w = 89, h = 55, squares = [], arcs = '';
        const dirs = ['L', 'T', 'R', 'B']; // where the square sits in the remaining rect
        sizes.forEach((s, i) => {
            const d = dirs[i % 4];
            let sq;
            if (d === 'L') { sq = [x, y, s]; x += s; w -= s; }
            else if (d === 'T') { sq = [x, y, s]; y += s; h -= s; }
            else if (d === 'R') { sq = [x + w - s, y, s]; w -= s; }
            else { sq = [x, y + h - s, s]; h -= s; }
            squares.push(sq);
            const [sx, sy] = sq;
            // quarter arc per square, continuing the spiral
            const S = s * u, X = sx * u, Y = sy * u;
            let p;
            if (d === 'L') p = `M${X} ${Y + S} A${S} ${S} 0 0 1 ${X + S} ${Y}`;
            else if (d === 'T') p = `M${X} ${Y} A${S} ${S} 0 0 1 ${X + S} ${Y + S}`;
            else if (d === 'R') p = `M${X + S} ${Y} A${S} ${S} 0 0 1 ${X} ${Y + S}`;
            else p = `M${X + S} ${Y + S} A${S} ${S} 0 0 1 ${X} ${Y}`;
            arcs += p + ' ';
        });
        svg.innerHTML = squares.map(([sx, sy, s], i) =>
            `<rect class="gsq" x="${sx * u}" y="${sy * u}" width="${s * u}" height="${s * u}"/>` +
            (s * u > 22 ? `<text class="gnum" x="${sx * u + 8}" y="${sy * u + 18}">${s}</text>` : '')
        ).join('') + `<path class="garc" d="${arcs}"/>`;
        void fib;
        if (hasGsap && !reduce) {
            const arc = svg.querySelector('.garc');
            const len = arc.getTotalLength();
            gsap.set(arc, { strokeDasharray: len, strokeDashoffset: len });
            gsap.to(arc, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: svg, start: 'top 85%', end: 'bottom 35%', scrub: 1 } });
            gsap.from(svg.querySelectorAll('.gsq'), { opacity: 0, scale: 0.9, transformOrigin: 'center', stagger: 0.08, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: svg, start: 'top 80%' } });
        }
    })();

    // ---------- collections ----------
    (function collections() {
        const track = $('#collTrack');
        if (!track) return;
        const fmt = (usd) => usd >= 1e6 ? '$' + (usd / 1e6).toFixed(usd % 1e6 ? 1 : 0) + 'M' : '$' + Math.round(usd / 1e3) + 'K';
        const fibN = [1, 1, 2, 3, 5, 8, 13, 21];
        track.innerHTML = window.FIB_PROJECTS.map((p, i) => `
          <article class="pcard">
            <div class="pimg"><img src="${p.img}" alt="${p.name}, ${p.area}" loading="lazy"><span class="pbadge">${p.badge}</span><span class="pfib">${fibN[i]}</span></div>
            <div class="pbody">
              <h3>${p.name}</h3>
              <p class="ploc"><i class="fa-solid fa-location-dot"></i> ${p.area}</p>
              <p class="pspec">${p.beds} · ${p.size}</p>
              <div class="pfoot">
                <span class="pprice">From <b>${fmt(p.usd)}</b></span>
              </div>
              <div class="pact">
                <button class="btn btn-gold btn-sm run-tm" data-id="${p.id}"><i class="fa-solid fa-hourglass-half"></i> Run in Time Machine</button>
                <button class="btn btn-ghost btn-sm open-modal" data-project="${p.name}">Brochure</button>
              </div>
            </div>
          </article>`).join('') + `<div class="pend"><p>Can't see your project?</p><a class="btn btn-ghost" href="https://wa.me/971544777337" target="_blank" rel="noopener">Ask about 47 more</a></div>`;
        track.addEventListener('click', e => {
            const b = e.target.closest('.run-tm');
            if (!b) return;
            window.FibTimeMachine && window.FibTimeMachine.setProject(b.dataset.id);
            window.FibScrollTo('#time-machine');
        });

        if (hasGsap && !reduce) {
            gsap.matchMedia().add('(min-width: 900px)', () => {
                const outer = $('.coll-track-outer');
                const dist = () => Math.max(0, track.scrollWidth - outer.clientWidth);
                gsap.to(track, {
                    x: () => -dist(), ease: 'none',
                    scrollTrigger: { trigger: '#collections', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
                });
            });
        }
    })();

    // ---------- reveals ----------
    if (hasGsap && !reduce) {
        gsap.from('.hero-title .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.2 });
        gsap.from('.hero .reveal', { y: 24, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.55 });
        gsap.to('.hero-inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        $$('.section .eyebrow, .section .h2, .section .h1, .section .lead, .card, .compare, .adv li, .stat, .broker-photo').forEach(n => {
            gsap.from(n, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 88%' } });
        });
    }

    // ---------- counters ----------
    $$('[data-count]').forEach(n => {
        const target = +n.dataset.count;
        const run = () => {
            if (!hasGsap || reduce) { n.textContent = target; return; }
            const o = { v: 0 };
            gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: () => n.textContent = Math.round(o.v) });
        };
        const ob = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(); ob.disconnect(); } }), { threshold: 0.6 });
        ob.observe(n);
    });

    // ---------- testimonials ----------
    const quotes = $$('.quote');
    let qi = 0;
    if (quotes.length > 1) setInterval(() => {
        quotes[qi].classList.remove('on');
        qi = (qi + 1) % quotes.length;
        quotes[qi].classList.add('on');
    }, 6500);

    // ---------- lead modal ----------
    const modal = $('#leadModal');
    const step1 = $('#step1'), step2 = $('#step2'), step3 = $('#step3');
    const err = $('#step1Error');
    const projectInput = $('#projectInterest'), summaryInput = $('#calcSummary');
    function showStep(n) { [step1, step2, step3].forEach((s, i) => s.hidden = i !== n - 1); }
    function openModal(btn) {
        showStep(1); err.hidden = true;
        const project = btn && btn.dataset.project;
        if (project) {
            projectInput.value = project;
            $('#modalTitle').textContent = btn.dataset.source === 'time-machine' ? 'Get your full breakdown' : 'Request brochure';
            $('#modalSub').textContent = btn.dataset.source === 'time-machine'
                ? 'We\'ll send the year-by-year plan, plus the Insider\'s Guide.'
                : `Full details, floor plans and payment plan for ${project}.`;
        } else {
            projectInput.value = '2026 Insider Guide';
            $('#modalTitle').textContent = 'Download the 2026 Insider\'s Guide';
            $('#modalSub').textContent = 'Enter your details for instant access.';
        }
        summaryInput.value = (btn && btn.dataset.summary) || '';
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('show'));
        lenis && lenis.stop();
        setTimeout(() => $('#phone').focus(), 250);
    }
    function closeModal() {
        modal.classList.remove('show');
        lenis && lenis.start();
        setTimeout(() => {
            modal.hidden = true;
            $('#leadForm').reset();
            const b = $('#btnSubmit'); b.disabled = false; b.textContent = 'Get information';
        }, 300);
    }
    document.addEventListener('click', e => {
        const b = e.target.closest('.open-modal');
        if (b) { e.preventDefault(); closeMenu(); openModal(b); }
    });
    $('.modal-x').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

    $('#btnNext').addEventListener('click', () => {
        const phone = $('#phone'), email = $('#email');
        const pv = phone.value.trim(), ev = email.value.trim();
        const okE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev), okP = pv.replace(/\D/g, '').length >= 7;
        phone.classList.toggle('bad', !okP); email.classList.toggle('bad', !okE);
        if (!okP || !okE) {
            err.textContent = !pv || !ev ? 'Please fill in both fields.' : !okE ? 'Please enter a valid email.' : 'Please enter a valid phone number.';
            err.hidden = false; return;
        }
        err.hidden = true; showStep(2); $('#name').focus();
    });
    $('#btnBack').addEventListener('click', () => showStep(1));

    $('#leadForm').addEventListener('submit', e => {
        e.preventDefault();
        const b = $('#btnSubmit');
        b.disabled = true; b.textContent = 'Sending…';
        const data = {
            name: $('#name').value, email: $('#email').value, phone: $('#phone').value,
            intent: $('#intent').value,
            project: projectInput.value + (summaryInput.value ? ' | ' + summaryInput.value : '')
        };
        fetch('https://script.google.com/macros/s/AKfycbyU_JPHUS8yE63nAdjOTOVgI1pX0b1wqegUhjN7PB0rTTsbblm7Zy6EqgT19Yq9DI9_8w/exec', {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data)
        }).then(() => {
            if (typeof gtag === 'function') gtag('event', 'generate_lead', { project: projectInput.value, method: 'Form Popup' });
            showStep(3);
            window.open('Insider_Guide/Guide.pdf', '_blank');
        }).catch(() => {
            b.disabled = false; b.textContent = 'Get information';
            err.textContent = 'Could not send — please try again or message us on WhatsApp.';
            showStep(1); err.hidden = false;
        });
    });

    if (hasGsap) window.addEventListener('load', () => ScrollTrigger.refresh());
})();
