import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, ChefHat, ShoppingBasket, MailWarning } from "lucide-react";
import { api } from "./api";
import { UserMenu } from "./components/Auth";
import { CategoryChips, CategoryManagerModal } from "./components/Categories";
import { RecipeGrid } from "./components/RecipeCard";
import { RecipeDetailModal } from "./components/RecipeDetailModal";
import { RecipeFormModal } from "./components/RecipeFormModal";
import { ProductGrid, ProductFormModal, PriceHistoryModal } from "./components/Product";
import { EmptyState, ConfirmModal } from "./components/common";

export default function CakeRecipeBook({ user, onUpdateUser, onLogout, flash }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [tab, setTab] = useState("recipes");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [recipeFormState, setRecipeFormState] = useState(null);
  const [productFormState, setProductFormState] = useState(null);
  const [historyProductId, setHistoryProductId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [pendingIngredientRowId, setPendingIngredientRowId] = useState(null);
  const [autoAssign, setAutoAssign] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, r] = await Promise.all([api.categories(), api.products(), api.recipes()]);
        setCategories(c.categories);
        setProducts(p.products);
        setRecipes(r.recipes);
      } catch (e) {
        setLoadError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  const openRecipe = useMemo(() => recipes.find((r) => r.id === openRecipeId) || null, [recipes, openRecipeId]);
  const historyProduct = useMemo(() => products.find((p) => p.id === historyProductId) || null, [products, historyProductId]);
  const editingProduct = productFormState && productFormState !== "new" ? productFormState : null;
  const editingRecipe = recipeFormState && recipeFormState !== "new" ? recipeFormState : null;

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (activeCategory !== "all" && !(r.categoryIds || []).includes(activeCategory)) return false;
      if (!q) return true;
      if (r.name?.toLowerCase().includes(q)) return true;
      const catMatch = categories.some((c) => (r.categoryIds || []).includes(c.id) && c.name.toLowerCase().includes(q));
      if (catMatch) return true;
      return (r.ingredients || []).some((ing) => {
        const p = products.find((pp) => pp.id === ing.productId);
        return p && p.name.toLowerCase().includes(q);
      });
    });
  }, [recipes, query, activeCategory, categories, products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const saveRecipe = async (payload) => {
    const { recipe } = payload.id ? await api.updateRecipe(payload.id, payload) : await api.createRecipe(payload);
    setRecipes((prev) => (payload.id ? prev.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...prev]));
    setRecipeFormState(null);
    setOpenRecipeId(recipe.id);
  };

  const saveProduct = async (payload) => {
    const { product } = payload.id ? await api.updateProduct(payload.id, payload) : await api.createProduct(payload);
    setProducts((prev) => (payload.id ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev]));
    setProductFormState(null);
    if (pendingIngredientRowId) {
      setAutoAssign({ rowId: pendingIngredientRowId, productId: product.id });
      setPendingIngredientRowId(null);
    }
  };

  const deleteRecipe = async (id) => {
    await api.deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setConfirmDialog(null);
    setOpenRecipeId(null);
  };
  const deleteProduct = async (id) => {
    await api.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setConfirmDialog(null);
    setProductFormState(null);
  };
  const addCategory = async (name) => {
    const { category } = await api.createCategory({ name });
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name, "uk")));
  };
  const renameCategory = async (id, name) => {
    const { category } = await api.renameCategory(id, { name });
    setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
  };
  const deleteCategory = async (id) => {
    await api.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setRecipes((prev) => prev.map((r) => ({ ...r, categoryIds: (r.categoryIds || []).filter((cid) => cid !== id) })));
    if (activeCategory === id) setActiveCategory("all");
    setConfirmDialog(null);
  };

  const resendVerification = async () => {
    setResendState("sending");
    try {
      await api.resendVerification();
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="text-sm animate-pulse" style={{ color: "var(--ink-soft)" }}>Завантаження книги рецептів…</div></div>;
  }
  if (loadError) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="auth-error">{loadError}</div></div>;
  }

  return (
    <div className="app-shell">
      <header className="px-5 sm:px-8 pt-7 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl" style={{ color: "var(--plum-dark)" }}>Кондитерська книга</h1>
            <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>рецепти · собівартість · калькуляція ціни</p>
          </div>
          <UserMenu user={user} onUpdate={onUpdateUser} onLogout={onLogout} />
        </div>

        {flash && <div className={`auth-flash ${flash.type === "error" ? "auth-flash-error" : "auth-flash-success"}`} style={{ marginTop: 14 }}>{flash.text}</div>}

        {!user.emailVerified && (
          <div className="verify-banner">
            <span className="flex items-center gap-2"><MailWarning size={16} /> Підтвердіть email, щоб убезпечити акаунт.</span>
            {resendState === "sent" ? (
              <span className="text-sm">Лист надіслано, перевірте пошту ✓</span>
            ) : (
              <button className="btn-ghost-sm" onClick={resendVerification} disabled={resendState === "sending"}>
                {resendState === "sending" ? "Надсилаємо…" : resendState === "error" ? "Не вийшло, спробувати ще раз" : "Надіслати лист ще раз"}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 mt-6 tab-row">
          <button className={`tab-btn ${tab === "recipes" ? "tab-btn-active" : ""}`} onClick={() => { setTab("recipes"); setQuery(""); }}>Рецепти</button>
          <button className={`tab-btn ${tab === "products" ? "tab-btn-active" : ""}`} onClick={() => { setTab("products"); setQuery(""); }}>Каталог продуктів</button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="search-box">
            <Search size={16} className="shrink-0" style={{ color: "var(--ink-soft)" }} />
            <input placeholder={tab === "recipes" ? "Пошук за назвою, категорією чи інгредієнтом…" : "Пошук продукту…"} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn-primary shrink-0" onClick={() => (tab === "recipes" ? setRecipeFormState("new") : setProductFormState("new"))}>
            <Plus size={16} /> <span className="hidden sm:inline">{tab === "recipes" ? "Новий рецепт" : "Новий продукт"}</span>
          </button>
        </div>

        {tab === "recipes" && (
          <div className="mt-4">
            <CategoryChips categories={categories} active={activeCategory} onSelect={setActiveCategory} onManage={() => setShowCategoryManager(true)} />
          </div>
        )}
      </header>

      <main className="px-5 sm:px-8 pb-16">
        {tab === "recipes" ? (
          filteredRecipes.length === 0 ? (
            recipes.length === 0 ? (
              <EmptyState icon={ChefHat} title="Тут поки порожньо" hint="Додайте свій перший рецепт торта чи тістечка, щоб почати рахувати собівартість." actionLabel="Новий рецепт" onAction={() => setRecipeFormState("new")} />
            ) : (
              <EmptyState icon={Search} title="Нічого не знайдено" hint="Спробуйте інший запит або скиньте фільтр категорії." />
            )
          ) : (
            <RecipeGrid recipes={filteredRecipes} products={products} categories={categories} onOpen={setOpenRecipeId} />
          )
        ) : filteredProducts.length === 0 ? (
          products.length === 0 ? (
            <EmptyState icon={ShoppingBasket} title="Каталог порожній" hint="Додайте продукти з цінами — вони знадобляться для розрахунку собівартості рецептів." actionLabel="Новий продукт" onAction={() => setProductFormState("new")} />
          ) : (
            <EmptyState icon={Search} title="Нічого не знайдено" />
          )
        ) : (
          <ProductGrid products={filteredProducts} onOpen={(id) => setProductFormState(products.find((p) => p.id === id))} onHistory={setHistoryProductId} />
        )}
      </main>

      {openRecipe && (
        <RecipeDetailModal
          recipe={openRecipe}
          products={products}
          categories={categories}
          onClose={() => setOpenRecipeId(null)}
          onEdit={() => { setRecipeFormState(openRecipe); setOpenRecipeId(null); }}
          onDelete={() => setConfirmDialog({ type: "recipe", id: openRecipe.id, name: openRecipe.name })}
        />
      )}

      {recipeFormState && (
        <RecipeFormModal
          key={editingRecipe ? editingRecipe.id : "new-recipe"}
          initial={editingRecipe}
          products={products}
          categories={categories}
          onSave={saveRecipe}
          onClose={() => setRecipeFormState(null)}
          onQuickAddProduct={(rowId) => { setPendingIngredientRowId(rowId); setProductFormState("new"); }}
          autoAssign={autoAssign}
          onAutoAssigned={() => setAutoAssign(null)}
        />
      )}

      {productFormState && (
        <ProductFormModal
          key={editingProduct ? editingProduct.id : "new-product"}
          initial={editingProduct}
          onSave={saveProduct}
          onClose={() => { setProductFormState(null); setPendingIngredientRowId(null); }}
          onDelete={() => setConfirmDialog({ type: "product", id: editingProduct.id, name: editingProduct.name })}
        />
      )}

      {historyProduct && <PriceHistoryModal productId={historyProduct.id} productName={historyProduct.name} onClose={() => setHistoryProductId(null)} />}

      {showCategoryManager && (
        <CategoryManagerModal categories={categories} onClose={() => setShowCategoryManager(false)} onAdd={addCategory} onRename={renameCategory} onDelete={(id) => setConfirmDialog({ type: "category", id })} />
      )}

      {confirmDialog?.type === "recipe" && (
        <ConfirmModal title={`Видалити рецепт «${confirmDialog.name}»?`} onConfirm={() => deleteRecipe(confirmDialog.id)} onCancel={() => setConfirmDialog(null)} />
      )}
      {confirmDialog?.type === "product" && (
        <ConfirmModal title={`Видалити продукт «${confirmDialog.name}»?`} body="Якщо продукт використовується в рецептах, їх собівартість перестане враховувати цей інгредієнт." onConfirm={() => deleteProduct(confirmDialog.id)} onCancel={() => setConfirmDialog(null)} />
      )}
      {confirmDialog?.type === "category" && (
        <ConfirmModal title="Видалити категорію?" body="Категорію буде прибрано з усіх рецептів, які її використовували." onConfirm={() => deleteCategory(confirmDialog.id)} onCancel={() => setConfirmDialog(null)} />
      )}
    </div>
  );
}
