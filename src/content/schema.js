/**
 * 一张表定义整站可管理的内容。
 *
 * 加一个新区块的流程只有两步：① 这里加一条 + 一个默认值
 * ② 云函数 content/index.js 的 NORMALIZERS 里加一个整理函数。
 * 面板的表单是按这张表生成的，不需要回来改模板。
 *
 * 字段的三种形态：
 *   text（默认）/ textarea / tags（数组，逗号或顿号分隔）
 * url: true 的字段会被当成链接处理，只接受 http(s)。
 * preview: true 的字段（目前只有空间的短名）会在输入框下方实时显示最终网址。
 */
export const SECTIONS = [
    {
        key: 'hero',
        label: '首屏',
        fields: [
            { name: 'title', label: '主标题', max: 60 },
            { name: 'subtitle', label: '副标题', type: 'textarea', rows: 2, max: 160 },
            { name: 'ctaText', label: '按钮文字', max: 24 }
        ]
    },
    {
        key: 'about',
        label: '关于我',
        fields: [
            { name: 'lead', label: '第一段自我介绍', type: 'textarea', rows: 3, max: 800 },
            { name: 'more', label: '第二段自我介绍', type: 'textarea', rows: 3, max: 800 }
        ]
    },
    {
        key: 'skills',
        label: '技能',
        fields: [
            {
                name: 'items',
                label: '技能标签',
                type: 'tags',
                hint: '逗号或顿号分隔，最多 24 项',
                maxItems: 24,
                itemMax: 24
            }
        ]
    },
    {
        key: 'spaces',
        label: '空间',
        list: {
            label: '空间',
            maxItems: 12,
            fields: [
                { name: 'name', label: '空间名字', max: 40, placeholder: '例如：读书笔记 / 摄影 / 项目记录' },
                {
                    name: 'slug',
                    label: '链接短名',
                    max: 32,
                    placeholder: 'notes',
                    hint: '只能用小写字母、数字和连字符，决定这个空间的网址。留空就按序号排（s1、s2），但改名后旧链接会失效。',
                    preview: true
                }
            ],
            // 每个空间除了这些字段，还能往下塞文字块和图片块
            blocks: true
        }
    },
    {
        key: 'links',
        label: '好东西',
        list: {
            label: '好东西',
            maxItems: 24,
            fields: [
                { name: 'name', label: '名字', max: 40, placeholder: '例如：我的另一个作品 / 一个很酷的网站' },
                {
                    name: 'url',
                    label: '网址',
                    max: 300,
                    url: true,
                    placeholder: 'https://example.com',
                    hint: '只认 http(s) 开头的地址。这是站外链接，会在新标签页打开。'
                },
                { name: 'note', label: '一句话说明（选填）', max: 120, placeholder: '例如：配色参考做得很好' }
            ]
        }
    },
    {
        key: 'contact',
        label: '联系方式',
        fields: [
            { name: 'intro', label: '引导语', type: 'textarea', rows: 2, max: 200 },
            { name: 'email', label: '邮箱', max: 120 },
            { name: 'github', label: 'GitHub 主页', max: 300, url: true, placeholder: 'https://github.com/…' }
        ]
    },
    {
        key: 'footer',
        label: '页脚',
        fields: [{ name: 'note', label: '版权文字', max: 160 }]
    }
];

export const SECTION_KEYS = SECTIONS.map((section) => section.key);

export function sectionByKey(key) {
    return SECTIONS.find((section) => section.key === key) || null;
}

/**
 * 默认内容。
 *
 * 原生版把默认值写在 HTML 里（禁用 JS 也读得到），Vue 版做不到——
 * 整页是 JS 渲染的。所以这里的取舍是：默认值退到 JS 里，换取组件化，
 * 同时在 index.html 放一段 <noscript> 如实说明、并指回原生版。
 */
export const DEFAULTS = {
    hero: {
        title: '探索、创造、分享',
        subtitle: '欢迎来到我的数字花园，在这里我记录我的学习、思考和创造之旅。',
        ctaText: '了解更多'
    },
    about: {
        lead: '我是 Lyq，正在找前端开发方向的第一份工作。这个站点是我用 React 18 + Vite 搭的：组件化开发，构建产物是纯静态文件，托管在腾讯云开发 CloudBase；内容管理和留言各由一个 Serverless 云函数处理。',
        more: '同一个站点我写了三遍——原生 JS、Vue、React，三套前端共用同一套后端和同一份数据。这么做不只是为了练手：能看出同一件事在不同范式下怎么写，比简历上多一个名词有说服力。'
    },
    skills: {
        items: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Vue.js', 'Node.js', 'Python', 'MySQL', 'Git']
    },
    spaces: { items: [] },
    links: { items: [] },
    contact: {
        intro: '有想聊聊技术和生活？随时给我留言。',
        email: '18546266901@163.com',
        github: 'https://github.com/Lee-Orlando'
    },
    footer: { note: 'Lyq. All rights reserved.' }
};

/* ---- 空骨架：建新条目时用 ---- */

export function emptyData(section) {
    if (section.list) return { items: [] };
    const data = {};
    section.fields.forEach((field) => {
        data[field.name] = field.type === 'tags' ? [] : '';
    });
    return data;
}

export function emptyItem(section) {
    const item = {};
    section.list.fields.forEach((field) => {
        item[field.name] = field.type === 'tags' ? [] : '';
    });
    if (section.list.blocks) item.blocks = [];
    return item;
}

export function emptyBlock(kind) {
    return kind === 'image'
        ? { type: 'image', url: '', alt: '' }
        : { type: 'text', value: '' };
}

export const MAX_BLOCKS_PER_SPACE = 30;

/* ---- 与云函数 content/index.js 的白名单保持一致 ---- */

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
