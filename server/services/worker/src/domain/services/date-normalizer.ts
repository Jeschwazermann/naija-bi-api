// ✅ Best Practice: Nigerian CSV exports default to dd/mm/yyyy, not the US
// mm/dd/yyyy — assuming US format silently swaps day and month for any date
// where the day is <= 12, which is a very hard bug to notice later.
export function parseNigerianDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // ISO format: 2024-06-09
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  // dd/mm/yyyy or dd-mm-yyyy (Nigerian default)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const [, day, month, yearRaw] = dmyMatch;
    const year = yearRaw.length === 2 ? Number(`20${yearRaw}`) : Number(yearRaw);
    const dayNum = Number(day);
    const monthNum = Number(month);
    if (monthNum > 12 || dayNum > 31) return null;
    return new Date(Date.UTC(year, monthNum - 1, dayNum));
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
