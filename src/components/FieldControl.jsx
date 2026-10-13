import { parseTags, slugify, tagsToText } from '../content/utils';

/**
 * 一个字段的编辑控件。形态由 schema 里的 type 决定：text / textarea / tags。
 *
 * 输入时存原样、失焦时才 trim：如果每次按键都把首尾空格削掉再写回，
 * 受控组件会把输入框的 value 重设一遍，光标会跳到末尾，打一个词就断一次。
 */
export default function FieldControl({ field, value, index = 0, onChange }) {
    const isTags = field.type === 'tags';
    const isTextarea = field.type === 'textarea';

    // 输入框里显示什么：tags 要摊平成顿号分隔的字符串
    const display = isTags ? tagsToText(value) : String(value ?? '');
    const id = `f-${field.name}-${index}`;

    function push(raw) {
        onChange(isTags ? parseTags(raw) : raw);
    }

    function onBlur(event) {
        const raw = event.target.value;
        // 短名当场收敛成合法值并在输入框里显示出来，让用户看见自己到底拿到了什么
        if (field.name === 'slug') {
            onChange(slugify(raw));
            return;
        }
        push(isTags ? raw : raw.trim());
    }

    /** 短名这类字段把「最终会变成什么网址」直接摊开，免得填完不知道拿到哪个链接 */
    const preview = (() => {
        if (!field.preview) return '';
        const slug = slugify(value);
        return slug
            ? `这个空间的网址：space.html?space=${slug}`
            : `还没填短名，网址会按序号排成 s${index + 1}`;
    })();

    return (
        <div className="form-group">
            <label htmlFor={id}>{field.label}</label>

            {isTextarea ? (
                <textarea
                    id={id}
                    value={display}
                    rows={field.rows || 3}
                    maxLength={field.max || 500}
                    placeholder={field.placeholder || ''}
                    onChange={(event) => push(event.target.value)}
                    onBlur={onBlur}
                />
            ) : (
                <input
                    id={id}
                    type={field.url ? 'url' : 'text'}
                    value={display}
                    autoComplete="off"
                    maxLength={field.max || 500}
                    placeholder={field.placeholder || ''}
                    onChange={(event) => push(event.target.value)}
                    onBlur={onBlur}
                />
            )}

            {field.hint && <span className="field-hint">{field.hint}</span>}
            {field.preview && (
                <span className="field-hint is-link" data-slug-preview={field.name}>{preview}</span>
            )}
        </div>
    );
}
