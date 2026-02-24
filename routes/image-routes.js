import express from "express";
import pool from "../db.js";
import authenticateToken from "../middleware/authorization.js";
import { UTApi } from "uploadthing/server";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const {
            userId,
            url,
            fileKey,
            title,
            alt_text,
            caption,
            is_featured,
        } = req.body;

        if (!url || !fileKey) {
            return res.status(400).json({ error: "Missing file data" });
        }

        const result = await pool.query(
            `INSERT INTO images 
      (user_id, url, file_key, title, alt_text, caption, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
            [
                userId,
                url,
                fileKey,
                title,
                alt_text,
                caption,
                is_featured || false,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { title, alt_text, caption, is_featured } = req.body;

        const result = await pool.query(
            `UPDATE images
       SET title = $1,
           alt_text = $2,
           caption = $3,
           is_featured = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
            [title, alt_text, caption, is_featured, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT file_key FROM images WHERE id = $1",
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Not found" });
        }

        await UTApi.deleteFiles(result.rows[0].file_key);

        await pool.query(
            "DELETE FROM images WHERE id = $1",
            [req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

export default router;