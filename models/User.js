import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    balance: { type: Number, default: 50 },
    trips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }]
})

export default mongoose.model('User', userSchema)