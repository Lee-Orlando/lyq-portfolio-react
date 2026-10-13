import { useEffect, useState } from 'react';
import { clone, findSpaceIndex, safeUrl } from './content/utils';
import { emptyBlock, MAX_BLOCKS_PER_SPACE } from './content/schema';
import { contentEndpoint, fetchSpaces, pushSection } from './content/api';
import BlockEditor from './components/BlockEditor';
import { useAnchorScroll } from './hooks/useAnchors';

/**
 * 单个空间的展示页 + 就地编辑器（space.html）。
 *
 * 页面做两件事：
 *   1. 按 ?space=短名 从云端取回 spaces 区块，找出对应空间，按顺序渲染文字块和图片块。
 *   2. 提供这个空间自己的编辑器——改名字、加文字、传图片、排序，保存只回写这一个空间。
 *
 * 为什么不做成「点编辑跳回首页的抽屉面板」：站在这里改，看到的排版就是访客看到的排版，
 * 不用在抽屉里想象图片会落在哪。首页那个抽屉依然管整站文案和空间清单，两者互不依赖。
 *
 * 整页没有静态内容，内容全在云端。拿不到数据时必须如实说明，绝不能拿占位文字糊弄过去。
 */

const endpoint = contentEndpoint();
const wanted = new URLSearchParams(window.location.search).get('space') || '';

const EMPTY = { items: [], index: -1, space: null, snapshot: '' };

function firstTextOf(blocks) {
    const hit = blocks.find((block) => block && block.type === 'text' && String(block.value || '').trim());
    return hit ? String(hit.value).trim().replace(/\s+/g, ' ') : '';
}

