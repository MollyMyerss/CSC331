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
  const [classes, setClasses] = useState("");
  
  const [availability, setAvailability] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    if (isSignUp) {
      // Create new user
      const userData = {
        email,
        password: pwd,
        classes: classes.split(",").map(c => c.trim()),
        availability: availability.split(",").map(slot => {
          const [day, timeRange] = slot.trim().split(" ");
          const [start, end] = timeRange.split("-");
          return { day, start, end };
        }),
      };

      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        alert("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        const data = await res.json();
        alert(data.error || "Error creating account");
      }

    } else {
      // Log in existing user
      const res = await fetch("http://localhost:5000/api/login", {
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
            <h2>{isSignUp ? "Create Account" : "Sign In"}</h2>

            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
              />
              <button
                type="button"
                className="ghost small"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </label>

            {/* If signing up, show extra fields */}
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
                  <span className="label">Availability (e.g., Mon 15:00-16:00)</span>
                  <input
                    type="text"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g., Mon 15:00-16:00, Wed 18:00-19:00"
                  />
                </label>
              </>
            )}

            <button className="primary" type="submit">
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>

            <p className="tiny muted">
              {isSignUp ? "Already have an account?" : "New user?"}{" "}
              <button
                type="button"
                className="link"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </button>
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