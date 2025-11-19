import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:5050";

const LS = {
  AUTH: "sb.auth.v1",
  TAB: "sb.tab.v1",
  PROFILE: "sb.profile.v1",
  ONBOARDED: "sb.onboarded.v1",
};

const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function onClick(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ref, handler]);
}

function Dashboard({ userEmail, onSignOut, profile, setProfile }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(load(LS.TAB, "Home"));

  useEffect(() => {
    save(LS.TAB, active);
  }, [active]);

  const menuRef = useRef(null);
  useOnClickOutside(menuRef, () => setOpen(false));

  function pick(item) {
    setActive(item);
    setOpen(false);
  }

  return (
    <section className="content">
      <div className="container">
        <div className="dash">
          <div className="dash-top">
            <div>
              <h2 style={{ margin: 0 }}>
                Welcome{profile?.name ? `, ${profile.name}` : ""} to your dashboard!
              </h2>
              <p className="muted" style={{ marginTop: 6 }}>
                Use the menu to jump to sections.
              </p>
            </div>

            <div className="dropdown-wrap" ref={menuRef}>
              <button
                className="dropdown-trigger"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {active === "Home" ? "Menu ▾" : `${active} ▾`}
              </button>

              {open && (
                <ul className="dropdown" role="menu">
                  <li role="menuitem">
                    <button onClick={() => pick("Home")}>Home</button>
                  </li>
                  <li role="menuitem">
                    <button onClick={() => pick("Calendar")}>Calendar</button>
                  </li>
                  <li role="menuitem">
                    <button onClick={() => pick("Groups")}>Groups</button>
                  </li>
                  <li role="menuitem">
                    <button onClick={() => pick("Notifications")}>Notifications</button>
                  </li>
                  <li role="menuitem">
                    <button onClick={() => pick("Messages")}>Messages</button>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* section router */}
          {active === "Home" && <HomeCards />}
          {active === "Calendar" && <CalendarView />}
          {active === "Groups" && <GroupsView />}
          {active === "Notifications" && <NotificationsView />}
          {active === "Messages" && <MessagesView />}
        </div>
      </div>
    </section>
  );
}

function HomeCards() {
  return (
    <div className="dash-cards">
      <div className="card">
        <h3>Quick Start</h3>
        <p>Add classes, set availability, and find study groups.</p>
        <div className="row">
          <button className="ghost small">Add Class</button>
          <button className="ghost small">New Session</button>
        </div>
      </div>
      <div className="card">
        <h3>Today</h3>
        <p>No sessions yet. Create one or join a group.</p>
        <p className="tiny muted">
          Tip: Use Groups to see the classes you have joined → create study sessions on the Calendar page.
        </p>
      </div>
      <div className="card">
        <h3>Messages</h3>
        <p>Nothing new. Say hi to your group!</p>
      </div>

      {/* we also keep the CalendarConnect box from the 2nd file */}
      <CalendarConnect />
    </div>
  );
}

function CalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  function getWeekStartingSunday() {
    const today = new Date();
    const dow = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dow);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function getEventDate(ev) {
    if (ev.start?.date) return new Date(ev.start.date + "T00:00:00");
    if (ev.start?.dateTime) return new Date(ev.start.dateTime);
    return null;
  }

  async function loadEvents() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = `${API_BASE}/auth/google`;
        return;
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch calendar events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setErr("");

    if (!newTitle || !newDate || !newStartTime || !newEndTime) {
      setErr("Please fill out title, date, start, and end.");
      return;
    }

    const startISO = new Date(`${newDate}T${newStartTime}`).toISOString();
    const endISO = new Date(`${newDate}T${newEndTime}`).toISOString();

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: newTitle,
          start: startISO,
          end: endISO,
        }),
      });

      if (res.status === 401) {
        window.location.href = `${API_BASE}/auth/google`;
        return;
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setNewTitle("");
      setNewDate("");
      setNewStartTime("");
      setNewEndTime("");

      loadEvents();
    } catch (e) {
      console.error(e);
      setErr("Failed to create event");
    }
  }

  const week = getWeekStartingSunday();
  const eventsByDay = week.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    return events.filter((ev) => {
      const evDate = getEventDate(ev);
      if (!evDate) return false;
      const evStr = evDate.toISOString().slice(0, 10);
      return evStr === dayStr;
    });
  });

  return (
    <div className="section">
      <h3>Weekly Calendar</h3>
      <p className="muted">Pulled from Google Calendar</p>

      <form
        onSubmit={handleCreate}
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <input
          type="text"
          placeholder="Event title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />
        <input
          type="time"
          value={newStartTime}
          onChange={(e) => setNewStartTime(e.target.value)}
        />
        <input
          type="time"
          value={newEndTime}
          onChange={(e) => setNewEndTime(e.target.value)}
        />
        <button className="primary small" type="submit">
          Create
        </button>
      </form>

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="ghost small" onClick={loadEvents}>
          Refresh
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {err && <p className="err-text tiny">{err}</p>}

      {/* main 7-day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        {week.map((day, idx) => {
          const dayEvents = eventsByDay[idx];
          const weekday = day.toLocaleDateString(undefined, { weekday: "short" });
          const month = day.toLocaleDateString(undefined, { month: "short" });
          const date = day.getDate();

          return (
            <div
              key={day.toISOString()}
              style={{
                background: "white",
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 12, color: "#777" }}>
                {weekday} • {month} {date}
              </div>

              {dayEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                  No events
                </div>
              ) : (
                dayEvents.map((ev) => {
                  let timeLabel = "All day";
                  if (ev.start?.dateTime) {
                    const s = new Date(ev.start.dateTime);
                    const e = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
                    const sStr = s.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const eStr = e
                      ? e.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    timeLabel = eStr ? `${sStr} – ${eStr}` : sStr;
                  }

                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: "#f3f4ff",
                        borderRadius: 6,
                        padding: "4px 6px",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {ev.summary || "(No title)"}
                      </div>
                      <div style={{ fontSize: 11, color: "#555" }}>{timeLabel}</div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

function GroupsView() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadGroups() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${API_BASE}/api/groups`);
        if (!res.ok) {
          throw new Error("Failed to load groups");
        }
        const data = await res.json();
        setGroups(data.groups || []);
      } catch (e) {
        console.error(e);
        setErr("Could not load groups. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, []);

  function startSession(group) {
    // For now, just a placeholder – easy to hook into Calendar later.
    alert(`Starting a study session for ${group.className}!`);
    console.log("Start session with group:", group);
  }

  return (
    <div className="section">
      <h3>Groups</h3>
      <p className="muted">
        Classes and peers list
      </p>

      {loading && <p className="tiny muted">Loading groups…</p>}
      {err && <p className="tiny err-text">{err}</p>}

      {!loading && !err && groups.length === 0 && (
        <p className="muted">
          No groups yet. Sign up and add your classes to see groups appear.
        </p>
      )}

      <div className="list">
        {groups.map((g) => (
          <div key={g.className} className="list-item">
            <div>
              <strong>{g.className}</strong>
              <div className="tiny muted">
                {g.members.length} member{g.members.length === 1 ? "" : "s"}
              </div>

              {/* member list */}
              {g.members.length > 0 && (
                <ul className="tiny" style={{ marginTop: 4 }}>
                  {g.members.map((m) => (
                    <li key={m.email}>
                      {m.email}
                      {Array.isArray(m.availability) &&
                        m.availability.length > 0 && (
                          <span className="muted">
                            {" "}
                            •{" "}
                            {m.availability
                              .map(
                                (a) =>
                                  `${a.day} ${a.start}-${a.end}`
                              )
                              .join(", ")}
                          </span>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function NotificationsView() {
  return (
    <div className="section">
      <h3>Notifications</h3>
      <p className="muted">You’re all caught up.</p>
      <div className="empty">No new notifications.</div>
    </div>
  );
}

function MessagesView() {
  return (
    <div className="section">
      <h3>Messages</h3>
      <div className="inbox">
        <div className="thread-list">
          <button className="thread active">BEM 329 Group</button>
          <button className="thread">MTH 121 Group</button>
          <button className="thread">Direct: Alex P.</button>
        </div>
        <div className="thread-pane">
          <div className="bubble you">Anyone free to review case study tonight?</div>
          <div className="bubble them">I can do 8pm!</div>
          <div className="compose">
            <input type="text" placeholder="Type a message…" />
            <button className="primary small">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingModal({ initial = { name: "", major: "", bio: "" }, onSave, onClose }) {
  const [draft, setDraft] = useState(initial);
  const [err, setErr] = useState("");

  function save() {
    if (!draft.name.trim() || !draft.major.trim()) {
      setErr("Please enter your Name and Major.");
      return;
    }
    onSave(draft);
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <div className="card" style={{ maxWidth: 520, width: "90%", background: "var(--panel,#fff)" }}>
        <h3 id="onboard-title">Set up your profile</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          You’ll only do this once.
        </p>

        <label className="field">
          <span className="label">Name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </label>

        <label className="field">
          <span className="label">Major</span>
          <input
            value={draft.major}
            onChange={(e) => setDraft((d) => ({ ...d, major: e.target.value }))}
          />
        </label>

        <label className="field">
          <span className="label">Bio (optional)</span>
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          />
        </label>

        {err && (
          <div className="tiny err-text" style={{ marginTop: 6 }}>
            {err}
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={save}>
            Save
          </button>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarConnect() {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/calendar/events`, {
        credentials: "include",
      });

      if (r.status === 401) {
        window.location.href = `${API_BASE}/auth/google`;
        return;
      }

      if (!r.ok) {
        const text = await r.text();
        throw new Error(`API ${r.status}: ${text}`);
      }

      const data = await r.json();
      setEvents(data);
    } catch (e) {
      setErr(String(e.message || e));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Google Calendar</h3>
      <div className="row">
        <button className="primary small" onClick={load}>
          {events ? "Refresh Events" : "Connect & Load Events"}
        </button>
        {events && (
          <form method="post" action={`${API_BASE}/api/calendar/disconnect`}>
            <button className="ghost small" style={{ marginLeft: 8 }}>
              Disconnect
            </button>
          </form>
        )}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {err && <p className="err-text tiny">{err}</p>}

      {Array.isArray(events) && events.length > 0 && (
        <ul className="list" style={{ marginTop: 10 }}>
          {events.map((ev) => (
            <li key={ev.id} className="list-item">
              <div>
                <strong>{ev.summary || "(No title)"}</strong>
                <div className="tiny muted">
                  {ev.start?.dateTime || ev.start?.date} → {ev.end?.dateTime || ev.end?.date}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {Array.isArray(events) && events.length === 0 && <p className="muted">No upcoming events.</p>}
    </div>
  );
}

export default function App() {
  const savedAuth = load(LS.AUTH, { authed: false, email: "" });

  const [email, setEmail] = useState(savedAuth.email || "");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [authed, setAuthed] = useState(!!savedAuth.authed);
  const [profile, setProfile] = useState(
    load(LS.PROFILE, { name: "", major: "", bio: "" })
  );

  const [onboarded, setOnboarded] = useState(load(LS.ONBOARDED, false));
  useEffect(() => {
    save(LS.ONBOARDED, onboarded);
  }, [onboarded]);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [isSignUp, setIsSignUp] = useState(false);
  const [classes, setClasses] = useState("");
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    if (authed && !onboarded) {
      setShowOnboarding(true);
    }
  }, [authed, onboarded]);

  useEffect(() => {
    save(LS.AUTH, { authed, email });
  }, [authed, email]);

  useEffect(() => {
    save(LS.PROFILE, profile);
  }, [profile]);

  const isWFU = /@wfu\.edu$/i.test(email.trim());
  const canSubmit = isWFU && pwd.length >= 6;

  async function onSubmit(e) {
    e.preventDefault();

    if (isSignUp) {
      const userData = {
        email,
        password: pwd,
        classes: classes
          ? classes.split(",").map((c) => c.trim())
          : [],
        availability: availability
          ? availability.split(",").map((slot) => {
              const [day, timeRange] = slot.trim().split(" ");
              if (!day || !timeRange) return null;
              const [start, end] = timeRange.split("-");
              return { day, start, end };
            }).filter(Boolean)
          : [],
      };

      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        alert(data.error || "Error creating account");
      }
      return;
    }

    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Welcome back!");
      setAuthed(true);
    } else {
      alert(data.error || "Login failed");
    }
  }

  function handleSignOut() {
    setAuthed(false);
    setPwd("");
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="container">
          <h1 className="title">Study Buddy</h1>
          <p className="subtitle">Find teammates. Learn faster.</p>

          {authed && (
            <div className="user-welcome">
              <div className="user-line">
                Welcome, {profile.name || email.split("@")[0]}
              </div>
              <button className="ghost small signout" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {authed && showOnboarding && (
        <OnboardingModal
          initial={profile}
          onSave={(data) => {
            setProfile(data);
            setOnboarded(true);
            setShowOnboarding(false);
          }}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {!authed ? (
        <section className="content">
          <form className="card form" onSubmit={onSubmit} noValidate>
            <h2>{isSignUp ? "Create Account" : "Sign In"}</h2>

            <div className="disclaimer">
              <strong>Required: WFU email</strong>
              <span className="muted"> (example@wfu.edu)</span>
            </div>

            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={!email ? "" : isWFU ? "ok" : "err"}
              />
              {!email ? null : isWFU ? (
                <span className="help ok-text">WFU email looks good.</span>
              ) : (
                <span className="help err-text">Use your @wfu.edu address.</span>
              )}
            </label>

            <label className="field">
              <span className="label">Password</span>
              <div className="password-row">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-pressed={showPwd}
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
              {pwd && pwd.length < 6 ? (
                <span className="help err-text">At least 6 characters.</span>
              ) : null}
            </label>

            {/* sign-up-only fields from the first file */}
            {isSignUp && (
              <>
                <label className="field">
                  <span className="label">Classes (comma-separated)</span>
                  <input
                    type="text"
                    value={classes}
                    onChange={(e) => setClasses(e.target.value)}
                    placeholder="e.g., MTH121, BEM329"
                  />
                </label>

                <label className="field">
                  <span className="label">
                    Availability (e.g., Mon 15:00-16:00)
                  </span>
                  <input
                    type="text"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g., Mon 15:00-16:00, Wed 18:00-19:00"
                  />
                </label>
              </>
            )}

            <button className="primary" type="submit" disabled={!canSubmit}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>

            <p className="tiny muted">
              {isSignUp ? "Already have an account?" : "New user?"}{" "}
              <button
                type="button"
                className="link"
                onClick={() => setIsSignUp((v) => !v)}
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </button>
            </p>
          </form>
        </section>
      ) : (
        <Dashboard
          userEmail={email}
          onSignOut={handleSignOut}
          profile={profile}
          setProfile={setProfile}
        />
      )}

      <footer className="footer">© {new Date().getFullYear()} Study Buddy</footer>
    </main>
  );
}
