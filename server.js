// ==========================
// Perya Shot Backend (server.js)
// ==========================
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// ==========================
// 🔹 Middleware
// ==========================
app.use(cors());
app.use(bodyParser.json());

// ==========================
// 🔹 MySQL Connection
// ==========================
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // change if your MySQL has a password
  password: "",
  database: "perya_shot",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Connected!");
});

// ==========================
// 🔹 API ROUTES
// ==========================

// 👉 Register new user
app.post("/register", (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
  db.query(sql, [username, hashedPassword, email], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "User registered successfully!" });
  });
});

// 👉 Login user
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password." });
    }

    // You should use a JWT for a real app, but for this demo, user_id is fine.
    res.json({ message: "Login successful!", userId: user.user_id });
  });
});

// 👉 Save score and update highest score
app.post("/scores", (req, res) => {
  const { userId, score } = req.body;

  if (!userId || score === undefined) {
    return res.status(400).json({ error: "Missing userId or score" });
  }

  // Insert the new score into the scores table
  const insertScoreQuery = "INSERT INTO scores (user_id, score) VALUES (?, ?)";
  db.query(insertScoreQuery, [userId, score], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    // Check if this new score is the highest for the user
    const checkHighestScoreQuery = `
      UPDATE users 
      SET highest_score = ? 
      WHERE user_id = ? AND highest_score < ?;
    `;
    db.query(checkHighestScoreQuery, [score, userId, score], (err, updateResult) => {
      if (err) {
        console.error("DB error updating highest score:", err);
        // Continue, as the score was still saved
      }
      res.json({ success: true, scoreId: result.insertId });
    });
  });
});

// 👉 Get a single user's profile information
app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT user_id, username, email, highest_score, profile_pic_url FROM users WHERE user_id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true, user: results[0] });
  });
});

// 👉 Get a single user's recent scores
app.get("/scores/:id", (req, res) => {
    const userId = req.params.id;
    const sql = "SELECT score FROM scores WHERE user_id = ? ORDER BY score_id DESC LIMIT 10";
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ success: true, scores: results });
    });
  });

// 👉 Get all scores and usernames for a leaderboard
app.get("/scores/leaderboard", (req, res) => {
  const query = `
    SELECT u.username, s.score
    FROM scores s
    JOIN users u ON s.user_id = u.user_id
    ORDER BY s.score DESC
    LIMIT 10;
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ success: true, leaderboard: results });
  });
});

// 👉 Get all users
app.get("/users", (req, res) => {
  const sql = "SELECT user_id, username, email FROM users";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ success: true, users: results });
  });
});

// 👉 Update user profile
app.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, email, profile_pic_url } = req.body;

  const sql = "UPDATE users SET username = ?, email = ?, profile_pic_url = ? WHERE user_id = ?";
  db.query(sql, [username, email, profile_pic_url, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "User updated successfully!" });
  });
});

// 👉 Delete user
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM users WHERE user_id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "User deleted successfully!" });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});