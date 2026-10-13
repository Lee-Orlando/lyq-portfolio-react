import LinkCard from './LinkCard';
import { useFadeIn } from '../hooks/useFadeIn';

/** 好东西：站外网址收藏，一条都没有时整块隐藏 */
export default function LinksSection({ links }) {
    const items = Array.isArray(links.items) ? links.items : [];
    const ref = useFadeIn(items.length > 0);

    if (items.length === 0) return null;

    return (
        <section className="links section fade-in-section" id="links" ref={ref}>
            <div className="container">
                <h2 className="section-title">好东西</h2>
                <p className="links-intro">我做的其他东西，和我喜欢的东西。</p>
                <div className="links-list">
                    {items.map((link, index) => (
                        <LinkCard key={index} link={link} />
                    ))}
                </div>
            </div>
        </section>
    );
}
