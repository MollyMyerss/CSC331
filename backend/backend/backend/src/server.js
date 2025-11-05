import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// get path to db.json file
const dbPath = path.resolve("db.json");

// helper functions to read/write to db.json
function readDB() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

//ROUTES

//health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

//get all users
app.get("/api/users", (_req, res) => {
  const db = readDB();
  res.json(db.users);
});

//add new user
app.post("/api/users", (req, res) => {
  const db = readDB();
  const { email, password, classes, availability } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }

  //make sure user doesn’t already exist
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists." });
  }

  db.users.push({ email, password, classes, availability });
  writeDB(db);

  res.status(201).json({ message: "User added successfully!" });
});

//login existing user
app.post("/api/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful", user });
});

//match users in same class + time
app.post("/api/match", (req, res) => {
  const db = readDB();
  const { className, day, start, end } = req.body;

  const matches = db.users.filter(u =>
    u.classes.includes(className) &&
    u.availability.some(a =>
      a.day === day &&
      !(a.end <= start || a.start >= end)
    )
  );

  res.json({ matches });
});

//start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API → http://localhost:${PORT}`));
