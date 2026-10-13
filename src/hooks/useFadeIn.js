import { useEffect, useRef } from 'react';

const OPTIONS = { threshold: 0.2, rootMargin: '0px 0px -100px 0px' };

/**
 * 元素滚进视口时加 .is-visible，配合 CSS 做淡入。
 *
 * Vue 版里这是条自定义指令（v-fade-in），React 没有指令，就做成 hook。
 *
 * enabled 参数不是摆设：像「空间」这种区块在没有内容时整块不渲染，
 * 云端数据回来后元素才出现。若 effect 只在挂载时跑一次，那时 ref.current 还是 null，
 * 淡入就永远不触发——所以把「有没有内容」作为依赖，元素出现后 observer 会重新观察。
 */
export function useFadeIn(enabled = true) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !enabled) return undefined;

        if (!('IntersectionObserver' in window)) {
            el.classList.add('is-visible');
            return undefined;
        }

        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                instance.unobserve(entry.target);
            });
        }, OPTIONS);
        observer.observe(el);

        return () => observer.disconnect();
    }, [enabled]);

    return ref;
}
