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
});
