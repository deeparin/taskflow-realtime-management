
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token is required'
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token is required'
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });

        if (!Number.isInteger(decoded.userId) || decoded.userId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token'
            });
        }

        // ใช้ข้อมูลจาก Token ที่ผ่านการตรวจสอบแล้ว
        req.user = {
            id: decoded.userId
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token'
        });
    }
};

module.exports = authenticateToken;
