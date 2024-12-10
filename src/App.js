import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';  // מייבאים את AuthProvider
import LoginForm from './components/LoginForm';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './components/UserProfile';
import UserTable from './components/UserTable';

const App = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <AuthProvider>  {/* עוטפים את כל האפליקציה ב-AuthProvider */}
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
                                // הסרנו את userId כי עכשיו נקבל אותו מה-Context
                            />
                        } />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App;