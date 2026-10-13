import { useRef, useState } from 'react';
import { contactEndpoint, sendMessage } from '../content/api';

/**
 * 联系表单：前端即时校验 + 提交到云函数。
 *
 * 三种结果都要让用户看得见：成功、服务端拒绝、网络失败。
 * 没配 contact 端点时如实说「在线留言还没开通」并引导邮件联系——
 * 绝不能把没发出去的留言显示成「发送成功」。
 */

const FALLBACK_CONTACT = '你可以直接发邮件到 18546266901@163.com。';

const FIELDS = ['name', 'email', 'message'];

const VALIDATORS = {
    name(value) {
        const trimmed = value.trim();
        if (!trimmed) return '请填写您的姓名';
        if (trimmed.length < 2) return '姓名至少 2 个字符';
        return '';
    },
    email(value) {
        const trimmed = value.trim();
        if (!trimmed) return '请填写您的邮箱';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return '邮箱格式看起来不太对';
        return '';
    },
    message(value) {
        const trimmed = value.trim();
        if (!trimmed) return '留言内容不能为空';
        if (trimmed.length < 10) return '再多写几句吧，至少 10 个字符';
        return '';
    }
};

const EMPTY_FORM = { name: '', email: '', message: '' };

export default function ContactForm() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState({ message: '', tone: '', visible: false });
    const [sending, setSending] = useState(false);

    // 已经标红过的字段才在打字时重校验，避免刚开始输入就报错
    const touchedRef = useRef({ name: false, email: false, message: false });

    function validateField(name, value) {
        const message = VALIDATORS[name](value);
        setErrors((prev) => ({ ...prev, [name]: message }));
        return !message;
    }

    function onChange(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        if (touchedRef.current[name]) validateField(name, value);
    }

    async function onSubmit(event) {
        event.preventDefault();

        const invalid = FIELDS.find((name) => !VALIDATORS[name](form[name]));
        if (invalid) {
            setErrors({
                name: VALIDATORS.name(form.name),
                email: VALIDATORS.email(form.email),
                message: VALIDATORS.message(form.message)
            });
            FIELDS.forEach((name) => { touchedRef.current[name] = true; });
            setStatus({ message: '', tone: '', visible: false });
            return;
        }

        const endpoint = contactEndpoint();
        if (!endpoint) {
            setStatus({ message: `在线留言还没开通，${FALLBACK_CONTACT}`, tone: 'error', visible: true });
            return;
        }

        setSending(true);
        setStatus({ message: '', tone: '', visible: false });

        const result = await sendMessage(endpoint, {
            name: form.name.trim(),
            email: form.email.trim(),
            message: form.message.trim()
        });
        setSending(false);

        if (result.ok) {
            setForm(EMPTY_FORM);
            setErrors({ name: '', email: '', message: '' });
            touchedRef.current = { name: false, email: false, message: false };
            setStatus({ message: result.message, tone: 'success', visible: true });
            return;
        }

        if (result.errors) {
            // 服务端给出的是字段级错误，回填到对应输入框而不是笼统报错
            setErrors((prev) => {
                const next = { ...prev };
                FIELDS.forEach((name) => {
                    if (result.errors[name]) next[name] = result.errors[name];
                });
                return next;
            });
            setStatus({ message: result.message || '有几项内容需要修改一下。', tone: 'error', visible: true });
            return;
        }

        setStatus({ message: `${result.message} ${FALLBACK_CONTACT}`, tone: 'error', visible: true });
    }

    return (
        <form className="contact-form" noValidate onSubmit={onSubmit}>
            <p
                className={`form-status${status.tone === 'error' ? ' is-error' : ''}${status.tone === 'success' ? ' is-success' : ''}`}
                role="status"
                aria-live="polite"
                hidden={!status.visible}
            >
                {status.message}
            </p>

            <div className="form-group">
                <label className="visually-hidden" htmlFor="contactName">您的姓名</label>
                <input
                    id="contactName"
                    type="text"
                    name="name"
                    placeholder="您的姓名"
                    autoComplete="name"
                    value={form.name}
                    aria-invalid={errors.name ? 'true' : undefined}
                    aria-describedby="nameError"
                    onChange={(event) => onChange('name', event.target.value)}
                    onBlur={() => {
                        touchedRef.current.name = true;
                        validateField('name', form.name);
                    }}
                />
                <span className="form-error" id="nameError" hidden={!errors.name}>{errors.name}</span>
            </div>

            <div className="form-group">
                <label className="visually-hidden" htmlFor="contactEmail">您的邮箱</label>
                <input
                    id="contactEmail"
                    type="email"
                    name="email"
                    placeholder="您的邮箱"
                    autoComplete="email"
                    value={form.email}
                    aria-invalid={errors.email ? 'true' : undefined}
                    aria-describedby="emailError"
                    onChange={(event) => onChange('email', event.target.value)}
                    onBlur={() => {
                        touchedRef.current.email = true;
                        validateField('email', form.email);
                    }}
                />
                <span className="form-error" id="emailError" hidden={!errors.email}>{errors.email}</span>
            </div>

            <div className="form-group">
                <label className="visually-hidden" htmlFor="contactMessage">您的留言</label>
                <textarea
                    id="contactMessage"
                    name="message"
                    placeholder="您的留言"
                    rows="5"
                    value={form.message}
                    aria-invalid={errors.message ? 'true' : undefined}
                    aria-describedby="messageError"
                    onChange={(event) => onChange('message', event.target.value)}
                    onBlur={() => {
                        touchedRef.current.message = true;
                        validateField('message', form.message);
                    }}
                />
                <span className="form-error" id="messageError" hidden={!errors.message}>{errors.message}</span>
            </div>

            <button type="submit" className="submit-button" disabled={sending}>
                {sending ? '发送中…' : '发送留言'}
            </button>
        </form>
    );
}
