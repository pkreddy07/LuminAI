const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const {
    method = "GET",
    token,
    body,
    headers = {},
    isForm = false
  } = options;

  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !isForm) {
    requestHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: payload
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = data?.detail || data?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function apiJson(path, options = {}) {
  return apiFetch(path, options);
}
