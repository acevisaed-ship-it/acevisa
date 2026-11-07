export type Tier = { minGross: number; maxGross: number | null; rate: number }
/** Rate for a gross amount from a tier table (first tier whose range contains gross). */
export function tierRate(gross: number, tiers: Tier[]): number {
  const t = [...tiers].sort((a, b) => a.minGross - b.minGross)
    .filter((x) => gross >= x.minGross && (x.maxGross == null || gross < x.maxGross))
  return t.length ? t[t.length - 1].rate : 0
}
