const express = require('express');
const router = express.Router();
const { validateEmail, validatePassword } = require('../../backend/validation');