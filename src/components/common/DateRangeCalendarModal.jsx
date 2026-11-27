import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

const formatDateISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getTodayISO = () => formatDateISO(new Date());

const calcDaysInclusive = (startStr, endStr) => {
  if (!startStr) return 1;
  const end = endStr && endStr >= startStr ? endStr : startStr;
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const s = new Date(sy, (sm || 1) - 1, sd || 1);
  const e = new Date(ey, (em || 1) - 1, ed || 1);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};

/**
 * Reusable Click-and-Drag Calendar Duration Picker + Trigger Card.
 * Standard COTELCO UI pattern (replaces raw Start/End <input type="date"> pairs).
 */
export const DateRangeCalendarField = ({
  label = 'Schedule Duration (Start → Due)',
  startDate = '',
  endDate = '',
  onChange,
  personLabel = ''
}) => {
  const todayISO = useMemo(() => getTodayISO(), []);
  const safeStart = startDate || todayISO;
  const safeEnd = endDate && endDate >= safeStart ? endDate : safeStart;
  const dayCount = calcDaysInclusive(safeStart, safeEnd);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = safeStart.split('-').map(Number);
    return new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
  });
  const [draftStart, setDraftStart] = useState(safeStart);
  const [draftEnd, setDraftEnd] = useState(safeEnd);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnchor, setDragAnchor] = useState(null);

  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isDragging]);

  const handleOpen = () => {
    setDraftStart(safeStart);
    setDraftEnd(safeEnd);
    const [y, m] = safeStart.split('-').map(Number);
    setViewMonth(new Date(y || new Date().getFullYear(), (m || 1) - 1, 1));
    setIsDragging(false);
    setDragAnchor(null);
    setOpen(true);
  };

  const monthCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const totalDays = last.getDate();

    const cells = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, 1 - (startPad - i));
      cells.push({ dateStr: formatDateISO(d), dayNum: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      cells.push({ dateStr: formatDateISO(d), dayNum: day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month + 1, cells.length - totalDays - startPad + 1);
      cells.push({ dateStr: formatDateISO(d), dayNum: d.getDate(), inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  const draftDays = calcDaysInclusive(draftStart, draftEnd);
  const monthTitle = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleConfirm = () => {
    onChange(draftStart, draftEnd);
    setOpen(false);
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      {label && <label className="form-label">{label}</label>}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          padding: '0.52rem 0.72rem',
          borderRadius: '10px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CalendarDays size={16} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mono" style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>
              {safeStart} {safeEnd > safeStart ? `→ ${safeEnd}` : ''}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {dayCount} {dayCount === 1 ? 'day' : 'days'} scheduled &bull; Click &amp; drag calendar to adjust
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={handleOpen}
          style={{ flexShrink: 0 }}
        >
          <CalendarDays size={13} /> Change
        </button>
      </div>

      {open && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1300 }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-box-header">
              <div className="modal-box-title">
                <CalendarDays size={18} />
                <span>Select Schedule Duration</span>
              </div>
              <button
                type="button"
                className="modal-box-close"
                onClick={() => setOpen(false)}
                aria-label="Close duration calendar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <strong style={{ fontSize: '0.95rem', minWidth: '132px', textAlign: 'center', color: 'var(--text-main)' }}>
                    {monthTitle}
                  </strong>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                      const now = new Date();
                      setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    }}
                  >
                    Today
                  </button>
                </div>

                <span className="stat-chip mono" style={{ fontSize: '0.78rem' }}>
                  <strong>{draftStart}</strong> &rarr; <strong>{draftEnd}</strong> ({draftDays} {draftDays === 1 ? 'day' : 'days'})
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Click and drag across calendar days to set the schedule range{personLabel ? ` for ${personLabel}` : ''}.
              </div>

              <div
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div
                      key={d}
                      style={{
                        textAlign: 'center',
                        padding: '0.45rem 0',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {monthCells.map((cell) => {
                    const isStart = cell.dateStr === draftStart;
                    const isEnd = cell.dateStr === draftEnd;
                    const inRange = cell.dateStr >= draftStart && cell.dateStr <= draftEnd;
                    const isToday = cell.dateStr === todayISO;

                    return (
                      <div
                        key={cell.dateStr}
                        onMouseDown={() => {
                          setIsDragging(true);
                          setDragAnchor(cell.dateStr);
                          setDraftStart(cell.dateStr);
                          setDraftEnd(cell.dateStr);
                        }}
                        onMouseEnter={() => {
                          if (!isDragging || !dragAnchor) return;
                          if (cell.dateStr >= dragAnchor) {
                            setDraftStart(dragAnchor);
                            setDraftEnd(cell.dateStr);
                          } else {
                            setDraftStart(cell.dateStr);
                            setDraftEnd(dragAnchor);
                          }
                        }}
                        style={{
                          minHeight: '58px',
                          padding: '0.35rem 0.45rem',
                          borderRight: '1px solid var(--border-subtle)',
                          borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          background:
                            isStart || isEnd
                              ? '#D9F99D'
                              : inRange
                              ? '#F7FEE7'
                              : isToday
                              ? '#F0FDF4'
                              : 'var(--bg-surface)',
                          boxShadow: isToday ? 'inset 0 0 0 1.5px #16A34A' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: isToday || isStart || isEnd ? 800 : 600,
                              color: isToday
                                ? '#FFFFFF'
                                : cell.inMonth
                                ? 'var(--text-main)'
                                : 'var(--text-tertiary)',
                              ...(isToday
                                ? {
                                    background: '#16A34A',
                                    borderRadius: '999px',
                                    width: '21px',
                                    height: '21px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }
                                : {})
                            }}
                          >
                            {cell.dayNum}
                          </span>
                          {isStart && isEnd ? (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#3F6212' }}>1 DAY</span>
                          ) : isStart ? (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#3F6212' }}>START</span>
                          ) : isEnd ? (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#3F6212' }}>DUE</span>
                          ) : isToday ? (
                            <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#15803D' }}>TODAY</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-box-footer" style={{ justifyContent: 'flex-end', gap: '0.55rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
              >
                <Check size={15} /> Confirm Schedule ({draftDays} {draftDays === 1 ? 'day' : 'days'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
