// ✅ Best Practice: money is stored as an integer (kobo) everywhere past
// this point — floats introduce rounding drift over millions of rows.
// Handles: "₦1,200.50", "1200.50", "NGN 1,200", "1200", empty/invalid.
export function parseNairaAmountToKobo(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return Math.round(raw * 100);

  const cleaned = raw
    .toString()
    .replace(/₦/g, '')
    .replace(/NGN/gi, '')
    .replace(/,/g, '')
    .trim();

  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}
