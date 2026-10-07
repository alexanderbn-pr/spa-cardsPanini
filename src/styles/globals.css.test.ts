import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Reads the token layer as raw source: DESIGN conformance is a property of the
 * CSS (R-DSN-*), not of a rendered page — no DOM snapshot can drift here.
 *
 * NOTE: `import css from "./globals.css?raw"` returns an EMPTY string in this
 * project (Vitest jsdom + @tailwindcss/vite), so the file is read from disk.
 * `import.meta.url` is not a `file:` URL under jsdom → resolve via process.cwd().
 */
const css = fs.readFileSync(
  path.join(process.cwd(), "src/styles/globals.css"),
  "utf8",
);

describe("globals.css DESIGN token layer", () => {
  it("sets cobalt as the primary color so buttons/focus rings carry the brand identity (R-DSN-01)", () => {
    expect(css).toContain("--primary: #494fdf");
    expect(css).toContain("--ring: #494fdf");
    expect(css).toContain("--primary-foreground: #ffffff");
  });

  it("locks radii to the DESIGN scale 8/12/20/28 replacing the shadcn calc chain (R-DSN-02)", () => {
    expect(css).toContain("--radius-sm: 8px");
    expect(css).toContain("--radius-md: 12px");
    expect(css).toContain("--radius-lg: 20px");
    expect(css).toContain("--radius-xl: 28px");
  });

  it("exposes the DESIGN named spacing tokens so odd values get first-class utilities (R-DSN-02)", () => {
    expect(css).toContain("--spacing-xxs: 4px");
    expect(css).toContain("--spacing-md: 14px");
    expect(css).toContain("--spacing-section: 88px");
    expect(css).toContain("--spacing-band: 120px");
  });

  it("adds the xs 425px breakpoint for large-phone tweaks without touching Tailwind defaults (R-DSN-04)", () => {
    expect(css).toContain("--breakpoint-xs: 425px");
  });

  it("stays dark-only with a true-black canvas and no light-mode toggle (R-DSN-04)", () => {
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("--background: #000000");
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).not.toMatch(/\.light\b/);
  });
});
