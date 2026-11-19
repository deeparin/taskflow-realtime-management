const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const prisma = require('./src/config/prisma');
const { initSocket } = require('./src/config/socket');

const authRoutes = require('./src/routes/auth.routes');
const taskRoutes = require('./src/routes/task.routes');

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

app.use(express.json());

// API ทดสอบ
app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }

    res.json({
        success: true,
        message: 'TaskFlow API is running!',
        timestamp: new Date().toISOString(),
        db: {
            status: dbStatus
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// สร้าง HTTP Server จาก Express
const httpServer = http.createServer(app);

// เริ่ม Socket.IO บน HTTP Server เดียวกัน
initSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
    console.log(`TaskFlow API running at http://localhost:${PORT}`);
});
