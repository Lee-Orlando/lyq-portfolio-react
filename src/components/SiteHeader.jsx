import { useEffect, useRef, useState } from 'react';

/**
 * 吸顶导航：滚动后加 .scrolled，同时按当前滚动位置高亮对应菜单项。
 * 移动端由汉堡按钮开合，Esc 与点击外部都能关。
 */

const NAV = [
    { id: 'hero', label: '首页' },
    { id: 'about', label: '关于' },
    { id: 'contact', label: '联系' }
];

export default function SiteHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [activeId, setActiveId] = useState('hero');
    const [menuOpen, setMenuOpen] = useState(false);
    const headerRef = useRef(null);

    useEffect(() => {
        let ticking = false;

        function updateState() {
            setScrolled(window.scrollY > 50);

            const header = headerRef.current;
            const triggerY = window.scrollY + (header ? header.offsetHeight : 0) + 20;
            let current = NAV[0].id;
            NAV.forEach((item) => {
                const section = document.getElementById(item.id);
                // 隐藏的区块（比如一个空间都没有时的 #spaces）不参与高亮
                if (section && !section.hidden && section.offsetTop <= triggerY) current = item.id;
            });
            setActiveId(current);
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                updateState();
                ticking = false;
            });
        }

        function onKeydown(event) {
            if (event.key === 'Escape') setMenuOpen(false);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        document.addEventListener('keydown', onKeydown);
        updateState();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            document.removeEventListener('keydown', onKeydown);
        };
    }, []);

    return (
        <header id="mainHeader" ref={headerRef} className={`main-header${scrolled ? ' scrolled' : ''}`}>
            <div className="container">
                <a href="#hero" className="logo">Lyq</a>

                <nav id="mainNav" className={`main-nav${menuOpen ? ' active' : ''}`} aria-label="主导航">
                    <ul>
                        {NAV.map((item) => (
                            <li key={item.id}>
                                <a
                                    href={`#${item.id}`}
                                    className={activeId === item.id ? 'active' : undefined}
                                    aria-current={activeId === item.id ? 'true' : undefined}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <button
                    type="button"
                    id="hamburger"
                    className={`hamburger${menuOpen ? ' active' : ''}`}
                    aria-controls="mainNav"
                    aria-expanded={String(menuOpen)}
                    aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span className="line"></span>
                    <span className="line"></span>
                    <span className="line"></span>
                </button>
            </div>
        </header>
    );
}
