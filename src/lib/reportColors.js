// Chart-mark colors for the Rapor dashboard, validated against this app's
// dark panel surface (#131c31) with the dataviz skill's
// scripts/validate_palette.js - see the commit message for the exact runs.
// These are deliberately separate from the app's UI accent/danger tokens in
// index.css: those are validated for small text/border use (badges, buttons),
// not for filled chart marks on a dark surface, which have their own
// lightness-band and contrast rules.

// Sequential (magnitude, one hue): category counts, monthly spend.
export const SEQUENTIAL = "#3987e5";

// Diverging pair (polarity: cari bakiye above/below zero).
export const DIVERGING_POSITIVE = "#3987e5"; // alacaklı (they owe us)
export const DIVERGING_NEGATIVE = "#e66767"; // borçlu (we owe them)

// Status palette (fixed roles, never themed) - used for payment status only.
export const STATUS = {
  odendi: "#0ca30c", // good
  kismi: "#fab219", // warning
  beklemede: "#ec835a", // serious
};
