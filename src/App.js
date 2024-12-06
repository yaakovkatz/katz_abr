import React, { useState } from 'react'; // הוספנו useState
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import UserTable from './components/UserTable';

const App = () => {
    const [showModal, setShowModal] = useState(false);

    console.log('1. Starting to check userId');
    const storedUserId = localStorage.getItem('userId');
    console.log('2. Stored user ID:', storedUserId, typeof storedUserId);

    // אם לא נמצא ערך, מגדירים את userId כ-null, אחרת שומרים את הערך כמו שהוא
    const userId = storedUserId || null;
    console.log('3. Final userId:', userId, typeof userId);

    // בדיקת כל התוכן של localStorage
    console.log('4. All localStorage items:', { ...localStorage });

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<LoginForm />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/profile" element={<UserProfile />} />
                    {/* עדכנו את הנתיב של UserTable עם הפרופס הנדרשים */}
                    <Route path="/users" element={
                        <UserTable
                            showModal={showModal}
                            setShowModal={setShowModal}
                            userId={userId} // משתמשים ב-userId מה-localStorage
                        />
                    } />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
