/**
 * 纯函数工具集：不碰 DOM，也不依赖 Vue。
 * 单独拆出来是为了能直接被组件和云函数调用两端的逻辑共用，也方便单测。
 */

export function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * 只认 http/https。
 * 内容来源是公开可写的接口，不拦一道的话，一条 javascript: 开头的链接
 * 就能在访客点击时执行脚本——这个字段会渲染成 href，必须卡死。
 */
export function safeUrl(value) {
    const url = String(value || '').trim();
    return /^https?:\/\/\S+$/i.test(url) ? url : '';
}

/** 只取域名用于展示；解析失败就整条退回，别因为一个奇怪的网址把整页搞崩 */
export function hostOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '外部链接';
    }
}

/** 把 https://github.com/Lee-Orlando/ 显示成 Lee-Orlando——链接该给机器，名字该给人看 */
export function shortHandle(url) {
    return String(url || '')
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/+$/, '');
}

/**
 * 链接短名：只留小写字母、数字和连字符，其余折成连字符并截到 32 字。
 * 与云函数 content/index.js 里的 slugify 是同一套规则，改一处就要改另一处。
 */
export function slugify(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    return raw
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
}

/** 没填短名就按序号兜底（s1 是第一个空间），space.html 认这个格式 */
export function spaceSlug(space, index) {
    return slugify(space && space.slug) || `s${index + 1}`;
}

export function spaceHref(space, index) {
    return `space.html?space=${encodeURIComponent(spaceSlug(space, index))}`;
}

const TAGS_SEPARATOR = /[,，、]/;

/** 把 "a、b, c" 收成数组；后端也这么切，两边保持一致 */
export function parseTags(value) {
    return String(value || '')
        .split(TAGS_SEPARATOR)
        .map((item) => item.trim())
        .filter(Boolean);
}

export function tagsToText(items) {
    return Array.isArray(items) ? items.join('、') : '';
}

/** 卡片上的摘要：折掉换行再截断，免得格子高矮不一 */
export function excerpt(text, max = 60) {
    const flat = String(text || '').trim().replace(/\s+/g, ' ');
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * 先按短名找，找不到再看是不是 s1 / s2 这种序号兜底。
 * 序号兜底存在的原因是允许先建空间、以后再补短名，链接不至于当场失效。
 * 返回下标而不是空间本身——保存时要知道该把哪一个写回去。
 */
export function findSpaceIndex(items, wanted) {
    const list = Array.isArray(items) ? items : [];
    const slug = slugify(wanted);
    if (!slug) return -1;

    const bySlug = list.findIndex((item) => slugify(item && item.slug) === slug);
    if (bySlug >= 0) return bySlug;

    const asIndex = /^s(\d+)$/.exec(slug);
    if (asIndex) {
        const position = Number(asIndex[1]) - 1;
        if (position >= 0 && position < list.length) return position;
    }
    return -1;
}
