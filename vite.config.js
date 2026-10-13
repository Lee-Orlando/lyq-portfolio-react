import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * 两个入口，与原生版、Vue 版保持一致：
 *   index.html  首页
 *   space.html  单个空间的页面，靠 ?space=短名 定位
 *
 * 不用 react-router 做单页路由的原因有两个：
 *   1. CloudBase 静态托管对「任意路径回退到 index.html」支持不稳定；
 *   2. space.html?space=xxx 这个 URL 已经在线上跑着、也被分享过，多页入口能原样保留它。
 * 代价只是多一次 HTML 请求——这个站点总共两页，无所谓。
 */
export default defineConfig({
    plugins: [react()],
    root,
    /**
     * 部署到根目录时不用管；部署到子目录（比如 CloudBase 同环境下的 /react/）
     * 带上环境变量即可：BASE_PATH=/react/ npm run build
     * 不写死是因为三个版本要共用一套后端和一份数据，谁占根目录还没定。
     */
    base: process.env.BASE_PATH || '/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: `${root}index.html`,
                space: `${root}space.html`
            }
        }
    }
});
