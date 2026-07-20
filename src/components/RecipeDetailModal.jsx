import React, { useState, useContext } from "react";
import { X, Pencil, Trash2, Users, Ruler, Percent } from "lucide-react";
import { CurrencyContext } from "../context/CurrencyContext";
import { UNIT_META, calcRecipeCost, money } from "../utils/units";
import { Modal, Thumb } from "./common";

export function RecipeDetailModal({ recipe, products, categories, onClose, onEdit, onDelete }) {
  const currency = useContext(CurrencyContext);
  const { lines, total, perServing } = calcRecipeCost(recipe, products);
  const [scaleMode, setScaleMode] = useState("servings");
  const [targetServings, setTargetServings] = useState(recipe.servings || 1);
  const [targetDiameter, setTargetDiameter] = useState(recipe.panDiameter || "");
  const [markup, setMarkup] = useState(recipe.markupPercent ?? 50);

  const canScaleByDiameter = Number(recipe.panDiameter) > 0;
  const factor =
    scaleMode === "diameter" && canScaleByDiameter && Number(targetDiameter) > 0
      ? Math.pow(Number(targetDiameter) / Number(recipe.panDiameter), 2)
      : scaleMode === "servings" && Number(recipe.servings) > 0
      ? Number(targetServings || 0) / Number(recipe.servings)
      : 1;

  const cats = categories.filter((c) => (recipe.categoryIds || []).includes(c.id));
  const sellingPerServing = perServing * (1 + Number(markup || 0) / 100);
  const profitPerServing = sellingPerServing - perServing;

  return (
    <Modal onClose={onClose} wide>
      <div className="max-h-[92vh] overflow-y-auto">
        <div className="recipe-detail-photo">
          <Thumb photo={recipe.photo} icon="ChefHat" />
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>{recipe.name || "Без назви"}</h2>
              {cats.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cats.map((c) => <span key={c.id} className="tag-pill">{c.name}</span>)}
                </div>
              )}
              {(recipe.panDiameter || recipe.servings) ? (
                <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
                  {recipe.panDiameter ? `Форма ${recipe.panDiameter} см · ` : ""}
                  {recipe.servings ? `${recipe.servings} порцій` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="btn-ghost" onClick={onEdit}><Pencil size={15} /> Редагувати</button>
              <button className="btn-danger-outline" onClick={onDelete}><Trash2 size={15} /></button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="section-label">Інгредієнти та собівартість</h3>
            {lines.length === 0 ? (
              <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>Інгредієнти ще не додані.</p>
            ) : (
              <div className="ledger mt-2">
                <div className="ledger-head">
                  <span>Продукт</span><span>К-сть</span><span className="text-right">Вартість</span>
                </div>
                {lines.map((l) => (
                  <div className="ledger-row" key={l.id}>
                    <span>{l.product ? l.product.name : `${l.productName || "продукт видалено"} ⚠`}</span>
                    <span className="font-mono text-sm">{l.amount} {UNIT_META[l.unit]?.label}</span>
                    <span className="font-mono text-sm text-right">{money(l.cost, currency)}</span>
                  </div>
                ))}
                <div className="ledger-total">
                  <span>Разом</span><span></span>
                  <span className="font-mono text-right">{money(total, currency)}</span>
                </div>
                {recipe.servings > 0 && (
                  <div className="ledger-total ledger-total-sub">
                    <span>Собівартість 1 порції</span><span></span>
                    <span className="font-mono text-right">{money(perServing, currency)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {lines.length > 0 && Number(recipe.servings) > 0 && (
            <div className="mt-7 panel">
              <h3 className="section-label flex items-center gap-2"><Users size={15} /> Масштабування партії</h3>
              <div className="flex items-center gap-2 mt-3">
                <button className={`seg ${scaleMode === "servings" ? "seg-active" : ""}`} onClick={() => setScaleMode("servings")}>За порціями</button>
                <button
                  className={`seg ${scaleMode === "diameter" ? "seg-active" : ""} ${!canScaleByDiameter ? "seg-disabled" : ""}`}
                  onClick={() => canScaleByDiameter && setScaleMode("diameter")}
                  title={!canScaleByDiameter ? "Вкажіть діаметр форми у рецепті, щоб масштабувати так" : ""}
                >
                  <Ruler size={13} className="inline mr-1" />За діаметром форми
                </button>
              </div>
              {scaleMode === "servings" ? (
                <label className="field mt-3">
                  <span>Потрібна кількість порцій</span>
                  <input type="number" min="1" step="1" value={targetServings} onChange={(e) => setTargetServings(e.target.value)} />
                </label>
              ) : (
                <label className="field mt-3">
                  <span>Новий діаметр форми, см (базовий: {recipe.panDiameter} см)</span>
                  <input type="number" min="1" step="1" value={targetDiameter} onChange={(e) => setTargetDiameter(e.target.value)} />
                </label>
              )}
              <div className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
                Коефіцієнт масштабування: <span className="font-mono" style={{ color: "var(--ink)" }}>×{factor > 0 ? factor.toFixed(2) : "0"}</span>
              </div>
              <div className="ledger mt-3">
                {lines.map((l) => (
                  <div className="ledger-row" key={l.id}>
                    <span>{l.product ? l.product.name : "—"}</span>
                    <span className="font-mono text-sm">{(Number(l.amount || 0) * factor).toFixed(1)} {UNIT_META[l.unit]?.label}</span>
                    <span className="font-mono text-sm text-right">{money(l.cost * factor, currency)}</span>
                  </div>
                ))}
                <div className="ledger-total">
                  <span>Разом на партію</span><span></span>
                  <span className="font-mono text-right">{money(total * factor, currency)}</span>
                </div>
              </div>
            </div>
          )}

          {lines.length > 0 && Number(recipe.servings) > 0 && (
            <div className="mt-6 panel">
              <h3 className="section-label flex items-center gap-2"><Percent size={15} /> Ціна продажу</h3>
              <label className="field mt-3">
                <span>Націнка, %</span>
                <input type="number" min="0" step="1" value={markup} onChange={(e) => setMarkup(e.target.value)} />
              </label>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="stat-box">
                  <span className="stat-label">Собівартість</span>
                  <span className="stat-value">{money(perServing, currency)}</span>
                </div>
                <div className="stat-box stat-box-accent">
                  <span className="stat-label">Ціна продажу</span>
                  <span className="stat-value">{money(sellingPerServing, currency)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Прибуток / порція</span>
                  <span className="stat-value">{money(profitPerServing, currency)}</span>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>Цінові показники — на 1 порцію, за базовим рецептом (без масштабування).</p>
            </div>
          )}

          {recipe.steps && (
            <div className="mt-7">
              <h3 className="section-label">Приготування</h3>
              <div className="text-sm leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: "var(--ink)" }}>{recipe.steps}</div>
            </div>
          )}
          {recipe.notes && (
            <div className="mt-6">
              <h3 className="section-label">Примітки</h3>
              <div className="text-sm leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>{recipe.notes}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
