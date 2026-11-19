
const { io } = require('socket.io-client');

const token = process.env.TEST_JWT;

if (!token) {
    console.error('Please provide TEST_JWT');
    process.exit(1);
}

const socket = io('http://localhost:3000', {
    auth: { token }
});

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection failed:', error.message);
});

socket.on('task:created', (task) => {
    console.log('Task created:', task);
});

socket.on('task:updated', (task) => {
    console.log('Task updated:', task);
});

socket.on('task:deleted', (data) => {
    console.log('Task deleted:', data);
});
