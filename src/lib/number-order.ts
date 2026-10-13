/**
 * R-ALB-04 / ADR-4 — ONE shared comparator for BOTH render paths (default
 * album + filtered grouped view). Module-scope collator: no hook, no
 * per-render instantiation.
 *
 * WHY numeric collation instead of the old `Number()` hybrid: `Number("3a")`
 * is NaN, so the hybrid fell back to `localeCompare` for alphanumeric pairs
 * and rendered "10" BEFORE "3a". `Intl.Collator({numeric:true})` walks digit
 * runs inside the string, giving natural order for padded ("001" < "003"),
 * unpadded ("2" < "10") AND alphanumeric ("3b" < "4" < "10") numbers alike.
 *
 * Locale variance (design R3): the RED pin in number-order.test.ts asserts
 * the EXACT sequence 1,2,3a,3b,4,10 — a CI locale drift fails loudly.
 */
const collator = new Intl.Collator(undefined, { numeric: true });

export const compareStickerNumber = (a: string, b: string): number =>
  collator.compare(a, b);
