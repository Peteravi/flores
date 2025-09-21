/* ====== Utilidades ====== */
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("scene");
const fx = document.getElementById("fx");
function S(tag, attrs = {}) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

/* ====== Defs (gradientes y sombra) ====== */
(function defs() {
    const d = S("defs");

    const petal = S("radialGradient", { id: "petalGrad", cx: "50%", cy: "40%", r: "70%" });
    petal.append(S("stop", { offset: "0%", "stop-color": "#fffbe1" }));
    petal.append(S("stop", { offset: "55%", "stop-color": "#ffe053" }));
    petal.append(S("stop", { offset: "100%", "stop-color": "#f9a602" }));
    d.append(petal);

    const center = S("radialGradient", { id: "centerGrad", cx: "50%", cy: "45%", r: "60%" });
    center.append(S("stop", { offset: "0%", "stop-color": "#392006" }));
    center.append(S("stop", { offset: "65%", "stop-color": "#6e3b09" }));
    center.append(S("stop", { offset: "100%", "stop-color": "#8a4d0f" }));
    d.append(center);

    const leaf = S("linearGradient", { id: "leafGrad", x1: "0%", y1: "0%", x2: "0%", y2: "100%" });
    leaf.append(S("stop", { offset: "0%", "stop-color": "#2a7b3f" }));
    leaf.append(S("stop", { offset: "100%", "stop-color": "#1b522a" }));
    d.append(leaf);

    const f = S("filter", { id: "ds", x: "-40%", y: "-40%", width: "180%", height: "180%" });
    f.append(S("feDropShadow", { dx: 0, dy: 2, stdDeviation: 3, "flood-opacity": .45 }));
    d.append(f);

    svg.append(d);
})();

/* ====== Construcción del ramo ====== */
const BASE_Y = 530;
const flowers = [];
function leafPath(len = 26) {
    return S("path", {
        d: `M0 0 C ${len * 0.4} -${len * 0.4}, ${len * 0.8} -${len * 0.1}, ${len} 0
                       C ${len * 0.8} ${len * 0.1}, ${len * 0.4} ${len * 0.4}, 0 0 Z`,
        fill: "url(#leafGrad)", stroke: "#174c27", "stroke-width": 2
    });
}
function blossom(scale = 1) {
    const g = S("g", { transform: `scale(${scale})` });
    const petals = S("g", { id: "petals" }); const N = 16;
    for (let k = 0; k < N; k++) {
        petals.appendChild(S("path", {
            d: "M0,-58 C 16,-24 16,-8 0,0 C -16,-8 -16,-24 0,-58 Z",
            transform: `rotate(${(360 / N) * k})`, fill: "url(#petalGrad)"
        }));
    }
    g.appendChild(petals);
    g.appendChild(S("circle", { cx: 0, cy: 0, r: 22, fill: "url(#centerGrad)", stroke: "#3a1f00", "stroke-width": 3 }));
    const seeds = S("g", { opacity: .8 });
    for (let i = 0; i < 24; i++) {
        const a = (Math.PI * 2 * i) / 24, r = 13 + (i % 2 ? 3 : 0);
        seeds.appendChild(S("circle", { cx: Math.cos(a) * r, cy: Math.sin(a) * r, r: 1.5, fill: "#2e1600" }));
    }
    g.appendChild(seeds);
    return { group: g, petals };
}
function createFlower(baseX, len = 210, bend = 0.22, scale = 1) {
    const root = S("g", { transform: `translate(${baseX}, ${BASE_Y})`, filter: "url(#ds)" });
    const topY = -len; const ctrlX0 = (bend >= 0 ? len * bend : -len * bend) * 1.1;
    const stem = S("path", { d: `M 0 0 Q ${ctrlX0} ${topY * 0.5} 0 ${topY}`, stroke: "#1c6b2f", "stroke-width": 6, fill: "none" });
    root.append(stem);

    const leavesG = S("g"); const leaves = []; const n = Math.max(4, Math.round(len / 55));
    for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1), y = topY * t, side = i % 2 ? -1 : 1;
        const Lg = S("g", { transform: `translate(${12 * side}, ${y + 10}) rotate(${side * 22})` });
        Lg.appendChild(leafPath(24 + (i % 3) * 6));
        leavesG.appendChild(Lg);
        leaves.push({ node: Lg, side, amp: 8 + (i % 3) * 3 });
    }
    root.append(leavesG);

    const head = S("g", { transform: `translate(0, ${topY})` });
    const bl = blossom(scale); head.append(bl.group); root.append(head);

    const shadow = S("ellipse", { cx: 0, cy: 0, rx: 36, ry: 8, fill: "rgba(0,0,0,.35)" });
    const shadowWrap = S("g", { transform: `translate(${baseX}, ${BASE_Y})` }); shadowWrap.append(shadow); svg.append(shadowWrap);

    svg.append(root);
    flowers.push({
        baseX, root, stem, ctrlX0, len, topY, head,
        petalsGroup: bl.petals, leaves, shadow, shadowWrap,
        amp: 2.2 + (220 / len), phase: Math.random() * Math.PI * 2
    });
}

/* Distribución del ramo */
const bases = [420, 360, 480, 315, 530, 300, 545];
const lens = [230, 200, 205, 185, 185, 170, 170];
const bends = [0.06, -0.08, 0.10, -0.05, 0.07, 0.09, -0.04];
const scales = [1.00, 0.92, 0.92, 0.90, 0.90, 0.82, 0.82];
for (let i = 0; i < bases.length; i++) createFlower(bases[i], lens[i], bends[i], scales[i]);

