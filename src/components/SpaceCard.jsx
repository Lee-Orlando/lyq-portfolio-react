import { excerpt, safeUrl, spaceHref } from '../content/utils';

/**
 * 九宫格里的一个空间。整格是链接，点进去是这个空间自己的页面。
 * 格子里只放封面图 + 名字 + 一句摘要——完整内容在 space.html 展开，
 * 否则卡片高矮不一，网格会散。
 */
export default function SpaceCard({ space, index }) {
    const blocks = Array.isArray(space.blocks) ? space.blocks : [];
    const name = String(space.name || '').trim() || '未命名空间';
    const href = spaceHref(space, index);

    const imageBlock = blocks.find((block) => block && block.type === 'image' && safeUrl(block.url));
    const cover = imageBlock ? safeUrl(imageBlock.url) : '';
    const coverAlt = imageBlock ? String(imageBlock.alt || '') : '';

    const textBlock = blocks.find((block) => block && block.type === 'text' && String(block.value || '').trim());
    const summary = textBlock ? excerpt(textBlock.value, 60) : '';

    return (
        <a className="space-card" href={href} aria-label={`打开空间：${name}`}>
            {cover && (
                <div className="space-cover">
                    <img src={cover} alt={coverAlt} loading="lazy" decoding="async" />
                </div>
            )}
            <h3 className="space-title">{name}</h3>
            {summary && <p className="space-excerpt">{summary}</p>}
            <span className="space-cue">进入 →</span>
        </a>
    );
}
