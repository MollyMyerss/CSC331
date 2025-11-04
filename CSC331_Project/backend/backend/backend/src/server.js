import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
const dbPath = path.resolve("backend/db.json");

//read and write functions
function readDB() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

//check if backend is working
app.get("/api/health", (_req, res) => res.json({ ok: true }));

//get users function
app.get("/api/users", (_req, res) => {
  const db = readDB();
  res.json(db.users);
});

//add a new user
app.post("/api/users", (req, res) => {
  const db = readDB();
  const { email, classes = [], availability = [] } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  db.users.push({ email, classes, availability });
  writeDB(db);

  res.status(201).json({ message: "User added", user: { email, classes, availability } });
});

//find matches
app.post("/api/match", (req, res) => {
  const db = readDB();
  const { className, timeSlot } = req.body;

  const matches = db.users.filter(
    (u) => u.classes.includes(className) && u.availability.includes(timeSlot)
  );

  res.json({ matches });
});

//start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
