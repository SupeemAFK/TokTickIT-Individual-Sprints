import { FormEvent, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
type User = { id: number; name: string; email: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; isActive: boolean };
type AuthResponse = { user: User; mustChangePassword: boolean; session: { token: string; expiresAt: string } };

async function api(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { ...options.headers, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Request failed.");
  return data;
}

export default function App() {
  const [token, setToken] = useState(sessionStorage.getItem("toktickit.token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [page, setPage] = useState("home");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", token)
      .then((data: { user: User; mustChangePassword: boolean }) => {
        setUser(data.user);
        setMustChangePassword(data.mustChangePassword);
      })
      .catch(() => {
        setToken("");
        setUser(null);
        sessionStorage.removeItem("toktickit.token");
      });
  }, [token]);

  if (!token) {
    return <Login onLogin={(nextToken, nextUser, needsPasswordChange) => {
      sessionStorage.setItem("toktickit.token", nextToken);
      setToken(nextToken);
      setUser(nextUser);
      setMustChangePassword(needsPasswordChange);
    }} />;
  }
  if (!user) return <main className="container py-5">Loading your account…</main>;
  if (mustChangePassword) {
    return <Password token={token} onDone={() => api("/api/auth/me", token).then((data) => {
      setUser(data.user);
      setMustChangePassword(data.mustChangePassword);
    })} />;
  }

  const logout = async () => {
    await fetch(API + "/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    sessionStorage.removeItem("toktickit.token");
    setToken("");
    setUser(null);
  };

  return <div className="min-vh-100 toktickit-page">
    <header className="border-bottom bg-white">
      <div className="container py-3 d-flex gap-2 align-items-center">
        <strong className="me-auto">TokTickIT <span className="toktickit-text">IT Service Desk</span><small className="d-block text-secondary">{user.name} · {user.role.replace("_", " ")}</small></strong>
        {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && <button className="btn btn-toktickit-outline" onClick={() => setPage("queue")}>Ticket Queue</button>}
        {user.role === "ADMINISTRATOR" && <button className="btn btn-toktickit-outline" onClick={() => setPage("users")}>User Management</button>}
        <button className="btn btn-outline-secondary" onClick={() => void logout()}>Logout</button>
      </div>
    </header>
    <main className="container py-5">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {page === "queue" ? <Queue token={token} onError={setError} /> : page === "users" ? <Users token={token} onError={setError} /> : <section className="card shadow-sm border-0"><div className="card-body p-4"><h1 className="h3">Welcome, {user.name}</h1><p className="text-secondary">Your authenticated {user.role.replace("_", " ")} workspace is ready.</p>{user.role === "REQUESTER" && <p>Requester ticket screens remain available after authenticated ownership migration.</p>}</div></section>}
    </main>
  </div>;
}

function Login({ onLogin }: { onLogin: (token: string, user: User, mustChangePassword: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data: AuthResponse = await api("/api/auth/login", "", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(data.session.token, data.user, data.mustChangePassword);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="container py-5" style={{ maxWidth: 520 }}>
    <section className="card shadow-sm border-0"><div className="card-body p-4">
      <h1 className="h3">TokTickIT Login</h1>
      <form onSubmit={submit}>
        <label className="form-label mt-3" htmlFor="login-email">Email</label>
        <input id="login-email" className="form-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
        <label className="form-label mt-3" htmlFor="login-password">Password</label>
        <input id="login-password" className="form-control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        <button className="btn btn-toktickit-primary mt-3" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div></section>
  </main>;
}

function Password({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/change-password", token, { method: "POST", body: JSON.stringify({ newPassword: password, confirmation: confirm }) });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="container py-5" style={{ maxWidth: 520 }}>
    <section className="card shadow-sm border-0"><div className="card-body p-4">
      <h1 className="h3">Change your initial password</h1>
      <p className="text-secondary">Use at least 12 characters with upper-case, lower-case, and numeric characters.</p>
      <form onSubmit={submit}>
        <label className="form-label mt-3" htmlFor="new-password">New password</label>
        <input id="new-password" className="form-control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" />
        <label className="form-label mt-3" htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" className="form-control" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={12} autoComplete="new-password" />
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        <button className="btn btn-toktickit-primary mt-3" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
      </form>
    </div></section>
  </main>;
}

function Queue({ token, onError }: { token: string; onError: (message: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api("/api/staff/tickets", token).then((data) => setItems(data.items)).catch((reason) => onError(reason.message)); }, [token, onError]);
  return <section><h1 className="h3">Ticket Queue</h1><table className="table"><thead><tr><th>Number</th><th>Summary</th><th>Status</th><th>IT Priority</th><th>Owner</th></tr></thead><tbody>{items.map((ticket) => <tr key={ticket.id}><td>{ticket.ticketNumber}</td><td>{ticket.summary}</td><td><span className="badge text-bg-secondary">{ticket.currentStatus}</span></td><td>{ticket.itPriority}</td><td>{ticket.owner?.name ?? "Unassigned"}</td></tr>)}</tbody></table>{!items.length && <p className="text-secondary">No matching tickets.</p>}</section>;
}

function Users({ token, onError }: { token: string; onError: (message: string) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => { api("/api/admin/users", token).then((data) => setUsers(Array.isArray(data) ? data : data.items)).catch((reason) => onError(reason.message)); }, [token, onError]);
  return <section><h1 className="h3">User Management</h1><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td>{account.name}</td><td>{account.email}</td><td>{account.role}</td><td>{account.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table></section>;
}
