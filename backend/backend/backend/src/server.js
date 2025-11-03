import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// test routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/hello", (_req, res) => res.json({ message: "Hi from backend!" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API → http://localhost:${PORT}`));
