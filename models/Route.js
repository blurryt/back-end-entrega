import mongoose from 'mongoose'

const routeSchema = new mongoose.Schema({
    addressStartTrip: { type: String, required: true },
    addressEndTrip: { type: String, required: true },
    duration: { type: Number },
    price: { type: Number, required: true}
})

export default mongoose.model('Route', routeSchema)