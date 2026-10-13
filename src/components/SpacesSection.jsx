import SpaceCard from './SpaceCard';
import { useFadeIn } from '../hooks/useFadeIn';

/**
 * 自建空间：没有固定标题，也不预设数量。
 * 管理员建几个这里就出现几格；一个都没有时整块隐藏，不留空招牌。
 */
export default function SpacesSection({ spaces }) {
    const items = Array.isArray(spaces.items) ? spaces.items : [];
    const ref = useFadeIn(items.length > 0);

    if (items.length === 0) return null;

    return (
        <section className="spaces section fade-in-section" id="spaces" ref={ref}>
            <div className="container">
                <div className="spaces-list">
                    {items.map((space, index) => (
                        <SpaceCard key={index} space={space} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
