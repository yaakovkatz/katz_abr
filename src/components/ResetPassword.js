import React, { useState } from 'react';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // מקבל את הטוקן מה-URL
    const token = new URLSearchParams(window.location.search).get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // בדיקה שהסיסמאות תואמות
        if (newPassword !== confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setError('');
                // אפשר להוסיף ניווט לדף ההתחברות אחרי כמה שניות
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                setError(data.errors[0]);
                setMessage('');
            }
        } catch (error) {
            setError('שגיאה בשליחת הבקשה');
        }
    };

    // אם אין טוקן, מציג הודעת שגיאה
    if (!token) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    קישור לא תקין. אנא בקש קישור חדש לאיפוס סיסמה.
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h2 className="text-center mb-4">איפוס סיסמה</h2>
                    {message && <div className="alert alert-success">{message}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">סיסמה חדשה</label>
                            <input
                                type="password"
                                className="form-control"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength="8"
                            />
                            <small className="text-muted">
                                הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, מספר ותו מיוחד
                            </small>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label">אימות סיסמה</label>
                            <input
                                type="password"
                                className="form-control"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100">
                            עדכן סיסמה
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;