/* dots — scroll-driven animations powered by GSAP + ScrollTrigger */

gsap.registerPlugin(ScrollTrigger);

const IS_MOBILE = window.matchMedia("(max-width: 700px)").matches;
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (REDUCE_MOTION) {
    // Keep the page usable and skip heavy scroll-linked animations.
    ScrollTrigger.getAll().forEach(t => t.kill(false));
}


/* =========================================================
   Smooth anchor scroll for all in-page links (#something)
   - respects fixed nav height
   - cancels on user wheel/touch (autoKill)
   - updates URL hash without a jump
   ========================================================= */
(function smoothAnchors() {
    if (REDUCE_MOTION) return;
    const nav = document.querySelector(".nav");
    const getNavOffset = () => (nav ? nav.offsetHeight : 0) + 10;

    let currentTween = null;
    const cancelTween = () => { if (currentTween) { currentTween.kill(); currentTween = null; } };

    // kill running tween if user interacts with the page
    ["wheel", "touchstart", "keydown"].forEach(evt => {
        window.addEventListener(evt, cancelTween, { passive: true });
    });

    function scrollToY(targetY, duration = 1.1) {
        cancelTween();
        const proxy = { y: window.scrollY };
        currentTween = gsap.to(proxy, {
            y: targetY,
            duration,
            ease: "power3.inOut",
            onUpdate: () => window.scrollTo(0, proxy.y),
            onComplete: () => { currentTween = null; },
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (!href || href === "#" || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            const rect = target.getBoundingClientRect();
            const targetY = Math.max(0, rect.top + window.scrollY - getNavOffset());

            // distance-adaptive duration: longer jumps feel right with more time
            const distance = Math.abs(targetY - window.scrollY);
            const duration = Math.min(1.6, Math.max(0.7, distance / 2400));

            scrollToY(targetY, duration);

            if (history.pushState) {
                history.pushState(null, "", href);
            }
        });
    });

    // if page loads with a hash, land softly after a tick
    if (location.hash && location.hash.length > 1) {
        window.addEventListener("load", () => {
            const target = document.querySelector(location.hash);
            if (!target) return;
            window.scrollTo(0, 0);
            const targetY = Math.max(0, target.getBoundingClientRect().top - getNavOffset());
            setTimeout(() => scrollToY(targetY, 1.2), 150);
        });
    }
})();

/* =========================================================
   Custom cursor
   ========================================================= */
(function cursor() {
    const dot = document.getElementById("cursor-dot");
    if (!dot || window.matchMedia("(max-width: 900px)").matches) return;
    if (REDUCE_MOTION) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let x = mx, y = my;

    document.addEventListener("mousemove", (e) => {
        mx = e.clientX; my = e.clientY;
    });

    gsap.ticker.add(() => {
        x += (mx - x) * 0.22;
        y += (my - y) * 0.22;
        dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });

    const hoverables = "a, button, input, select, .how__step, .compare__card";
    document.querySelectorAll(hoverables).forEach(el => {
        el.addEventListener("mouseenter", () => dot.classList.add("is-hover"));
        el.addEventListener("mouseleave", () => dot.classList.remove("is-hover"));
    });
})();


/* =========================================================
   HERO — title stagger in, parallax orbs
   ========================================================= */
