/* Golden-angle (phyllotaxis) vortex — WebGL background that you descend into as you scroll. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('spiral');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)').matches;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
    document.body.classList.add('no-webgl');
}

if (renderer) {
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080c, 0.045);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 16);

    const group = new THREE.Group();
    scene.add(group);

    // ---- phyllotaxis points ----
    const N = mobile ? 4200 : 9000;
    const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
    const C = 0.09, RMAX = C * Math.sqrt(N);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
    const gold = new THREE.Color('#d9b46c'), pale = new THREE.Color('#fff1d0'), deep = new THREE.Color('#7a5a2a');
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
        const r = C * Math.sqrt(i + 1), th = i * GA;
        pos[i * 3] = r * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(th);
        pos[i * 3 + 2] = -Math.pow(RMAX - r, 1.35) * 0.55 + (Math.random() - 0.5) * 0.15;
        const k = r / RMAX;
        tmp.copy(deep).lerp(gold, Math.min(1, k * 1.6)).lerp(pale, Math.random() < 0.12 ? 0.8 : 0.0);
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        seed[i] = Math.random() * 100;
        size[i] = 0.6 + Math.random() * 1.4 + (Math.random() < 0.02 ? 2.5 : 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    const uniforms = { uTime: { value: 0 }, uDPR: { value: DPR }, uDim: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, fog: false,
        vertexShader: `
            attribute float aSeed; attribute float aSize;
            uniform float uTime; uniform float uDPR;
            varying vec3 vColor; varying float vTw; varying float vDepth;
            void main() {
                vColor = color;
                vec3 p = position;
                p.z += sin(uTime * 0.6 + aSeed) * 0.06;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vDepth = -mv.z;
                vTw = 0.55 + 0.45 * sin(uTime * (0.8 + fract(aSeed) * 1.6) + aSeed);
                gl_PointSize = min(aSize * uDPR * (72.0 / max(vDepth, 0.5)), 48.0 * uDPR);
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `
            uniform float uDim;
            varying vec3 vColor; varying float vTw; varying float vDepth;
            void main() {
                vec2 c = gl_PointCoord - 0.5;
                float d = length(c);
                float a = smoothstep(0.5, 0.0, d);
                a *= a;
                float fog = clamp(1.0 - (vDepth - 8.0) / 40.0, 0.18, 1.0);
                float near = smoothstep(0.3, 2.5, vDepth);
                gl_FragColor = vec4(vColor * (0.75 + vTw * 0.7), a * fog * near * uDim);
            }`
    });
    const points = new THREE.Points(geo, mat);
    group.add(points);

    // ---- golden (logarithmic) spiral arms ----
    const b = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);
    function arm(offset, opacity) {
        const pts = [];
        for (let th = 0; th <= 26; th += 0.02) {
            const r = 0.01 * Math.exp(b * th);
            if (r > RMAX * 1.05) break;
            pts.push(new THREE.Vector3(r * Math.cos(th + offset), r * Math.sin(th + offset), -Math.pow(Math.max(RMAX - r, 0), 1.35) * 0.55 + 0.02));
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const m = new THREE.LineBasicMaterial({ color: 0xe8c987, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
        return new THREE.Line(g, m);
    }
    const arms = [arm(0, 0.38), arm(Math.PI, 0.22)];
    arms.forEach(a => group.add(a));

    // ---- resize ----
    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < h ? 75 : 60;
        camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ---- input ----
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', e => {
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    const tm = document.getElementById('time-machine');
    let smooth = 0, last = performance.now(), running = true, t = 0;

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });

    function frame(now) {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        t += dt;
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const p = window.scrollY / max;
        smooth += (p - smooth) * Math.min(1, dt * 4);

        // descend: from above the disc, through the centre, down the vortex
        camera.position.z = 16 - smooth * 22;
        mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
        camera.position.x = mouse.x * 0.9;
        camera.position.y = -mouse.y * 0.6;
        camera.lookAt(0, 0, camera.position.z - 10);
        camera.rotation.z = smooth * Math.PI * 0.6;

        group.rotation.z = reduce ? 0 : t * 0.035 + smooth * Math.PI * 1.618;
        // on wide screens the disc sits to the right of the hero copy, then centres as you descend
        const wide = camera.aspect > 1.15;
        group.position.x = wide ? 5.2 * Math.max(0, 1 - smooth * 7) : 0;
        group.position.y = wide ? 0 : 3.2 * Math.max(0, 1 - smooth * 7);
        group.rotation.x = Math.sin(t * 0.1) * 0.04;

        // dim behind the Time Machine so numbers stay readable
        // full brightness in the hero, softer behind content, dimmest behind the Time Machine
        const vh = window.innerHeight;
        let dim = 1 - Math.min(1, window.scrollY / (vh * 0.8)) * 0.5;
        if (tm) {
            const r = tm.getBoundingClientRect();
            const overlap = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
            dim -= overlap * 0.25;
        }
        uniforms.uDim.value += (dim - uniforms.uDim.value) * 0.08;
        uniforms.uTime.value = t;
        arms[0].material.opacity = 0.38 * uniforms.uDim.value;
        arms[1].material.opacity = 0.22 * uniforms.uDim.value;

        renderer.render(scene, camera);
        if (!reduce || t < 0.1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    if (reduce) window.addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    document.body.classList.add('webgl-on');}
