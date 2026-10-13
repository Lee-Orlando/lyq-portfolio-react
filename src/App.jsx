import { useEffect } from 'react';
import { useContent } from './hooks/useContent';
import { useAnchorScroll } from './hooks/useAnchors';
import SiteHeader from './components/SiteHeader';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import SpacesSection from './components/SpacesSection';
import LinksSection from './components/LinksSection';
import ContactSection from './components/ContactSection';
import SiteFooter from './components/SiteFooter';
import AdminPanel from './components/AdminPanel';

/**
 * 首页。各区块的数据来自 ContentProvider，云端内容回来后自动重渲染。
 *
 * 区块顺序与原生版、Vue 版一致；空间与好东西一条都没有时整块不渲染
 * （判断在各自组件里），不会留一块空招牌。
 */
export default function App() {
    const { sections, load } = useContent();

    useAnchorScroll();

    useEffect(() => {
        // 云端拿不到就沿用默认内容，页面不会白屏，也不谎报成功
        load();
    }, [load]);

    return (
        <>
            <a className="skip-link" href="#main">跳到主要内容</a>

            <SiteHeader />

            <main id="main">
                <HeroSection data={sections.hero} />
                <AboutSection about={sections.about} skills={sections.skills} />
                <SpacesSection spaces={sections.spaces} />
                <LinksSection links={sections.links} />
                <ContactSection contact={sections.contact} />
            </main>

            <SiteFooter footer={sections.footer} contact={sections.contact} />

            <AdminPanel />
        </>
    );
}
