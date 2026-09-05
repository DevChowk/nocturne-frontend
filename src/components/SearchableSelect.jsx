import { useEffect, useMemo, useRef, useState } from 'react';

// Tight searchable combobox. ~80 countries are too many to scroll in a
// native <select> on mobile, and native <select> can't be filtered. This
// component:
//   - Renders a trigger input showing the currently-selected option.
//   - On focus, opens a popover with a filter input + scrollable list.
//   - Click outside / Esc closes it.
//   - Arrow keys + Enter for keyboard nav (basic — j/k power users get the
//     scroll behavior; ARIA listbox semantics).
//
// API:
//   <SearchableSelect
//     value="IN"
//     onChange={(code) => ...}
//     options={[{ code: 'IN', name: 'India' }, ...]}
//     placeholder="Search countries…"
//     formatOption={(opt) => `${flag(opt.code)} ${opt.name}`}
//     emptyLabel="Not set"             // shown as the first row, sets value to ''
//     id="pe-country"                   // for label htmlFor
//   />
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search…',
  formatOption,
  emptyLabel,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.code === value);
  const display = selected ? formatOption(selected) : '';

  // Memoized so the keydown effect's `rows` dep is stable across renders.
  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q
      ? options.filter(
          (o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
        )
      : options;
    return [
      ...(emptyLabel ? [{ code: '', name: emptyLabel, _empty: true }] : []),
      ...filtered,
    ];
  }, [options, query, emptyLabel]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const row = rows[activeIdx];
        if (row) {
          e.preventDefault();
          onChange(row.code);
          setOpen(false);
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, rows, activeIdx, onChange]);

  // Scroll active row into view as the user arrows down.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? query : display}
        onFocus={() => { setOpen(true); setQuery(''); setActiveIdx(0); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
        placeholder={placeholder}
        className="w-full field-sticker px-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30"
      />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-on-surface/10 backdrop-blur-md custom-scrollbar"
          style={{ background: 'rgb(var(--color-surface-low-rgb) / 0.95)' }}
        >
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-on-surface-variant text-sm">No matches</li>
          ) : (
            rows.map((row, i) => {
              const isActive = i === activeIdx;
              const isSelected = row.code === value || (row._empty && !value);
              return (
                <li
                  key={row.code || '__empty'}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    // mouseDown (not click) so we beat the input's blur.
                    e.preventDefault();
                    onChange(row.code);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="px-3 py-2 text-sm cursor-pointer transition-colors"
                  style={{
                    background: isActive ? 'rgba(255,212,0,0.12)' : 'transparent',
                    color: isSelected ? '#FFD400' : '#fff',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {row._empty ? row.name : formatOption(row)}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
