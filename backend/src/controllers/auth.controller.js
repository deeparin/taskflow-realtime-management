const authService = require('../services/auth.service');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Name must not exceed 100 characters'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (
            normalizedEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email'
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: 'Password must be between 8 and 72 characters'
            });
        }

        const user = await authService.register({
            name,
            email: normalizedEmail,
            password
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: user
        });
    } catch (error) {
        console.error('Register error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Registration failed'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await authService.login({
            email,
            password
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Login failed'
        });
    }
};

module.exports = {
    register,
    login
};