(function hero() {
    if (REDUCE_MOTION) {
        // Ensure hero text is visible without the entrance stagger.
        document.querySelectorAll(".hero__title .word").forEach(w => {
            w.style.transform = "translateY(0%)";
        });
        return;
    }
    const words = document.querySelectorAll(".hero__title .word");
    gsap.to(words, {
        y: "0%",
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.2,
    });

    gsap.from(".hero__eyebrow", { opacity: 0, y: -10, duration: 0.8, delay: 0.1 });
    gsap.from(".hero__sub", { opacity: 0, y: 16, duration: 0.9, delay: 0.7 });
    gsap.from(".hero__cta-row > *", { opacity: 0, y: 16, duration: 0.7, delay: 0.9, stagger: 0.08 });
    gsap.from(".hero__metrics .metric", {
        opacity: 0, y: 20, duration: 0.7, delay: 1.1, stagger: 0.1,
    });

    if (!IS_MOBILE) {
        gsap.to(".hero__orb--1", {
            yPercent: -30, xPercent: -10,
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero__orb--2", {
            yPercent: 30, xPercent: 10,
            scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
    }
})();


/* =========================================================
   Generic counter utility
   ========================================================= */
function animateCounter(el, fromVal, toVal, duration = 1.4) {
    const obj = { v: fromVal };
    gsap.to(obj, {
        v: toVal,
        duration,
        ease: "power3.out",
        onUpdate: () => {
            el.textContent = Math.round(obj.v).toLocaleString("ru-RU");
        },
    });
}


/* =========================================================
   PROBLEM — sticky storytelling
   0.00-0.30  lines reveal one by one
   0.30-0.40  map fades up from below
   0.40-0.65  chaotic courier route draws + counter ticks 0→3280
   0.65-0.85  traffic jams pulse in with labels
   0.85-1.00  verdict slides up, map darkens a touch
   ========================================================= */
(function problem() {
    const section = document.querySelector(".problem");
    if (!section) return;
    if (REDUCE_MOTION) return;

    const lines = section.querySelectorAll(".problem__line");
    const map = section.querySelector(".problem__map");
    const price = section.querySelector(".problem__map-price");
    const priceCounter = document.getElementById("problem-counter");
    const verdict = section.querySelector(".problem__verdict");

    const chaosRoute = document.getElementById("chaos-route");
    const courier = document.getElementById("courier");
    const jams = section.querySelectorAll(".jam");
    const jamLabels = section.querySelectorAll(".jam-label");

    const totalPrice = 3280;

    // prep route draw
    let routeLength = 0;
    if (chaosRoute) {
        routeLength = chaosRoute.getTotalLength();
        chaosRoute.style.strokeDasharray = routeLength;
        chaosRoute.style.strokeDashoffset = routeLength;
    }

    // prep initial states
    gsap.set(lines, { opacity: 0, y: 30 });
    gsap.set(map, { opacity: 0, y: 60 });
    gsap.set(price, { opacity: 0, y: 20 });
    gsap.set(verdict, { opacity: 0, y: 30 });
    gsap.set(jams, { opacity: 0, scale: 0.4, transformOrigin: "center center" });
    gsap.set(jamLabels, { opacity: 0, y: 8 });
    if (courier) gsap.set(courier, { opacity: 0 });

    const state = { courierProgress: -1, displayed: 0, smoothRouteP: 0 };

    // hermite smoothstep — eases a 0..1 ratio so stage transitions glide in/out
    const smooth = (t) => {
        const c = gsap.utils.clamp(0, 1, t);
        return c * c * (3 - 2 * c);
    };

    ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        // longer scrub = more inertia on scroll, which removes the jitter
        scrub: IS_MOBILE ? 1.0 : 1.4,
        onUpdate: (self) => {
            const p = self.progress;

            // ─── stage 1: lines 0.00-0.30 ───
            lines.forEach((line, i) => {
                const start = (i * 0.25) / lines.length;
                const end = start + 0.15;
                const lp = smooth((p - start) / (end - start));
                gsap.set(line, { opacity: i < lines.length - 1 ? lp * 0.85 : lp, y: (1 - lp) * 30 });
            });

            // keep the LAST active line bright
            const activeLineIdx = Math.min(lines.length - 1, Math.floor((p / 0.3) * lines.length));
            lines.forEach((line, i) => {
                if (p < 0.3 && i === activeLineIdx) gsap.set(line, { opacity: 1 });
            });

            // ─── stage 2: map fade 0.30-0.40 ───
            const mapP = smooth((p - 0.30) / 0.10);
            gsap.set(map, { opacity: mapP, y: (1 - mapP) * 60 });

            // dim earlier lines once map appears
            if (p > 0.30) {
                lines.forEach(line => gsap.set(line, { opacity: 0.25 + (1 - mapP) * 0.3 }));
            }

            // ─── stage 3: route + counter 0.40-0.65 ───
            const routeP = smooth((p - 0.40) / 0.25);
            if (chaosRoute) {
                chaosRoute.style.strokeDashoffset = routeLength * (1 - routeP);
            }
            if (!IS_MOBILE && courier && routeLength > 0) {
                if (routeP > 0) {
                    if (Math.abs(routeP - state.smoothRouteP) > 0.01) {
                        const pt = chaosRoute.getPointAtLength(routeLength * routeP);
                        courier.setAttribute("transform", `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`);
                        state.smoothRouteP = routeP;
                    }
                    gsap.to(courier, { opacity: routeP > 0.02 ? 1 : 0, duration: 0.35, overwrite: "auto" });
                } else {
                    gsap.to(courier, { opacity: 0, duration: 0.35, overwrite: "auto" });
                }
            }

            // price counter syncs with route progress
            const targetPrice = Math.round(routeP * totalPrice / 10) * 10;
            if (targetPrice !== state.displayed) {
                priceCounter.textContent = targetPrice.toLocaleString("ru-RU");
                state.displayed = targetPrice;
            }
            const priceP = smooth((p - 0.38) / 0.08);
            gsap.set(price, { opacity: priceP, y: (1 - priceP) * 20 });

            // ─── stage 4: traffic jams 0.65-0.85 ───
            jams.forEach((jam, i) => {
                const start = 0.65 + i * 0.06;
                const end = start + 0.10;
                const jp = smooth((p - start) / (end - start));
                gsap.set(jam, { opacity: jp, scale: 0.4 + jp * 0.6 });
            });
            jamLabels.forEach((lbl, i) => {
                const start = 0.68 + i * 0.06;
                const end = start + 0.10;
                const lp = smooth((p - start) / (end - start));
                gsap.set(lbl, { opacity: lp, y: (1 - lp) * 8 });
            });

            // ─── stage 5: verdict 0.85-1.00 ───
            const vp = smooth((p - 0.85) / 0.15);
            gsap.set(verdict, { opacity: vp, y: (1 - vp) * 30 });
        },
    });

    // infinite pulse on jam rings (independent of scroll)
    if (!IS_MOBILE) section.querySelectorAll(".jam-ring").forEach((ring, i) => {
        gsap.fromTo(ring,
            { attr: { r: 10 }, opacity: 0.9 },
            {
                attr: { r: 24 },
                opacity: 0,
                duration: 2.2,
                repeat: -1,
                ease: "sine.out",
                delay: i * 0.5,
            }
        );
    });

    // parallax bg dots
    if (!IS_MOBILE) {
        gsap.to(".problem__bg-dot--a", {
            xPercent: 20, yPercent: 10, scale: 1.1,
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
        });
        gsap.to(".problem__bg-dot--b", {
            xPercent: -20, yPercent: -10, scale: 1.2,
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
        });
    }
})();


