import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import {
  UserCheck,
  Wrench,
  KeyRound,
  Lock,
  ScrollText,
  Database,
  RotateCcw
} from 'lucide-react';

const ROLES = [
  {
    icon: UserCheck,
    title: 'Operations Director',
    points: [
      'Full access to fleet records, employees, calendar, and system settings',
      'Register and retire vehicles, manage clearances, and assign mechanics',
      'Approve repair expenses and review audits'
    ]
  },
  {
    icon: Wrench,
    title: 'Assigned Mechanic',
    points: [
      'Scoped view of personal mechanic Dashboard and assigned Maintenance jobs',
      'Update repair stages and mark assigned work orders as completed',
      'No access to other mechanics’ queues, profiling, or system settings'
    ]
  }
];

const SAFEGUARDS = [
  { icon: Lock, title: 'Encrypted transmission', text: 'All web traffic is served over HTTPS/TLS to protect logins, driver records and submissions.' },
  { icon: ScrollText, title: 'Append-only audit trail', text: 'Reassignments, record edits and overrides are logged and cannot be edited or deleted.' },
  { icon: KeyRound, title: 'Credential protection', text: 'Passwords are stored using salted cryptographic hashing, never in plain text.' },
  { icon: Database, title: 'Restricted data access', text: 'Database permissions are limited per role to prevent unauthorized internal access.' }
];

const CATEGORIES = [
  ['WORK_ORDER', 'Outside service & PMS'],
  ['DISPATCH', 'Dispatch & custody'],
  ['MAINTENANCE', 'Maintenance'],
  ['COMPLIANCE', 'Safety compliance'],
  ['ASSET_REGISTRY', 'Asset registry'],
  ['SECURITY_AUTH', 'Security & access'],
  ['FINANCIAL_AUDIT', 'Financial audit']
];

export const SecurityAudit = () => {
  const { auditLogs, globalSearch } = useFleet();

  const [tab, setTab] = useState('audit');
  const [category, setCategory] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const toggleLog = (id) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const logs = useMemo(() => {
    const q = (globalSearch || '').toLowerCase().trim();
    return auditLogs.filter(l =>
      (category === 'ALL' || l.category === category) &&
      (!q || [l.id, l.user, l.action, l.details, l.role, l.category].some(f => String(f || '').toLowerCase().includes(q)))
    );
  }, [auditLogs, globalSearch, category]);

  return (
    <div className="page">
      <div className="page-toolbar">
        {tab === 'audit' && (
          <>
            <select
              className="form-select toolbar-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="ALL">All categories</option>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            {category !== 'ALL' && (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setCategory('ALL')}>
                <RotateCcw size={14} /> Reset
              </button>
            )}

            {globalSearch && (
              <span className="stat-chip" style={{ color: 'var(--text-secondary)' }}>
                Filter: &ldquo;{globalSearch}&rdquo;
              </span>
            )}
          </>
        )}

        <span className="spacer" />

        <div className="segmented" role="group" aria-label="Security view">
          <button type="button" className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
            Audit Trail ({auditLogs.length})
          </button>
          <button type="button" className={tab === 'access' ? 'active' : ''} onClick={() => setTab('access')}>
            Access Control
          </button>
        </div>
      </div>

      <div className="page-body">
        {tab === 'audit' ? (
          <div className="table-wrap">
            <table className="data-table" aria-label="Audit trail">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Timestamp</th>
                  <th>User &amp; Role</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state">No audit logs match criteria.</div></td></tr>
                ) : logs.map(l => {
                  const isLong = (l.details || '').length > 55;
                  const isExpanded = expandedLogId === l.id;

                  return (
                    <tr key={l.id}>
                      <td><span className="log-id mono">{l.id}</span></td>
                      <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{l.timestamp}</td>
                      <td>
                        <span className="cell-strong">{l.user}</span>
                        <span className="cell-sub">{l.role}</span>
                      </td>
                      <td className="cell-strong">{l.action}</td>
                      <td><span className="badge badge-neutral">{l.category}</span></td>
                      <td style={{ maxWidth: 360 }}>
                        <div style={{ fontSize: '0.84rem' }}>
                          {isExpanded ? l.details : `${l.details.slice(0, 55)}${isLong ? '...' : ''}`}
                        </div>
                      </td>
                      <td><span className="badge badge-primary">{l.status}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => toggleLog(l.id)}
                        >
                          {isExpanded ? 'Collapse' : 'View Log'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="access-body">
            <div>
              <div className="section-label">Role permissions</div>
              <div className="role-grid" style={{ overflow: 'visible' }}>
                {ROLES.map(r => {
                  const Icon = r.icon;
                  return (
                    <div key={r.title} className="card role-card">
                      <div className="role-title"><Icon size={18} />{r.title}</div>
                      <ul>{r.points.map(p => <li key={p}>{p}</li>)}</ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="section-label">Platform safeguards</div>
              <div className="safeguard-grid">
                {SAFEGUARDS.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.title} className="card">
                      <div className="safeguard-title"><Icon size={18} />{s.title}</div>
                      <p className="safeguard-text">{s.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
