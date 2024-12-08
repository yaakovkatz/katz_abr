import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import UserTable from './components/UserTable';

const App = () => {
    const [showModal, setShowModal] = useState(false);
    const tempUserId = 1;  // ערך זמני לבדיקה במקום localStorage

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<LoginForm />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/users" element={
                        <UserTable
                            showModal={showModal}
                            setShowModal={setShowModal}
                            userId={tempUserId}
                        />
                    } />
                </Routes>
            </div>
        </Router>
    );
};

export default App;