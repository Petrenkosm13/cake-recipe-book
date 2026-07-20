import React, { useContext } from "react";
import { CurrencyContext } from "../context/CurrencyContext";
import { calcRecipeCost } from "../utils/units";
import { Thumb } from "./common";

export function RecipeCard({ recipe, products, categories, onOpen }) {
  const currency = useContext(CurrencyContext);
  const { perServing, lines } = calcRecipeCost(recipe, products);
  const hasCost = recipe.servings > 0 && lines.length > 0;
  const cats = categories.filter((c) => (recipe.categoryIds || []).includes(c.id));
  return (
    <div className="recipe-card" onClick={onOpen}>
      <div className="recipe-card-photo">
        <Thumb photo={recipe.photo} icon="ChefHat" />
        {hasCost && (
          <div className="cost-stamp">
            <span className="cost-stamp-value">{perServing.toFixed(0)}</span>
            <span className="cost-stamp-unit">{currency}/порц.</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-display text-base leading-snug" style={{ color: "var(--ink)" }}>{recipe.name || "Без назви"}</h4>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {cats.map((c) => (
              <span key={c.id} className="tag-pill">{c.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecipeGrid({ recipes, products, categories, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} products={products} categories={categories} onOpen={() => onOpen(r.id)} />
      ))}
    </div>
  );
}
