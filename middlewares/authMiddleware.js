import { decryptTwoWay } from "../utils/encrypt.js";
import User from "../models/User.js";

export async function authMidleware(req, res, next) {
    const userToken = req.headers['user-token'];
    console.log(userToken);
    if(userToken) {
        const userData = await decryptTwoWay(userToken);
        req.current_user = await User.findById(userData.id);
        next();
    } else {
        res.status(401).send({
            error: "Você não tem permissão."
        })
    }
}