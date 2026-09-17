const INQUIRIES = [
  {
    name: 'Tharindu Silva',
    project: 'Field Breeze – Divulapitiya',
    type: 'Site visit',
    message: 'Can we visit this Saturday morning with the family?',
    status: 'New',
  },
  {
    name: 'Menaka Jayasuriya',
    project: 'Kirindivela – Serenity Park',
    type: 'Bank loan assistance',
    message: 'Need help checking loan eligibility for a 10 perch plot.',
    status: 'In progress',
  },
  {
    name: 'Amal Perera',
    project: 'Balummahara',
    type: 'Price & availability',
    message: 'Is there a corner plot still available facing the main road?',
    status: 'New',
  },
  {
    name: 'Dilani Fernando',
    project: 'Meerigama',
    type: 'General inquiry',
    message: 'Please share the latest brochure and deed details.',
    status: 'Closed',
  },
];

export default function Inquiries() {
  return (
    <div className="space-y-4">
      {INQUIRIES.map((item) => (
        <article
          key={`${item.name}-${item.project}`}
          className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${
                item.status === 'New'
                  ? 'bg-myland-red/10 text-myland-red'
                  : item.status === 'In progress'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-myland-mist text-myland-slate'
              }`}
            >
              {item.status}
            </span>
            <span className="text-xs text-myland-slate">{item.type}</span>
          </div>
          <h2 className="font-display font-semibold text-myland-ink">{item.name}</h2>
          <p className="text-sm text-myland-red mt-1">{item.project}</p>
          <p className="text-sm text-myland-slate mt-3 leading-relaxed">{item.message}</p>
        </article>
      ))}
    </div>
  );
}
