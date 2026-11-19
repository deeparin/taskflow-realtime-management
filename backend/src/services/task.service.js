
const prisma = require('../config/prisma');

// ดึงเฉพาะ Task ของผู้ใช้ที่ Login อยู่
const getAllTasks = async (userId) => {
    return await prisma.task.findMany({
        where: { userId },
        orderBy: {
            createdAt: 'desc'
        }
    });
};

// ดึง Task ตาม ID โดยต้องเป็นเจ้าของด้วย
const getTaskById = async (id, userId) => {
    return await prisma.task.findFirst({
        where: {
            id,
            userId
        }
    });
};

// สร้าง Task โดยผูกกับผู้ใช้ที่ผ่านการยืนยันตัวตนแล้ว
const createTask = async (data) => {
    return await prisma.task.create({
        data: {
            title: data.title,
            description: data.description ?? null,
            userId: data.userId
        }
    });
};

// แก้ไขเฉพาะ Task ที่เป็นของผู้ใช้
const updateTask = async (id, userId, data) => {
    const result = await prisma.task.updateMany({
        where: {
            id,
            userId
        },
        data
    });

    if (result.count === 0) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
    }

    return await prisma.task.findFirst({
        where: {
            id,
            userId
        }
    });
};

// ลบเฉพาะ Task ที่เป็นของผู้ใช้
const deleteTask = async (id, userId) => {
    const result = await prisma.task.deleteMany({
        where: {
            id,
            userId
        }
    });

    if (result.count === 0) {
        const error = new Error('Task not found');
        error.statusCode = 404;
        throw error;
    }

    return { id };
};

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};
