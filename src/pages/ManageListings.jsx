const LISTINGS = [
  { title: 'Field Breeze – Divulapitiya', location: 'Divulapitiya, Gampaha', status: 'For Sale', lots: 24 },
  { title: 'Highway Drive – Mirigama', location: 'Mirigama', status: 'For Sale', lots: 18 },
  { title: 'Arunalu – Biyagama', location: 'Biyagama', status: 'Hot Offer', lots: 12 },
  { title: 'Capital Point – Delgoda', location: 'Delgoda', status: 'For Sale', lots: 30 },
  { title: 'Dreamland – Dompe', location: 'Dompe', status: 'Ongoing', lots: 16 },
  { title: 'Liberty – Kaduwela', location: 'Kaduwela', status: 'For Sale', lots: 22 },
];

export default function ManageListings() {
  return (
    <div className="bg-white rounded-xl3 shadow-card border border-myland-mist/80 overflow-hidden">
      <div className="px-6 py-5 border-b border-myland-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-myland-ink">Project listings</h2>
          <p className="text-sm text-myland-slate mt-1">Sample workspace for the next listings admin pass.</p>
        </div>
        <button type="button" className="btn-primary !py-2 !px-4 !text-xs">
          Add listing
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-myland-cream text-myland-slate font-display text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 font-semibold">Project</th>
              <th className="px-6 py-3 font-semibold">Location</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Lots</th>
            </tr>
          </thead>
          <tbody>
            {LISTINGS.map((item) => (
              <tr key={item.title} className="border-t border-myland-mist">
                <td className="px-6 py-4 font-display font-semibold text-myland-ink">{item.title}</td>
                <td className="px-6 py-4 text-myland-slate">{item.location}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-myland-red/10 text-myland-red text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1">
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-myland-ink">{item.lots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
