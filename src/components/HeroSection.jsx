import ParticleField from './ParticleField';

export default function HeroSection({ data }) {
    return (
        <section className="hero section" id="hero">
            <div className="hero-background"></div>
            <ParticleField />
            <div className="hero-content">
                <h1>{data.title}</h1>
                <p>{data.subtitle}</p>
                <a href="#about" className="cta-button">{data.ctaText}</a>
            </div>
        </section>
    );
}
