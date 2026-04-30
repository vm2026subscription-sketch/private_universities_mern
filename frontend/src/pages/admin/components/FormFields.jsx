export function FormField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} className={`input-field ${props.className || ''}`.trim()} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`input-field min-h-[100px] ${props.className || ''}`.trim()} />;
}

export function SelectInput({ options = [], ...props }) {
  return (
    <select {...props} className={`input-field ${props.className || ''}`.trim()}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-light-border accent-primary" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function FormActions({ onCancel, submitLabel = 'Save', isEditing = false, loading = false }) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saving...' : isEditing ? 'Update' : submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      )}
    </div>
  );
}
