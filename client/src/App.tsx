import { useEffect, useState } from "react";
import {
  checkSystem,
  fetchCategories,
  fetchDevelopmentRequesters,
  type Category,
  type DevelopmentRequester,
} from "./api";
import CreateTicketForm from "./CreateTicketForm";

type UiState = "idle" | "loading" | "success" | "error";
type LoadState = "loading" | "success" | "error";

const REQUESTER_STORAGE_KEY = "toktickit.requesterId";

export default function App() {
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [requesterState, setRequesterState] = useState<LoadState>("loading");
  const [requesterMessage, setRequesterMessage] = useState("");
  const [pendingRequesterId, setPendingRequesterId] = useState("");
  const [selectedRequester, setSelectedRequester] = useState<DevelopmentRequester | null>(null);
  const [activePage, setActivePage] = useState<"tickets" | "create">("tickets");
  const [state, setState] = useState<UiState>("idle");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState<LoadState>("loading");
  const [categoryMessage, setCategoryMessage] = useState("");

  async function loadRequesters() {
    setRequesterState("loading");
    setRequesterMessage("");

    try {
      const results = await fetchDevelopmentRequesters();
      setRequesters(results);
      setRequesterState("success");

      const storedId = sessionStorage.getItem(REQUESTER_STORAGE_KEY);
      const storedRequester = results.find((requester) => requester.id === Number(storedId));
      if (storedRequester) {
        setSelectedRequester(storedRequester);
        setPendingRequesterId(String(storedRequester.id));
      } else {
        sessionStorage.removeItem(REQUESTER_STORAGE_KEY);
      }
    } catch (error) {
      setRequesters([]);
      setRequesterMessage(error instanceof Error ? error.message : "Unable to load requesters.");
      setRequesterState("error");
    }
  }

  useEffect(() => {
    void loadRequesters();
  }, []);

  useEffect(() => {
    if (!selectedRequester) {
      return;
    }

    let isActive = true;

    async function loadCategories() {
      setCategoryState("loading");
      setCategoryMessage("");

      try {
        const results = await fetchCategories();
        if (!isActive) return;
        setCategories(results);
        setCategoryState("success");
      } catch (error) {
        if (!isActive) return;
        setCategories([]);
        setCategoryMessage(error instanceof Error ? error.message : "Unable to load categories.");
        setCategoryState("error");
      }
    }

    void loadCategories();
    return () => {
      isActive = false;
    };
  }, [selectedRequester?.id]);

  function handleContinue() {
    const requester = requesters.find((item) => item.id === Number(pendingRequesterId));
    if (!requester) return;

    sessionStorage.setItem(REQUESTER_STORAGE_KEY, String(requester.id));
    setSelectedRequester(requester);
  }

  function handleChangeRequester() {
    sessionStorage.removeItem(REQUESTER_STORAGE_KEY);
    setSelectedRequester(null);
    setState("idle");
    setService("");
    setMessage("");
    setActivePage("tickets");
  }

  async function handleCheck() {
    setState("loading");
    setMessage("");
    setActivePage("tickets");

    try {
      const status = await checkSystem();
      setService(status.service);
      setState("success");
    } catch (error) {
      setService("");
      setMessage(error instanceof Error ? error.message : "Unable to check backend status.");
      setState("error");
    }
  }

  if (!selectedRequester) {
    return (
      <main className="container py-5 toktickit-page" style={{ maxWidth: 640 }}>
        <section className="card shadow-sm border-0" aria-labelledby="requester-selection-heading">
          <div className="card-body p-4 p-md-5">
            <div className="h4 mb-4">TokTickIT <span className="toktickit-text">IT Service Desk</span></div>
            <h1 id="requester-selection-heading" className="h3 mb-3">Choose a Development Requester</h1>
            <p className="text-secondary">
              This temporary selector is for Lab 2 testing only. It is not a sign-in method or real authentication.
            </p>

            {requesterState === "loading" && <p className="mb-0" role="status">Loading requesters...</p>}

            {requesterState === "error" && (
              <div className="alert alert-danger mb-0" role="alert">
                <strong>Requesters unavailable</strong>
                <div>{requesterMessage}</div>
                <button className="btn btn-outline-danger mt-3" onClick={() => void loadRequesters()}>Try again</button>
              </div>
            )}

            {requesterState === "success" && requesters.length === 0 && (
              <div className="alert alert-warning mb-0" role="status">
                <strong>No active requesters available</strong>
                <div>Ask an administrator to seed or activate a Development Requester, then try again.</div>
                <button className="btn btn-outline-secondary mt-3" onClick={() => void loadRequesters()}>Refresh</button>
              </div>
            )}

            {requesterState === "success" && requesters.length > 0 && (
              <div className="mt-4">
                <label className="form-label fw-semibold" htmlFor="development-requester">Development Requester</label>
                <select
                  className="form-select"
                  id="development-requester"
                  value={pendingRequesterId}
                  onChange={(event) => setPendingRequesterId(event.target.value)}
                >
                  <option value="">Select a requester</option>
                  {requesters.map((requester) => (
                    <option key={requester.id} value={requester.id}>{requester.name} ({requester.email})</option>
                  ))}
                </select>
                <button className="btn btn-toktickit-primary mt-3" disabled={!pendingRequesterId} onClick={handleContinue}>Continue</button>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-vh-100 toktickit-page">
      <header className="border-bottom bg-white">
        <div className="container py-3 d-flex flex-wrap align-items-center gap-3" style={{ maxWidth: 960 }}>
          <div className="me-auto">
            <div className="h4 mb-0">TokTickIT <span className="toktickit-text">IT Service Desk</span></div>
            <div className="small text-secondary">Requester: <strong className="text-dark">{selectedRequester.name}</strong></div>
          </div>
          <nav aria-label="Requester navigation" className="d-flex gap-2">
            <button className="btn btn-toktickit-primary btn-sm" aria-current={activePage === "tickets" ? "page" : undefined} onClick={() => setActivePage("tickets")}>My Tickets</button>
            <button className="btn btn-toktickit-outline btn-sm" aria-current={activePage === "create" ? "page" : undefined} onClick={() => setActivePage("create")}>Create Ticket</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleChangeRequester}>Change Requester</button>
          </nav>
        </div>
      </header>

      <main className="container py-5 toktickit-page" style={{ maxWidth: 960 }}>
        <div className="alert toktickit-context" role="status">
          Requester context active for <strong>{selectedRequester.name}</strong>. Requester-specific data is reloaded when you change requester.
        </div>
        {activePage === "create" ? <CreateTicketForm requester={selectedRequester} onCancel={() => setActivePage("tickets")} /> : <>
        <button className="btn btn-toktickit-primary" onClick={handleCheck} disabled={state === "loading"}>
          {state === "loading" ? "Loading…" : "Check System"}
        </button>

        {state === "loading" && <p className="mt-3 mb-0 text-secondary" role="status">Checking backend status...</p>}
        {state === "success" && <div className="alert alert-success mt-3 mb-0" role="status"><strong>Online</strong><div>{service} is running.</div></div>}
        {state === "error" && <div className="alert alert-danger mt-3 mb-0" role="alert"><strong>Offline</strong><div>{message}</div></div>}

        <section className="mt-5" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="h5 mb-3">Request categories</h2>
          {categoryState === "loading" && <p className="text-secondary" role="status">Loading categories...</p>}
          {categoryState === "error" && <div className="alert alert-danger" role="alert"><strong>Categories unavailable</strong><div>{categoryMessage}</div></div>}
          {categoryState === "success" && <ul className="list-group">{categories.map((category) => <li className="list-group-item" key={category.id}>{category.name}</li>)}</ul>}
        </section>
        </>}
      </main>
    </div>
  );
}
