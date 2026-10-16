import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select";

describe("Select — R-CRT-08 native styled control", () => {
  it("renders a NATIVE <select> with the option children (not a custom listbox)", () => {
    render(
      <Select aria-label="Equipo" defaultValue="">
        <option value="">Selecciona equipo</option>
        <option value="1">Barcelona</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Equipo" });
    // Native semantics — the label association rides on the real element.
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecciona equipo", "Barcelona"]);
  });

  it("is controlled: changing the value calls onChange with the selected option", () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Equipo" value="" onChange={onChange}>
        <option value="">Selecciona equipo</option>
        <option value="1">Barcelona</option>
      </Select>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Equipo" }), {
      target: { value: "1" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('variant="pill" applies the pill design tokens without the default chrome (R2, R7)', () => {
    render(
      <Select variant="pill" aria-label="Colecciones" defaultValue="1">
        <option value="1">Mundial 2022</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Colecciones" });
    for (const token of [
      "h-9",
      "rounded-full",
      "bg-primary",
      "px-lg",
      "text-sm",
      "font-bold",
      "text-primary-foreground",
      "tracking-[0.24px]",
      "whitespace-nowrap",
    ]) {
      expect(select.className).toContain(token);
    }
    // Empty CVA base: the pill must NOT inherit the default's heavy chrome
    // (shared base would leak these via twMerge non-conflict — design D1).
    expect(select.className).not.toContain("h-14");
    expect(select.className).not.toContain("w-full");
    expect(select.className).not.toContain("bg-black/40");
    expect(select.className).not.toContain("border");
  });
});