/* ====== Animación del viento (mejorada) ====== */
/* ruido suave + ráfagas + dirección lenta */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function smoothNoise(t) { return 0.6 * Math.sin(t * 0.6) + 0.35 * Math.sin(t * 0.13 + 1.7) + 0.2 * Math.sin(t * 0.05 + 0.4); }
function gust(t) { const x = Math.sin(t * 0.12 - 1.2); return Math.max(0, x) ** 3; }

let t0 = performance.now() / 1000;
let ampScale = 1; // se ajusta a tamaño de pantalla

function recalcAmplitude() {
    // Ajusta la intensidad según el alto de la tarjeta (para móviles no se vea exagerado)
    const r = svg.getBoundingClientRect();
    const h = Math.max(1, r.height);
    ampScale = Math.max(0.75, Math.min(1.15, h / 580));
}
new ResizeObserver(recalcAmplitude).observe(document.querySelector(".card"));
recalcAmplitude();

function animate() {
    if (reduceMotion) return; // respetar accesibilidad

    const t = performance.now() / 1000 - t0;
    const dir = Math.sin(t * 0.07);                           // dirección lenta
    const wind = (0.7 * smoothNoise(t) + 1.4 * gust(t)) * dir;   // magnitud variable

    // parallax muy sutil del propio SVG
    svg.style.transform = `translate3d(${Math.sin(t * 0.15) * 4}px, 0, 0)`;

    flowers.forEach((F, i) => {
        const local = wind + 0.35 * Math.sin(t * 0.9 + F.phase);
        const angle = local * F.amp * ampScale;   // grados ajustados a pantalla

        // doblado real del tallo
        const ctrlX = F.ctrlX0 + angle * 0.8;
        F.stem.setAttribute("d", `M 0 0 Q ${ctrlX} ${F.topY * 0.5} 0 ${F.topY}`);

        // giro desde la base (pequeño)
        F.root.setAttribute("transform", `translate(${F.baseX}, ${BASE_Y}) rotate(${angle * 0.35})`);

        // hojas (cada una con su micro-oscilación)
        F.leaves.forEach((L, k) => {
            const leafAngle = L.side * (18 + L.amp * 0.6 + 6 * Math.sin(t * 1.6 + F.phase + k)) + angle * 0.25;
            L.node.setAttribute("transform", L.node.getAttribute("transform").replace(/rotate\([^)]*\)/, `rotate(${leafAngle})`));
        });

        // cabeza + pétalos
        const pulse = 1 + 0.02 * Math.sin(t * 2.1 + F.phase);
        const flutter = 2.8 * Math.sin(t * 2.7 + F.phase * 1.3) + angle * 0.12;
        F.head.setAttribute("transform", `translate(0, ${F.topY}) scale(${pulse})`);
        F.petalsGroup.setAttribute("transform", `rotate(${flutter})`);

        // sombra en el suelo
        const squash = 1 + Math.abs(angle) * 0.03;
        F.shadow.setAttribute("transform", `scale(${squash},1)`);
    });

    requestAnimationFrame(animate);
}
animate();

/* ====== FX: luciérnagas con parallax ====== */
(function fxLayer() {
    if (reduceMotion) return;
    const ctx = fx.getContext("2d");
    let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let particles = [];

    function resize() {
        const { width, height } = fx.getBoundingClientRect();
        fx.width = Math.floor(width * DPR);
        fx.height = Math.floor(height * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        particles = [];
        const n = 55;
        for (let i = 0; i < n; i++) {
            particles.push({
                x: Math.random() * width, y: Math.random() * height,
                r: 0.6 + Math.random() * 2.2, a: 0.25 + Math.random() * 0.55,
                tw: Math.random() * Math.PI * 2,
                vx: -0.3 + Math.random() * 0.6, vy: 0.05 + Math.random() * 0.15,
                z: Math.random() * 1.2 + 0.4 // parallax
            });
        }
    }
    new ResizeObserver(resize).observe(document.querySelector(".card"));
    resize();

    function tick() {
        ctx.clearRect(0, 0, fx.width, fx.height);
        ctx.globalCompositeOperation = "lighter";
        const W = fx.width / DPR, H = fx.height / DPR;
        const t = (performance.now() / 1000 - t0);

        particles.forEach(p => {
            p.tw += 0.03;
            const tw = 0.4 + 0.6 * Math.sin(p.tw);
            p.x += (p.vx + 0.15 * Math.sin(p.tw * 0.7)) * p.z;
            p.y += (p.vy) * p.z;

            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y > H + 10) p.y = -10;

            // leve parallax horizontal sincronizado con la escena
            const px = p.x + Math.sin(t * 0.15) * 3 * (1 / p.z);

            ctx.globalAlpha = p.a * tw;
            const g = ctx.createRadialGradient(px, p.y, 0, px, p.y, p.r * 6);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, p.y, p.r * 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
        requestAnimationFrame(tick);
    }
    tick();
})();

/* ====== Mensaje ====== */
(function message() {
    const firma = "Peter Aviles EL MEJOR ING EN SISTEMAS HUMILDEMENTE";
    const lineas = [
        "Eres luz en los días grises y calma en la tormenta.",
        "Fuerte para levantar tus sueños, valiente para ir por ellos.",
        "Hermosa en cada detalle: en tu risa, tu mirada y tu corazón.",
        "Gracias por existir. Hoy y siempre, te celebro."
    ];
    document.getElementById("firma") && (document.getElementById("firma").textContent = firma);
    const f = document.getElementById("fecha");
    if (f) f.textContent = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });

    const out = document.getElementById("typewriter");
    if (!out) return;
    const txt = lineas.join("\n"); let i = 0;
    (function type() { out.textContent = txt.slice(0, i++); if (i <= txt.length) setTimeout(type, 22); })();
})();
