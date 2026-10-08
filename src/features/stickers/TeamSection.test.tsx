import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import TeamSection from "./TeamSection";
import type { Sticker, Team } from "@/types/api";

function makeSticker(id: number, check: boolean): Sticker {
  return {
    id,
    number: String(id).padStart(3, "0"),
    name: `Sticker ${id}`,
    positionId: null,
    position: null,
    check,
    quantity: check ? 1 : 0,
  };
}

function makeTeam(stickers: Sticker[]): Team {
  return { id: 7, name: "Real Madrid", stickers };
}

function renderSection(team: Team) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <TeamSection team={team} />
    </Wrapper>,
  );
}

function partialTeam(): Team {
  // 3 checked out of 8 → R-ALB-02's "3/8" scenario
  return makeTeam([
    makeSticker(1, true),
    makeSticker(2, true),
    makeSticker(3, true),
    makeSticker(4, false),
    makeSticker(5, false),
    makeSticker(6, false),
    makeSticker(7, false),
    makeSticker(8, false),
  ]);
}

describe("TeamSection — R-ALB-02 team header counts", () => {
  it("shows the team name, its id and its own {checked}/{total} fraction", () => {
    renderSection(partialTeam());

    expect(screen.getByText("Real Madrid")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    // WHY: counts are per-team, not global — 3 of THIS team's 8 are checked.
    expect(screen.getByText("3/8")).toBeTruthy();
  });
});

describe("TeamSection — R-ALB-03 completed badge", () => {
  it("replaces the counts with a green rounded 'Completed' pill when every sticker is checked", () => {
    const done = makeTeam([makeSticker(1, true), makeSticker(2, true)]);

    renderSection(done);

    const badge = screen.getByText("Completed");
    expect(badge.className).toContain("border-success");
    expect(badge.className).toContain("rounded-full");
    expect(screen.queryByText("2/2")).toBeNull();
  });

  it("keeps the counts and shows NO badge while any sticker is unchecked", () => {
    renderSection(partialTeam());

    expect(screen.getByText("3/8")).toBeTruthy();
    expect(screen.queryByText("Completed")).toBeNull();
  });
});

describe("TeamSection — R-ALB-04 ordering with UNPADDED numbers (verify V1)", () => {
  // WHY: the pinned OpenAPI types `number` as a plain string (example "001")
  // with no padding constraint — a lexicographic sort would render 1, 10, 2.
  it("sorts numerically 1, 2, 10 instead of lexicographically 1, 10, 2", () => {
    const unpadded = makeTeam([
      { ...makeSticker(10, false), number: "10", name: "Diez" },
      { ...makeSticker(1, false), number: "1", name: "Uno" },
      { ...makeSticker(2, false), number: "2", name: "Dos" },
    ]);

    renderSection(unpadded);

    const labels = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Sticker 1 Uno",
      "Sticker 2 Dos",
      "Sticker 10 Diez",
    ]);
  });
});
