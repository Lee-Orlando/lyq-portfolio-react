import { useEffect, useRef } from 'react';

/**
 * 首屏的粒子连线背景。
 *
 * 三个省电细节都是从原生版搬过来的，别在重写时丢掉：
 *   1. 系统开了「减少动态效果」就只画一帧静态星空，不启动动画循环
 *   2. 标签页切到后台时停掉 requestAnimationFrame
 *   3. 首屏滚出视口后停止绘制（IntersectionObserver）
 *
 * 画布是命令式 API，React 管不了它的生命周期，所以用 ref 自己 append/remove。
 */

const CONFIG = {
    count: 80,
    color: '#ffd700',
    lineColor: '#ffd700',
    lineDistance: 150,
    lineWidth: 1,
    baseOpacity: 0.5,
    radius: 3,
    speed: 2
};

const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ParticleField() {
    const hostRef = useRef(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;

        const canvas = document.createElement('canvas');
        host.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        let particles = [];
        let width = 0;
        let height = 0;
        let frameId = null;
        let resizeTimer = null;

        function resize() {
            width = host.offsetWidth;
            height = host.offsetHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function seed() {
            particles = Array.from({ length: CONFIG.count }, () => {
                const angle = Math.random() * Math.PI * 2;
                const velocity = (Math.random() + 0.2) * CONFIG.speed;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    radius: Math.random() * CONFIG.radius + CONFIG.radius / 2,
                    opacity: Math.random() * CONFIG.baseOpacity + 0.1
                };
            });
        }

        function step() {
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x <= 0 || p.x >= width) p.vx *= -1;
                if (p.y <= 0 || p.y >= height) p.vy *= -1;
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();
            }

            const { lineDistance, lineColor, lineWidth } = CONFIG;
            for (let i = 0; i < particles.length; i += 1) {
                for (let j = i + 1; j < particles.length; j += 1) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.hypot(dx, dy);
                    if (dist >= lineDistance) continue;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = lineWidth;
                    ctx.globalAlpha = 0.4 * (1 - dist / lineDistance);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        }

        function loop() {
            step();
            draw();
            frameId = window.requestAnimationFrame(loop);
        }

        function start() {
            if (frameId !== null) return;
            loop();
        }

        function stop() {
            if (frameId === null) return;
            window.cancelAnimationFrame(frameId);
            frameId = null;
        }

        function onVisibility() {
            if (document.hidden) stop();
            else if (!prefersReducedMotion) start();
        }

        resize();
        seed();
        draw();

        let visibilityObserver = null;
        let resizeObserver = null;

        if (!prefersReducedMotion) {
            start();
            document.addEventListener('visibilitychange', onVisibility);

            // 首屏滚出视口就停，别在用户看不到的地方烧 CPU
            visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) start();
                    else stop();
                });
            }, { threshold: 0 });
            visibilityObserver.observe(host);
        }

        resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resize();
                seed();
                draw();
            }, 150);
        });
        resizeObserver.observe(host);

        return () => {
            stop();
            clearTimeout(resizeTimer);
            document.removeEventListener('visibilitychange', onVisibility);
            if (visibilityObserver) visibilityObserver.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        };
    }, []);

    // id 保留成 particles-js：样式表里那条 z-index:-1 的定位规则挂在它上面，改名背景会被内容盖住
    return <div id="particles-js" ref={hostRef} aria-hidden="true" />;
}
