import React, { useState, useEffect, useCallback } from 'react';
import { accountAPI, personAPI } from '../services/api';

const EMPTY_ACCOUNT = { accountNumber: '', accountType: 'Savings', balance: '', personId: '' };
const ACCOUNT_TYPES = ['Savings', 'Checking', 'Money Market', 'Certificate of Deposit', 'Investment'];

function getBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'savings') return 'badge badge-savings';
  if (t === 'checking') return 'badge badge-checking';
  return 'badge badge-default';
}

export default function AccountsView() {
  const [accounts, setAccounts] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [accRes, perRes] = await Promise.all([accountAPI.getAll(), personAPI.getAll()]);
      setAccounts(accRes.data);
      setPersons(perRes.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingAccount(null);
    setForm({ ...EMPTY_ACCOUNT, personId: persons[0]?.id || '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setForm({
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      personId: account.personId || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      await accountAPI.delete(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSubmit = async () => {
    if (!form.accountNumber || !form.accountType || form.balance === '' || !form.personId) {
      setError('All fields are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { ...form, balance: parseFloat(form.balance), personId: parseInt(form.personId) };
    try {
      if (editingAccount) {
        await accountAPI.update(editingAccount.id, payload);
      } else {
        await accountAPI.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Accounts</div>
          <div className="page-subtitle">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} · Total balance:&nbsp;
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={persons.length === 0}>
          <span className="btn-icon">+</span> Add Account
        </button>
      </div>

      {persons.length === 0 && !loading && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          ⚠️ You must create at least one Person before adding accounts.
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-text">Loading...</div></div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <div className="empty-text">No accounts yet. Create one to get started.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Account #</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.id}>
                    <td>
                      <span className="text-mono">{account.accountNumber}</span>
                    </td>
                    <td>
                      <span className={getBadgeClass(account.accountType)}>{account.accountType}</span>
                    </td>
                    <td>
                      <span className="balance-positive">
                        ${account.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>
                        {account.personName || `Person #${account.personId}`}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(account)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(account.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
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
              <div className="modal-title">{editingAccount ? 'Edit Account' : 'New Account'}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">⚠️ {error}</div>}
              <div className="form-group">
                <label className="form-label">Account Number *</label>
                <input className="form-input" value={form.accountNumber}
                  onChange={e => setForm(f => ({...f, accountNumber: e.target.value}))}
                  placeholder="ACC-001234" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Type *</label>
                <select className="form-select" value={form.accountType}
                  onChange={e => setForm(f => ({...f, accountType: e.target.value}))}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Balance ($) *</label>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={form.balance}
                  onChange={e => setForm(f => ({...f, balance: e.target.value}))}
                  placeholder="0.00" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Account Owner *</label>
                <select className="form-select" value={form.personId}
                  onChange={e => setForm(f => ({...f, personId: e.target.value}))}>
                  <option value="">— Select a person —</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : (editingAccount ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
