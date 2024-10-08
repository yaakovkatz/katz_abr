// src/utils/validation.js

export const validatePassword = (password) => {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('הסיסמה חייבת להכיל לפחות 8 תווים');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית');
    }

    if (!/\d/.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות ספרה אחת');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות תו מיוחד אחד');
    }

    return errors;
};

export const validateEmail = (email) => {
    const errors = [];

    if (!email) {
        errors.push('חובה להזין כתובת אימייל');
        return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('כתובת האימייל אינה תקינה');
    }

    return errors;
};