/* =========================================================
   TRANSITION — text reveal
   ========================================================= */
(function transition() {
    if (REDUCE_MOTION) return;
    gsap.from(".transition__big", {
        opacity: 0,
        y: 40,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: {
            trigger: ".transition",
            start: "top 70%",
        },
    });
    gsap.from(".transition__small", {
        opacity: 0,
        y: 20,
        duration: 0.8,
        scrollTrigger: {
            trigger: ".transition",
            start: "top 70%",
        },
    });
})();


/* =========================================================
   HOW — sticky map, parcel travels along path,
   points activate, steps highlight, price ticks
   ========================================================= */
(function how() {
    const section = document.querySelector(".how");
    if (!section) return;
    if (REDUCE_MOTION) return;

    const route = document.getElementById("route");
    const parcel = document.getElementById("parcel");
    const points = section.querySelectorAll(".map-point");
    const steps = section.querySelectorAll(".how__step");
    const hops = section.querySelectorAll(".how__map-price-hops span");
    const priceCounter = document.getElementById("route-counter");

    if (!route || !parcel) return;

    const pathLength = route.getTotalLength();

    route.style.strokeDasharray = pathLength;
    route.style.strokeDashoffset = pathLength;

    const state = { progress: 0, displayedPrice: 0, activeHop: -1 };

    const smoothStep = (t) => {
        const c = Math.max(0, Math.min(1, t));
        return c * c * (3 - 2 * c);
    };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: IS_MOBILE ? 1.0 : 1.4,
            onUpdate: (self) => {
                const p = self.progress;
                state.progress = p;

                // draw route (smoothed so stroke doesn't snap at fast scrolls)
                const pe = smoothStep(p);
                route.style.strokeDashoffset = pathLength * (1 - pe);

                // move parcel along path
                if (!IS_MOBILE) {
                    const point = route.getPointAtLength(pathLength * pe);
                    parcel.setAttribute(
                        "transform",
                        `translate(${point.x.toFixed(2)}, ${point.y.toFixed(2)}) rotate(${(Math.sin(pe * Math.PI * 2) * 3).toFixed(2)})`
                    );
                }

                // activate points progressively (0 is already at start)
                const numPoints = points.length;
                const activeIdx = Math.min(numPoints - 1, Math.floor(p * numPoints));
                points.forEach((pt, i) => {
                    pt.classList.toggle("is-active", i <= activeIdx);
                });

                // highlight step based on progress bucket
                let stepIdx = 0;
                if (p > 0.15) stepIdx = 1;
                if (p > 0.7) stepIdx = 2;
                steps.forEach((s, i) => s.classList.toggle("is-active", i === stepIdx));

                // hops (0..4 → 100..500)
                const hopIdx = Math.min(hops.length - 1, Math.floor(p * hops.length));
                if (hopIdx !== state.activeHop) {
                    hops.forEach((h, i) => h.classList.toggle("is-on", i <= hopIdx));
                    state.activeHop = hopIdx;
                }

                // price counter
                const price = Math.round(p * 500 / 100) * 100;
                if (price !== state.displayedPrice) {
                    priceCounter.textContent = price.toLocaleString("ru-RU");
                    state.displayedPrice = price;
                }
            },
        },
    });

    // initial step active
    steps[0].classList.add("is-active");
    points[0].classList.add("is-active");

    // pulse anim on each point while active
    if (!IS_MOBILE) points.forEach((pt, i) => {
        const outer = pt.querySelector("circle:nth-child(3)");
        if (!outer) return;
        gsap.to(outer, {
            attr: { r: 22 },
            opacity: 0,
            duration: 2.0,
            repeat: -1,
            ease: "sine.out",
            delay: i * 0.2,
        });
    });
})();


