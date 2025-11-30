import mongoose from "mongoose"

const tripSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User', 
        required: true 
    },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route'},
    date: { 
        type: Date, 
        default: Date.now
    },
    status: { 
        type: String,
        enum: ['pending', 'active', 'completed', 'canceled'],
        default: 'pending'
    },
    price: { type: Number, required: true }
})

export default mongoose.model('Trip', tripSchema)