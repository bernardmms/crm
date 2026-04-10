import { Input } from "@repo/ui/components/ui/input";
import type { InputHTMLAttributes } from "react";
import { FormError } from "./FormError";
import type { UseFormRegisterReturn } from "react-hook-form";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: { message?: string };
  registration: UseFormRegisterReturn;
}

export function FormField({
  label,
  error,
  registration,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor={registration.name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={registration.name}
        {...registration}
        {...inputProps}
        aria-invalid={error ? "true" : "false"}
      />
      <FormError message={error?.message} />
    </div>
  );
}
