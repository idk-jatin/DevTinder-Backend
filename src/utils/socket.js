const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const { Chat } = require('../models/chat');

let io;

const initializeSocket = (server) => {
    io = socketio(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        try {
            // Retrieve token from cookies or query
            let token = socket.handshake.headers.cookie?.split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];
            
            if (!token && socket.handshake.query?.token) {
                token = socket.handshake.query.token;
            }

            if (!token) return next(new Error('Authentication Error: Missing Token'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded._id;
            next();
        } catch (err) {
            next(new Error('Authentication Error: Invalid Token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket Connected: User ${socket.userId}`);

        socket.on('joinChat', ({ targetUserId }) => {
            const room = [socket.userId, targetUserId].sort().join('_');
            socket.join(room);
            console.log(`User ${socket.userId} joined room ${room}`);
        });

        socket.on('sendMessage', async ({ targetUserId, text }) => {
            try {
                const room = [socket.userId, targetUserId].sort().join('_');
                
                // Save to DB
                let chat = await Chat.findOne({
                    participants: { $all: [socket.userId, targetUserId] }
                });

                if (!chat) {
                    chat = new Chat({
                        participants: [socket.userId, targetUserId],
                        messages: []
                    });
                }
                
                const newMessage = {
                    senderId: socket.userId,
                    text: text
                };

                chat.messages.push(newMessage);
                await chat.save();
                
                // Get the saved message (with timestamp and _id)
                const savedMessage = chat.messages[chat.messages.length - 1];

                // Broadcast to everyone in the room (including sender to verify delivery)
                io.to(room).emit('messageReceived', {
                    _id: savedMessage._id,
                    senderId: socket.userId,
                    text: savedMessage.text,
                    timestamp: savedMessage.createdAt
                });

            } catch (err) {
                console.error("Socket error processing message:", err);
                socket.emit('error', 'Failed to push message.');
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket Disconnected: User ${socket.userId}`);
        });
    });
};

module.exports = initializeSocket;
