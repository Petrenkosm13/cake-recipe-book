import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, ImagePlus, Check } from "lucide-react";
import { UNIT_META, UNITS_BY_TYPE, uid, resizeImageFile } from "../utils/units";
import { Modal, Thumb } from "./common";

export function IngredientRow({ row, products, onChange, onRemove, onQuickAddProduct }) {
  const product = products.find((p) => p.id === row.productId);
  const unitOptions = product ? UNITS_BY_TYPE[product.unitType] : ["g", "kg", "ml", "l", "pcs"];
  return (
    <div className="ing-row">
      <select
        className="ing-select"
        value={row.productId === "" || row.productId == null ? "" : String(row.productId)}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "__new__") { onQuickAddProduct(row.id); return; }
          if (val === "") { onChange(row.id, { productId: "", productName: "" }); return; }
          const p = products.find((pp) => String(pp.id) === val);
          if (!p) return;
          onChange(row.id, { productId: p.id, productName: p.name, unit: UNITS_BY_TYPE[p.unitType][0] });
        }}
      >
        <option value="">Оберіть продукт…</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="__new__">+ Новий продукт…</option>
      </select>
      <input
        className="ing-amount"
        type="number" min="0" step="any" placeholder="0"
        value={row.amount}
        onChange={(e) => onChange(row.id, { amount: e.target.value })}
      />
      <select className="ing-unit" value={row.unit} onChange={(e) => onChange(row.id, { unit: e.target.value })}>
        {unitOptions.map((u) => <option key={u} value={u}>{UNIT_META[u].label}</option>)}
      </select>
      <button className="ing-remove" onClick={() => onRemove(row.id)} title="Прибрати"><Minus size={15} /></button>
    </div>
  );
}

export function RecipeFormModal({ initial, products, categories, onSave, onClose, onQuickAddProduct, autoAssign, onAutoAssigned }) {
  const [name, setName] = useState(initial?.name || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [categoryIds, setCategoryIds] = useState(initial?.categoryIds || []);
  const [servings, setServings] = useState(initial?.servings ?? 8);
  const [panDiameter, setPanDiameter] = useState(initial?.panDiameter || "");
  const [markupPercent, setMarkupPercent] = useState(initial?.markupPercent ?? 50);
  const [steps, setSteps] = useState(initial?.steps || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [ingredients, setIngredients] = useState(initial?.ingredients?.length ? initial.ingredients : [{ id: uid(), productId: "", amount: "", unit: "g" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const toggleCategory = (id) => setCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  const updateIng = (id, patch) => setIngredients((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  const removeIng = (id) => setIngredients((prev) => prev.filter((r) => r.id !== id));
  const addIng = () => setIngredients((prev) => [...prev, { id: uid(), productId: "", amount: "", unit: "g" }]);

  useEffect(() => {
    if (!autoAssign) return;
    const product = products.find((p) => p.id === autoAssign.productId);
    if (!product) return;
    setIngredients((prev) => prev.map((r) => (r.id === autoAssign.rowId ? { ...r, productId: product.id, productName: product.name, unit: UNITS_BY_TYPE[product.unitType][0] } : r)));
    onAutoAssigned();
  }, [autoAssign]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await resizeImageFile(file)); } catch { /* ignore */ }
  };

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        photo,
        categoryIds,
        servings: Number(servings || 0),
        panDiameter: panDiameter ? Number(panDiameter) : null,
        markupPercent: Number(markupPercent || 0),
        steps,
        notes,
        ingredients: ingredients.filter((r) => r.productId && Number(r.amount) > 0),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>{initial ? "Редагувати рецепт" : "Новий рецепт"}</h2>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-4 items-start">
            <button className="photo-picker" onClick={() => fileRef.current?.click()} type="button">
              <Thumb photo={photo} icon="ChefHat" />
              <div className="photo-picker-overlay"><ImagePlus size={16} /></div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            <div className="flex-1">
              <label className="field">
                <span>Назва рецепта *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Медовик класичний" />
              </label>
            </div>
          </div>

          <div>
            <span className="field-label">Категорії</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {categories.map((c) => (
                <button key={c.id} type="button" className={`chip ${categoryIds.includes(c.id) ? "chip-active" : ""}`} onClick={() => toggleCategory(c.id)}>
                  {c.name}
                </button>
              ))}
              {categories.length === 0 && <span className="text-sm" style={{ color: "var(--ink-soft)" }}>Категорій ще немає — додайте через "Керувати категоріями".</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="field">
              <span>Кількість порцій</span>
              <input type="number" min="0" step="1" value={servings} onChange={(e) => setServings(e.target.value)} />
            </label>
            <label className="field">
              <span>Діаметр форми, см (необов'язково)</span>
              <input type="number" min="0" step="1" value={panDiameter} onChange={(e) => setPanDiameter(e.target.value)} />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="field-label">Інгредієнти</span>
              <button type="button" className="btn-ghost-sm" onClick={addIng}><Plus size={13} /> Рядок</button>
            </div>
            <div className="ing-head">
              <span>Продукт</span><span>К-сть</span><span>Од.</span><span></span>
            </div>
            <div className="space-y-2 mt-1">
              {ingredients.map((row) => (
                <IngredientRow key={row.id} row={row} products={products} onChange={updateIng} onRemove={removeIng} onQuickAddProduct={onQuickAddProduct} />
              ))}
            </div>
          </div>

          <label className="field">
            <span>Націнка за замовчуванням, %</span>
            <input type="number" min="0" step="1" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} />
          </label>

          <label className="field">
            <span>Приготування</span>
            <textarea rows={5} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Опишіть кроки приготування…" />
          </label>

          <label className="field">
            <span>Примітки</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необов'язково" />
          </label>

          {error && <div className="auth-error">{error}</div>}
        </div>
        <div className="p-6 pt-0 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button className="btn-primary" disabled={!canSave} onClick={handleSave}><Check size={16} /> {saving ? "Зберігаємо…" : "Зберегти рецепт"}</button>
        </div>
      </div>
    </Modal>
  );
}
