import React, { useState, useEffect } from "react";
import { api } from "./api";
import { AuthScreen } from "./components/Auth";
import { CurrencyContext } from "./context/CurrencyContext";
import CakeRecipeBook from "./CakeRecipeBook";

export default function App() {
  const [status, setStatus] = useState("loading"); // loading | guest | in
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.me().then(({ user }) => { setUser(user); setStatus("in"); }).catch(() => setStatus("guest"));
  }, []);

  const handleAuthed = (u) => { setUser(u); setStatus("in"); };
  const handleLogout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setUser(null);
    setStatus("guest");
  };
  const handleUpdateUser = async (patch) => {
    const { user: updated } = await api.updateMe(patch);
    setUser(updated);
  };

  if (status === "loading") {
    return <div className="auth-shell"><div className="text-sm animate-pulse" style={{ color: "var(--ink-soft)" }}>Завантаження…</div></div>;
  }
  if (status === "guest") {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  return (
    <CurrencyContext.Provider value={user.currencySymbol}>
      <CakeRecipeBook user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
    </CurrencyContext.Provider>
  );
}
