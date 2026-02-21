import React, { useState, useEffect, useCallback } from 'react';
import { personAPI } from '../services/api';

const EMPTY_PERSON = { firstName: '', lastName: '', email: '', phoneNumber: '' };

function getBadgeForType(type) {
  const t = (type || '').toLowerCase();
  if (t === 'savings') return 'badge badge-savings';
  if (t === 'checking') return 'badge badge-checking';
  return 'badge badge-default';
}

export default function PersonsView() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [form, setForm] = useState(EMPTY_PERSON);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [personAccounts, setPersonAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const loadPersons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await personAPI.getAll();
      setPersons(res.data);
    } catch {
      setError('Failed to load persons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPersons(); }, [loadPersons]);

  const openCreate = () => {
    setEditingPerson(null);
    setForm(EMPTY_PERSON);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (e, person) => {
    e.stopPropagation();
    setEditingPerson(person);
    setForm({ firstName: person.firstName, lastName: person.lastName, email: person.email, phoneNumber: person.phoneNumber || '' });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this person and all their accounts?')) return;
    try {
      await personAPI.delete(id);
      if (expandedId === id) setExpandedId(null);
      loadPersons();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingPerson) {
        await personAPI.update(editingPerson.id, form);
      } else {
        await personAPI.create(form);
      }
      setModalOpen(false);
      loadPersons();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = async (person) => {
    if (expandedId === person.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(person.id);
    setAccountsLoading(true);
    try {
      const res = await personAPI.getAccounts(person.id);
      setPersonAccounts(res.data);
    } catch {
      setPersonAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Persons</div>
          <div className="page-subtitle">Manage account holders — click a row to view their accounts</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span className="btn-icon">+</span> Add Person
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-text">Loading...</div></div>
        ) : persons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <div className="empty-text">No persons yet. Add one to get started.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {persons.map(person => (
                  <React.Fragment key={person.id}>
                    <tr className="clickable-row" onClick={() => handleRowClick(person)}>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ marginRight: 8, color: 'var(--text-dim)' }}>
                          {expandedId === person.id ? '▾' : '▸'}
                        </span>
                        {person.firstName} {person.lastName}
                      </td>
                      <td><span className="text-mono">{person.email}</span></td>
                      <td className="text-mono">{person.phoneNumber || '—'}</td>
                      <td><span className="stat-pill">#{person.id}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="action-cell">
                          <button className="btn btn-ghost btn-sm" onClick={e => openEdit(e, person)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={e => handleDelete(e, person.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === person.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, background: 'var(--bg)' }}>
                          <div className="accounts-drawer">
                            <div className="drawer-header">
                              <div>
                                <div className="drawer-title">
                                  Accounts — {person.firstName} {person.lastName}
                                </div>
                                <div className="drawer-subtitle">All linked bank accounts</div>
                              </div>
                            </div>
                            {accountsLoading ? (
                              <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading accounts...</div>
                            ) : personAccounts.length === 0 ? (
                              <div className="empty-state" style={{ padding: '24px' }}>
                                <div className="empty-text">No accounts linked to this person.</div>
                              </div>
                            ) : (
                              <table>
                                <thead>
                                  <tr>
                                    <th>Account #</th>
                                    <th>Type</th>
                                    <th>Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {personAccounts.map(acc => (
                                    <tr key={acc.id}>
                                      <td className="text-mono">{acc.accountNumber}</td>
                                      <td><span className={getBadgeForType(acc.accountType)}>{acc.accountType}</span></td>
                                      <td className="balance-positive">${acc.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingPerson ? 'Edit Person' : 'New Person'}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">⚠️ {error}</div>}
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} placeholder="John" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} placeholder="Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="john.doe@example.com" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={form.phoneNumber} onChange={e => setForm(f => ({...f, phoneNumber: e.target.value}))} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : (editingPerson ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
