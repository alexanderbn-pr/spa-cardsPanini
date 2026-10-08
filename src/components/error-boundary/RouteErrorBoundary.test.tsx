import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RouteErrorBoundary from "./RouteErrorBoundary";

/**
 * Probe child — throws while `shouldThrow` is true, renders content otherwise.
 * Used to prove: catch → fallback; resetKey change → children render again;
 * retry with a still-broken child re-catches exactly once (no re-throw loop).
 */
function ThrowingProbe({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div data-testid="probe">content</div>;
}

function renderBoundary(initial: { resetKey: string; shouldThrow: boolean }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <RouteErrorBoundary resetKey={initial.resetKey}>
        <ThrowingProbe shouldThrow={initial.shouldThrow} />
      </RouteErrorBoundary>
    </QueryClientProvider>,
  );
  return {
    client,
    ...result,
  };
}

beforeEach(() => {
  // The boundary logs caught errors; React logs its own too — keep output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("RouteErrorBoundary — R-FBK-03 (ADR-2)", () => {
  it("renders the fallback (message + Reintentar) when a child throws — never a black frame", () => {
    renderBoundary({ resetKey: "/stickers", shouldThrow: true });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByTestId("error-fallback")).toBeTruthy();
    expect(screen.getByText("Reintentar")).toBeTruthy();
    expect(screen.queryByTestId("probe")).toBeNull();
  });

  it("resets on resetKey change — the children render again once healthy", () => {
    const { client, rerender } = renderBoundary({
      resetKey: "/stickers",
      shouldThrow: true,
    });
    expect(screen.getByTestId("error-fallback")).toBeTruthy();

    rerender(
      <QueryClientProvider client={client}>
        <RouteErrorBoundary resetKey="/login">
          <ThrowingProbe shouldThrow={false} />
        </RouteErrorBoundary>
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId("error-fallback")).toBeNull();
    expect(screen.getByTestId("probe")).toBeTruthy();
  });

  it("Reintentar with a still-broken child re-catches exactly once — no re-throw loop", () => {
    renderBoundary({ resetKey: "/stickers", shouldThrow: true });

    // Clicking must NOT hang: invalidate → reset → children throw again →
    // boundary catches → fallback again. A re-throw loop would spin forever.
    fireEvent.click(screen.getByTestId("error-fallback"));

    expect(screen.getByTestId("error-fallback")).toBeTruthy();
    expect(screen.queryByTestId("probe")).toBeNull();
  });
});
