const USERS = [
  { name: 'Kavithra Admin', email: 'kavithra@myland.lk', role: 'Super admin', status: 'Active' },
  { name: 'Nimal Sales', email: 'nimal@myland.lk', role: 'Sales', status: 'Active' },
  { name: 'Ishara Content', email: 'ishara@myland.lk', role: 'Editor', status: 'Active' },
  { name: 'Ruwan Site', email: 'ruwan@myland.lk', role: 'Site officer', status: 'Invited' },
  { name: 'Chamari Finance', email: 'chamari@myland.lk', role: 'Finance', status: 'Active' },
  { name: 'Guest Viewer', email: 'viewer@myland.lk', role: 'Read only', status: 'Disabled' },
];

export default function UserManagement() {
  return (
    <div className="bg-white rounded-xl3 shadow-card border border-myland-mist/80 overflow-hidden">
      <div className="px-6 py-5 border-b border-myland-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-myland-ink">Staff accounts</h2>
          <p className="text-sm text-myland-slate mt-1">Sample user list. Roles and invites can be wired later.</p>
        </div>
        <button type="button" className="btn-primary !py-2 !px-4 !text-xs">
          Invite user
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-myland-cream text-myland-slate font-display text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Role</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((user) => (
              <tr key={user.email} className="border-t border-myland-mist">
                <td className="px-6 py-4 font-display font-semibold text-myland-ink">{user.name}</td>
                <td className="px-6 py-4 text-myland-slate">{user.email}</td>
                <td className="px-6 py-4 text-myland-ink">{user.role}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1 ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : user.status === 'Invited'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-myland-mist text-myland-slate'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
