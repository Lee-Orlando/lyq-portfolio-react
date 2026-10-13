import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { clone } from '../content/utils';
import { DEFAULTS } from '../content/schema';
import { contentEndpoint, fetchSections, pushSection } from '../content/api';

/**
 * 站点内容的全局 store。
 *
 * 用 Context + Provider 而不是模块级可变对象，是因为 React 的渲染依赖「引用变了就重渲染」：
 * 直接改一个模块里的对象，组件不会知道内容变了。这里每一次内容更新都走 setSections，
 * 页面上读 sections 的组件自然跟着更新——面板保存成功，正文立刻变。
 *
 * 与 Vue 版的单例 store 是同一份语义，只是换成了 React 的表达方式。
 */

const ContentContext = createContext(null);

export const endpoint = contentEndpoint();

export function ContentProvider({ children }) {
    const [sections, setSections] = useState(() => clone(DEFAULTS));
    const [loaded, setLoaded] = useState(false);

    /**
     * 启动时拉一次云端内容。
     * 失败的语义是「沿用默认内容」，不是「报错」——接口不通时页面照样完整可读。
     */
    const load = useCallback(async () => {
        if (!endpoint) return false;
        const remote = await fetchSections(endpoint);
        if (!remote) return false;

        setSections((prev) => {
            const next = { ...prev };
            Object.keys(remote).forEach((key) => {
                if (!(key in DEFAULTS)) return;
                // 云端返回 null 表示该区块从没保存过，保持默认内容
                if (remote[key] === null || remote[key] === undefined) return;
                next[key] = remote[key];
            });
            return next;
        });
        setLoaded(true);
        return true;
    }, []);

    /** 保存一个区块。成功时把结果写回 store，页面立刻跟着变 */
    const saveSection = useCallback(async (key, content) => {
        const result = await pushSection(endpoint, key, content);
        if (result.ok) {
            setSections((prev) => ({ ...prev, [key]: clone(content) }));
        }
        return result;
    }, []);

    const value = useMemo(() => ({
        sections,
        loaded,
        writable: Boolean(endpoint),
        load,
        saveSection
    }), [sections, loaded, load, saveSection]);

    return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
    const ctx = useContext(ContentContext);
    if (!ctx) throw new Error('useContent 必须在 <ContentProvider> 内部使用');
    return ctx;
}
