// backend/models/User_data.js

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
    },
    diet_preference: {
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten free','none'], // Opciones
    default: 'none'
    },
    maxCalories: {
        type: Number,
        min: 0,
        default: 2500 // Valor por defecto
    },
    maxCarbs: {
        type: Number,
        min: 0,
        default: 300
    },
    maxProtein: {
        type: Number,
        min: 0,
        default: 150
    },
    maxSugar: {
    type: Number,
    min: 0,
    default: 50 // Un valor por defecto
    },
}, {
    timestamps: true 
});

const User_data = mongoose.model('User_data', UserDataSchema);

module.exports = User_data;