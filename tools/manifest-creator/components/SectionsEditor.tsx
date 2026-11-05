'use client';

import type { PostSection } from '@nostr-post/core/types';
import { styles } from './fieldEditorStyles';
import { useListKeys } from './useListKeys';

interface SectionsEditorProps {
  sections: PostSection[];
  onChange: (sections: PostSection[]) => void;
}

const cardStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.5rem',
  padding: '0.5rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.375rem',
  background: 'white',
} as const;

const inputStyle = { ...styles.input, minWidth: 0 } as const;
const groupStyle = { ...styles.formGroup, minWidth: 0 } as const;

/** `a, b` → `['a', 'b']` */
const parseList = (text: string): string[] =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/** `1, 30078` → `[1, 30078]` */
const parseKinds = (text: string): number[] =>
  text
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((kind) => Number.isInteger(kind) && kind >= 0);

/** A section without its empty optional keys */
const cleanSection = (section: PostSection): PostSection =>
  Object.fromEntries(
    Object.entries(section).filter(
      ([, value]) =>
        value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)
    )
  ) as unknown as PostSection;

const VIEWS = [
  ['list', 'List'],
  ['gallery', 'Photos and videos'],
  ['agenda', 'Agenda (calendar events)'],
] as const;

/** Edits `sections`: what a page lists besides the event itself (reviews, photos, gigs…). */
export function SectionsEditor({ sections: related, onChange }: SectionsEditorProps) {
  const sectionKeys = useListKeys(related.length);
  const update = (index: number, patch: Partial<PostSection>) =>
    onChange(related.map((s, i) => (i === index ? cleanSection({ ...s, ...patch }) : s)));
  const remove = (index: number) => {
    sectionKeys.removeKey(index);
    onChange(related.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={styles.label}>Sections</div>
          <div style={styles.helperText}>
            What the page of an event made with this manifest lists (wiki pages, a calendar event's
            page): posts referencing it, e.g. its reviews (by manifest), photos and videos
            (gallery), gigs (agenda), or wiki entities of another type (by d-tag suffix, optionally
            in a role), with an optional "Add". A manifest extending this one adds sections; one
            with the same id (else label) replaces it, e.g. to translate the heading.
          </div>
        </div>
        <button
          type="button"
          style={styles.smallButton}
          onClick={() => onChange([...related, { label: '' }])}
        >
          + Add Section
        </button>
      </div>

      {related.map((section, index) => (
        <SectionCard
          key={sectionKeys.keys[index]}
          section={section}
          index={index}
          update={(patch) => update(index, patch)}
          remove={() => remove(index)}
        />
      ))}
    </div>
  );
}

/** One section's settings */
function SectionCard({
  section,
  index,
  update: patch,
  remove: drop,
}: {
  section: PostSection;
  index: number;
  update: (patch: Partial<PostSection>) => void;
  remove: () => void;
}) {
  const id = (name: string) => `section-${index}-${name}`;
  return (
    <div style={cardStyle}>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('label')}>
          Heading
        </label>
        <input
          id={id('label')}
          style={inputStyle}
          type="text"
          value={section.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="e.g. Reviews"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('id')}>
          Id (for manifests extending this one)
        </label>
        <input
          id={id('id')}
          style={inputStyle}
          type="text"
          value={section.id ?? ''}
          onChange={(e) => patch({ id: e.target.value || undefined })}
          placeholder="e.g. reviews"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('view')}>
          Shown as
        </label>
        <select
          id={id('view')}
          style={inputStyle}
          value={section.view ?? 'list'}
          onChange={(e) => patch({ view: e.target.value === 'list' ? undefined : e.target.value })}
        >
          {VIEWS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('kinds')}>
          Kinds (empty: any)
        </label>
        <input
          // Typed text is kept until blur; a new key resets it when the kinds change elsewhere
          key={(section.kinds ?? []).join(',')}
          id={id('kinds')}
          style={inputStyle}
          type="text"
          defaultValue={(section.kinds ?? []).join(', ')}
          onBlur={(e) => patch({ kinds: parseKinds(e.target.value) })}
          placeholder="1, 30078 (posts) or 30818 (wiki)"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('manifests')}>
          Only posts of manifests
        </label>
        <input
          key={(section.manifests ?? []).join(',')}
          id={id('manifests')}
          style={inputStyle}
          type="text"
          defaultValue={(section.manifests ?? []).join(', ')}
          onBlur={(e) => patch({ manifests: parseList(e.target.value) })}
          placeholder="e.g. venue-review-v1"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('add')}>
          "Add" with manifest, field linking the page
        </label>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <input
            id={id('add')}
            style={inputStyle}
            type="text"
            value={typeof section.add?.manifest === 'string' ? section.add.manifest : ''}
            onChange={(e) =>
              patch({
                add: e.target.value
                  ? { manifest: e.target.value, field: section.add?.field }
                  : undefined,
              })
            }
            placeholder="manifest id or 30078: address"
          />
          <input
            style={{ ...inputStyle, width: '7rem' }}
            type="text"
            aria-label={`Section ${index + 1} add field`}
            disabled={!section.add}
            value={section.add?.field ?? ''}
            onChange={(e) =>
              section.add &&
              patch({
                add: { manifest: section.add.manifest, field: e.target.value || undefined },
              })
            }
            placeholder="field id"
          />
        </div>
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('suffix')}>
          Only wiki entities with d-tag suffix
        </label>
        <input
          id={id('suffix')}
          style={inputStyle}
          type="text"
          value={section.dTagSuffix ?? ''}
          onChange={(e) => patch({ dTagSuffix: e.target.value || undefined })}
          placeholder="e.g. -brewery"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('role')}>
          Only in role (their field id)
        </label>
        <input
          id={id('role')}
          style={inputStyle}
          type="text"
          value={section.role ?? ''}
          onChange={(e) => patch({ role: e.target.value || undefined })}
          placeholder="e.g. taprooms"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('limit')}>
          Shown at first
        </label>
        <input
          id={id('limit')}
          style={inputStyle}
          type="number"
          min={1}
          value={section.limit ?? ''}
          onChange={(e) => patch({ limit: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="20"
        />
      </div>
      <div style={groupStyle}>
        <label style={styles.label} htmlFor={id('stats')}>
          Average of tag (out of max)
        </label>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <input
            id={id('stats')}
            style={inputStyle}
            type="text"
            value={section.stats?.tag ?? ''}
            onChange={(e) =>
              patch({
                stats: e.target.value ? { ...section.stats, tag: e.target.value } : undefined,
              })
            }
            placeholder="e.g. rating"
          />
          <input
            style={{ ...inputStyle, width: '5rem' }}
            type="number"
            min={1}
            aria-label={`Section ${index + 1} stats max`}
            disabled={!section.stats}
            value={section.stats?.max ?? ''}
            onChange={(e) =>
              section.stats &&
              patch({
                stats: {
                  tag: section.stats.tag,
                  max: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            placeholder="5"
          />
        </div>
      </div>
      <div style={{ ...groupStyle, flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ ...styles.label, display: 'flex', gap: '0.375rem' }}>
          <input
            type="checkbox"
            checked={section.self ?? false}
            onChange={(e) => patch({ self: e.target.checked || undefined })}
          />
          With the event itself
        </label>
        <label style={{ ...styles.label, display: 'flex', gap: '0.375rem' }}>
          <input
            type="checkbox"
            checked={section.links ?? false}
            onChange={(e) => patch({ links: e.target.checked || undefined })}
          />
          Also by its <code>i</code> links
        </label>
        <button
          type="button"
          style={{ ...styles.deleteButton, marginLeft: 'auto' }}
          onClick={() => drop()}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
