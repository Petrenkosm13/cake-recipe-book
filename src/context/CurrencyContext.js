import { createContext } from "react";

export const CurrencyContext = createContext("₴");

export const CURRENCY_PRESETS = [
  { code: "UAH", symbol: "₴" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "PLN", symbol: "zł" },
];
