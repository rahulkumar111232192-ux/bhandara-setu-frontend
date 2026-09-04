export async function apiFetch(path: string, options: RequestInit = {}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("bhandara-token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const requestUrl = apiUrl && path.startsWith("/api/") ? `${apiUrl}${path}` : path;
  const res = await fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers,
  });

  // If server returns 401 Unauthorized on protected routes, broadcast session expiration
  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !path.includes("/api/auth/login") &&
    !path.includes("/api/auth/signup") &&
    !path.includes("/api/auth/anonymous")
  ) {
    const storedUser = localStorage.getItem("bhandara-user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (!parsed.isAnonymous) {
          localStorage.removeItem("bhandara-user");
          localStorage.removeItem("bhandara-token");
          window.dispatchEvent(new CustomEvent("bhandara:session-expired"));
        }
      } catch {
        localStorage.removeItem("bhandara-user");
        localStorage.removeItem("bhandara-token");
      }
    }
  }

  return res;
}
