import dotenv from "dotenv";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { google } from "googleapis";

// setup env + __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });


const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const dbPath = path.resolve(__dirname, "/Users/mollymyers/CSC331/backend/src/db.json");


function readDB() {
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}


const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  cookieSession({
    name: "sb_sess",
    keys: [process.env.SESSION_SECRET || "dev-secret"],
    httpOnly: true,
    sameSite: "lax",
    secure: false, 
  })
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT
);


// basic routes
app.get("/", (_req, res) => {
  res.send("Study Buddy API is running. Try /api/health");
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));


// get all users
app.get("/api/users", (_req, res) => {
  const db = readDB();
  res.json(db.users);
});

// add new user
app.post("/api/users", (req, res) => {
  const db = readDB();
  const { email, password, classes, availability } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }

  // make sure user doesn’t already exist
  if (db.users.some((u) => u.email === email)) {
    return res.status(400).json({ error: "User already exists." });
  }

  db.users.push({ email, password, classes, availability });
  writeDB(db);

  res.status(201).json({ message: "User added successfully!" });
});

// login existing user
app.post("/api/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  const user = db.users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful", user });
});

// match users in same class + overlapping time
app.post("/api/match", (req, res) => {
  const db = readDB();
  const { className, day, start, end } = req.body;

  const matches = db.users.filter(
    (u) =>
      Array.isArray(u.classes) &&
      u.classes.includes(className) &&
      Array.isArray(u.availability) &&
      u.availability.some(
        (a) =>
          a.day === day &&
          // not disjoint → there's overlap
          !(a.end <= start || a.start >= end)
      )
  );

  res.json({ matches });
});

// Google OAuth + Calendar routes (from your second file)

// 1) send user to Google with WRITE scope
app.get("/auth/google", (_req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
  });
  res.redirect(url);
});

// 2) callback
app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error("Missing code");
    const { tokens } = await oauth2Client.getToken(String(code));
    req.session.tokens = tokens;
    res.redirect("http://localhost:5173/");
  } catch (e) {
    console.error("OAuth callback error:", e.response?.data || e.message || e);
    res.status(500).send("Auth error");
  }
});

// 3) list events
app.get("/api/calendar/events", async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) return res.status(401).json({ error: "Not connected" });

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const resp = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    // refresh session tokens if Google gave us new ones
    const newCreds = oauth2Client.credentials;
    if (newCreds && (newCreds.access_token || newCreds.refresh_token)) {
      req.session.tokens = { ...tokens, ...newCreds };
    }

    res.json(resp.data.items || []);
  } catch (e) {
    console.error("Events error:", e.response?.data || e.message || e);
    res.status(500).json({ error: "Google error" });
  }
});

// 4) create event
app.post("/api/calendar/events", async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: "Not connected" });
    }

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const { summary, start, end } = req.body;
    if (!summary || !start || !end) {
      return res.status(400).json({ error: "Missing summary/start/end" });
    }

    const resp = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        start: {
          dateTime: start,
          timeZone: "America/New_York",
        },
        end: {
          dateTime: end,
          timeZone: "America/New_York",
        },
      },
    });

    res.json(resp.data);
  } catch (e) {
    console.error("Create event error:", e.response?.data || e.message || e);
    res.status(500).json({ error: "Failed to create event" });
  }
});

app.post("/api/calendar/disconnect", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// 🔹 NEW: class-based groups (buckets)
app.get("/api/groups", (req, res) => {
  const db = readDB();
  const emailFilter = req.query.email;

  const buckets = new Map();

  for (const user of db.users) {
    // handle both string "MTH121,BEM329" and ["MTH121","BEM329"]
    let classes = [];

    if (Array.isArray(user.classes)) {
      classes = user.classes;
    } else if (typeof user.classes === "string") {
      classes = user.classes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }

    for (const raw of classes) {
      const cls = typeof raw === "string" ? raw.trim() : "";
      if (!cls) continue;

      if (!buckets.has(cls)) {
        buckets.set(cls, {
          className: cls,
          members: [],
        });
      }

      const bucket = buckets.get(cls);
      bucket.members.push({
        email: user.email,
        availability: Array.isArray(user.availability)
          ? user.availability
          : [],
      });
    }
  }

  let groups = Array.from(buckets.values());

  // optional filter: only groups this email belongs to
  if (emailFilter) {
    groups = groups.filter((g) =>
      g.members.some((m) => m.email === emailFilter)
    );
  }

  res.json({ groups });
});


// 6) debug
app.get("/api/debug/session", (req, res) => {
  const t = req.session?.tokens || {};
  res.json({
    hasTokens: !!t.access_token || !!t.refresh_token,
    scope: t.scope,
    expiry_date: t.expiry_date,
  });
});

// start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`API → http://localhost:${PORT}`));
