import { useMemo } from 'react';
import { safeUrl, shortHandle } from '../content/utils';
import ContactForm from './ContactForm';
import { useFadeIn } from '../hooks/useFadeIn';

const SUBJECT = encodeURIComponent('来自个人站点的留言');

export default function ContactSection({ contact }) {
    const ref = useFadeIn();

    const email = String(contact.email || '').trim();
    const github = safeUrl(contact.github);
    const githubLabel = shortHandle(github);
    const mailto = useMemo(
        () => (email ? `mailto:${email}?subject=${SUBJECT}` : ''),
        [email]
    );

    return (
        <section className="contact section fade-in-section" id="contact" ref={ref}>
            <div className="container">
                <h2 className="section-title">联系我</h2>

                <div className="contact-lede">
                    <p className="contact-intro">{contact.intro}</p>
                    <ul className="contact-direct">
                        {email && (
                            <li>
                                <a href={mailto} aria-label={`发送邮件到 ${email}`}>{email}</a>
                            </li>
                        )}
                        {github && (
                            <li>
                                <a
                                    href={github}
                                    aria-label={`GitHub 主页：${githubLabel}`}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    {githubLabel}
                                </a>
                            </li>
                        )}
                    </ul>
                </div>

                <ContactForm />
            </div>
        </section>
    );
}
