import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/myland-logo.png';

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink placeholder:text-myland-slate/50 outline-none focus:bg-white focus:border-myland-gold/50';

export default function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    const to = location.state?.from?.pathname || '/';
    return <Navigate to={to} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-myland-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl3 shadow-card border border-myland-mist/80 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="MyLand" className="h-10 w-auto" />
          <div>
            <p className="font-display font-bold text-myland-ink leading-none">myland</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-myland-slate mt-1">
              Admin workspace
            </p>
          </div>
        </div>

        <h1 className="font-display font-bold text-xl text-myland-ink">Welcome back</h1>
        <p className="text-sm text-myland-slate mt-1 mb-5">Sign in with your email and password.</p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
              Email
            </span>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@myland.lk"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
              Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="current-password"
                required
                minLength={8}
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

          {error && <p className="text-sm text-myland-red">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
