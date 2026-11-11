/* =====================================================
   STAR CANVAS — céu animado com estrelas e foguete
===================================================== */
(function () {
    const TAU = Math.PI * 2;

    const COLORS = {
        gold: '#fad643',
        royalBlue: 'rgba(38,0,227,0.9)',
        hull: 'rgba(235,235,255,0.92)',
        nose: 'rgba(250,214,67,0.98)',
        window: 'rgba(100,80,255,0.8)',
        windowRim: 'rgba(200,195,255,0.7)',
    };

    const STAR = {
        AREA_PER_STAR: 3500,
        MIN_COUNT: 40,
        SPARKLE_CHANCE: 0.12,
        SPARKLE_ALPHA: 0.85,
        WRAP_MARGIN: 10,
    };

    const ROCKET = {
        MAX_ACTIVE: 4,
        FIRST_SPAWN_DELAY: 120, // frames
        MIN_SPAWN_INTERVAL: 45, // frames
        MAX_SPAWN_INTERVAL: 150, // frames
        SPAWN_OFFSET: 80,
        VISIBLE_MARGIN: 20,
        MIN_SPEED: 2.5,
        MAX_ALPHA: 0.78,
        FADE_STEP: 0.04,
        TRAIL_LENGTH: 40,
    };

    const canvas = document.getElementById('starCanvas');
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let stars = [];
    let backgroundLayers = [];
    let rockets = [];
    let framesUntilNextRocket = ROCKET.FIRST_SPAWN_DELAY;

    const random = (min, max) => min + Math.random() * (max - min);
    const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    function createRadialGradient(x, y, radius, colorStops) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
        return gradient;
    }

    // A chama usa coordenadas locais do foguete, então o gradiente é criado uma única vez.
    const flameGradient = (() => {
        const gradient = ctx.createRadialGradient(0, 20, 0, 0, 24, 10);
        gradient.addColorStop(0, 'rgba(255,220,80,0.9)');
        gradient.addColorStop(0.5, 'rgba(255,100,10,0.5)');
        gradient.addColorStop(1, 'rgba(200,30,0,0)');
        return gradient;
    })();

    /* ── Fundo ── */

    // Depende só do tamanho da tela: recriado no resize, não a cada frame.
    function buildBackgroundLayers() {
        return [
            // espaço profundo
            createRadialGradient(width * 0.35, height * 0.4, width * 0.9,
                [[0, '#0d0038'], [0.6, '#05001a'], [1, '#020010']]),
            // nebulosa azul
            createRadialGradient(width * 0.75, height * 0.25, width * 0.45,
                [[0, 'rgba(38,0,227,.14)'], [1, 'transparent']]),
            // nebulosa dourada
            createRadialGradient(width * 0.15, height * 0.72, width * 0.3,
                [[0, 'rgba(250,214,67,.06)'], [1, 'transparent']]),
        ];
    }

    function drawBackground() {
        backgroundLayers.forEach(layer => {
            ctx.fillStyle = layer;
            ctx.fillRect(0, 0, width, height);
        });
    }

    /* ── Estrelas ── */

    function createStar() {
        const isSparkle = Math.random() < STAR.SPARKLE_CHANCE;
        return {
            x: random(0, width),
            y: random(0, height),
            vx: random(-0.06, 0.06),
            vy: random(-0.025, 0.025),
            alpha: Math.random(),
            twinkleSpeed: random(0.003, 0.011) * randomSign(),
            isSparkle,
            size: isSparkle ? random(3, 9) : random(0.2, 2),
        };
    }

    function wrapAround(value, max) {
        if (value < -STAR.WRAP_MARGIN) return max + STAR.WRAP_MARGIN;
        if (value > max + STAR.WRAP_MARGIN) return -STAR.WRAP_MARGIN;
        return value;
    }

    function updateStar(star) {
        star.alpha += star.twinkleSpeed;
        if (star.alpha <= 0 || star.alpha >= 1) {
            star.twinkleSpeed = -star.twinkleSpeed;
            star.alpha = clamp(star.alpha, 0, 1);
        }
        star.x = wrapAround(star.x + star.vx, width);
        star.y = wrapAround(star.y + star.vy, height);
    }

    function drawSparkle(x, y, size, alpha) {
        const innerRadius = size * 0.12;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const between = angle + Math.PI / 4;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
            ctx.lineTo(Math.cos(between) * innerRadius, Math.sin(between) * innerRadius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawDot(x, y, radius, alpha) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
    }

    function drawStar(star) {
        if (star.isSparkle) {
            drawSparkle(star.x, star.y, star.size, star.alpha * STAR.SPARKLE_ALPHA);
        } else {
            drawDot(star.x, star.y, star.size, star.alpha);
        }
    }

    /* ── Foguete ── */

    function createRocket() {
        const fromLeft = Math.random() < 0.5;
        const speed = Math.max(width * 0.004, ROCKET.MIN_SPEED);
        return {
            x: fromLeft ? -ROCKET.SPAWN_OFFSET : width + ROCKET.SPAWN_OFFSET,
            y: height * random(0.15, 0.7),
            vx: fromLeft ? speed : -speed,
            vy: -speed * random(0.22, 0.4),
            alpha: 0,
            hasEntered: false,
            trail: [],
        };
    }

    function isOnScreen({ x, y }) {
        const margin = ROCKET.VISIBLE_MARGIN;
        return x > -margin && x < width + margin && y > -margin && y < height + margin;
    }

    function moveRocket(r) {
        r.x += r.vx;
        r.y += r.vy;

        const visible = isOnScreen(r);
        r.hasEntered = r.hasEntered || visible;
        r.alpha = visible
            ? Math.min(r.alpha + ROCKET.FADE_STEP, ROCKET.MAX_ALPHA)
            : Math.max(r.alpha - ROCKET.FADE_STEP, 0);

        r.trail.unshift({ x: r.x, y: r.y });
        if (r.trail.length > ROCKET.TRAIL_LENGTH) r.trail.pop();
    }

    // O foguete nasce fora da tela; só termina depois de entrar e sumir de novo.
    const hasFinished = r => r.hasEntered && r.alpha <= 0;

    function spawnRocketWhenDue() {
        framesUntilNextRocket--;
        if (framesUntilNextRocket > 0 || rockets.length >= ROCKET.MAX_ACTIVE) return;

        rockets.push(createRocket());
        framesUntilNextRocket = Math.round(random(ROCKET.MIN_SPAWN_INTERVAL, ROCKET.MAX_SPAWN_INTERVAL));
    }

    function updateRockets() {
        spawnRocketWhenDue();
        rockets.forEach(moveRocket);
        rockets = rockets.filter(r => !hasFinished(r));
    }

    function trailColor(index, alpha) {
        if (index < 8) return `rgba(255,210,60,${alpha})`;
        if (index < 20) return `rgba(255,110,20,${alpha * 0.7})`;
        return `rgba(160,70,10,${alpha * 0.35})`;
    }

    function drawTrail({ trail, alpha }) {
        trail.forEach((point, i) => {
            const fade = 1 - i / trail.length;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3.5 * fade, 0, TAU);
            ctx.fillStyle = trailColor(i, alpha * fade * 0.5);
            ctx.fill();
        });
    }

    function fillPolygon(color, points) {
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fill();
    }

    // Coordenadas locais: foguete apontando para cima, com o centro do corpo na origem.
    function drawShip() {
        // chama
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.ellipse(0, 22, 5, 12, 0, 0, TAU);
        ctx.fill();

        // corpo
        ctx.fillStyle = COLORS.hull;
        ctx.beginPath();
        ctx.roundRect(-6, -14, 12, 28, 4);
        ctx.fill();

        fillPolygon(COLORS.nose, [[-6, -14], [6, -14], [0, -27]]);
        fillPolygon(COLORS.royalBlue, [[-6, 8], [-14, 18], [-6, 14]]); // asa esquerda
        fillPolygon(COLORS.royalBlue, [[6, 8], [14, 18], [6, 14]]);    // asa direita

        // janela
        ctx.fillStyle = COLORS.window;
        ctx.beginPath();
        ctx.arc(0, -3, 4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = COLORS.windowRim;
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    function drawRocket(r) {
        drawTrail(r);

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(Math.atan2(r.vy, r.vx) + Math.PI / 2);
        ctx.globalAlpha = r.alpha;
        drawShip();
        ctx.restore();
    }

    /* ── Loop principal ── */

    // O canvas acompanha o tamanho do hero (não da janela) e usa a densidade de pixels
    // da tela, para ficar nítido em celulares sem ultrapassar 2x por desempenho.
    function resize() {
        const hero = canvas.parentElement;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const widthChanged = hero.clientWidth !== width;

        width = hero.clientWidth;
        height = hero.clientHeight;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        backgroundLayers = buildBackgroundLayers();

        // A barra de endereço do celular muda só a altura: manter as estrelas evita "piscar".
        if (widthChanged) {
            const starCount = Math.floor((width * height) / STAR.AREA_PER_STAR) + STAR.MIN_COUNT;
            stars = Array.from({ length: starCount }, createStar);
        }
    }

    function renderFrame() {
        drawBackground();

        stars.forEach(star => {
            updateStar(star);
            drawStar(star);
        });

        updateRockets();
        rockets.forEach(drawRocket);

        requestAnimationFrame(renderFrame);
    }

    new ResizeObserver(resize).observe(canvas.parentElement);
    resize();
    requestAnimationFrame(renderFrame);
})();

/* =====================================================
   NAVBAR — efeito ao rolar e barra de progresso
===================================================== */
(function () {
    const SCROLL_THRESHOLD = 60;
    const navbar = document.getElementById('navbar');
    let frameRequested = false;

    function scrollProgress() {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        return scrollable > 0 ? window.scrollY / scrollable : 0;
    }

    function updateNavbar() {
        frameRequested = false;
        navbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
        navbar.style.setProperty('--scroll-progress', scrollProgress().toFixed(4));
    }

    // Agrupa os eventos de scroll em no máximo uma atualização por frame.
    window.addEventListener('scroll', () => {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(updateNavbar);
    }, { passive: true });
    updateNavbar();
})();

/* =====================================================
   NAVBAR — destaca a seção visível
===================================================== */
(function () {
    const links = new Map(
        [...document.querySelectorAll('.nav-links a')].map(link => [link.hash.slice(1), link])
    );

    // A faixa observada é uma linha no meio da tela: a seção que a cruza é a atual.
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(link => link.classList.remove('active'));
            links.get(entry.target.id)?.classList.add('active');
        });
    }, { rootMargin: '-50% 0px -50% 0px' });

    links.forEach((_, id) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
    });
})();

