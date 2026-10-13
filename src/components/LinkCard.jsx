import { hostOf, safeUrl } from '../content/utils';

/**
 * 「好东西」里的一格：整块是外链，新标签页打开。
 * 格子上写目标域名——点之前就该知道会跳到别的站，别让人以为是站内页面。
 */
export default function LinkCard({ link }) {
    const url = safeUrl(link.url);
    const name = String(link.name || '').trim() || (url ? hostOf(url) : '未命名');
    const note = String(link.note || '').trim();

    return (
        <a
            className="link-card"
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`在新标签页打开：${name}`}
        >
            <h3 className="link-title">{name}</h3>
            {note && <p className="link-note">{note}</p>}
            <span className="space-cue is-external">{hostOf(url)} ↗</span>
        </a>
    );
}
