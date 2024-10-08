// Validation utilities
const passwordValidation = {
    minLength: 8,
    patterns: {
        hasUpperCase: /[A-Z]/,
        hasLowerCase: /[a-z]/,
        hasNumbers: /\d/,
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
    }
};

const validatePassword = (password) => {
    const errors = [];

    // בדיקת אורך מינימלי
    if (!password || password.length < passwordValidation.minLength) {
        errors.push(`הסיסמה חייבת להכיל לפחות ${passwordValidation.minLength} תווים`);
    }

    // בדיקת אות גדולה באנגלית
    //  if (!passwordValidation.patterns.hasUpperCase.test(password)) {
    //     errors.push('הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית');
    //   }

    // בדיקת אות קטנה באנגלית
    if (!passwordValidation.patterns.hasLowerCase.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית');
    }

    // בדיקת מספרים
    if (!passwordValidation.patterns.hasNumbers.test(password)) {
        errors.push('הסיסמה חייבת להכיל לפחות ספרה אחת');
    }

    // בדיקת תווים מיוחדים
    //   if (!passwordValidation.patterns.hasSpecialChar.test(password)) {
    //     errors.push('הסיסמה חייבת להכיל לפחות תו מיוחד אחד');
    //    }

    return errors;
};

const validateEmail = (email) => {
    const errors = [];

    // בדיקה שהאימייל לא ריק
    if (!email) {
        errors.push('חובה להזין כתובת אימייל');
        return errors;
    }

    // בדיקת תבנית אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('כתובת האימייל אינה תקינה');
        return errors;
    }

    return errors;
};

module.exports = {
    passwordValidation,
    validatePassword,
    validateEmail
};