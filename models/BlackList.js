import mongoose from "mongoose"

const blacklistSchema = new mongoose.Schema({
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '1h' }
})

export default mongoose.model('Blacklist', blacklistSchema)