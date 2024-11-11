import React, { useState } from 'react'; // הוספנו useState
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import UserTable from './components/UserTable';

const App = () => {
    const [showModal, setShowModal] = useState(false); // הוספנו state למודאל
    const storedUserId = localStorage.getItem('userId');
    const userId = storedUserId ? parseInt(storedUserId) : null;

    console.log('Stored user ID:', storedUserId);



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