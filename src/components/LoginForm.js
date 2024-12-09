// יבוא ספריות וקומפוננטות
import React, { useState, useEffect } from 'react';
import { validatePassword, validateEmail } from '../validation';
import { Link, useNavigate } from 'react-router-dom';

// קבועים וקונפיגורציה
const API_URL = 'https://katz-abr.onrender.com';

const LoginForm = () => {
    // ניהול סטייט
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
        showPassword: false,
        isLogin: true, // true = התחברות, false = הרשמה
    });

    const [uiState, setUiState] = useState({
        errors: [],
        isLoading: false,
    });

    const navigate = useNavigate();

    // אפקטים והתחברות לשרת

    // בדיקת חיבור לשרת בטעינה ראשונית
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
                setUiState(prev => ({
                    ...prev,
                    errors: ['בעיית תקשורת עם השרת']
                }));
            }
        };
        testConnection();
    }, []);

    // בדיקת טוקן "זכור אותי" בטעינה
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

    // פונקציות עזר

    // טיפול בשינויים בטופס
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // החלפה בין מצב התחברות להרשמה
    const toggleAuthMode = () => {
        setFormData(prev => ({
            ...prev,
            isLogin: !prev.isLogin,
            password: '',
            showPassword: false,
            rememberMe: false
        }));
        setUiState(prev => ({ ...prev, errors: [] }));
    };

    // שליחת הטופס
    const handleSubmit = async (e) => {
        e.preventDefault();
        setUiState(prev => ({ ...prev, errors: [], isLoading: true }));

        try {
            // וולידציה להרשמה
            if (!formData.isLogin) {
                const validationErrors = [
                    ...validatePassword(formData.password),
                    ...validateEmail(formData.email)
                ];
                if (validationErrors.length) {
                    setUiState(prev => ({
                        ...prev,
                        errors: validationErrors,
                        isLoading: false
                    }));
                    return;
                }
            }

            // שליחת בקשה לשרת
            const response = await fetch(`${API_URL}/${formData.isLogin ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    rememberMe: formData.rememberMe
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
            setUiState(prev => ({
                ...prev,
                errors: [error.message || 'שגיאה בתהליך ההתחברות']
            }));
        } finally {
            setUiState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // רינדור הטופס
    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h1 className="text-center mb-4">
                        {formData.isLogin ? 'התחברות' : 'הרשמה'}
                    </h1>

                    <form onSubmit={handleSubmit} className="needs-validation">
                        {/* שדה אימייל */}
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">
                                כתובת אימייל
                            </label>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled={uiState.isLoading}
                            />
                        </div>

                        {/* שדה סיסמה */}
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">
                                סיסמה
                            </label>
                            <div className="input-group">
                                <input
                                    type={formData.showPassword ? "text" : "password"}
                                    className="form-control"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    disabled={uiState.isLoading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        showPassword: !prev.showPassword
                                    }))}
                                    disabled={uiState.isLoading}
                                >
                                    <i className={`fa fa-eye${formData.showPassword ? '-slash' : ''}`}></i>
                                </button>
                            </div>

                            {/* קישור לשחזור סיסמה במצב התחברות */}
                            {formData.isLogin && (
                                <div className="mt-2">
                                    <Link to="/forgot-password" className="text-primary">
                                        שכחת סיסמה?
                                    </Link>
                                </div>
                            )}

                            {/* הנחיות לסיסמה במצב הרשמה */}
                            {!formData.isLogin && (
                                <small className="text-muted">
                                    הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, מספר ותו מיוחד
                                </small>
                            )}
                        </div>

                        {/* תיבת סימון "זכור אותי" במצב התחברות */}
                        {formData.isLogin && (
                            <div className="mb-3 form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    disabled={uiState.isLoading}
                                />
                                <label className="form-check-label" htmlFor="rememberMe">
                                    זכור אותי
                                </label>
                            </div>
                        )}

                        {/* הצגת שגיאות */}
                        {uiState.errors.length > 0 && (
                            <div className="alert alert-danger">
                                <ul className="mb-0">
                                    {uiState.errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* כפתור שליחה */}
                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={uiState.isLoading}
                        >
                            {uiState.isLoading && (
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                />
                            )}
                            {formData.isLogin ? 'התחבר' : 'הירשם'}
                        </button>
                    </form>

                    {/* כפתור החלפה בין התחברות להרשמה */}
                    <div className="mt-3 text-center">
                        <button
                            onClick={toggleAuthMode}
                            className="btn btn-link"
                            disabled={uiState.isLoading}
                        >
                            {formData.isLogin ? 'עבור להרשמה' : 'עבור להתחברות'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;