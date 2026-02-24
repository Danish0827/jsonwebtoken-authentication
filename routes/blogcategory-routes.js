import express from "express";
import pool from "../db.js"; // tera postgres connection file
import slugify from "slugify";
import authenticateToken from "../middleware/authorization.js";

const router = express.Router   ();

router.get("/",authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM blog_categories ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/:id",authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM blog_categories WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/",authenticateToken, async (req, res) => {
    try {
        const { name, description, slug } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }
        const finalSlug = slug
            ? slugify(slug, { lower: true, strict: true })
            : slugify(name, { lower: true, strict: true });

        const result = await pool.query(
            `INSERT INTO blog_categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [name, finalSlug, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(400).json({ error: "Slug already exists" });
        }

        res.status(500).json({ error: "Server error" });
    }
});

router.put("/:id",authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, slug } = req.body;

        const finalSlug =
            slug && slug.trim() !== ""
                ? slugify(slug, { lower: true, strict: true })
                : null;

        const result = await pool.query(
            `UPDATE blog_categories SET name = COALESCE($1, name),
            slug = COALESCE($2, slug),
            description = $3
            WHERE id = $4
            RETURNING *`,
            [name || null, finalSlug, description || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(400).json({ error: "Slug already exists" });
        }

        res.status(500).json({ error: "Server error" });
    }
});


router.delete("/:id",authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM blog_categories WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
