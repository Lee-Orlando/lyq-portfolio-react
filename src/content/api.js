/**
 * 与云端通信：内容读写、图片上传、留言提交。
 *
 * 这一层刻意不碰 Vue 也不碰 DOM——它只负责「发请求、解析结果、把失败说清楚」。
 * 三个版本（原生 / Vue / React）调的是完全相同的 HTTP 接口，数据也只有一份。
 */

/**
 * 端点地址来自 public/site.config.js（含真实环境 ID，被 gitignore 排除）。
 * 没有这个文件就退回 index.html 的 meta 兜底值。
 * 只接受 http/https，避免有人在配置里塞 javascript: 之类的伪协议。
 */
function readConfigValue(key) {
    const config = typeof window !== 'undefined' ? window.SITE_CONFIG : null;
    if (!config || typeof config !== 'object') return '';
    const value = config[key];
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

function readMeta(name) {
    if (typeof document === 'undefined') return '';
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.content.trim() : '';
}

export function contentEndpoint() {
    return readConfigValue('contentEndpoint') || readMeta('content-endpoint');
}

export function contactEndpoint() {
    return readConfigValue('contactEndpoint') || readMeta('contact-endpoint');
}

/** 拿全部区块。接口不通返回 null，调用方沿用默认内容，不谎报成功 */
export async function fetchSections(endpoint) {
    try {
        const response = await fetch(endpoint, { method: 'GET' });
        const data = await response.json();
        if (!response.ok || !data || !data.ok || !data.sections) return null;
        return data.sections;
    } catch {
        return null;
    }
}

/** 只取 spaces 区块。加时间戳是为了跳过 CDN 缓存——否则刚存进去的内容会读成旧版本 */
export async function fetchSpaces(endpoint) {
    try {
        const response = await fetch(`${endpoint}?section=spaces&_=${Date.now()}`, { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * 写一个区块。
 * 失败时区分三种：网络不通、服务端整体拒绝、服务端给出字段级错误。
 * 字段级错误要能回填到对应输入框，而不是笼统弹一句「保存失败」。
 */
export async function pushSection(endpoint, key, content) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: key, content })
        });
        const data = await response.json().catch(() => null);

        if (response.ok && data && data.ok) {
            return { ok: true, message: data.message || '已保存' };
        }
        return {
            ok: false,
            errors: (data && data.errors) || null,
            message: (data && data.message) || `保存失败（${response.status}）`
        };
    } catch {
        return { ok: false, message: '网络不太顺畅，没能连上云端。' };
    }
}

/**
 * 选图 → 读成 base64 → 交给云函数 → 拿回可以直接 <img src> 的地址。
 * 图片不塞进内容 JSON，而是单独落在 site/media/ 下，否则内容文件会迅速膨胀。
 */
export async function uploadImage(endpoint, file) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读不出这张图'));
        reader.readAsDataURL(file);
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', mimeType: file.type, data: dataUrl })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.ok) {
        throw new Error((data && data.message) || `上传失败（${response.status}）`);
    }
    return data.url;
}

/** 联系表单提交 */
export async function sendMessage(endpoint, payload) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // 网关异常时可能返回 HTML，解析失败要能兜住而不是抛给用户
        const result = await response.json().catch(() => null);

        if (response.ok && result && result.ok) {
            return { ok: true, message: result.message || '留言已收到，我会尽快回复你。' };
        }
        return {
            ok: false,
            errors: (result && result.errors) || null,
            message: (result && result.message) || `发送失败（${response.status}）`
        };
    } catch {
        return { ok: false, message: '网络不太顺畅，留言没能发出去。' };
    }
}
