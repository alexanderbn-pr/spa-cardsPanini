import { cloneElement } from "react";

/** The aria hook-up FormField injects into its single control child. */
interface AriaControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export interface FormFieldProps {
  /** Visible field label — also the accessible name of the control. */
  label: string;
  /** The control's `id`; the label's `for` and the error id derive from it. */
  htmlFor: string;
  /** Inline error text (from `flatten().fieldErrors`); absent = valid. */
  error?: string;
  children: React.ReactElement<AriaControlProps>;
}

/**
 * R-CRT-08 form-field wrapper: label + control + inline error. When `error` is
 * present it is rendered with `role="alert"` and a deterministic `${htmlFor}-error`
 * id, and the control gets `aria-describedby`/`aria-invalid` wired by cloning —
 * so consumers only supply the control and never hand-wire a11y (react-form:
 * extract the reusable component from the first form that uses it).
 */
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const control = error
    ? cloneElement(children, {
        "aria-describedby": errorId,
        "aria-invalid": true,
      })
    : children;

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
