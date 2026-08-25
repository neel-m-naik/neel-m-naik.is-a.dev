/* ==========================================================================
   Neel M Naik — Portfolio interactions
   ========================================================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// If the user prefers reduced motion, strip data-tilt before vanilla-tilt's
// own DOMContentLoaded auto-init runs, so tilt never engages for them.
if (prefersReducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach((el) => el.removeAttribute('data-tilt'));
}

/* ---------------------------------------------------------------------
   1. Typewriter
   --------------------------------------------------------------------- */
(function typewriter() {
    const phrases = [
        '3D point cloud pipelines.',
        'deep learning architectures.',
        'low-churn heuristic algorithms.',
        'interactive spatial worlds.'
    ];
    const target = document.getElementById('typewriter');
    if (!target) return;

    if (prefersReducedMotion) {
        target.textContent = phrases[0];
        return;
    }

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function loop() {
        const current = phrases[phraseIdx];
        charIdx += isDeleting ? -1 : 1;
        target.textContent = current.substring(0, charIdx);

        let speed = isDeleting ? 35 : 75;
        if (!isDeleting && charIdx === current.length) {
            speed = 1800;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            speed = 300;
        }
        setTimeout(loop, speed);
    }
    loop();
})();

/* ---------------------------------------------------------------------
   2. Hero point cloud (Three.js) + live HUD readout
   --------------------------------------------------------------------- */
(function heroPointCloud() {
    const heroSection = document.querySelector('.hero');
    const canvasMount = document.getElementById('pointcloud-canvas');
    const hudPoints = document.getElementById('hud-points');
    const hudRot = document.getElementById('hud-rot');
    if (!heroSection || !canvasMount || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        heroSection.clientWidth / heroSection.clientHeight,
        0.1,
        1000
    );
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasMount,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);

    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 3.8;

        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x5eead4, // scan cyan — data, not UI chrome
        size: 0.045,
        transparent: true,
        opacity: 0.8
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
    camera.position.z = 6;

    if (hudPoints) hudPoints.textContent = particleCount.toLocaleString();

    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    let isRunning = false;
    let hudTick = 0;

    function frame() {
        if (!isRunning) return;
        requestAnimationFrame(frame);

        if (!prefersReducedMotion) {
            pointCloud.rotation.y += 0.0025 + mouseX * 0.005;
            pointCloud.rotation.x += 0.001 - mouseY * 0.005;
        }

        // Update the HUD readout every few frames — cheap, and it's real data.
        hudTick += 1;
        if (hudRot && hudTick % 6 === 0) {
            const twoPi = Math.PI * 2;
            const normalized = ((pointCloud.rotation.y % twoPi) + twoPi) % twoPi;
            hudRot.textContent = normalized.toFixed(3);
        }

        renderer.render(scene, camera);
    }

    function start() {
        if (isRunning) return;
        isRunning = true;
        frame();
    }
    function stop() {
        isRunning = false;
    }

    start();

    // Pause rendering when the hero is off-screen or the tab is hidden —
    // no reason to spend GPU/battery on a canvas nobody can see.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? start() : stop()),
            { threshold: 0 }
        );
        io.observe(heroSection);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            camera.aspect = heroSection.clientWidth / heroSection.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(heroSection.clientWidth, heroSection.clientHeight);
        }, 150);
    });
})();

/* ---------------------------------------------------------------------
   3. Project filter — no reliance on the global `event` object
   --------------------------------------------------------------------- */
(function projectFilter() {
    const buttons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.project-card');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            buttons.forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            const category = btn.dataset.filter;
            cards.forEach((card) => {
                const match = category === 'all' || card.dataset.category === category;
                card.style.display = match ? '' : 'none';
            });
        });
    });
})();

/* ---------------------------------------------------------------------
   4. Scroll reveal
   --------------------------------------------------------------------- */
(function scrollReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach((el) => observer.observe(el));
})();

/* ---------------------------------------------------------------------
   5. Active nav link on scroll
   --------------------------------------------------------------------- */
(function activeNav() {
    const links = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main section, .hero');
    if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.getAttribute('id');
                links.forEach((link) => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            });
        },
        { rootMargin: '-40% 0px -50% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
})();
