import { useEffect } from 'react';

/**
 * 站内锚点的平滑滚动。
 *
 * 用事件委托挂在 document 上，而不是给每个 <a> 绑一次：导航、首页 CTA 按钮、
 * 地址栏来的 #hash 走的都是同一条路径，加新链接不用到处补监听。
 * 尊重系统的「减少动态效果」偏好：那种情况下直接跳，不做平滑动画。
 */
export function useAnchorScroll() {
    useEffect(() => {
        const prefersReduced =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function onClick(event) {
            const link = event.target.closest && event.target.closest('a[href^="#"]');
            if (!link) return;

            const hash = link.getAttribute('href');
            if (!hash || hash === '#') return;

            const target = document.querySelector(hash);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: prefersReduced ? 'auto' : 'smooth',
                block: 'start'
            });
            try {
                history.replaceState(null, '', hash);
            } catch {
                // file:// 协议下部分浏览器禁止修改 history，忽略即可
            }
        }

        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);
}
