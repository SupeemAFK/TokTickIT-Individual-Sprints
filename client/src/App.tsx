import { useState } from "react";
import { checkSystem } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");

  async function handleCheck() {
    setState("loading");
    setMessage("");

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

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="mt-3 mb-0 text-secondary" role="status">
          Checking backend status...
        </p>
      )}

      {state === "success" && (
        <div className="alert alert-success mt-3 mb-0" role="status">
          <strong>Online</strong>
          <div>{service} is running.</div>
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          <strong>Offline</strong>
          <div>{message}</div>
        </div>
      )}
    </div>
  );
}
