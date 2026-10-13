import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PercentageBar from "./PercentageBar";

describe("PercentageBar — R-ALB-01 progress label from nested team checks", () => {
  it("displays the {checked}/{total} fraction and fills the track by percentage", () => {
    render(<PercentageBar checked={40} total={100} />);

    // WHY: totals only exist on GET /teams — the label must render exactly
    // the counts the caller computed from that ONE response.
    expect(screen.getByText("40/100")).toBeTruthy();
    expect(screen.getByTestId("percentage-fill").style.width).toBe("40%");
  });

  it("renders a partial fraction without rounding the label away", () => {
    render(<PercentageBar checked={3} total={8} />);

    expect(screen.getByText("3/8")).toBeTruthy();
    expect(screen.getByTestId("percentage-fill").style.width).toBe("37.5%");
  });

  it("stays at 0% instead of dividing by zero when there are no stickers", () => {
    render(<PercentageBar checked={0} total={0} />);

    expect(screen.getByText("0/0")).toBeTruthy();
    expect(screen.getByTestId("percentage-fill").style.width).toBe("0%");
  });
});
