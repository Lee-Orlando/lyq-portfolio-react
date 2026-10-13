import { useFadeIn } from '../hooks/useFadeIn';

/**
 * 「关于我」+「我的技能」。
 * 原生版里技能是嵌在关于区块里的一个 <div data-section="skills">，
 * 这里保持同样的层级——两个区块在云端是分开存的，但页面上属于同一段叙述。
 */
export default function AboutSection({ about, skills }) {
    const ref = useFadeIn();
    const tags = Array.isArray(skills.items) ? skills.items : [];

    return (
        <section className="about section fade-in-section" id="about" ref={ref}>
            <div className="container">
                <div className="about-content">
                    <h2 className="section-title">关于我</h2>
                    <div id="aboutView">
                        <p>{about.lead}</p>
                        <p>{about.more}</p>

                        <h3>我的技能</h3>
                        {tags.length > 0 && (
                            <ul className="skills-list">
                                {tags.map((tag) => (
                                    <li key={tag}>{tag}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
