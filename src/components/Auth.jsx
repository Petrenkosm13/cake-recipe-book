import React, { useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { api } from "../api";
import { CURRENCY_PRESETS } from "../context/CurrencyContext";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C41.8 36.5 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

export function AuthScreen({ onAuthed, flash }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

        {flash && <div className={`auth-flash ${flash.type === "error" ? "auth-flash-error" : "auth-flash-success"}`}>{flash.text}</div>}

        <a href="/api/auth/google" className="btn-google mt-5">
          <GoogleGlyph /> Увійти через Google
        </a>
        <div className="auth-divider"><span>або</span></div>

        <form onSubmit={submit} className="space-y-2">
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
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                required minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Мінімум 6 символів"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
