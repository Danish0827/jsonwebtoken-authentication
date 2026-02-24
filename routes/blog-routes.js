import express from "express";
import pool from "../db.js";
import authenticateToken from "../middleware/authorization.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      slug,
      short_description,
      content,
      featured_image,
      featured_image_alt,
      author_name,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      faqs,
      status,
      category_ids
    } = req.body;

    await client.query("BEGIN");

    const blogResult = await client.query(
      `INSERT INTO blogs
      (title, slug, short_description, content, featured_image,
       featured_image_alt, author_name, meta_title,
       meta_description, meta_keywords, canonical_url,
       faqs, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        title,
        slug,
        short_description,
        content,
        featured_image,
        featured_image_alt,
        author_name,
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        faqs,
        status || "draft"
      ]
    );

    const blog = blogResult.rows[0];

    if (category_ids && category_ids.length > 0) {
      for (const catId of category_ids) {
        await client.query(
          `INSERT INTO blog_category_map (blog_id, category_id)
           VALUES ($1,$2)`,
          [blog.id, catId]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json(blog);

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get("/",authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        COALESCE(
          json_agg(c.*) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as categories
      FROM blogs b
      LEFT JOIN blog_category_map bcm ON b.id = bcm.blog_id
      LEFT JOIN blog_categories c ON bcm.category_id = c.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug",authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(`
      SELECT 
        b.*,
        COALESCE(
          json_agg(c.*) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as categories
      FROM blogs b
      LEFT JOIN blog_category_map bcm ON b.id = bcm.blog_id
      LEFT JOIN blog_categories c ON bcm.category_id = c.id
      WHERE b.slug = $1
      GROUP BY b.id
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { title, content, category_ids } = req.body;

    await client.query("BEGIN");

    await client.query(
      `UPDATE blogs
       SET title = $1,
           content = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [title, content, id]
    );

    if (category_ids) {
      await client.query(
        `DELETE FROM blog_category_map WHERE blog_id = $1`,
        [id]
      );

      for (const catId of category_ids) {
        await client.query(
          `INSERT INTO blog_category_map (blog_id, category_id)
           VALUES ($1,$2)`,
          [id, catId]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ message: "Blog updated successfully" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM blogs WHERE id = $1`, [req.params.id]);
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
