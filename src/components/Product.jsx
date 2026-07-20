import React, { useState, useEffect, useContext, useRef } from "react";
import { History, ImagePlus, Check, Trash2, X } from "lucide-react";
import { api } from "../api";
import { CurrencyContext } from "../context/CurrencyContext";
import {
  UNIT_META, UNITS_BY_TYPE, TYPE_LABEL, BASE_UNIT_LABEL, ICON_CHOICES,
  pricePerBase, formatUnitPrice, money, resizeImageFile,
} from "../utils/units";
import { Modal, Thumb, IconGlyph } from "./common";

export function ProductCard({ product, onOpen, onHistory }) {
  const currency = useContext(CurrencyContext);
  return (
    <div className="product-card" onClick={onOpen}>
      <div className="product-card-photo"><Thumb photo={product.photo} icon={product.icon} /></div>
      <div className="p-3">
        <h4 className="font-display text-base leading-snug" style={{ color: "var(--ink)" }}>{product.name}</h4>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-sm" style={{ color: "var(--plum)" }}>{formatUnitPrice(product, currency)}</span>
          <button className="icon-btn-sm" onClick={(e) => { e.stopPropagation(); onHistory(); }} title="Історія цін">
            <History size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, onOpen, onHistory }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 pt-1">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onOpen={() => onOpen(p.id)} onHistory={() => onHistory(p.id)} />
      ))}
    </div>
  );
}

export function ProductFormModal({ initial, onSave, onClose, onDelete }) {
  const currency = useContext(CurrencyContext);
  const [name, setName] = useState(initial?.name || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [icon, setIcon] = useState(initial?.icon || "Package");
  const [unitType, setUnitType] = useState(initial?.unitType || "weight");
  const [packageAmount, setPackageAmount] = useState(initial?.packageAmount ?? 1);
  const [packageUnit, setPackageUnit] = useState(initial?.packageUnit || "kg");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!UNITS_BY_TYPE[unitType].includes(packageUnit)) setPackageUnit(UNITS_BY_TYPE[unitType][0]);
  }, [unitType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await resizeImageFile(file)); } catch { /* ignore */ }
  };

  const canSave = name.trim().length > 0 && Number(packageAmount) > 0 && Number(price) >= 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        photo,
        icon,
        unitType,
        packageAmount: Number(packageAmount),
        packageUnit,
        price: Number(price),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const preview = { unitType, packageAmount: Number(packageAmount || 0), packageUnit, price: Number(price || 0) };

  return (
    <Modal onClose={onClose}>
      <div className="max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>{initial ? "Редагувати продукт" : "Новий продукт"}</h2>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-4 items-start">
            <button className="photo-picker" onClick={() => fileRef.current?.click()} type="button">
              <Thumb photo={photo} icon={icon} />
              <div className="photo-picker-overlay"><ImagePlus size={16} /></div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            <div className="flex-1">
              <label className="field">
                <span>Назва продукту *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Вершки 33%" />
              </label>
            </div>
          </div>

          {!photo && (
            <div>
              <span className="field-label">Значок (якщо без фото)</span>
              <div className="flex gap-2 mt-1.5">
                {ICON_CHOICES.map((ic) => (
                  <button key={ic} type="button" className={`icon-choice ${icon === ic ? "icon-choice-active" : ""}`} onClick={() => setIcon(ic)}>
                    <IconGlyph name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="field">
            <span>Тип одиниці</span>
            <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
              {Object.keys(TYPE_LABEL).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="field col-span-1">
              <span>Упаковка</span>
              <input type="number" min="0" step="any" value={packageAmount} onChange={(e) => setPackageAmount(e.target.value)} />
            </label>
            <label className="field col-span-1">
              <span>Одиниця</span>
              <select value={packageUnit} onChange={(e) => setPackageUnit(e.target.value)}>
                {UNITS_BY_TYPE[unitType].map((u) => <option key={u} value={u}>{UNIT_META[u].label}</option>)}
              </select>
            </label>
            <label className="field col-span-1">
              <span>Ціна, {currency}</span>
              <input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>

          {Number(preview.price) > 0 && Number(preview.packageAmount) > 0 && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "var(--paper-alt)", color: "var(--ink-soft)" }}>
              Розрахунково: <span className="font-mono" style={{ color: "var(--plum)" }}>{formatUnitPrice(preview, currency)}</span>
              {" · "}{(pricePerBase(preview)).toFixed(4)} {currency}/{BASE_UNIT_LABEL[unitType]}
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
        </div>
        <div className="p-6 pt-0 flex items-center justify-between gap-2">
          {initial ? (
            <button className="btn-danger-outline" onClick={onDelete}><Trash2 size={15} /> Видалити</button>
          ) : <span />}
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Скасувати</button>
            <button className="btn-primary" disabled={!canSave} onClick={handleSave}><Check size={16} /> {saving ? "Зберігаємо…" : "Зберегти"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function PriceHistoryModal({ productId, productName, onClose }) {
  const currency = useContext(CurrencyContext);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.productHistory(productId).then((d) => setRows(d.history)).catch((e) => setError(e.message));
  }, [productId]);

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>Історія цін · {productName}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {rows === null && !error && <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Завантаження…</p>}
        {rows && (
          <div className="ledger">
            <div className="ledger-head"><span>Дата</span><span>Упаковка</span><span className="text-right">Ціна</span></div>
            {[...rows].reverse().map((h, i) => (
              <div className="ledger-row" key={i}>
                <span className="text-sm">{new Date(h.date).toLocaleDateString("uk-UA")}</span>
                <span className="font-mono text-sm">{h.packageAmount} {UNIT_META[h.packageUnit]?.label}</span>
                <span className="font-mono text-sm text-right">{money(h.price, currency)}</span>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm py-3 px-3" style={{ color: "var(--ink-soft)" }}>Історії ще немає.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
