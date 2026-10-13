import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui";
import { register, toInlineErrors, type InlineFieldErrors } from "./api";
import { RegisterSchema } from "./schemas";

interface RegisterFormProps {
  /** R-AUTH-02: on success the user returns to login to sign in (no auto-login). */
  onRegistered: () => void;
}

/**
 * Register form: email + password + "repetir contraseña". Equality is a CLIENT
 * rule via `RegisterSchema.refine` — the request body is `{email,password}` ONLY.
 */
export default function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [errors, setErrors] = useState<InlineFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = RegisterSchema.safeParse({
      email,
      password,
      passwordRepeat,
    });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await register(parsed.data);
      onRegistered();
    } catch (error) {
      const inline = toInlineErrors(error);
      if (inline !== null) setErrors(inline);
      else if (error instanceof ApiError) {
        // duplicate-email 500 (documented backend bug) lands here → global modal
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
        <label htmlFor="reg-email" className="text-sm text-muted-foreground">
          Email
        </label>
        <Input
          id="reg-email"
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
        <label htmlFor="reg-password" className="text-sm text-muted-foreground">
          Contraseña
        </label>
        <Input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
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

      <div className="flex flex-col gap-xs">
        <label
          htmlFor="reg-password-repeat"
          className="text-sm text-muted-foreground"
        >
          Repetir contraseña
        </label>
        <Input
          id="reg-password-repeat"
          name="passwordRepeat"
          type="password"
          autoComplete="new-password"
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          aria-invalid={errors.passwordRepeat !== undefined}
        />
        {errors.passwordRepeat?.[0] ? (
          <p role="alert" className="text-sm text-danger">
            {errors.passwordRepeat[0]}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="light"
        disabled={submitting}
        className="mt-sm h-12 w-full rounded-full font-semibold tracking-[0.24px]"
      >
        Registrarse
      </Button>
    </form>
  );
}
