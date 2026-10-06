require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada.");
}

if (!process.env.JWT_SECRET) {
  console.error("ERRO: JWT_SECRET não configurada.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


/* =========================
   AUTH MIDDLEWARE
========================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token não informado."
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token inválido."
    });
  }

  try {
    const user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido ou expirado."
    });
  }
}


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      application: "Nexora",
      database: "connected"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      application: "Nexora",
      database: "disconnected"
    });
  }
});


/* =========================
   REGISTER
========================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Preencha todos os campos."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Este e-mail já está cadastrado."
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
      `,
      [
        name.trim(),
        normalizedEmail,
        passwordHash
      ]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.status(201).json({
      message: "Conta criada com sucesso.",
      token,
      user
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Erro ao criar conta."
    });
  }
});


/* =========================
   LOGIN
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Informe e-mail e senha."
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "E-mail ou senha incorretos."
      });
    }

    const user = result.rows[0];

    const validPassword =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!validPassword) {
      return res.status(401).json({
        message: "E-mail ou senha incorretos."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      message: "Login realizado com sucesso.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Erro ao fazer login."
    });
  }
});


/* =========================
   CURRENT USER
========================= */

app.get(
  "/api/me",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT id, name, email, created_at
        FROM users
        WHERE id = $1
        `,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Usuário não encontrado."
        });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao carregar usuário."
      });
    }
  }
);


/* =========================
   GET TASKS
========================= */

app.get(
  "/api/tasks",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          title,
          description,
          priority,
          due_date,
          completed,
          created_at,
          updated_at
        FROM tasks
        WHERE user_id = $1
        ORDER BY
          completed ASC,
          due_date ASC NULLS LAST,
          created_at DESC
        `,
        [req.user.id]
      );

      res.json(result.rows);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao carregar tarefas."
      });
    }
  }
);


/* =========================
   CREATE TASK
========================= */

app.post(
  "/api/tasks",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title,
        description,
        priority,
        due_date
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "O título da tarefa é obrigatório."
        });
      }

      const allowedPriorities = [
        "low",
        "medium",
        "high"
      ];

      const finalPriority =
        allowedPriorities.includes(priority)
          ? priority
          : "medium";

      const result = await pool.query(
        `
        INSERT INTO tasks
        (
          user_id,
          title,
          description,
          priority,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          req.user.id,
          title.trim(),
          description || "",
          finalPriority,
          due_date || null
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao criar tarefa."
      });
    }
  }
);


/* =========================
   UPDATE TASK
========================= */

app.put(
  "/api/tasks/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const taskId = Number(req.params.id);

      const {
        title,
        description,
        priority,
        due_date
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "O título é obrigatório."
        });
      }

      const result = await pool.query(
        `
        UPDATE tasks
        SET
          title = $1,
          description = $2,
          priority = $3,
          due_date = $4,
          updated_at = NOW()
        WHERE
          id = $5
          AND user_id = $6
        RETURNING *
        `,
        [
          title.trim(),
          description || "",
          priority || "medium",
          due_date || null,
          taskId,
          req.user.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tarefa não encontrada."
        });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao atualizar tarefa."
      });
    }
  }
);


/* =========================
   TOGGLE TASK
========================= */

app.patch(
  "/api/tasks/:id/toggle",
  authenticateToken,
  async (req, res) => {
    try {
      const taskId = Number(req.params.id);

      const result = await pool.query(
        `
        UPDATE tasks
        SET
          completed = NOT completed,
          updated_at = NOW()
        WHERE
          id = $1
          AND user_id = $2
        RETURNING *
        `,
        [
          taskId,
          req.user.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tarefa não encontrada."
        });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao alterar tarefa."
      });
    }
  }
);


/* =========================
   DELETE TASK
========================= */

app.delete(
  "/api/tasks/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const taskId = Number(req.params.id);

      const result = await pool.query(
        `
        DELETE FROM tasks
        WHERE
          id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
          taskId,
          req.user.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Tarefa não encontrada."
        });
      }

      res.json({
        message: "Tarefa excluída com sucesso."
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Erro ao excluir tarefa."
      });
    }
  }
);


/* =========================
   FRONTEND
========================= */

app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Nexora rodando na porta ${PORT}`
    );
  }
);