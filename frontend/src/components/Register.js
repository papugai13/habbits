import React, { useState } from 'react';
import './Auth.css';

const Register = ({ onRegister, onSwitchToLogin, t, theme: propTheme, setTheme: propSetTheme }) => {
    // If not passed, use a local state that reads from localStorage
    const [localTheme, setLocalTheme] = useState(() => localStorage.getItem('theme') || 'auto');
    const theme = propTheme || localTheme;

    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const handleThemeChange = (newTheme) => {
        if (propSetTheme) {
            propSetTheme(newTheme);
        } else {
            setLocalTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Manually apply theme if parent doesn't handle it
            let currentTheme = newTheme;
            if (newTheme === 'auto') {
                const hour = new Date().getHours();
                currentTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
            }
            document.body.className = currentTheme === 'dark' ? 'dark-theme' : '';
        }
        localStorage.setItem('theme', newTheme);
    };

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Очистка ошибки для конкретного поля
        if (errors[e.target.name]) {
            setErrors({
                ...errors,
                [e.target.name]: null
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.password !== formData.password2) {
            newErrors.password2 = t('passwordsDoNotMatch');
        }

        if (formData.password.length < 8) {
            newErrors.password = t('passwordTooShort');
        }

        if (!formData.email.includes('@')) {
            newErrors.email = t('invalidEmail');
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Валидация на клиенте
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/auth/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                onRegister(data);
            } else {
                // Обработка ошибок от сервера
                if (typeof data === 'object') {
                    setErrors(data);
                } else {
                    setErrors({ general: t('registerError') });
                }
            }
        } catch (err) {
            setErrors({ general: t('connectionError') });
            console.error('Register error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card">
            {/* Beautiful Segmented Theme Switcher */}
            <div className="auth-theme-toggle" role="radiogroup" aria-label={t('theme') || 'Тема'}>
                <div className={`auth-theme-indicator ${theme}`} />
                <button
                    type="button"
                    className={`auth-theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                    aria-checked={theme === 'light'}
                    role="radio"
                    title={t('lightTheme') || 'Светлая тема'}
                    aria-label={t('lightTheme') || 'Светлая тема'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>
                <button
                    type="button"
                    className={`auth-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                    aria-checked={theme === 'dark'}
                    role="radio"
                    title={t('darkTheme') || 'Темная тема'}
                    aria-label={t('darkTheme') || 'Темная тема'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>
                <button
                    type="button"
                    className={`auth-theme-btn ${theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('auto')}
                    aria-checked={theme === 'auto'}
                    role="radio"
                    title={t('autoTheme') || 'Системная тема'}
                    aria-label={t('autoTheme') || 'Системная тема'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor"></path>
                    </svg>
                </button>
            </div>

            <h1 className="auth-title">{t('registerTitle')}</h1>
            <p className="auth-subtitle">{t('registerSubtitle')}</p>

            {errors.general && <div className="auth-error">{errors.general}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="username">{t('username')} *</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        autoFocus
                        disabled={loading}
                    />
                    {errors.username && <span className="field-error">{errors.username}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="email">{t('email')} *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="first_name">{t('firstName')}</label>
                        <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="last_name">{t('lastName')}</label>
                        <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="password">{t('password')} *</label>
                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? t('hidePassword') || 'Скрыть пароль' : t('showPassword') || 'Показать пароль'}
                            title={showPassword ? t('hidePassword') || 'Скрыть пароль' : t('showPassword') || 'Показать пароль'}
                        >
                            {showPassword ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                    {errors.password && <span className="field-error">{errors.password}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="password2">{t('confirmPassword')} *</label>
                    <div className="password-wrapper">
                        <input
                            type={showPassword2 ? "text" : "password"}
                            id="password2"
                            name="password2"
                            value={formData.password2}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword2(!showPassword2)}
                            aria-label={showPassword2 ? t('hidePassword') || 'Скрыть пароль' : t('showPassword') || 'Показать пароль'}
                            title={showPassword2 ? t('hidePassword') || 'Скрыть пароль' : t('showPassword') || 'Показать пароль'}
                        >
                            {showPassword2 ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                    {errors.password2 && <span className="field-error">{errors.password2}</span>}
                </div>

                <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                >
                    {loading ? t('registering') : t('registerButton')}
                </button>
            </form>

            <div className="auth-switch">
                {t('alreadyHaveAccount')}{' '}
                <button
                    onClick={onSwitchToLogin}
                    className="auth-link"
                    disabled={loading}
                >
                    {t('loginButton')}
                </button>
            </div>
        </div>
    );
};

export default Register;
