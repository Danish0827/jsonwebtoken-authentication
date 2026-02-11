import jwt from 'jsonwebtoken'

function jwtTokens({user_id,user_name,user_email}){
    const user  = {user_id,user_name,user_email}
    const accessToken = jwt.sign(user, )
}