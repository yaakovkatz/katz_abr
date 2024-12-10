import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log("Loaded user from storage:", parsedUser);
            } catch (error) {
                console.error("Error parsing stored user:", error);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, rememberMe = false) => {
        try {
            console.log('Attempting login with:', { email, rememberMe });

            const response = await axios.post('http://localhost:10000/login', {
                email,
                password,
                rememberMe
            });

            console.log('Server response:', response.data);

            const userData = response.data.data?.user;
            if (userData) {
                setUser(userData);
                console.log("User set in context:", userData);

                if (rememberMe) {
                    localStorage.setItem('user', JSON.stringify(userData));
                }
                return { success: true };
            }

            console.log('No user data in response');
            return { success: false, error: 'התחברות נכשלה' };
        } catch (error) {
            console.error('Login error:', error.response?.data);
            return {
                success: false,
                error: error.response?.data?.errors?.[0] || 'שגיאה בהתחברות'
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};