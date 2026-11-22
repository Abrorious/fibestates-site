/* Investor Time Machine — monthly cash-flow model + UI.
   All money is computed in AED and converted for display. */
(function () {
    const P = window.FIB_PROJECTS;
    const FX = window.FIB_AED_PER_USD;
    const DLD = 0.04;          // Dubai Land Department fee at purchase
    const EXIT = 0.02;         // selling costs at exit
    const GV = 2000000;        // Golden Visa property threshold, AED
    const MAX_Y = 15;
    const START = new Date().getFullYear();

    const PLANS = {
        '60/40': { book: 0.20, build: 0.40, hand: 0.40, post: 0, postM: 0, label: '60/40' },
        '70/30': { book: 0.10, build: 0.60, hand: 0.30, post: 0, postM: 0, label: '70/30' },
        'post': { book: 0.10, build: 0.40, hand: 0, post: 0.50, postM: 36, label: '50/50 post-handover' },
        'ready': { book: 1.00, build: 0, hand: 0, post: 0, postM: 0, label: 'Ready, 100% upfront' }
    };

    const $ = (id) => document.getElementById(id);
    const el = {
        project: $('tmProject'), price: $('tmPrice'), priceOut: $('tmPriceOut'), plan: $('tmPlan'),
        hand: $('tmHandover'), handOut: $('tmHandoverOut'), handField: $('handoverField'),
        aBuild: $('aBuild'), aAfter: $('aAfter'), aYield: $('aYield'), aCosts: $('aCosts'),
        t: $('tmT'), year: $('tmYear'), scale: $('tmScale'), chart: $('tmChart'),
        mValue: $('mValue'), mPaid: $('mPaid'), mRent: $('mRent'), mEquity: $('mEquity'), mProfit: $('mProfit'), mIrr: $('mIrr'),
        gv: $('tmGv'), handNote: $('tmHandNote'), schedule: $('tmSchedule'), wa: $('tmWhatsapp'), email: $('tmEmail')
    };
    if (!el.project) return;

    const state = { cur: 'AED', plan: '60/40', projectId: P[0].id, priceAED: Math.round(P[0].usd * FX / 50000) * 50000 };

    // ---------- formatting ----------
    const conv = (aed) => state.cur === 'USD' ? aed / FX : aed;
    function money(aed, compact = true) {
        const v = conv(aed);
        const s = state.cur === 'USD' ? '$' : 'AED ';
        const a = Math.abs(v), sign = v < 0 ? '−' : '';
        if (!compact) return sign + s + Math.round(a).toLocaleString('en-US');
        if (a >= 1e6) return sign + s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
        if (a >= 1e3) return sign + s + Math.round(a / 1e3) + 'K';
        return sign + s + Math.round(a);
    }
    const pct = (x) => (x * 100).toFixed(1) + '%';

    // ---------- model ----------
    function model() {
        const price = state.priceAED;
        const plan = PLANS[state.plan];
        const H = state.plan === 'ready' ? 0 : Math.round(parseFloat(el.hand.value) * 12);
        const gB = parseFloat(el.aBuild.value) / 100;
        const gA = parseFloat(el.aAfter.value) / 100;
        const y = parseFloat(el.aYield.value) / 100;
        const costs = parseFloat(el.aCosts.value) / 100;
        const N = MAX_Y * 12;

        // payment schedule (month -> amount)
        const pay = new Array(N + 1).fill(0);
        const milestones = [];
        pay[0] += price * plan.book;
        milestones.push({ m: 0, amt: price * plan.book, label: 'Booking' });
        if (plan.build > 0) {
            const n = Math.max(H - 1, 1);
            for (let m = 1; m <= n; m++) pay[Math.min(m, H)] += price * plan.build / n;
            milestones.push({ m: 1, amt: price * plan.build, label: 'During construction', span: n });
        }
        if (plan.hand > 0) { pay[H] += price * plan.hand; milestones.push({ m: H, amt: price * plan.hand, label: 'Handover' }); }
        if (plan.post > 0) {
            for (let m = 1; m <= plan.postM; m++) if (H + m <= N) pay[H + m] += price * plan.post / plan.postM;
            milestones.push({ m: H + 1, amt: price * plan.post, label: 'After handover', span: plan.postM });
        }

        const rows = [];
        let paid = price * DLD, cumPay = 0, rent = 0, vH = price;
        for (let m = 0; m <= N; m++) {
            const value = m <= H ? price * Math.pow(1 + gB, m / 12) : vH * Math.pow(1 + gA, (m - H) / 12);
            if (m === H) vH = value;
            if (m > H || (H === 0 && m > 0)) rent += value * y / 12 * (1 - costs);
            cumPay += pay[m];
            paid = price * DLD + cumPay;
            const remaining = price - cumPay;
            rows.push({ m, value, paid, rent, remaining, equity: value - remaining });
        }
        return { price, H, pay, rows, milestones, plan, gB, gA, y, costs };
    }

    function irrAt(M, T) {
        const cf = new Array(T + 1).fill(0);
        cf[0] -= M.price * DLD;
        for (let m = 0; m <= T; m++) {
            cf[m] -= M.pay[m];
            if (m > 0) cf[m] += M.rows[m].rent - M.rows[m - 1].rent;
        }
        const r = M.rows[T];
        cf[T] += r.value * (1 - EXIT) - r.remaining;
        const npv = (rate) => cf.reduce((s, c, i) => s + c / Math.pow(1 + rate, i), 0);
        let lo = -0.0833, hi = 0.2; // monthly bounds (~-65%/yr .. ~790%/yr)
        if (npv(lo) * npv(hi) > 0) return null;
        for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; (npv(lo) * npv(mid) <= 0) ? hi = mid : lo = mid; }
        const net = cf.reduce((a, b) => a + b, 0);
        return { irr: Math.pow(1 + (lo + hi) / 2, 12) - 1, profit: net };
    }

    // ---------- chart ----------
    const W = 640, Hc = 260, PADL = 8, PADR = 8, PADT = 16, PADB = 4;
    el.ticks = document.createElement('div');
    el.ticks.className = 'chart-ticks';
    el.chart.after(el.ticks);
    function drawChart(M, T) {
        const rows = M.rows.filter(r => r.m % 3 === 0);
        const wealth = (r) => r.equity + r.rent;
        let max = 0, min = 0;
        rows.forEach(r => { max = Math.max(max, r.value, wealth(r), r.paid); min = Math.min(min, wealth(r)); });
        const showGv = GV > min && GV < max * 1.15;
        if (showGv) max = Math.max(max, GV * 1.05);
        max *= 1.06;
        const x = (m) => PADL + (W - PADL - PADR) * m / (MAX_Y * 12);
        const yy = (v) => PADT + (Hc - PADT - PADB) * (1 - (v - min) / (max - min));
        const line = (f) => rows.map((r, i) => (i ? 'L' : 'M') + x(r.m).toFixed(1) + ' ' + yy(f(r)).toFixed(1)).join(' ');
        const area = line(wealth) + ` L${x(MAX_Y * 12)} ${yy(Math.max(min, 0))} L${x(0)} ${yy(Math.max(min, 0))} Z`;
        const tm = T * 12, rT = M.rows[tm];
        const step = window.innerWidth < 640 ? 5 : 3;
        let ticks = '';
        for (let k = 0; k <= MAX_Y; k += step) ticks += `<span${k === MAX_Y ? ' class="end"' : ''} style="left:${(x(k * 12) / W * 100).toFixed(2)}%">${START + k}</span>`;
        el.ticks.innerHTML = ticks + (M.H > 0 ? `<span class="keys" style="left:${(x(M.H) / W * 100).toFixed(2)}%">keys</span>` : '');
        el.chart.innerHTML = `
          <defs>
            <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#d9b46c" stop-opacity=".32"/><stop offset="1" stop-color="#d9b46c" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${[0.25, 0.5, 0.75].map(f => `<line class="grid" x1="0" x2="${W}" y1="${PADT + (Hc - PADT - PADB) * f}" y2="${PADT + (Hc - PADT - PADB) * f}"/>`).join('')}
          ${M.H > 0 ? `<line class="hand" x1="${x(M.H)}" x2="${x(M.H)}" y1="${PADT}" y2="${Hc - PADB}"/>` : ''}
          ${showGv ? `<line class="gv" x1="0" x2="${W}" y1="${yy(GV)}" y2="${yy(GV)}"/>` : ''}
          <path class="area" d="${area}"/>
          <path class="l-paid" d="${line(r => r.paid)}"/>
          <path class="l-value" d="${line(r => r.value)}"/>
          <path class="l-wealth" d="${line(wealth)}"/>
          <rect class="future" x="${x(tm)}" y="0" width="${W - x(tm)}" height="${Hc - PADB}"/>
          <line class="cursor" x1="${x(tm)}" x2="${x(tm)}" y1="${PADT - 6}" y2="${Hc - PADB}"/>
          <circle class="dot" cx="${x(tm)}" cy="${yy(rT.value)}" r="4.5"/>
          <circle class="dot dot-w" cx="${x(tm)}" cy="${yy(wealth(rT))}" r="4.5"/>`;
    }

    // ---------- tweened numbers ----------
    const shown = {};
    function setNum(node, key, val, fmt) {
        if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) { node.textContent = fmt(val); shown[key] = val; return; }
        const o = { v: shown[key] ?? val };
        gsap.to(o, { v: val, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: () => node.textContent = fmt(o.v) });
        shown[key] = val;
    }

    let lastSummary = '';
    function render() {
        const M = model();
        const T = parseInt(el.t.value, 10);
        const r = M.rows[T * 12];
        const res = irrAt(M, T * 12);
        const proj = P.find(p => p.id === state.projectId);

        el.priceOut.textContent = money(state.priceAED, false);
        el.handOut.textContent = el.hand.value.replace('.5', '½') + (el.hand.value === '1' ? ' year' : ' years');
        el.handField.classList.toggle('off', state.plan === 'ready');
        el.year.textContent = START + T;
        [['aBuild', '% / yr'], ['aAfter', '% / yr'], ['aYield', '%'], ['aCosts', '%']].forEach(([k, s]) => $(k + 'Out').textContent = el[k].value + s);

        setNum(el.mValue, 'v', r.value, money);
        setNum(el.mPaid, 'p', r.paid, money);
        setNum(el.mRent, 'r', r.rent, money);
        setNum(el.mEquity, 'e', r.equity, money);
        setNum(el.mProfit, 'pr', res ? res.profit : 0, money);
        el.mIrr.textContent = res ? pct(res.irr) : '—';

        drawChart(M, T);
        $('miniYear').textContent = START + T;
        $('miniValue').textContent = money(r.value);
        $('miniProfit').textContent = money(res ? res.profit : 0);
        $('miniIrr').textContent = res ? pct(res.irr) : '—';

        // Golden Visa + handover badges
        if (r.value >= GV) {
            el.gv.className = 'badge-gv ok';
            el.gv.innerHTML = `<i class="fa-solid fa-passport"></i> Value above AED 2M — may qualify for the 10-year UAE Golden Visa*`;
        } else {
            el.gv.className = 'badge-gv';
            el.gv.innerHTML = `<i class="fa-solid fa-passport"></i> ${money(GV - r.value)} below the AED 2M Golden Visa threshold`;
        }
        const handYear = START + M.H / 12;
        el.handNote.innerHTML = M.H === 0
            ? `<i class="fa-solid fa-key"></i> Ready — rental income from day one`
            : (T * 12 < M.H
                ? `<i class="fa-solid fa-helmet-safety"></i> Under construction until ~${Math.floor(handYear)}. Selling now = assigning your contract.`
                : `<i class="fa-solid fa-key"></i> Keys in ~${Math.floor(handYear)} · rent since then`);

        // schedule
        el.schedule.innerHTML = '<h4>Payment schedule <span>' + M.plan.label + '</span></h4>' + [
            { label: 'DLD fee (4%)', amt: M.price * DLD, when: 'At booking' },
            ...M.milestones.map(s => ({
                label: s.label, amt: s.amt,
                when: s.span ? `${Math.round(s.span)} monthly × ${money(s.amt / s.span)}` : (s.m === 0 ? 'Today' : `Year ${START + Math.floor(s.m / 12)}`)
            }))
        ].map(s => `<div class="sch"><span>${s.label}<small>${s.when}</small></span><b>${money(s.amt)}</b><i style="--w:${Math.min(100, s.amt / M.price * 100)}%"></i></div>`).join('');

        // CTA payloads
        lastSummary = `${proj ? proj.name : 'Custom'} · ${money(state.priceAED, false)} · ${M.plan.label}` +
            (M.H ? ` · handover in ${el.hand.value}y` : '') +
            ` → in ${START + T}: value ${money(r.value)}, profit ${money(res ? res.profit : 0)}, IRR ${res ? pct(res.irr) : '—'}`;
        el.wa.href = 'https://wa.me/971544777337?text=' + encodeURIComponent(`Hi! I ran the Time Machine on fibestates.com:\n${lastSummary}\nCan we discuss this?`);
        el.email.dataset.project = 'Time Machine: ' + (proj ? proj.name : 'Custom');
        el.email.dataset.summary = lastSummary;
    }

    // ---------- wiring ----------
    P.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = `${p.name} — ${p.area}`;
        el.project.appendChild(o);
    });
    const custom = document.createElement('option');
    custom.value = 'custom'; custom.textContent = 'Custom price';
    el.project.appendChild(custom);

    function setProject(id) {
        state.projectId = id;
        el.project.value = id;
        const p = P.find(x => x.id === id);
        if (p) { state.priceAED = Math.round(p.usd * FX / 50000) * 50000; el.price.value = state.priceAED; }
        render();
    }
    el.project.addEventListener('change', () => setProject(el.project.value));
    el.price.addEventListener('input', () => {
        state.priceAED = parseFloat(el.price.value);
        if (state.projectId !== 'custom') { state.projectId = 'custom'; el.project.value = 'custom'; }
        render();
    });
    function segWire(root, attr, cb) {
        root.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            root.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
            cb(b.dataset[attr]);
        }));
    }
    segWire(el.plan, 'plan', v => { state.plan = v; render(); });
    segWire(document.querySelector('.seg-sm'), 'cur', v => { state.cur = v; Object.keys(shown).forEach(k => delete shown[k]); render(); });
    [el.hand, el.aBuild, el.aAfter, el.aYield, el.aCosts, el.t].forEach(i => i.addEventListener('input', render));

    // year scale + drag on chart
    el.scale.innerHTML = Array.from({ length: MAX_Y }, (_, i) => `<span>${(START + i + 1) % 100 === 0 ? START + i + 1 : "'" + String(START + i + 1).slice(2)}</span>`).join('');
    let dragging = false;
    const fromPointer = (e) => {
        const b = el.chart.getBoundingClientRect();
        const t = Math.round((e.clientX - b.left) / b.width * MAX_Y);
        el.t.value = Math.min(MAX_Y, Math.max(1, t)); render();
    };
    el.chart.addEventListener('pointerdown', e => { dragging = true; el.chart.setPointerCapture(e.pointerId); fromPointer(e); });
    el.chart.addEventListener('pointermove', e => dragging && fromPointer(e));
    el.chart.addEventListener('pointerup', () => dragging = false);

    window.FibTimeMachine = { setProject, summary: () => lastSummary };
    el.price.value = state.priceAED;
    render();
    window.addEventListener('resize', () => render());
})();
