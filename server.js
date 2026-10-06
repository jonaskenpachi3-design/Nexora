require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.warn("Configure DATABASE_URL e JWT_SECRET no arquivo .env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token não informado." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Preencha todos os campos." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rowCount) {
      return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      user,
      token: createToken(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar conta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email?.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ message: "E-mail ou senha inválidos." });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token: createToken(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao fazer login." });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [req.user.id]
  );

  res.json(result.rows[0]);
});

app.get("/api/tasks", auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, description, priority, due_date, completed, created_at, updated_at
     FROM tasks
     WHERE user_id = $1
     ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC`,
    [req.user.id]
  );

  res.json(result.rows);
});

app.post("/api/tasks", auth, async (req, res) => {
  try {
    const { title, description = "", priority = "medium", dueDate = null } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "O título é obrigatório." });
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({ message: "Prioridade inválida." });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, title.trim(), description.trim(), priority, dueDate || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar tarefa." });
  }
});

app.put("/api/tasks/:id", auth, async (req, res) => {
  try {
    const { title, description = "", priority, dueDate = null, completed = false } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "O título é obrigatório." });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           priority = $3,
           due_date = $4,
           completed = $5,
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        priority,
        dueDate || null,
        Boolean(completed),
        req.params.id,
        req.user.id
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar tarefa." });
  }
});

app.patch("/api/tasks/:id/toggle", auth, async (req, res) => {
  const result = await pool.query(
    `UPDATE tasks
     SET completed = NOT completed, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [req.params.id, req.user.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: "Tarefa não encontrada." });
  }

  res.json(result.rows[0]);
});

app.delete("/api/tasks/:id", auth, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, req.user.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: "Tarefa não encontrada." });
  }

  res.status(204).send();
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Nexora rodando em http://localhost:${PORT}`);
});