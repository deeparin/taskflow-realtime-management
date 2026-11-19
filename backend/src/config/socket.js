
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('./prisma');

let io;

const userRoom = (userId) => `user:${userId}`;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });

    // ตรวจสอบ JWT ก่อนอนุญาตให้เชื่อมต่อ Socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token || typeof token !== 'string') {
                return next(new Error('Authentication required'));
            }

            if (!process.env.JWT_SECRET) {
                console.error('JWT_SECRET is not configured');
                return next(new Error('Internal server error'));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET,
                { algorithms: ['HS256'] }
            );

            if (
                !Number.isInteger(decoded.userId) ||
                decoded.userId <= 0
            ) {
                return next(new Error('Invalid authentication token'));
            }

            // ตรวจสอบว่าผู้ใช้ยังมีอยู่ในฐานข้อมูล
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true }
            });

            if (!user) {
                return next(new Error('User not found'));
            }

            // กำหนดตัวตนจาก Token ที่ตรวจสอบแล้ว
            socket.user = {
                id: user.id
            };

            next();
        } catch (error) {
            next(new Error('Invalid or expired authentication token'));
        }
    });

    io.on('connection', (socket) => {
        const room = userRoom(socket.user.id);

        // Client ไม่ได้เป็นผู้เลือก User ID ของห้อง
        socket.join(room);

        console.log(
            `Socket connected: user=${socket.user.id}, socket=${socket.id}`
        );

        socket.on('disconnect', (reason) => {
            console.log(
                `Socket disconnected: user=${socket.user.id}, reason=${reason}`
            );
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized');
    }

    return io;
};

module.exports = {
    initSocket,
    getIO,
    userRoom
};
