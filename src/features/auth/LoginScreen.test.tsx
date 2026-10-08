import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import LoginScreen from "./LoginScreen";

const fetchMock = vi.fn();

function jsonResponse(status: number, statusText: string, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response;
}

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: password },
  });
}

function switchToRegister() {
  fireEvent.click(screen.getByRole("button", { name: "Regístrate" }));
}

function fillRegister(email: string, password: string, repeat: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Repetir contraseña"), {
    target: { value: repeat },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  localStorage.clear();
  useAuthStore.setState({ token: null, user: null });
  useUiStore.setState({ errorMessages: null });
});

describe("LoginScreen — R-AUTH-01 policy gate", () => {
  it("blocks a policy-violating password BEFORE any HTTP request (no digit → field errors only)", () => {
    render(<LoginScreen />);
    fillLogin("user@example.com", "Abcdefgh!");

    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/dígito/);
  });
});

describe("LoginScreen — R-AUTH-03 validation envelope mapping", () => {
  it("renders server 400 fieldErrors under the field and shows NO global modal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, "Bad Request", {
        message: "Validation error",
        errors: {
          formErrors: [],
          fieldErrors: { body: ["password: incorrecta"] },
        },
      }),
    );
    render(<LoginScreen />);
    fillLogin("user@example.com", "Secret1!");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Contraseña").getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(screen.getByRole("alert").textContent).toMatch(/incorrecta/);
    expect(useUiStore.getState().errorMessages).toBeNull();
  });

  it("routes a non-field 401 to the global error modal (wrong credentials)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, "Unauthorized", { message: "Credenciales inválidas" }),
    );
    render(<LoginScreen />);
    fillLogin("user@example.com", "Secret1!");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() =>
      expect(useUiStore.getState().errorMessages).toEqual([
        "Credenciales inválidas",
      ]),
    );
  });
});

describe("LoginScreen — R-AUTH-01 success path", () => {
  it("stores the session (memory + ligae-auth) and stops sending the form", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, "OK", { token: "aaa.bbb.ccc" }),
    );
    render(<LoginScreen />);
    fillLogin("user@example.com", "Secret1!");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() =>
      expect(useAuthStore.getState().token).toBe("aaa.bbb.ccc"),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        email: "user@example.com",
        password: "Secret1!",
      }),
    );
    expect(localStorage.getItem("ligae-auth")).toContain("aaa.bbb.ccc");
    expect(useAuthStore.getState().user?.email).toBe("user@example.com");
  });
});

describe("RegisterForm — R-AUTH-02 client-only passwordRepeat", () => {
  it("blocks a mismatched repeat BEFORE any HTTP request", () => {
    render(<LoginScreen />);
    switchToRegister();
    fillRegister("user@example.com", "Secret1!", "Secret2!");

    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/no coinciden/);
  });

  it("sends ONLY {email,password} on success and returns the user to login to sign in", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, "Created", { id: 1, email: "user@example.com" }),
    );
    render(<LoginScreen />);
    switchToRegister();
    fillRegister("user@example.com", "Secret1!", "Secret1!");

    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/register");
    expect(init.body).toBe(
      JSON.stringify({ email: "user@example.com", password: "Secret1!" }),
    );
    // back on login mode: the login submit button is back, repeat field is gone
    expect(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Repetir contraseña")).toBeNull();
  });

  it("surfaces the duplicate-email 500 backend bug through the GLOBAL modal, not inline (RK-6)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(500, "Internal Server Error", {
        message: "Internal server error",
      }),
    );
    render(<LoginScreen />);
    switchToRegister();
    fillRegister("taken@example.com", "Secret1!", "Secret1!");

    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    await waitFor(() =>
      expect(useUiStore.getState().errorMessages).toEqual([
        "Internal server error",
      ]),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
