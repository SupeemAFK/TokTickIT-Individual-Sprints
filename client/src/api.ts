const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  service: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error("Unable to reach the backend. Check that the API server is running.");
  }

  if (!response.ok) {
    throw new Error(`Backend health check failed with HTTP ${response.status}.`);
  }

  const data = (await response.json()) as { status?: string; service?: string };

  if (data.status !== "ok") {
    throw new Error("Backend health check returned an unexpected response.");
  }

  return { online: true, service: data.service ?? "TokTickIT API" };
}
