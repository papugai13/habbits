import React, { useState } from 'react';
import './Auth.css';

const Register = ({ onRegister, onSwitchToLogin, t }) => {
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
        <div className="auth-container">
            <div className="auth-card">
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
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password2">{t('confirmPassword')} *</label>
                        <input
                            type="password"
                            id="password2"
                            name="password2"
                            value={formData.password2}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
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
        </div>
    );
};

export default Register;
