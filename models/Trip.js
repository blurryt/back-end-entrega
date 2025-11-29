import mongoose from "mongoose"

const tripSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User', 
        required: true 
    },
    addressStartTrip: { type: String, required: true },
    addressEndTrip: { type: String, required: true },
    date: { 
        type: Date, 
        default: Date.now
    },
    status: { 
        type: String,
        enum: ['pending', 'active', 'completed', 'canceled'],
        default: 'pending'
    }
})

export default mongoose.model('Trip', tripSchema)