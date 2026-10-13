import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { login, toInlineErrors, type InlineFieldErrors } from "./api";
import { CredentialsSchema } from "./schemas";
import RegisterForm from "./RegisterForm";

/**
 * Login screen + login⇄register mode toggle (local state, no dialog dependency —
 * design §5). Field errors come from `safeParse().flatten().fieldErrors` or the
 * server 400 envelope; anything else is routed to the global error modal.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <main className="grid min-h-svh place-items-center bg-background p-lg">
      <section className="w-full max-w-[400px] rounded-lg bg-surface-elevated p-xxl">
        <h1 className="mb-xl text-center text-2xl font-medium tracking-[-1%]">
          Stickers ligaE
        </h1>

        {mode === "login" ? (
          <LoginForm />
        ) : (
          <RegisterForm onRegistered={() => setMode("login")} />
        )}

        <p className="mt-lg text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="font-medium text-white underline underline-offset-4"
                onClick={() => setMode("register")}
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="font-medium text-white underline underline-offset-4"
                onClick={() => setMode("login")}
              >
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </section>
    </main>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<InlineFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = CredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const session = await login(parsed.data);
      useAuthStore.getState().setSession(session.token, session.user);
    } catch (error) {
      const inline = toInlineErrors(error);
      if (inline !== null) setErrors(inline);
      else if (error instanceof ApiError) {
        useUiStore.getState().openError(error.messages);
      } else throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md">
      {errors.form?.[0] ? (
        <p role="alert" className="text-sm text-danger">
          {errors.form[0]}
        </p>
      ) : null}

      <div className="flex flex-col gap-xs">
        <label htmlFor="login-email" className="text-sm text-muted-foreground">
          Email
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={errors.email !== undefined}
        />
        {errors.email?.[0] ? (
          <p role="alert" className="text-sm text-danger">
            {errors.email[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-xs">
        <label
          htmlFor="login-password"
          className="text-sm text-muted-foreground"
        >
          Contraseña
        </label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={errors.password !== undefined}
        />
        {errors.password?.[0] ? (
          <p role="alert" className="text-sm text-danger">
            {errors.password[0]}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="light"
        disabled={submitting}
        className="mt-sm h-12 w-full rounded-full font-semibold tracking-[0.24px]"
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
