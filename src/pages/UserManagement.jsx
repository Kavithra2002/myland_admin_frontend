import { useEffect, useMemo, useState } from 'react';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiX } from 'react-icons/hi';
import { createUser, deleteUser, fetchUsers, updateUser } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'user',
};

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink placeholder:text-myland-slate/50 outline-none focus:bg-white focus:border-myland-gold/50';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = async () => {
    const items = await fetchUsers();
    setUsers(items);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => users.filter((item) => item.userStatus === 'active'),
    [users]
  );

  const openNew = () => {
    setEditing('new');
    setForm(EMPTY);
    setShowPassword(false);
    setError('');
    setNotice('');
  };

  const openEdit = (user) => {
    setEditing(user.userId);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role === 'admin' ? 'admin' : 'user',
    });
    setShowPassword(false);
    setError('');
    setNotice('');
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowPassword(false);
  };

  const persist = async () => {
    setBusy('save');
    setError('');
    setNotice('');
    try {
      if (editing === 'new') {
        await createUser(form);
        setNotice('User added.');
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await updateUser(editing, payload);
        setNotice('User updated.');
      }
      await load();
      closeForm();
      setConfirm(null);
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  };

  const requestSave = (event) => {
    event.preventDefault();
    setConfirm({
      type: editing === 'new' ? 'add' : 'save',
      name: form.name,
      email: form.email,
      role: form.role,
    });
  };

  const runDelete = async () => {
    if (!confirm) return;
    setBusy(String(confirm.userId));
    setError('');
    try {
      await deleteUser(confirm.userId);
      setNotice('User marked deleted. The row stays in the database.');
      if (editing === confirm.userId) closeForm();
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      {editing == null && (
        <div className="flex justify-end">
          <button type="button" onClick={openNew} className="btn-primary !py-2.5 !px-4 !text-xs shrink-0">
            <HiOutlinePlus className="text-base" /> Add user
          </button>
        </div>
      )}

      {error && <p className="text-myland-red text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm">{notice}</p>}

      {editing != null && (
        <form
          onSubmit={requestSave}
          className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display font-semibold text-lg text-myland-ink">
              {editing === 'new' ? 'Add user' : 'Edit user'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="w-9 h-9 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Close form"
            >
              <HiX />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Name</span>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Email</span>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
                {editing === 'new' ? 'Password' : 'New password (optional)'}
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-12`}
                  value={form.password}
                  onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                  minLength={editing === 'new' ? 8 : undefined}
                  required={editing === 'new'}
                  placeholder={editing === 'new' ? 'At least 8 characters' : 'Leave blank to keep current'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((open) => !open)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-myland-slate hover:text-myland-ink flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <HiOutlineEyeOff className="text-lg" /> : <HiOutlineEye className="text-lg" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Role</span>
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy === 'save'} className="btn-primary !py-2.5 !px-5 !text-xs">
              {busy === 'save' ? 'Saving…' : editing === 'new' ? 'Add user' : 'Save changes'}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost !py-2.5 !px-5 !text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl3 shadow-card border border-myland-mist/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-myland-cream text-myland-slate font-display text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Test password</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.userId} className="border-t border-myland-mist">
                  <td className="px-6 py-4 font-display font-semibold text-myland-ink">{user.name}</td>
                  <td className="px-6 py-4 text-myland-slate">{user.email}</td>
                  <td className="px-6 py-4 text-myland-ink">{user.role}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1 ${
                        user.userStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-myland-mist text-myland-slate'
                      }`}
                    >
                      {user.userStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-myland-ink/80">
                    {user.plainPassword || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.userStatus === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center gap-1 rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-3 py-2"
                          >
                            <HiOutlinePencil /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy === String(user.userId) || user.userId === currentUser?.userId}
                            onClick={() => setConfirm({ type: 'delete', ...user })}
                            className="inline-flex items-center gap-1 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-3 py-2 hover:border-myland-red disabled:opacity-40"
                          >
                            <HiOutlineTrash /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && visible.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-myland-slate">No users in this view.</p>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-myland-ink/40"
            aria-label="Cancel"
            onClick={() => !busy && setConfirm(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card">
            <h3 className="font-display font-semibold text-lg text-myland-ink">
              {confirm.type === 'add'
                ? 'Add this user?'
                : confirm.type === 'save'
                  ? 'Save these user changes?'
                  : 'Delete this user?'}
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              {confirm.type === 'add'
                ? 'This creates the account and they will be able to sign in with the details you entered.'
                : confirm.type === 'save'
                  ? 'The name, email, role, and password change (if you entered one) will be saved.'
                  : 'The record stays in the database with user_status set to deleted. They will not be able to sign in.'}
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">{confirm.name}</p>
              <p className="text-xs text-myland-slate mt-0.5">{confirm.email}</p>
              {confirm.role && (
                <p className="text-xs text-myland-ink mt-1">Role: {confirm.role}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {confirm.type === 'add' || confirm.type === 'save' ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={persist}
                  className="inline-flex items-center justify-center rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50"
                >
                  {busy ? 'Working…' : confirm.type === 'add' ? 'Yes, add user' : 'Yes, save changes'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={runDelete}
                  className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50"
                >
                  {busy ? 'Working…' : 'Yes, delete'}
                </button>
              )}
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setConfirm(null)}
                className="btn-ghost !py-2.5 !px-5 !text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
