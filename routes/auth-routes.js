import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jwtTokens } from "../utils/jwt-helpers.js";
import authenticateToken from "../middleware/authorization.js";
import crypto from "crypto";

const router = express.Router();

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query(
            "SELECT * FROM users WHERE user_email = $1",
            [email]
        );

        if (user.rows.length === 0)
            return res.status(401).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].user_password
        );

        if (!validPassword)
            return res.status(401).json({ error: "Invalid credentials" });

        const { accessToken, refreshToken, jti } = jwtTokens(user.rows[0]);

        const tokenHash = hashToken(refreshToken);

        await pool.query(
            `INSERT INTO refresh_tokens 
      (id, user_id, token_hash, expires_at) 
      VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
            [jti, user.rows[0].user_id, tokenHash]
        );

        res.cookie("access_token", accessToken, cookieOptions);
        res.cookie("refresh_token", refreshToken, cookieOptions);

        res.json({ message: "Login successful" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/refresh_token", async (req, res) => {
    // console.log(req.cookies.refresh_token, "req.cookies.refresh_token");

    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken)
            return res.status(401).json({ error: "No refresh token" });

        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const tokenRow = await pool.query(
            `SELECT * FROM refresh_tokens 
     WHERE id = $1 
     AND expires_at > NOW()`,
            [decoded.jti]
        );

        // console.log(decoded.jti,tokenRow,"tokenrow");

        if (tokenRow.rows.length === 0) {
            return res.status(403).json({ error: "Invalid session" });
        }

        const dbToken = tokenRow.rows[0];
        const incomingHash = hashToken(refreshToken);

        if (incomingHash !== dbToken.token_hash) {
            await pool.query(
                "DELETE FROM refresh_tokens WHERE user_id = $1",
                [dbToken.user_id]
            );
            return res.status(403).json({ error: "Session compromised" });
        }

        await pool.query(
            "DELETE FROM refresh_tokens WHERE id = $1",
            [decoded.jti]
        );

        const { accessToken, refreshToken: newRefreshToken, jti } =
            jwtTokens({ user_id: decoded.user_id, role: decoded.role });

        const newHash = hashToken(newRefreshToken);

        await pool.query(
            `INSERT INTO refresh_tokens 
      (id, user_id, token_hash, expires_at) 
      VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
            [jti, decoded.user_id, newHash]
        );

        res.cookie("access_token", accessToken, cookieOptions);
        res.cookie("refresh_token", newRefreshToken, cookieOptions);

        res.json({ message: "Token refreshed" });
        console.log('Token refreshed');


    } catch {
        return res.status(403).json({ error: "Invalid refresh token" });
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await pool.query(
            `SELECT user_id, user_name, user_email, role 
       FROM users 
       WHERE user_id = $1`,
            [req.user.user_id]
        );

        if (user.rows.length === 0)
            return res.status(404).json({ error: "User not found" });

        res.json(user.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post("/logout", async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        console.log('decoded.jti', refreshToken, "fdgfdgfdg");

        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                console.log(decoded.jti, refreshToken, "fdgfdgfdg");
                await pool.query("DELETE FROM refresh_tokens WHERE id = $1", [decoded.jti]);
            } catch (err) {
                console.log("Refresh token invalid or already expired");
            }
        }

        res.clearCookie("access_token", cookieOptions);
        res.clearCookie("refresh_token", cookieOptions);
        console.log('Loggsadsafed out successfully');

        res.json({ message: "Logged out successfully" });

    } catch {
        res.status(200).json({ message: "Logged out" });
    }
});


router.get("/admin", authenticateToken, (req, res) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ error: "Access denied" });

    res.json({ message: "Welcome Admin" });
});

export default router;
