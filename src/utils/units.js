export const UNIT_META = {
  g: { label: "г", type: "weight", toBase: 1 },
  kg: { label: "кг", type: "weight", toBase: 1000 },
  ml: { label: "мл", type: "volume", toBase: 1 },
  l: { label: "л", type: "volume", toBase: 1000 },
  pcs: { label: "шт", type: "piece", toBase: 1 },
};
export const UNITS_BY_TYPE = { weight: ["g", "kg"], volume: ["ml", "l"], piece: ["pcs"] };
export const TYPE_LABEL = { weight: "вага (г / кг)", volume: "об'єм (мл / л)", piece: "штучний" };
export const BASE_UNIT_LABEL = { weight: "г", volume: "мл", piece: "шт" };
export const BIG_UNIT = { weight: "kg", volume: "l", piece: "pcs" };
export const BIG_UNIT_LABEL = { weight: "кг", volume: "л", piece: "шт" };
export const ICON_CHOICES = ["Wheat", "Milk", "Egg", "Droplet", "Package", "Cookie"];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function pricePerBase(product) {
  if (!product) return 0;
  const meta = UNIT_META[product.packageUnit];
  const baseAmount = Number(product.packageAmount || 0) * meta.toBase;
  if (!baseAmount) return 0;
  return Number(product.price || 0) / baseAmount;
}

export function formatUnitPrice(product, currency) {
  const big = BIG_UNIT[product.unitType];
  const label = BIG_UNIT_LABEL[product.unitType];
  const perBig = pricePerBase(product) * UNIT_META[big].toBase;
  return `${perBig.toFixed(2)} ${currency}/${label}`;
}

export function ingredientCost(ing, product) {
  if (!product) return 0;
  const meta = UNIT_META[ing.unit];
  if (!meta) return 0;
  const baseAmount = Number(ing.amount || 0) * meta.toBase;
  return baseAmount * pricePerBase(product);
}

export function calcRecipeCost(recipe, products) {
  let total = 0;
  const lines = (recipe.ingredients || []).map((ing) => {
    const product = products.find((p) => p.id === ing.productId);
    const cost = product ? ingredientCost(ing, product) : 0;
    total += cost;
    return { ...ing, product, cost };
  });
  const servings = Number(recipe.servings || 0);
  const perServing = servings > 0 ? total / servings : 0;
  return { lines, total, perServing };
}

export function money(n, currency) {
  const v = Number(n || 0);
  return `${v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function resizeImageFile(file, maxDim = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
