/**
 * Styles for ManifestNostrPanel - extracted to keep the component under 500 lines.
 */
export const styles = {
  panel: {
    background: 'var(--np-color-surface-container-lowest)',
    borderRadius: 'var(--np-radius-sm)',
    border: '1px solid var(--np-color-outline-variant)',
    padding: '1.5rem',
    marginTop: '1rem',
  },
  panelTitle: {
    fontSize: 'var(--np-text-xl)',
    fontWeight: 600,
    margin: '0 0 1rem 0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  statusSuccess: {
    padding: '0.5rem 0.75rem',
    background: 'var(--np-color-success-container)',
    color: 'var(--np-color-success)',
    borderRadius: 'var(--np-radius-sm)',
    fontSize: 'var(--np-text-md)',
    marginTop: '0.5rem',
  },
  statusError: {
    padding: '0.5rem 0.75rem',
    background: 'var(--np-color-error-container)',
    color: 'var(--np-color-error)',
    borderRadius: 'var(--np-radius-sm)',
    fontSize: 'var(--np-text-md)',
    marginTop: '0.5rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  tab: {
    padding: '0.375rem 0.75rem',
    background: 'var(--np-color-surface-container)',
    border: '1px solid var(--np-color-outline-variant)',
    borderRadius: 'var(--np-radius-sm)',
    cursor: 'pointer',
    fontSize: 'var(--np-text-sm)',
    fontWeight: 500,
    color: 'var(--np-color-on-surface-variant)',
  },
  activeTab: {
    padding: '0.375rem 0.75rem',
    background: 'var(--np-color-primary)',
    border: '1px solid var(--np-color-primary)',
    borderRadius: 'var(--np-radius-sm)',
    cursor: 'pointer',
    fontSize: 'var(--np-text-sm)',
    fontWeight: 500,
    color: 'var(--np-color-on-primary)',
  },
} as const;
