import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS, SECTION_KEYS, DEFAULTS, sectionByKey, emptyItem } from '../content/schema';
import { clone, findSpaceIndex } from '../content/utils';
import { endpoint, useContent } from '../hooks/useContent';
import FieldControl from './FieldControl';
import ItemEditor from './ItemEditor';

/**
 * 站点管理面板。
 *
 * 与空间详情页那个就地编辑器是两套东西：这里管整站文案和空间清单，
 * 详情页只改当前那一个空间。两者互不依赖。
 *
 * 脏标记用「草稿 JSON 与已发布 JSON 比对」得出，而不是在每个输入事件里记账——
 * 深层的块编辑（加文字、传图、排序）都只改 draft 这一份，一次比对就全覆盖了。
 * Vue 版靠 deep watch 自动做这件事；React 里写成 useMemo，draft 或正文一变就重算。
 */
export default function AdminPanel() {
    const { sections, loaded, saveSection } = useContent();

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => clone(sections));
    const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
    const [statuses, setStatuses] = useState({});
    const [saving, setSaving] = useState({});
    const [targetIndex, setTargetIndex] = useState(-1);

    const panelRef = useRef(null);
    const fabRef = useRef(null);

    // 从空间详情页点「编辑这个空间」过来时带着 ?space=短名，直接定位到那一条
    const pendingSpace = useMemo(
        () => new URLSearchParams(window.location.search).get('space') || '',
        []
    );

    /**
     * 所有编辑都走这里：深拷贝一份再改，改完整体 setState。
     * React 不能就地改 props 上的对象，否则组件不知道数据变了，也不会重渲染。
     */
    const mutate = useCallback((fn) => {
        setDraft((prev) => {
            const next = clone(prev);
            fn(next);
            return next;
        });
    }, []);

    const dirty = useMemo(() => {
        const result = {};
        SECTION_KEYS.forEach((key) => {
            result[key] = JSON.stringify(draft[key]) !== JSON.stringify(sections[key]);
        });
        return result;
    }, [draft, sections]);

    const hint = endpoint
        ? '改完点保存，内容写入云端后所有访客刷新即可看到。每个区块单独保存，互不覆盖。'
        : '还没配置 content-endpoint，面板只能看不能存：把 site.config.example.js 复制成 site.config.js 并填上云函数地址，或直接用邮件改内容。';

    function setStatus(key, message, tone) {
        setStatuses((prev) => ({ ...prev, [key]: { message, tone } }));
    }

    function clearStatus(key) {
        setStatuses((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    function activateTab(key) {
        setActiveKey(key);
        clearStatus(key);
    }

    function openPanel() {
        setDraft(clone(sections));
        setOpen(true);
    }

    function closePanel() {
        setOpen(false);
    }

    /* ---- 列表条目的增删改序 ---- */

    function itemsOf(key) {
        return (draft[key] && draft[key].items) || [];
    }

    function addItem(section) {
        if (itemsOf(section.key).length >= section.list.maxItems) {
            setStatus(section.key, `最多 ${section.list.maxItems} 个${section.list.label}，先删一个再加。`, 'error');
            return;
        }
        mutate((next) => {
            next[section.key].items.push(emptyItem(section));
        });
    }

    function removeItem(section, index) {
        const name = itemsOf(section.key)[index].name || `这个${section.list.label}`;
        if (!window.confirm(`删除「${name}」？里面的内容一起删掉。`)) return;
        mutate((next) => {
            next[section.key].items.splice(index, 1);
        });
    }

    function moveItem(section, index, delta) {
        const items = itemsOf(section.key);
        const target = index + delta;
        if (target < 0 || target >= items.length) return;
        mutate((next) => {
            const list = next[section.key].items;
            [list[index], list[target]] = [list[target], list[index]];
        });
    }

    /* ---- 保存 / 恢复默认 ---- */

    async function saveContent(key, content) {
        const section = sectionByKey(key);
        if (!section) return;

        if (!endpoint) {
            setStatus(key, '还没配置 content-endpoint（见 site.config.js），现在改的内容不会保存。', 'error');
            return;
        }

        setSaving((prev) => ({ ...prev, [key]: true }));
        const result = await saveSection(key, content);
        setSaving((prev) => ({ ...prev, [key]: false }));

        if (!result.ok) {
            if (result.errors) {
                const messages = Object.keys(result.errors).map((name) => result.errors[name]).slice(0, 3);
                setStatus(key, `${result.message}：${messages.join('；')}`, 'error');
            } else {
                setStatus(key, result.message, 'error');
            }
            return;
        }

        setStatus(key, result.message || '已保存，访客刷新即可看到。', 'success');
    }

    function save(key) {
        return saveContent(key, draft[key]);
    }

    async function reset(key) {
        const section = sectionByKey(key);
        if (!window.confirm(`把「${section.label}」恢复成默认内容？这会覆盖云端已保存的版本。`)) return;
        // 直接拿默认值去存，不等 setState 落地——否则保存的还是改之前的草稿
        const next = clone(DEFAULTS[key]);
        mutate((d) => {
            d[key] = next;
        });
        await saveContent(key, next);
    }

    /* ---- 从空间详情页点「编辑这个空间」过来：定位到那一条 ---- */

    // effect 里要读最新的 draft / sections，用 ref 拿，避免把它们塞进依赖导致反复触发
    const draftRef = useRef(draft);
    draftRef.current = draft;
    const sectionsRef = useRef(sections);
    sectionsRef.current = sections;

    const focusSpace = useCallback((wanted) => {
        const spaces = (draftRef.current && draftRef.current.spaces) || {};
        const index = findSpaceIndex(spaces.items || [], wanted);
        if (index < 0) return;

        setActiveKey('spaces');
        setTargetIndex(index);

        requestAnimationFrame(() => {
            const card = panelRef.current && panelRef.current.querySelector(`[data-item="${index}"]`);
            if (!card) return;
            try {
                card.scrollIntoView({ block: 'center', behavior: 'smooth' });
            } catch {
                /* 滚动只是为了看得清，失败不影响编辑 */
            }
            const input = card.querySelector('input');
            if (input) input.focus({ preventScroll: true });
        });
    }, []);

    /**
     * 直接 index.html#edit 进来时，面板往往比云端先就绪，停在默认值上。
     * 云端回来后刷新开着面板的区块——但有未保存改动的跳过，不能覆盖正在编辑的内容。
     */
    useEffect(() => {
        if (!loaded) return;
        setDraft((prev) => {
            const next = { ...prev };
            SECTION_KEYS.forEach((key) => {
                const stillDirty = JSON.stringify(prev[key]) !== JSON.stringify(sectionsRef.current[key]);
                if (stillDirty) return;
                next[key] = clone(sectionsRef.current[key]);
            });
            return next;
        });
        // 面板可能在云端回来之前就开了，那时候还找不到这个空间，这里补一次
        if (pendingSpace) focusSpace(pendingSpace);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, sections]);

    /* ---- 开关的键盘与外部点击 ---- */

    useEffect(() => {
        function onKeydown(event) {
            if (event.key === 'Escape') setOpen(false);
        }
        function onDocumentClick(event) {
            if (!open) return;
            if (panelRef.current && panelRef.current.contains(event.target)) return;
            if (fabRef.current && fabRef.current.contains(event.target)) return;
            setOpen(false);
        }
        document.addEventListener('keydown', onKeydown);
        document.addEventListener('click', onDocumentClick);
        return () => {
            document.removeEventListener('keydown', onKeydown);
            document.removeEventListener('click', onDocumentClick);
        };
    }, [open]);

    useEffect(() => {
        if (window.location.hash === '#edit') openPanel();
        if (pendingSpace) focusSpace(pendingSpace);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <button
                ref={fabRef}
                type="button"
                className={`admin-fab${open ? ' is-active' : ''}`}
                aria-label="打开站点管理面板"
                onClick={() => (open ? closePanel() : openPanel())}
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                <span>管理</span>
            </button>

            {open && (
                <aside ref={panelRef} className="admin-panel" aria-label="站点管理面板">
                    <div className="admin-panel-head">
                        <h2>站点管理</h2>
                        <button type="button" className="ghost-button" onClick={closePanel}>收起</button>
                    </div>

                    <p className="editor-hint">{hint}</p>

                    <div className="admin-tabs" role="tablist" aria-label="内容区块">
                        {SECTIONS.map((section) => (
                            <button
                                key={section.key}
                                type="button"
                                role="tab"
                                className={`admin-tab${activeKey === section.key ? ' is-active' : ''}${dirty[section.key] ? ' is-dirty' : ''}`}
                                aria-selected={String(activeKey === section.key)}
                                data-tab={section.key}
                                onClick={() => activateTab(section.key)}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>

                    <form noValidate onSubmit={(event) => event.preventDefault()}>
                        {SECTIONS.map((section) => (
                            <section
                                key={section.key}
                                // 用 display 而不是 hidden 属性：样式表里若给 .admin-pane 设了 display，
                                // hidden 会被覆盖掉，两个区块会同时显示
                                style={{ display: activeKey === section.key ? undefined : 'none' }}
                                className="admin-pane"
                                role="tabpanel"
                                data-pane={section.key}
                            >
                                <div className="admin-pane-body">
                                    {section.list ? (
                                        <>
                                            <div className="item-editor-list" data-item-list>
                                                {itemsOf(section.key).map((item, index) => (
                                                    <ItemEditor
                                                        key={index}
                                                        section={section}
                                                        item={item}
                                                        index={index}
                                                        total={itemsOf(section.key).length}
                                                        endpoint={endpoint}
                                                        target={section.key === 'spaces' && index === targetIndex}
                                                        onMutate={(fn) => mutate((next) => fn(next[section.key].items[index]))}
                                                        onRemove={() => removeItem(section, index)}
                                                        onMove={(delta) => moveItem(section, index, delta)}
                                                        onNotify={(payload) => setStatus(section.key, payload.message, payload.tone)}
                                                    />
                                                ))}
                                            </div>
                                            <button type="button" className="ghost-button item-add" onClick={() => addItem(section)}>
                                                + 添加{section.list.label}
                                            </button>
                                        </>
                                    ) : (
                                        section.fields.map((field) => (
                                            <FieldControl
                                                key={field.name}
                                                field={field}
                                                value={draft[section.key] ? draft[section.key][field.name] : ''}
                                                onChange={(value) => mutate((next) => {
                                                    next[section.key][field.name] = value;
                                                })}
                                            />
                                        ))
                                    )}
                                </div>

                                <div className="editor-actions">
                                    <button
                                        type="button"
                                        className="submit-button"
                                        disabled={saving[section.key]}
                                        onClick={() => save(section.key)}
                                    >
                                        {saving[section.key] ? '保存中…' : `保存「${section.label}」`}
                                    </button>
                                    <button type="button" className="ghost-button" onClick={() => reset(section.key)}>
                                        恢复默认
                                    </button>
                                </div>

                                {statuses[section.key] && (
                                    <p
                                        className={`editor-status${statuses[section.key].tone === 'error' ? ' is-error' : ''}${statuses[section.key].tone === 'success' ? ' is-success' : ''}`}
                                        data-status={section.key}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {statuses[section.key].message}
                                    </p>
                                )}
                            </section>
                        ))}
                    </form>
                </aside>
            )}
        </>
    );
}
