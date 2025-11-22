import bcrypt from 'bcrypt';
import * as jose from 'jose'
import dotenv from 'dotenv';
dotenv.config();

const salt = 10;
const alg = 'HS256';
const secret = new TextEncoder().encode(
    process.env.SUPER_SECRET_KEY
);

export async function encryptOneWay(payload) {
    return await bcrypt.hash(payload, salt);
}

export async function compareEncrypted(password, hash) {
    return await bcrypt.compare(password, hash)
}

export async function encryptTwoWay(payload) {
    return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg })
        .sign(secret);
}

export async function decryptTwoWay(token) {    
    const { 
        payload, 
        protectedHeader 
    } = await jose.jwtVerify(token, secret, {});
    console.log(payload);
    return payload;
}