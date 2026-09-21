import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  HiOutlineHome,
  HiOutlineStar,
  HiOutlineBookOpen,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineChatAlt2,
  HiOutlineLocationMarker,
  HiOutlineLogout,
} from 'react-icons/hi';
import logo from '../assets/myland-logo.png';
import { useAuth } from '../context/AuthContext.jsx';
import { SiteSettingsProvider, useSiteSettings } from '../context/SiteSettingsContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: HiOutlineHome, end: true },
  { to: '/reviews', label: 'Review Authorizer', icon: HiOutlineStar },
  { to: '/blogs', label: 'Blog Listing', icon: HiOutlineBookOpen, requiresBlogPage: true },
  { to: '/listings', label: 'Manage Listings', icon: HiOutlineOfficeBuilding },
  { to: '/property-updates', label: 'Property Updates', icon: HiOutlineLocationMarker },
  { to: '/users', label: 'User Management', icon: HiOutlineUsers, adminOnly: true },
  { to: '/inquiries', label: 'Inquiries', icon: HiOutlineChatAlt2 },
];

const TITLES = {
  '/': 'Dashboard',
  '/reviews': 'Review Authorizer',
  '/blogs': 'Blog Listing',
  '/listings': 'Manage Listings',
  '/listings/new': 'Add Project',
  '/property-updates': 'Property Updates',
  '/users': 'User Management',
  '/inquiries': 'Inquiries',
};

function pageTitle(pathname) {
  if (pathname === '/listings/new') return 'Add Project';
  if (/^\/listings\/[^/]+\/edit$/.test(pathname)) return 'Edit Project';
  return TITLES[pathname] || 'Admin';
}

function initials(name) {
  const parts = String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]).join('').toUpperCase() || 'ML';
}

function AdminShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { blogPageEnabled, loading } = useSiteSettings();
  const nav = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.requiresBlogPage && isAdmin && !blogPageEnabled) return false;
    return true;
  });

  useEffect(() => {
    if (!loading && isAdmin && !blogPageEnabled && pathname.startsWith('/blogs')) {
      navigate('/', { replace: true });
    }
  }, [blogPageEnabled, loading, isAdmin, pathname, navigate]);

  return (
    <div className="min-h-screen bg-myland-cream flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-myland-mist">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-myland-mist">
          <img src={logo} alt="Myland" className="h-9 w-auto" fetchPriority="high" decoding="async" />
          <div>
            <p className="font-display font-bold text-sm text-myland-ink leading-none">myland</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-myland-slate mt-1">Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-display font-semibold transition-colors ${
                    isActive
                      ? 'bg-myland-red/10 text-myland-red'
                      : 'text-myland-slate hover:bg-myland-cream hover:text-myland-ink'
                  }`
                }
              >
                <Icon className="text-lg shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <p className="px-6 py-4 text-[11px] text-myland-slate border-t border-myland-mist">
          Signed in as {user?.role}
        </p>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-myland-mist">
          <div className="flex items-center justify-between gap-4 px-4 md:px-8 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-myland-red font-semibold">
                Myland Admin
              </p>
              <h1 className="font-display font-bold text-xl text-myland-ink">
                {pageTitle(pathname)}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-myland-mist bg-white pl-1 pr-3 py-1">
                <span className="w-8 h-8 rounded-full bg-myland-red text-white text-xs font-display font-bold flex items-center justify-center">
                  {initials(user?.name)}
                </span>
                <span className="text-sm font-display font-semibold text-myland-ink">
                  {user?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-10 h-10 rounded-full border border-myland-mist bg-white flex items-center justify-center text-myland-ink"
                aria-label="Sign out"
              >
                <HiOutlineLogout />
              </button>
            </div>
          </div>
          <nav className="md:hidden flex gap-1 overflow-x-auto px-4 pb-3 no-scrollbar">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-3 py-1.5 text-xs font-display font-semibold ${
                    isActive ? 'bg-myland-red text-white' : 'bg-myland-mist text-myland-slate'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <SiteSettingsProvider>
      <AdminShell />
    </SiteSettingsProvider>
  );
}
