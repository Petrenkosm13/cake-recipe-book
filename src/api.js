async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const message = data?.error || `Помилка запиту (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  signup: (payload) => request("POST", "/auth/signup", payload),
  login: (payload) => request("POST", "/auth/login", payload),
  logout: () => request("POST", "/auth/logout"),
  me: () => request("GET", "/auth/me"),
  updateMe: (payload) => request("PATCH", "/auth/me", payload),
  resendVerification: () => request("POST", "/auth/resend-verification"),
  forgotPassword: (payload) => request("POST", "/auth/forgot-password", payload),
  resetPassword: (payload) => request("POST", "/auth/reset-password", payload),

  categories: () => request("GET", "/categories"),
  createCategory: (payload) => request("POST", "/categories", payload),
  renameCategory: (id, payload) => request("PATCH", `/categories/${id}`, payload),
  deleteCategory: (id) => request("DELETE", `/categories/${id}`),

  products: () => request("GET", "/products"),
  productHistory: (id) => request("GET", `/products/${id}/history`),
  createProduct: (payload) => request("POST", "/products", payload),
  updateProduct: (id, payload) => request("PATCH", `/products/${id}`, payload),
  deleteProduct: (id) => request("DELETE", `/products/${id}`),

  recipes: () => request("GET", "/recipes"),
  createRecipe: (payload) => request("POST", "/recipes", payload),
  updateRecipe: (id, payload) => request("PATCH", `/recipes/${id}`, payload),
  deleteRecipe: (id) => request("DELETE", `/recipes/${id}`),
};
