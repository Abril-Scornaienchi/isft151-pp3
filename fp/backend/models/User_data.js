// fp/backend/models/User_data.js

const mongoose = require('mongoose');

const UserDataSchema = new mongoose.Schema({
    username: { 
        type: String,
        required: true,
        unique: true, 
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, 
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    grupo: {
        type: String,
        enum: ['Admin', 'User'],
        default: 'User',
    }
}, {
    timestamps: true 
});

const User_data = mongoose.model('User_data', UserDataSchema);

module.exports = User_data;