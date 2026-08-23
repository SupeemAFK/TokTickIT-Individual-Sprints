import { useEffect, useState } from "react";
import { checkSystem, fetchCategories, type Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";
type CategoryState = "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState<CategoryState>("loading");
  const [categoryMessage, setCategoryMessage] = useState("");

  useEffect(() => {
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
  }, []);

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

      <section className="mt-5" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="h5 mb-3">
          Request categories
        </h2>

        {categoryState === "loading" && (
          <p className="text-secondary" role="status">
            Loading categories...
          </p>
        )}

        {categoryState === "error" && (
          <div className="alert alert-danger" role="alert">
            <strong>Categories unavailable</strong>
            <div>{categoryMessage}</div>
          </div>
        )}

        {categoryState === "success" && (
          <ul className="list-group">
            {categories.map((category) => (
              <li className="list-group-item" key={category.id}>
                {category.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
