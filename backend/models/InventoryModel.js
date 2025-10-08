const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User_data', 
        required: true
    },
    article_name: {
        type: String, 
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['gramos', 'kg', 'unidades', 'litros', 'ml'] 
    },
}, {
    timestamps: true 
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;