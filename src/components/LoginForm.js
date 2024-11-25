// frontend/LoginForm.js
import React, { useState, useEffect } from 'react';
import { validatePassword, validateEmail } from '../validation';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:10000'
    : 'https://katz-abr-backend.onrender.com';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState([]);
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const testConnection = async () => {
            try {
                const response = await fetch(`${API_URL}/test`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                console.log('Server connection test:', data);
            } catch (error) {
                console.error('Server connection test failed:', error);
                setErrors(['בעיית תקשורת עם השרת']);
            }
        };
        testConnection();
    }, []);

    useEffect(() => {
        const checkRememberToken = async () => {
            const token = localStorage.getItem('rememberToken');
            if (!token) return;

            try {
                const response = await fetch(`${API_URL}/check-remember-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ token })
                });

                if (!response.ok) {
                    throw new Error('Invalid token');
                }

                const data = await response.json();
                if (data.user) {
                    navigate('/users');
                }
            } catch (error) {
                localStorage.removeItem('rememberToken');
                console.error('Token verification failed:', error);
            }
        };
        checkRememberToken();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors([]);
        setIsLoading(true);

        try {
            // Validation for registration
            if (!isLogin) {
                const validationErrors = [
                    ...validatePassword(password),
                    ...validateEmail(email)
                ];
                if (validationErrors.length) {
                    setErrors(validationErrors);
                    setIsLoading(false);
                    return;
                }
            }

            const response = await fetch(`${API_URL}/${isLogin ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.errors?.[0] || 'שגיאה בתהליך ההתחברות');
            }

            if (data.user) {
                localStorage.setItem('userId', data.user.id);
                if (data.user.rememberToken) {
                    localStorage.setItem('rememberToken', data.user.rememberToken);
                }
                navigate('/users');
            } else {
                throw new Error('מידע משתמש חסר בתשובת השרת');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            setErrors([error.message || 'שגיאה בתהליך ההתחברות']);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h1 className="text-center mb-4">{isLogin ? 'התחברות' : 'הרשמה'}</h1>
                    <form onSubmit={handleSubmit} className="needs-validation">
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">כתובת אימייל</label>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">סיסמה</label>
                            <div className="input-group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-control"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    <i className={`fa fa-eye${showPassword ? '-slash' : ''}`}></i>
                                </button>
                            </div>

                            {isLogin && (
                                <div className="mt-2">
                                    <Link to="/forgot-password" className="text-primary">שכחת סיסמה?</Link>
                                </div>
                            )}

                            {!isLogin && (
                                <small className="text-muted">
                                    הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, מספר ותו מיוחד
                                </small>
                            )}
                        </div>

                        {isLogin && (
                            <div className="mb-3 form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={isLoading}
                                />
                                <label className="form-check-label" htmlFor="rememberMe">
                                    זכור אותי
                                </label>
                            </div>
                        )}

                        {errors.length > 0 && (
                            <div className="alert alert-danger">
                                <ul className="mb-0">
                                    {errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            ) : null}
                            {isLogin ? 'התחבר' : 'הירשם'}
                        </button>
                    </form>

                    <div className="mt-3 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrors([]);
                                setPassword('');
                                setShowPassword(false);
                                setRememberMe(false);
                            }}
                            className="btn btn-link"
                            disabled={isLoading}
                        >
                            {isLogin ? 'עבור להרשמה' : 'עבור להתחברות'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