/* =========================================================
   COMPARE — cards slide in, counters run, saving ticks up
   ========================================================= */
(function compare() {
    const section = document.querySelector(".compare");
    if (!section) return;
    if (REDUCE_MOTION) return;

    gsap.from(".compare__title", {
        opacity: 0, y: 40, duration: 1, ease: "power4.out",
        scrollTrigger: { trigger: section, start: "top 70%" },
    });

    gsap.from(".compare__card--bad", {
        opacity: 0, x: -40, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 60%" },
    });
    gsap.from(".compare__card--good", {
        opacity: 0, x: 40, duration: 0.9, ease: "power3.out", delay: 0.1,
        scrollTrigger: { trigger: section, start: "top 60%" },
    });
    gsap.from(".compare__vs", {
        opacity: 0, scale: 0.5, duration: 0.7, ease: "back.out(2)",
        scrollTrigger: { trigger: section, start: "top 60%" },
    });

    // animate numeric counters within compare
    const badNum = section.querySelector(".compare__card--bad .compare__big-num");
    const goodNum = section.querySelector(".compare__card--good .compare__big-num");

    ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        once: true,
        onEnter: () => {
            animateCounter(badNum, 800, 3000, 1.6);
            animateCounter(goodNum, 3000, 1500, 1.8);
        },
    });

    const saveNum = section.querySelector(".compare__save-num .counter");
    ScrollTrigger.create({
        trigger: ".compare__bottom",
        start: "top 80%",
        once: true,
        onEnter: () => animateCounter(saveNum, 0, 15000, 1.8),
    });
})();


/* =========================================================
   WAITLIST — subtle reveal
   ========================================================= */
(function waitlist() {
    if (REDUCE_MOTION) return;
    gsap.from(".waitlist__title, .waitlist__sub, .waitlist__form, .waitlist__foot", {
        opacity: 0,
        y: 30,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".waitlist", start: "top 70%" },
    });
})();


/* =========================================================
   Re-run ScrollTrigger after HTMX swaps (form submission)
   ========================================================= */
document.body.addEventListener("htmx:afterSwap", () => {
    if (!REDUCE_MOTION) ScrollTrigger.refresh();
});
