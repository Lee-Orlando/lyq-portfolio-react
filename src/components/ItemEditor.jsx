import { emptyBlock, MAX_BLOCKS_PER_SPACE } from '../content/schema';
import FieldControl from './FieldControl';
import BlockEditor from './BlockEditor';

/**
 * 列表区块里的一条（一个空间，或一条好东西）。
 * 空间的特别之处是它内部还有一层：按顺序堆的文字块和图片块。
 *
 * onMutate(fn) 拿到这一条的副本让调用方改，改完由上层统一 setState——
 * React 不允许直接改 props 上的对象，这是与 Vue 版最大的一处差异。
 */
export default function ItemEditor({ section, item, index, total, endpoint, onMutate, onRemove, onMove, onNotify, target }) {
    const blocks = Array.isArray(item.blocks) ? item.blocks : [];
    const hasBlocks = Boolean(section.list.blocks);

    function addBlock(kind) {
        if (blocks.length >= MAX_BLOCKS_PER_SPACE) {
            onNotify({ message: `一个空间最多 ${MAX_BLOCKS_PER_SPACE} 块内容。`, tone: 'error' });
            return;
        }
        onMutate((draft) => {
            draft.blocks.push(emptyBlock(kind));
        });
    }

    function removeBlock(order) {
        onMutate((draft) => {
            draft.blocks.splice(order, 1);
        });
    }

    function moveBlock(order, delta) {
        const targetIndex = order + delta;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        onMutate((draft) => {
            const list = draft.blocks;
            [list[order], list[targetIndex]] = [list[targetIndex], list[order]];
        });
    }

    return (
        <div className={`item-editor${target ? ' is-target' : ''}`} data-item={index}>
            <div className="item-editor-head">
                <span className="item-index">
                    {index + 1}. {item.name || `未命名${section.list.label}`}
                </span>
                <div className="item-controls">
                    <button
                        type="button"
                        className="icon-button"
                        disabled={index === 0}
                        aria-label={`把第 ${index + 1} 条上移`}
                        onClick={() => onMove(-1)}
                    >↑</button>
                    <button
                        type="button"
                        className="icon-button"
                        disabled={index === total - 1}
                        aria-label={`把第 ${index + 1} 条下移`}
                        onClick={() => onMove(1)}
                    >↓</button>
                    <button
                        type="button"
                        className="icon-button is-danger"
                        aria-label={`删除第 ${index + 1} 条`}
                        onClick={onRemove}
                    >删除</button>
                </div>
            </div>

            {section.list.fields.map((field) => (
                <FieldControl
                    key={field.name}
                    field={field}
                    index={index}
                    value={item[field.name]}
                    onChange={(value) => onMutate((draft) => {
                        draft[field.name] = value;
                    })}
                />
            ))}

            {hasBlocks && (
                <>
                    <div className="block-editor-list">
                        {blocks.map((block, order) => (
                            <BlockEditor
                                key={order}
                                block={block}
                                order={order}
                                total={blocks.length}
                                endpoint={endpoint}
                                onPatch={(patch) => onMutate((draft) => {
                                    Object.assign(draft.blocks[order], patch);
                                })}
                                onRemove={() => removeBlock(order)}
                                onMove={(delta) => moveBlock(order, delta)}
                                onNotify={onNotify}
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
                </>
            )}
        </div>
    );
}
