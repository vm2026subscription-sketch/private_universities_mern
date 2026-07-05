import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef(function Input(
  { className, label, error, hint, id, required, ...props },
  ref
) {
  const inputId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-body-sm font-medium text-light-text dark:text-dark-text"
        >
          {label}
          {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          "input-field",
          error && "border-error focus:ring-error",
          className
        )}
        required={required}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-caption text-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-caption text-light-muted">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
