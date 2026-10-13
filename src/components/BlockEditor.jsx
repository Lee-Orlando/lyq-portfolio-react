import { safeUrl } from '../content/utils';
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '../content/schema';
import { uploadImage } from '../content/api';

/**
 * 一个空间内部的一块内容：文字块或图片块。
 * 可以上下移动、删除；图片块还能选图上传。
 *
 * 上传成功后只把返回的 CDN 地址写进 block.url —— 图片本身不进内容 JSON，
 * base64 会让体积膨胀三分之一，内容文件迟早被撑爆。
 *
 * patch(patch) 把改动合并进这一块：React 里不能直接改 props 上的对象，
 * 所有修改都要由上层收进 draft 再整体 setState。
 */
export default function BlockEditor({ block, order, total, endpoint, onPatch, onRemove, onMove, onNotify }) {
    const previewUrl = safeUrl(block.url);
    const isImage = block.type === 'image';

    async function onPickFile(event) {
        const picker = event.target;
        const file = picker.files && picker.files[0];
        // 清掉才能重复选同一个文件，否则第二次选它不会再触发 change
        picker.value = '';
        if (!file) return;

        if (!IMAGE_MIME_TYPES.includes(file.type)) {
            onNotify({ message: '只支持 PNG / JPG / GIF / WebP 图片。', tone: 'error' });
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            onNotify({
                message: `这张图 ${(file.size / 1024 / 1024).toFixed(2)}MB，超过 2MB 上限，先压缩一下。`,
                tone: 'error'
            });
            return;
        }
        if (!endpoint) {
            onNotify({ message: '还没配置 content-endpoint，图片没地方存。', tone: 'error' });
            return;
        }

        onNotify({ message: '图片上传中…', tone: '' });
        try {
            const url = await uploadImage(endpoint, file);
            onPatch({ url });
            onNotify({ message: '图片已上传，记得点保存。', tone: 'success' });
        } catch (error) {
            onNotify({ message: error.message || '图片上传失败，重试一次试试。', tone: 'error' });
        }
    }

    return (
        <div className="block-editor" data-block={order}>
            <div className="block-head">
                <span className={`block-kind is-${block.type}`}>{isImage ? '图片' : '文字'}</span>
                <div className="item-controls">
                    <button
                        type="button"
                        className="icon-button"
                        disabled={order === 0}
                        aria-label="把这块内容上移"
                        onClick={() => onMove(-1)}
                    >↑</button>
                    <button
                        type="button"
                        className="icon-button"
                        disabled={order === total - 1}
                        aria-label="把这块内容下移"
                        onClick={() => onMove(1)}
                    >↓</button>
                    <button
                        type="button"
                        className="icon-button is-danger"
                        aria-label="删除这块内容"
                        onClick={onRemove}
                    >删除</button>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor={isImage ? `b-img-${order}` : `b-text-${order}`}>
                    第 {order + 1} 块{isImage ? '图片' : '文字'}
                </label>

                {!isImage ? (
                    <textarea
                        id={`b-text-${order}`}
                        value={block.value || ''}
                        rows="3"
                        maxLength={2000}
                        onChange={(event) => onPatch({ value: event.target.value })}
                        onBlur={(event) => onPatch({ value: String(event.target.value || '').trim() })}
                    />
                ) : (
                    <>
                        <input
                            id={`b-img-${order}`}
                            type="file"
                            className="block-file"
                            accept={IMAGE_MIME_TYPES.join(',')}
                            onChange={onPickFile}
                        />
                        {/* 已经传过的图把缩略图摆出来，才知道这块到底放了什么 */}
                        {previewUrl && (
                            <img className="block-preview" src={previewUrl} alt={block.alt || '已上传的图片'} />
                        )}
                        <label htmlFor={`b-img-${order}-alt`}>图片说明（会显示在图下方，可留空）</label>
                        <input
                            id={`b-img-${order}-alt`}
                            type="text"
                            maxLength={120}
                            autoComplete="off"
                            placeholder="例如：凌晨四点的自习室"
                            value={block.alt || ''}
                            onChange={(event) => onPatch({ alt: event.target.value })}
                            onBlur={(event) => onPatch({ alt: String(event.target.value || '').trim() })}
                        />
                        {previewUrl && <span className="field-hint">{previewUrl}</span>}
                    </>
                )}
            </div>
        </div>
    );
}
