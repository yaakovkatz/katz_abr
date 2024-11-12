import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('הסיסמאות החדשות אינן תואמות');
            return;
        }

        try {
            const response = await fetch('https://katz-abr-backend.onrender.com/update-password', {                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: localStorage.getItem('userId'), // צריך לשמור את זה בהתחברות
                    currentPassword: password,
                    newPassword
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('הסיסמה עודכנה בהצלחה');
                setError('');
                setPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setError(data.errors[0]);
                setMessage('');
            }
        } catch (error) {
            setError('שגיאה בעדכון הסיסמה');
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו אינה הפיכה!')) {
            return;
        }

        try {
            const response = await fetch('https://katz-abr-backend.onrender.com/delete-account', {                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: localStorage.getItem('userId'),
                    password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.removeItem('userId');
                localStorage.removeItem('rememberToken');
                navigate('/login');
            } else {
                setError(data.errors[0]);
            }
        } catch (error) {
            setError('שגיאה במחיקת החשבון');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h2 className="text-center mb-4">הגדרות חשבון</h2>
                    {message && <div className="alert alert-success">{message}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}

                    <form onSubmit={handleUpdatePassword}>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">סיסמה נוכחית</label>
                            <input
                                type="password"
                                className="form-control"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">סיסמה חדשה</label>
                            <input
                                type="password"
                                className="form-control"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label">אימות סיסמה חדשה</label>
                            <input
                                type="password"
                                className="form-control"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100 mb-3">
                            עדכן סיסמה
                        </button>
                    </form>

                    <div className="mt-5">
                        <h3 className="text-center mb-4">מחיקת חשבון</h3>
                        <p className="text-danger text-center">אזהרה: פעולה זו אינה הפיכה!</p>
                        <button
                            onClick={handleDeleteAccount}
                            className="btn btn-danger w-100"
                        >
                            מחק חשבון
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;