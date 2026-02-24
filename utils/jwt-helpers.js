import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from "uuid";

function jwtTokens({ user_id, user_name, user_email, role }) {
    const jti = uuidv4();
    const user = { user_id, user_name, user_email, role }
    const accessToken = jwt.sign({
        user_id: user.user_id,
        role: user.role,
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' }); //15m
    const refreshToken = jwt.sign({
        user_id: user.user_id,
        role: user.role,
        jti 
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return ({ accessToken, refreshToken, jti});
}

export { jwtTokens };