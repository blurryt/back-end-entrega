import mongoose from "mongoose"

const userSchema = mongoose.Schema({
    email: String,
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    trips: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }
})

export default mongoose.model('User', userSchema)