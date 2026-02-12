import express from 'express'
import pool from '../db.js';
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { jwtTokens } from './../utils/jwt-helpers.js'
import authenticateToken from '../middleware/authorization.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await pool.query('SELECT * FROM users WHERE user_email = $1', [email])
        if (user.rows.length === 0) return res.status(401).json({ error: 'Email is Incorrect' })
        const validPassword = await bcrypt.compare(password, user.rows[0].user_password);
        if (!validPassword) return res.status(401).json({ error: 'Incorrect Password' })
        let tokens = jwtTokens(user.rows[0]);
        res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true });
        res.status(200).json(tokens);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
})

router.get('/refresh_token', async (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken === null) return res.status(401).json({ error: 'NULL REFRESH TOKEN' });
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (error, user) => {
        if (error) return res.status(403).json({ error: error.message });
        let tokens = jwtTokens(user);
        res.cookie('refresh_token', tokens.refreshToken, { httpOnly: true });
        res.status(200).json(tokens);
    })
})

router.get("/me", authenticateToken, async (req, res) => {
  const user = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [req.user.user_id]
  );

  res.json(user.rows[0]);
});


router.delete('/refresh_token',(req,res)=>{
    try {
        res.clearCookie('refresh_token')
        return res.status(200).json({message:'refresh token delete'})
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
})
export default router