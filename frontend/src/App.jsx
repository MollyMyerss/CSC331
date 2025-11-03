import { useState, useRef, useEffect } from "react";

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

function Dashboard({ userEmail, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Home"); 
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
              <h2 style={{ margin: 0 }}>Welcome to your dashboard!</h2>
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

          {/* ---- Section router ---- */}
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
        <p className="tiny muted">Tip: Use Groups → “Find group” to browse open study groups.</p>
      </div>
      <div className="card">
        <h3>Messages</h3>
        <p>Nothing new. Say hi to your group!</p>
      </div>
    </div>
  );
}

function CalendarView() {
  return (
    <div className="section">
      <h3>Calendar</h3>
      <p className="muted">Your upcoming study sessions will appear here.</p>
      <div className="calendar-grid">
        {Array.from({ length: 7 * 5 }).map((_, i) => (
          <div key={i} className="calendar-cell">{/* placeholder */}</div>
        ))}
      </div>
      <div className="row">
        <button className="primary">Create Session</button>
        <button className="ghost">Import from .ics</button>
      </div>
    </div>
  );
}

function GroupsView() {
  return (
    <div className="section">
      <h3>Groups</h3>
      <p className="muted">Join or create study groups by class.</p>
      <div className="list">
        <div className="list-item">
          <div>
            <strong>BEM 329 – Sports Marketing</strong>
            <div className="tiny muted">Meets Thu 7–8 pm • 3 members</div>
          </div>
          <button className="ghost small">View</button>
        </div>
        <div className="list-item">
          <div>
            <strong>MTH 121 – Linear Algebra</strong>
            <div className="tiny muted">Meets Sun 3–4 pm • 5 members</div>
          </div>
          <button className="ghost small">Join</button>
        </div>
      </div>
      <div className="row">
        <button className="primary">Create Group</button>
        <button className="ghost">Find Group</button>
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


export default function App() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [authed, setAuthed] = useState(false);

  const isWFU = /@wfu\.edu$/i.test(email.trim());
  const canSubmit = isWFU && pwd.length >= 6;

  function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    console.log("Sign in with:", { email, pwd });
    alert("Signed in (demo). Replace with real auth next.");
    setAuthed(true); 
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
            <div className="user-line">Welcome, {email.split("@")[0]}</div>
            {}
            <button className="ghost small signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}

        </div>
      </header>


      {!authed ? (
        <section className="content">
          <form className="card form" onSubmit={onSubmit} noValidate>
            <div className="disclaimer">
              <strong>Required: WFU email</strong>
              <span className="muted"> (example@wfu.edu)</span>
            </div>

            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                inputMode="email"
                placeholder=""
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
                  placeholder=""
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

            <button className="primary" type="submit" disabled={!canSubmit}>
              Continue
            </button>

            <p className="tiny muted">
              By continuing, you agree to our community guidelines. You must use a
              valid Wake Forest email to sign in.
            </p>
          </form>
        </section>
      ) : (
        <Dashboard userEmail={email} onSignOut={handleSignOut} />
      )}

      <footer className="footer">© {new Date().getFullYear()} Study Buddy</footer>
    </main>
  );
}