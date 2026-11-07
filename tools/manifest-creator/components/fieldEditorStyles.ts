export const styles = {
  fieldItem: {
    padding: '1rem',
    border: '1px solid var(--np-color-outline-variant)',
    borderRadius: 'var(--np-radius-sm)',
    background: 'var(--np-color-surface-container-low)',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  fieldTitle: {
    fontWeight: 600,
    color: 'var(--np-color-on-surface)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
    gap: '0.75rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontSize: 'var(--np-text-md)',
    fontWeight: 500,
    color: 'var(--np-color-on-surface)',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid var(--np-color-outline-variant)',
    borderRadius: 'var(--np-radius-sm)',
    fontSize: 'var(--np-text-md)',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid var(--np-color-outline-variant)',
    borderRadius: 'var(--np-radius-sm)',
    fontSize: 'var(--np-text-md)',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
  },
  helperText: {
    fontSize: 'var(--np-text-sm)',
    color: 'var(--np-color-on-surface-variant)',
  },
  mappingCard: {
    border: '1px dashed var(--np-color-outline-variant)',
    borderRadius: 'var(--np-radius-sm)',
    padding: '0.75rem',
    background: 'var(--np-color-surface-container-lowest)',
  },
} as const;
