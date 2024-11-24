import React, { useState, useEffect } from 'react';
import { validatePassword, validateEmail } from '../validation';
import { Link, useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState([]);
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();

    // בדיקת נתיב test בטעינה
    useEffect(() => {
        const testConnection = async () => {
            try {
                const response = await fetch('https://katz-abr-backend.onrender.com/test');
                const data = await response.json();
                console.log('Test endpoint response:', data);
            } catch (error) {
                console.error('Test endpoint error:', error);
            }
        };

        testConnection();
    }, []);

    // בדיקת טוקן "זכור אותי" בטעינת הדף
    useEffect(() => {
        const checkRememberToken = async () => {
            const token = localStorage.getItem('rememberToken');
            if (token) {
                try {
                    console.log('Checking remember token:', token);
                    const response = await fetch('https://katz-abr-backend.onrender.com/check-remember-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ token }),
                    });

                    console.log('Remember token response status:', response.status);
                    const textResponse = await response.text();
                    console.log('Raw remember token response:', textResponse);

                    try {
                        const data = JSON.parse(textResponse);
                        console.log('Parsed remember token response:', data);
                        if (!response.ok) {
                            localStorage.removeItem('rememberToken');
                        }
                    } catch (e) {
                        console.error('Failed to parse remember token response:', e);
                        localStorage.removeItem('rememberToken');
                    }
                } catch (error) {
                    console.error('Error checking remember token:', error);
                }
            }
        };

        checkRememberToken();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors([]);

        console.log('Starting submission:', { email, password, isLogin });

        if (!isLogin) {
            const passwordErrors = validatePassword(password);
            const emailErrors = validateEmail(email);

            if (passwordErrors.length > 0 || emailErrors.length > 0) {
                setErrors([...passwordErrors, ...emailErrors]);
                return;
            }
        }

        try {
            const url = `https://katz-abr-backend.onrender.com${isLogin ? '/login' : '/register'}`;
            console.log('Sending request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe: isLogin ? rememberMe : false,
                }),
            });

            console.log('Response status:', response.status);

            const textResponse = await response.text();
            console.log('Raw response:', textResponse);

            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error('Invalid JSON response from server');
            }

            console.log('Parsed response:', data);
            console.log('Server response:', data);
            console.log('Errors:', data.errors || [data.message]);

            if (response.ok) {
                if (data.user) {
                    console.log('Saving user data:', data.user);
                    localStorage.setItem('userId', data.user.id);

                    if (data.user.rememberToken) {
                        localStorage.setItem('rememberToken', data.user.rememberToken);
                    }

                    console.log('After saving - userId from localStorage:', localStorage.getItem('userId'));
                }

                alert(isLogin ? 'התחברות בוצעה בהצלחה!' : 'הרשמה בוצעה בהצלחה!');
                setEmail('');
                setPassword('');
                setErrors([]);

                if (isLogin) {
                    navigate('/users');
                }
            } else {
                setErrors(data.errors || [data.message]);
            }
        } catch (error) {
            console.error('Submission error:', error);
            setErrors(isLogin ? ['שגיאה בהתחברות'] : ['שגיאה בהרשמה']);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h1 className="text-center mb-4">{isLogin ? 'התחברות' : 'הרשמה'}</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">כתובת אימייל</label>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
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
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fa fa-eye${showPassword ? '-slash' : ''}`}></i>
                                    {showPassword ? '' : '️'}
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
                        <button type="submit" className="btn btn-primary w-100">
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