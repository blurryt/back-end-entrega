import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: String,
    img: String,
    age: Number,
    birthday: Date,
    password: String,
    gender: String,
    preference_gender: String
});

const User = mongoose.model("Users", userSchema);

export default User;