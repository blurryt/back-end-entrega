import mongoose from "mongoose";

export const likeSchema = new mongoose.Schema({
    liked: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    },
    liker: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users'
    }
});

const Like = mongoose.model("Likes", likeSchema);

export default Like; 
//hmm entendi