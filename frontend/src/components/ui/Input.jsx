import { forwardRef, useId } from 'react';

// Design-system form controls with consistent height, radius, focus ring, and
// optional label / help / error. Unifies the admin `.input-field` and the
// bespoke `.modal-input` used on public pages.
const CONTROL =
  'w-full px-4 rounded-btn border bg-white dark:bg-dark-card text-light-text dark:text-dark-text border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition disabled:opacity-60';

function Wrapper({ label, help, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-light-text dark:text-dark-text">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : help ? (
        <p className="text-xs text-light-muted dark:text-dark-muted">{help}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, help, error, id, className = '', ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Wrapper label={label} help={help} error={error} htmlFor={inputId}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`${CONTROL} h-11 ${error ? 'border-error focus:ring-error' : ''} ${className}`.trim()}
        {...props}
      />
    </Wrapper>
  );
});

export const Textarea = forwardRef(function Textarea({ label, help, error, id, className = '', rows = 4, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Wrapper label={label} help={help} error={error} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error}
        className={`${CONTROL} py-3 ${error ? 'border-error focus:ring-error' : ''} ${className}`.trim()}
        {...props}
      />
    </Wrapper>
  );
});

export const Select = forwardRef(function Select({ label, help, error, id, options = [], className = '', children, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Wrapper label={label} help={help} error={error} htmlFor={inputId}>
      <select
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`${CONTROL} h-11 ${error ? 'border-error focus:ring-error' : ''} ${className}`.trim()}
        {...props}
      >
        {options.length
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    </Wrapper>
  );
});