/** 把空间名写回标题和 og 标签，分享出去才不会永远显示「空间 · Lyq」 */
function applyMeta(title, summary) {
    document.title = `${title} · Lyq`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${title} · Lyq`);

    if (!summary) return;
    const text = summary.length > 100 ? `${summary.slice(0, 100)}…` : summary;
    const descTag = document.querySelector('meta[name="description"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (descTag) descTag.setAttribute('content', text);
    if (ogDesc) ogDesc.setAttribute('content', text);
}

export default function SpaceApp() {
    const [state, setState] = useState(EMPTY);
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState('');
    const [status, setStatus] = useState({ message: '', tone: '' });
    const [saving, setSaving] = useState(false);

    useAnchorScroll();

    const year = new Date().getFullYear();
    const space = state.space;
    const blocks = space && Array.isArray(space.blocks) ? space.blocks : [];
    const loaded = Boolean(space);
    const name = String((space && space.name) || '').trim() || '未命名空间';

    function setStatusMessage(message, tone) {
        setStatus({ message, tone });
    }

    /** 所有编辑都收进这里：克隆一份再改，改完整体 setState */
    function mutateSpace(fn) {
        setState((prev) => {
            if (!prev.space) return prev;
            const items = prev.items.map(clone);
            const next = items[prev.index];
            fn(next);
            return { ...prev, items, space: next };
        });
    }

    function isDirty() {
        return JSON.stringify(space || {}) !== state.snapshot;
    }

    /* ---- 编辑 ---- */

    function addBlock(kind) {
        if (blocks.length >= MAX_BLOCKS_PER_SPACE) {
            setStatusMessage(`一个空间最多 ${MAX_BLOCKS_PER_SPACE} 块内容。`, 'error');
            return;
        }
        mutateSpace((next) => {
            next.blocks.push(emptyBlock(kind));
        });
        setStatusMessage('加好了，记得点保存。', '');
    }

    function removeBlock(order) {
        mutateSpace((next) => {
            next.blocks.splice(order, 1);
        });
    }

    function moveBlock(order, delta) {
        const target = order + delta;
        if (target < 0 || target >= blocks.length) return;
        mutateSpace((next) => {
            const list = next.blocks;
            [list[order], list[target]] = [list[target], list[order]];
        });
    }

    /** 退出编辑：把空间恢复成进入编辑前的样子，没保存的改动一律丢掉 */
    function stopEditing() {
        setEditing(false);
        setState((prev) => {
            const restored = JSON.parse(prev.snapshot);
            const items = prev.items.map(clone);
            items[prev.index] = restored;
            return { ...prev, items, space: restored };
        });
    }

    function cancelEditing() {
        if (isDirty() && !window.confirm('有改动还没保存，确定放弃？')) return;
        stopEditing();
        setStatusMessage('已放弃改动。', '');
    }

    function toggleEditing() {
        if (!space) return;
        if (editing) cancelEditing();
        else {
            setEditing(true);
            setStatusMessage('', '');
        }
    }

    /**
     * 后端按区块存文件，spaces 是一个整体 JSON，所以保存只能整份列表写回——
     * 把改过的这一个放回原位。代价是两个人同时改不同空间会互相覆盖，
     * 目前只有管理员一个人改，先接受。
     */
    async function save() {
        if (!space) return;
        if (!endpoint) {
            setStatusMessage('还没配置 content-endpoint（见 site.config.js），现在改的内容不会保存。', 'error');
            return;
        }

        setSaving(true);
        const payload = state.items.map(clone);
        payload[state.index] = clone(space);
        const result = await pushSection(endpoint, 'spaces', { items: payload });
        setSaving(false);

        if (!result.ok) {
            if (result.errors) {
                const messages = Object.keys(result.errors).map((key) => result.errors[key]).slice(0, 3);
                setStatusMessage(`${result.message}：${messages.join('；')}`, 'error');
            } else {
                setStatusMessage(result.message, 'error');
            }
            return;
        }

        setState({
            items: payload,
            index: state.index,
            space: payload[state.index],
            snapshot: JSON.stringify(payload[state.index])
        });
        setEditing(false);
        setStatusMessage('已保存，访客刷新即可看到。', 'success');
    }

    /* ---- 启动 ---- */

    useEffect(() => {
        let cancelled = false;

        async function boot() {
            if (!endpoint) {
                setNotice('这个页面还没连上云端（site.config.js 里没填 content-endpoint），读不到空间内容。');
                return;
            }
            if (!wanted) {
                setNotice('链接里没有指定是哪个空间，回到首页选一个吧。');
                return;
            }

            const payload = await fetchSpaces(endpoint);
            if (cancelled) return;
            if (!payload) {
                setNotice('云端内容没取到，可能是网络问题。稍后刷新试试，或先回首页看看。');
                return;
            }

            const items = (payload.sections && payload.sections.spaces && payload.sections.spaces.items) || [];
            const index = findSpaceIndex(items, wanted);
            if (index < 0) {
                setNotice(`没找到对应的空间（${wanted}）。它可能已经被删掉或改了短名，回首页看看现在的空间列表。`);
                return;
            }

            const current = items[index];
            setState({ items, index, space: current, snapshot: JSON.stringify(current) });
            applyMeta(String(current.name || '').trim() || '未命名空间', firstTextOf(current.blocks || []));
        }

        boot();
        return () => { cancelled = true; };
    }, []);

    return (
        <>
            <a className="skip-link" href="#main">跳到主要内容</a>

            <header id="mainHeader" className="main-header">
                <div className="container">
                    <a href="index.html" className="logo">Lyq</a>
                    <nav className="main-nav" aria-label="主导航">
                        <ul>
                            <li><a href="index.html#hero">首页</a></li>
                            <li><a href="index.html#about">关于</a></li>
                            <li><a href="index.html#contact">联系</a></li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main id="main">
                <section className="space-detail section" id="spaceDetail">
                    <div className="container">
                        <a className="back-link" href="index.html#spaces">← 返回全部空间</a>

                        {loaded && (
                            <>
                                <h1 style={{ display: editing ? 'none' : undefined }} className="space-detail-title">
                                    {name}
                                </h1>

                                <div style={{ display: editing ? 'none' : undefined }} className="space-detail-body">
                                    {blocks.length > 0 ? (
                                        blocks.map((block, order) => {
                                            if (block.type === 'text' && String(block.value || '').trim()) {
                                                return (
                                                    <p key={order} className="space-text">
                                                        {String(block.value).trim()}
                                                    </p>
                                                );
                                            }
                                            if (block.type === 'image' && safeUrl(block.url)) {
                                                return (
                                                    <figure key={order} className="space-media">
                                                        <img src={safeUrl(block.url)} alt={block.alt || ''} loading="lazy" decoding="async" />
                                                        {String(block.alt || '').trim() && (
                                                            <figcaption>{String(block.alt).trim()}</figcaption>
                                                        )}
                                                    </figure>
                                                );
                                            }
                                            return null;
                                        })
                                    ) : (
                                        <p className="space-text">这个空间还没有内容。</p>
                                    )}
                                </div>

                                {/* 状态条放在编辑器外面：保存成功后编辑器会收起来，提示得留得住 */}
                                {status.message && (
                                    <p
                                        className={`editor-status${status.tone === 'error' ? ' is-error' : ''}${status.tone === 'success' ? ' is-success' : ''}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {status.message}
                                    </p>
                                )}

                                {editing && (
                                    <div className="space-editor">
                                        <p className="editor-hint">只改这个空间。改完点保存，访客刷新就能看到。</p>

                                        <div className="form-group">
                                            <label htmlFor="editName">空间名字</label>
                                            <input
                                                id="editName"
                                                type="text"
                                                maxLength={40}
                                                autoComplete="off"
                                                value={space.name || ''}
                                                onChange={(event) => mutateSpace((next) => {
                                                    next.name = event.target.value;
                                                })}
                                            />
                                        </div>

                                        <div className="block-editor-list">
                                            {blocks.map((block, order) => (
                                                <BlockEditor
                                                    key={order}
                                                    block={block}
                                                    order={order}
                                                    total={blocks.length}
                                                    endpoint={endpoint}
                                                    onPatch={(patch) => mutateSpace((next) => {
                                                        Object.assign(next.blocks[order], patch);
                                                    })}
                                                    onRemove={() => removeBlock(order)}
                                                    onMove={(delta) => moveBlock(order, delta)}
                                                    onNotify={(payload) => setStatusMessage(payload.message, payload.tone)}
                                                />
                                            ))}
                                        </div>

                                        <div className="block-actions">
                                            <button type="button" className="ghost-button" onClick={() => addBlock('text')}>
                                                + 加一段文字
                                            </button>
                                            <button type="button" className="ghost-button" onClick={() => addBlock('image')}>
                                                + 加一张图片
                                            </button>
                                        </div>

                                        <div className="editor-actions">
                                            <button type="button" className="submit-button" disabled={saving} onClick={save}>
                                                {saving ? '保存中…' : '保存这个空间'}
                                            </button>
                                            <button type="button" className="ghost-button" onClick={cancelEditing}>
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {notice && <p className="space-notice">{notice}</p>}
                    </div>
                </section>
            </main>

            <footer className="main-footer">
                <div className="container">
                    <div className="footer-copyright">
                        <p>&copy; {year} Lyq. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* 内容到手了才把编辑入口放出来——不知道在改什么的时候开着编辑器只会误导 */}
            {loaded && (
                <button
                    type="button"
                    className={`admin-fab${editing ? ' is-active' : ''}`}
                    onClick={toggleEditing}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                    <span>{editing ? '结束编辑' : '编辑这个空间'}</span>
                </button>
            )}
        </>
    );
}
