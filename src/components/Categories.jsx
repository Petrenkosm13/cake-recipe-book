import React, { useState } from "react";
import { Settings2, Tag, Pencil, Trash2, Check, Plus, X } from "lucide-react";
import { Modal } from "./common";

export function CategoryChips({ categories, active, onSelect, onManage }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <button className={`chip ${active === "all" ? "chip-active" : ""}`} onClick={() => onSelect("all")}>Усі</button>
      {categories.map((c) => (
        <button key={c.id} className={`chip ${active === c.id ? "chip-active" : ""}`} onClick={() => onSelect(c.id)}>
          {c.name}
        </button>
      ))}
      <button className="chip chip-manage" onClick={onManage} title="Керувати категоріями">
        <Settings2 size={14} />
      </button>
    </div>
  );
}

export function CategoryManagerModal({ categories, onClose, onAdd, onRename, onDelete }) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>Категорії</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="space-y-2 mb-4">
          {categories.map((c) => (
            <div key={c.id} className="cat-row">
              {editing === c.id ? (
                <input className="cat-edit-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus />
              ) : (
                <span className="flex items-center gap-2"><Tag size={14} style={{ color: "var(--pistachio)" }} />{c.name}</span>
              )}
              <div className="flex gap-1">
                {editing === c.id ? (
                  <button className="icon-btn-sm" onClick={() => { onRename(c.id, editValue.trim() || c.name); setEditing(null); }}><Check size={14} /></button>
                ) : (
                  <button className="icon-btn-sm" onClick={() => { setEditing(c.id); setEditValue(c.name); }}><Pencil size={14} /></button>
                )}
                <button className="icon-btn-sm" onClick={() => onDelete(c.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Категорій ще немає.</p>}
        </div>
        <div className="flex gap-2">
          <input className="cat-edit-input flex-1" placeholder="Нова категорія…" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { onAdd(newName.trim()); setNewName(""); } }} />
          <button className="btn-primary" onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(""); } }}><Plus size={15} /></button>
        </div>
      </div>
    </Modal>
  );
}