/* =====================================================
   HAMBURGER MENU
===================================================== */
(function () {
    const menu = document.getElementById('navLinks');
    const button = document.getElementById('hamburger');

    function setMenuOpen(isOpen) {
        menu.classList.toggle('open', isOpen);
        button.classList.toggle('active', isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
        button.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    }

    const isMenuOpen = () => menu.classList.contains('open');

    button.addEventListener('click', () => setMenuOpen(!isMenuOpen()));
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenuOpen(false));
    });

    // Fecha ao tocar fora do menu ou apertar Esc.
    document.addEventListener('click', event => {
        if (isMenuOpen() && !event.target.closest('#navbar')) setMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isMenuOpen()) setMenuOpen(false);
    });
})();

/* =====================================================
   REVEAL ON SCROLL — IntersectionObserver
===================================================== */
(function () {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
        .forEach(el => observer.observe(el));
})();

/* =====================================================
   CARD SPOTLIGHT — luz que segue o mouse
===================================================== */
(function () {
    if (!window.matchMedia('(hover: hover)').matches) return;

    const CARD_SELECTOR = '.feature-card, .access-card, .team-card, .mvv-card';

    document.addEventListener('pointermove', event => {
        const card = event.target.closest(CARD_SELECTOR);
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
})();

/* =====================================================
   COUNTER ANIMATION
   Uso: <span class="stat-val" data-target="98" data-suffix="%"></span>
===================================================== */
(function () {
    const STEPS = 60;
    const STEP_INTERVAL_MS = 25;

    function animateCounter(el) {
        const target = Number(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const increment = Math.ceil(target / STEPS);
        let current = 0;

        const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            el.textContent = current + suffix;
            if (current >= target) clearInterval(timer);
        }, STEP_INTERVAL_MS);
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            animateCounter(entry.target);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-val[data-target]')
        .forEach(el => observer.observe(el));
})();

/* =====================================================
   CONTACT FORM
===================================================== */
(function () {
    const DEFAULT_LABEL = '✦ Enviar mensagem';
    const SENDING_LABEL = 'Enviando...';
    const VALIDATION_ERROR_MS = 2500;
    const REQUEST_ERROR_MS = 3000;
    const SUCCESS_VISIBLE_MS = 5000;

    const button = document.querySelector('.btn-send');
    const successMsg = document.getElementById('successMsg');
    const fields = {
        nome: document.getElementById('cf-name'),
        email: document.getElementById('cf-email'),
        assunto: document.getElementById('cf-subject'),
        mensagem: document.getElementById('cf-msg'),
    };

    let resetTimer;

    function readForm() {
        return Object.fromEntries(
            Object.entries(fields).map(([name, input]) => [name, input.value.trim()])
        );
    }

    function clearForm() {
        Object.values(fields).forEach(input => { input.value = ''; });
    }

    const isValid = ({ nome, email, mensagem }) => Boolean(nome && email && mensagem);

    function resetButton() {
        button.disabled = false;
        button.classList.remove('is-error');
        button.textContent = DEFAULT_LABEL;
    }

    function showButtonError(message, durationMs) {
        button.disabled = false;
        button.classList.add('is-error');
        button.textContent = `⚠ ${message}`;
        resetTimer = setTimeout(resetButton, durationMs);
    }

    function showSuccess() {
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), SUCCESS_VISIBLE_MS);
    }

    async function postContact(payload) {
        const response = await fetch('/contato', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.erro || 'Erro ao enviar');
    }

    async function handleSubmit() {
        clearTimeout(resetTimer);
        const payload = readForm();

        if (!isValid(payload)) {
            showButtonError('Preencha todos os campos obrigatórios', VALIDATION_ERROR_MS);
            return;
        }

        button.disabled = true;
        button.textContent = SENDING_LABEL;

        try {
            await postContact(payload);
            resetButton();
            clearForm();
            showSuccess();
        } catch {
            showButtonError('Erro ao enviar. Tente novamente.', REQUEST_ERROR_MS);
        }
    }

    button.addEventListener('click', handleSubmit);
})();
