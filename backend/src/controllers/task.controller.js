const { getIO, userRoom } = require('../config/socket');
const taskService = require('../services/task.service');

// GET /api/tasks
const getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks(req.user.id);

        res.status(200).json({
            success: true,
            data: tasks
        });
    } catch (error) {
        console.error('Get tasks error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve tasks'
        });
    }
};

// GET /api/tasks/:id
const getTaskById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const task = await taskService.getTaskById(id, req.user.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error('Get task error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve task'
        });
    }
};

// POST /api/tasks
const createTask = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Description must be a string or null'
            });
        }

        const task = await taskService.createTask({
            title: title.trim(),
            description,
            userId: req.user.id
        });

        getIO()
            .to(userRoom(req.user.id))
            .emit('task:created', task);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task
        });
    } catch (error) {
        console.error('Create task error:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Failed to create task'
        });
    }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const { title, description, status } = req.body;

        if (
            title !== undefined &&
            (typeof title !== 'string' || !title.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Title must be a non-empty string'
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Description must be a string or null'
            });
        }

        const allowedStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

        if (
            status !== undefined &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const task = await taskService.updateTask(id,
            req.user.id, {
            ...(title !== undefined && { title: title.trim() }),
            ...(description !== undefined && { description }),
            ...(status !== undefined && { status })
        });

        getIO()
            .to(userRoom(req.user.id))
            .emit('task:updated', task);

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task
        });
    } catch (error) {
        console.error('Update task error:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Failed to update task'
        });
    }
};

// DELETE /api/tasks/:id

const deleteTask = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        await taskService.deleteTask(id, req.user.id);

        // แจ้ง Client ว่า Task ถูกลบแล้ว
        getIO()
            .to(userRoom(req.user.id))
            .emit('task:deleted', { id });

        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Delete task error:', error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Failed to delete task'
        });
    }
};


module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};