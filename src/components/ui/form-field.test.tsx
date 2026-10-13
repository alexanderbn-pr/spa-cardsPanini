import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./form-field";
import { Select } from "./select";

describe("FormField — R-CRT-08 label + control + inline error", () => {
  it("associates the label with the control and leaves aria untouched when there is no error", () => {
    render(
      <FormField label="Equipo" htmlFor="team">
        <Select id="team" aria-label="Equipo">
          <option value="">Selecciona equipo</option>
        </Select>
      </FormField>,
    );

    const control = screen.getByRole("combobox", { name: "Equipo" });
    expect(control.id).toBe("team");
    expect(control.getAttribute("aria-describedby")).toBeNull();
    expect(control.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the error beside the control (role=alert) and wires aria-describedby + aria-invalid", () => {
    render(
      <FormField label="Equipo" htmlFor="team" error="El equipo es obligatorio">
        <Select id="team" aria-label="Equipo">
          <option value="">Selecciona equipo</option>
        </Select>
      </FormField>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("El equipo es obligatorio");
    expect(alert.id).toBe("team-error");

    const control = screen.getByRole("combobox", { name: "Equipo" });
    expect(control.getAttribute("aria-describedby")).toBe("team-error");
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });
});
