import express from 'express'
import pool from '../db.js';
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import {jwtTokens} from './../utils/jwt-helpers.js'

const router = express.Router();

router.post('/login',async (req,res) =>{
    try {
        const {email,password} = req.body
        const user = await pool.query('SELECT * FROM users WHERE user_email = $1',[email])
        if(user.rows.length === 0) return res.status(401).json({error : 'Email is Incorrect'})
        const validPassword = await bcrypt.compare(password,user.rows[0].user_password);
        if(!validPassword) return res.status(401).json({error : 'Incorrect Password'})
        res.status(200).json("Success")
    } catch (error) {
        
    }
})

export default router