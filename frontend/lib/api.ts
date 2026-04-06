const API_BASE = "http://127.0.0.1:8000";

export interface User {
  user_id: number;
  email: string;
}

export async function registerUser(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail ?? "Registration failed.");
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail ?? "Invalid email or password.");
  }

  const data: User = await res.json();

  localStorage.setItem("user_id", String(data.user_id));
  localStorage.setItem("email", data.email);

  // Set a cookie so middleware (Edge Runtime) can detect the session.
  document.cookie = `user_id=${data.user_id}; path=/; max-age=${60 * 60 * 24 * 7}`;

  return data;
}

export function logoutUser(): void {
  localStorage.removeItem("user_id");
  localStorage.removeItem("email");
  document.cookie = "user_id=; path=/; max-age=0";
}

export function getCurrentUser(): User | null {
  const user_id = localStorage.getItem("user_id");
  const email = localStorage.getItem("email");
  if (!user_id || !email) return null;
  return { user_id: Number(user_id), email };
}
