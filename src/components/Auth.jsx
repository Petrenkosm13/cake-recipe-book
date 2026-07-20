import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { api } from "../api";
import { CURRENCY_PRESETS } from "../context/CurrencyContext";

export function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = mode === "login" ? { email, password } : { email, password, displayName };
      const { user } = mode === "login" ? await api.login(payload) : await api.signup(payload);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-title">Кондитерська книга</div>
        <div className="auth-sub">{mode === "login" ? "Увійдіть, щоб побачити свої рецепти" : "Створіть акаунт, щоб почати"}</div>
        <form onSubmit={submit} className="space-y-2 mt-5">
          {mode === "signup" && (
            <label className="field">
              <span>Ім'я (необов'язково)</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ваше ім'я" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Мінімум 6 символів" />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy} type="submit">
            {busy ? "Зачекайте…" : mode === "login" ? "Увійти" : "Зареєструватися"}
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>Ще немає акаунта? <button type="button" onClick={() => { setMode("signup"); setError(""); }}>Зареєструватися</button></>
          ) : (
            <>Вже є акаунт? <button type="button" onClick={() => { setMode("login"); setError(""); }}>Увійти</button></>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserMenu({ user, onUpdate, onLogout }) {
  const [open, setOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const isPreset = CURRENCY_PRESETS.some((c) => c.code === user.currencyCode);
  const initials = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="user-menu">
      <button className="user-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="user-avatar">{initials}</span>
        <span>{user.displayName || user.email}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 30 }} onClick={() => setOpen(false)} />
          <div className="user-menu-panel">
            <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{user.displayName || "Без імені"}</div>
            <div className="text-xs" style={{ color: "var(--ink-soft)" }}>{user.email}</div>

            <div className="mt-3">
              <span className="field-label">Валюта</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CURRENCY_PRESETS.map((c) => (
                  <button key={c.code} type="button" className={`seg ${user.currencyCode === c.code ? "seg-active" : ""}`} onClick={() => onUpdate({ currencyCode: c.code, currencySymbol: c.symbol })}>
                    {c.symbol}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                <input className="cat-edit-input" style={{ width: 56 }} placeholder="код" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
                <input className="cat-edit-input" style={{ width: 56 }} placeholder="симв." value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value)} />
                <button className="btn-ghost-sm" onClick={() => { if (customCode.trim() && customSymbol.trim()) onUpdate({ currencyCode: customCode.trim().toUpperCase(), currencySymbol: customSymbol.trim() }); }}>Ок</button>
              </div>
              {!isPreset && <div className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>Поточна: {user.currencyCode} ({user.currencySymbol})</div>}
            </div>

            <button className="btn-ghost mt-4" style={{ width: "100%", justifyContent: "center" }} onClick={onLogout}>Вийти</button>
          </div>
        </>
      )}
    </div>
  );
}
