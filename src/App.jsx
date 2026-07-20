import React, { useState, useEffect } from "react";
import { api } from "./api";
import { AuthScreen } from "./components/Auth";
import { CurrencyContext } from "./context/CurrencyContext";
import CakeRecipeBook from "./CakeRecipeBook";

function readFlashFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const verify = params.get("verify");
  const authError = params.get("auth_error");
  if (verify === "success") return { type: "success", text: "Email підтверджено! Тепер можна користуватись усіма функціями." };
  if (verify === "expired") return { type: "error", text: "Посилання для підтвердження застаріло. Надішліть нове через меню профілю." };
  if (verify === "invalid") return { type: "error", text: "Недійсне посилання підтвердження." };
  if (authError) return { type: "error", text: "Не вдалося увійти через Google. Спробуйте ще раз." };
  return null;
}

export default function App() {
  const [status, setStatus] = useState("loading"); // loading | guest | in
  const [user, setUser] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const f = readFlashFromUrl();
    if (f) {
      setFlash(f);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
    return <AuthScreen onAuthed={handleAuthed} flash={flash} />;
  }

  return (
    <CurrencyContext.Provider value={user.currencySymbol}>
      <CakeRecipeBook user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} flash={flash} />
    </CurrencyContext.Provider>
  );
}
