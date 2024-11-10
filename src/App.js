import React, { useState } from 'react'; // הוספנו useState
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import UserTable from './components/UserTable';

const App = () => {
    const [showModal, setShowModal] = useState(false); // הוספנו state למודאל

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
                            userId={1} // כאן צריך להיות ה-ID של המשתמש המחובר
                        />
                    } />
                </Routes>
            </div>
        </Router>
    );
};

export default App;