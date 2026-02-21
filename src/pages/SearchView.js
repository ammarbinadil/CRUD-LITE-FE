import React, { useState, useEffect } from "react";
import { personAPI, accountAPI } from "../services/api";

function getBadgeClass(type) {
  const t = (type || "").toLowerCase();
  if (t === "savings") return "badge badge-savings";
  if (t === "checking") return "badge badge-checking";
  return "badge badge-default";
}

function Highlight({ text, query }) {
  if (!text || !query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="search-highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

const PERSON_FIELDS = [
  { key: "name", label: "Full Name", placeholder: "e.g. John Doe" },
  {
    key: "email",
    label: "Email Address",
    placeholder: "e.g. john@example.com",
  },
  { key: "phoneNumber", label: "Phone Number", placeholder: "e.g. +1 555 000" },
];

const ACCOUNT_FIELDS = [
  {
    key: "accountNumber",
    label: "Account Number",
    placeholder: "e.g. ACC-001",
  },
  {
    key: "accountType",
    label: "Account Type",
    placeholder: "e.g. Savings, Checking",
  },
  { key: "ownerName", label: "Owner Name", placeholder: "e.g. Jane Smith" },
];

const ACCOUNT_TYPES = [
  "Savings",
  "Checking",
  "Money Market",
  "Certificate of Deposit",
  "Investment",
];
const EMPTY_PERSON = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
};
const EMPTY_ACCOUNT = {
  accountNumber: "",
  accountType: "Savings",
  balance: "",
  personId: "",
};

export default function SearchView() {
  const [searchType, setSearchType] = useState("persons");
  const [fields, setFields] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [results, setResults] = useState([]);
  const [allPersons, setAllPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // the record being edited
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load persons list for account owner dropdown
  useEffect(() => {
    personAPI
      .getAll()
      .then((r) => setAllPersons(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFields(
      searchType === "persons"
        ? { name: "", email: "", phoneNumber: "" }
        : { accountNumber: "", accountType: "", ownerName: "" }
    );
    setResults([]);
    setSearched(false);
    setError("");
  }, [searchType]);

  const currentFields =
    searchType === "persons" ? PERSON_FIELDS : ACCOUNT_FIELDS;
  const hasAnyInput = Object.values(fields).some((v) => v.trim() !== "");

  const handleFieldChange = (key, value) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!hasAnyInput) return;
    setLoading(true);
    setSearched(false);
    setError("");
    try {
      if (searchType === "persons") {
        const res = await personAPI.getAll();
        const q = {
          name: fields.name.trim().toLowerCase(),
          email: fields.email.trim().toLowerCase(),
          phone: fields.phoneNumber.trim().toLowerCase(),
        };
        setResults(
          res.data.filter(
            (p) =>
              (!q.name ||
                `${p.firstName} ${p.lastName}`
                  .toLowerCase()
                  .includes(q.name)) &&
              (!q.email || (p.email || "").toLowerCase().includes(q.email)) &&
              (!q.phone ||
                (p.phoneNumber || "").toLowerCase().includes(q.phone))
          )
        );
      } else {
        const res = await accountAPI.getAll();
        const q = {
          num: fields.accountNumber.trim().toLowerCase(),
          type: fields.accountType.trim().toLowerCase(),
          owner: fields.ownerName.trim().toLowerCase(),
        };
        setResults(
          res.data.filter(
            (a) =>
              (!q.num ||
                (a.accountNumber || "").toLowerCase().includes(q.num)) &&
              (!q.type ||
                (a.accountType || "").toLowerCase().includes(q.type)) &&
              (!q.owner || (a.personName || "").toLowerCase().includes(q.owner))
          )
        );
      }
    } catch {
      setError("Search failed. Make sure the backend is running.");
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleClear = () => {
    setFields(
      searchType === "persons"
        ? { name: "", email: "", phoneNumber: "" }
        : { accountNumber: "", accountType: "", ownerName: "" }
    );
    setResults([]);
    setSearched(false);
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    const label =
      searchType === "persons"
        ? `${record.firstName} ${record.lastName}`
        : `account ${record.accountNumber}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      if (searchType === "persons") await personAPI.delete(record.id);
      else await accountAPI.delete(record.id);
      setResults((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    }
  };

  // ── Open Edit Modal ─────────────────────────────────────────────────────────
  const openEdit = (record) => {
    setEditTarget(record);
    setEditError("");
    if (searchType === "persons") {
      setEditForm({
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phoneNumber: record.phoneNumber || "",
      });
    } else {
      setEditForm({
        accountNumber: record.accountNumber,
        accountType: record.accountType,
        balance: record.balance,
        personId: record.personId || "",
      });
    }
    setEditModal(true);
  };

  // ── Save Edit ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setEditError("");
    if (searchType === "persons") {
      if (!editForm.firstName || !editForm.lastName || !editForm.email) {
        setEditError("First name, last name, and email are required.");
        return;
      }
    } else {
      if (
        !editForm.accountNumber ||
        !editForm.accountType ||
        editForm.balance === "" ||
        !editForm.personId
      ) {
        setEditError("All fields are required.");
        return;
      }
    }
    setSaving(true);
    try {
      let updated;
      if (searchType === "persons") {
        const res = await personAPI.update(editTarget.id, editForm);
        updated = res.data;
      } else {
        const payload = {
          ...editForm,
          balance: parseFloat(editForm.balance),
          personId: parseInt(editForm.personId),
        };
        const res = await accountAPI.update(editTarget.id, payload);
        // re-fetch to get fresh personName
        const fresh = await accountAPI.getAll();
        updated = fresh.data.find((a) => a.id === editTarget.id) || res.data;
      }
      setResults((prev) =>
        prev.map((r) => (r.id === editTarget.id ? updated : r))
      );
      setEditModal(false);
    } catch (err) {
      setEditError(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Search</div>
          <div className="page-subtitle">
            Find, update, or delete persons and accounts
          </div>
        </div>
      </div>

      {/* Type Toggle */}
      <div className="search-type-toggle">
        {["persons", "accounts"].map((type) => (
          <button
            key={type}
            className={
              "search-type-btn" + (searchType === type ? " active" : "")
            }
            onClick={() => setSearchType(type)}
          >
            <span className="search-type-icon">
              {type === "persons" ? "👤" : "💳"}
            </span>
            <span className="search-type-label">
              {type === "persons" ? "Search Persons" : "Search Accounts"}
            </span>
            <span className="search-type-desc">
              {type === "persons"
                ? "by name, email, phone"
                : "by number, type, owner"}
            </span>
          </button>
        ))}
      </div>

      {/* Fields Card */}
      <div className="search-fields-card">
        <div className="search-fields-header">
          <span className="search-fields-title">
            {searchType === "persons"
              ? "👤 Person Search Fields"
              : "💳 Account Search Fields"}
          </span>
          <span className="search-fields-hint">
            Fill one or more fields — results match all filled fields
          </span>
        </div>
        <div className="search-fields-grid">
          {currentFields.map((field) => (
            <div
              className="form-group"
              key={field.key}
              style={{ marginBottom: 0 }}
            >
              <label className="form-label">{field.label}</label>
              <input
                className="form-input"
                type="text"
                value={fields[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="search-actions">
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={!hasAnyInput && !searched}
          >
            Clear
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={!hasAnyInput || loading}
          >
            {loading ? "Searching..." : "🔍 Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          <div className="results-summary">
            {results.length === 0
              ? "No results matched your search criteria"
              : `${results.length} result${
                  results.length !== 1 ? "s" : ""
                } found`}
          </div>

          {results.length > 0 && (
            <div className="card">
              <div className="table-wrapper">
                {searchType === "persons" ? (
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
                      {results.map((person) => (
                        <tr key={person.id}>
                          <td style={{ fontWeight: 500 }}>
                            <Highlight
                              text={`${person.firstName} ${person.lastName}`}
                              query={fields.name}
                            />
                          </td>
                          <td>
                            <span className="text-mono">
                              <Highlight
                                text={person.email}
                                query={fields.email}
                              />
                            </span>
                          </td>
                          <td className="text-mono">
                            <Highlight
                              text={person.phoneNumber || "—"}
                              query={fields.phoneNumber}
                            />
                          </td>
                          <td>
                            <span className="stat-pill">#{person.id}</span>
                          </td>
                          <td>
                            <div className="action-cell">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEdit(person)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(person)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
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
                      {results.map((account) => (
                        <tr key={account.id}>
                          <td>
                            <span className="text-mono">
                              <Highlight
                                text={account.accountNumber}
                                query={fields.accountNumber}
                              />
                            </span>
                          </td>
                          <td>
                            <span
                              className={getBadgeClass(account.accountType)}
                            >
                              {account.accountType}
                            </span>
                          </td>
                          <td className="balance-positive">
                            $
                            {account.balance?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            <Highlight
                              text={
                                account.personName ||
                                `Person #${account.personId}`
                              }
                              query={fields.ownerName}
                            />
                          </td>
                          <td>
                            <div className="action-cell">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEdit(account)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(account)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {results.length === 0 && (
            <div className="empty-state" style={{ marginTop: 32 }}>
              <div className="empty-icon">🔎</div>
              <div className="empty-text">No results found</div>
              <div
                style={{ marginTop: 8, fontSize: 13, color: "var(--text-dim)" }}
              >
                Try adjusting your search criteria
              </div>
            </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon">
            {searchType === "persons" ? "👤" : "💳"}
          </div>
          <div className="empty-text">
            Fill in the fields above and click Search
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-dim)" }}>
            Multiple fields are combined with AND logic
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {searchType === "persons" ? "Edit Person" : "Edit Account"}
              </div>
              <button
                className="modal-close"
                onClick={() => setEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {editError && (
                <div className="alert alert-error">⚠️ {editError}</div>
              )}

              {searchType === "persons" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      className="form-input"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder="John"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      className="form-input"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      placeholder="Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      className="form-input"
                      value={editForm.phoneNumber}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          phoneNumber: e.target.value,
                        }))
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Number *</label>
                    <input
                      className="form-input"
                      value={editForm.accountNumber}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          accountNumber: e.target.value,
                        }))
                      }
                      placeholder="ACC-001234"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Type *</label>
                    <select
                      className="form-select"
                      value={editForm.accountType}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          accountType: e.target.value,
                        }))
                      }
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balance ($) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.balance}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, balance: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Account Owner *</label>
                    <select
                      className="form-select"
                      value={editForm.personId}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, personId: e.target.value }))
                      }
                    >
                      <option value="">— Select a person —</option>
                      {allPersons.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} ({p.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
