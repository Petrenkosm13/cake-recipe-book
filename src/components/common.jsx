import React from "react";
import { ChefHat, Wheat, Milk, Egg, Droplet, Package, Cookie, Plus, AlertCircle } from "lucide-react";

export const ICONS = { Wheat, Milk, Egg, Droplet, Package, Cookie };

export function IconGlyph({ name, size = 22, className = "" }) {
  const Cmp = ICONS[name] || ChefHat;
  return <Cmp size={size} className={className} strokeWidth={1.8} />;
}

export function Thumb({ photo, icon, fallback = "ChefHat", size = "full" }) {
  const dim = size === "full" ? "w-full h-full" : "";
  if (photo) return <img src={photo} alt="" className={`${dim} object-cover`} style={{ objectFit: "cover", width: "100%", height: "100%" }} />;
  return (
    <div className={`${dim} flex items-center justify-center`} style={{ background: "var(--paper-alt)", width: "100%", height: "100%" }}>
      <IconGlyph name={icon || fallback} size={size === "full" ? 34 : 20} className="glyph-muted" />
    </div>
  );
}

export function Modal({ onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto" style={{ background: "rgba(46,36,32,0.45)", zIndex: 50 }} onClick={onClose}>
      <div
        className={`modal-card w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:rounded-2xl min-h-full sm:min-h-0`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, body, confirmLabel = "Видалити", onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle size={22} style={{ color: "var(--plum)" }} className="shrink-0" />
          <div>
            <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>{title}</h3>
            {body && <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{body}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost" onClick={onCancel}>Скасувати</button>
          <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--paper-alt)", width: 64, height: 64 }}>
        <Icon size={28} style={{ color: "var(--plum)" }} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-xl mb-1" style={{ color: "var(--ink)" }}>{title}</h3>
      {hint && <p className="text-sm max-w-xs mb-5" style={{ color: "var(--ink-soft)" }}>{hint}</p>}
      {actionLabel && (
        <button className="btn-primary" onClick={onAction}>
          <Plus size={16} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
