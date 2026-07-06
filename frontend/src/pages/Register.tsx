import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Calendar, ShieldAlert, User, Mail, Lock, Phone, MessageCircle } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA' },
  { code: '+1876', label: 'JM' },
  { code: '+44', label: 'UK' },
  { code: '+61', label: 'AU' },
  { code: '+1868', label: 'TT' },
  { code: '+1246', label: 'BB' },
];

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+1876');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Phone number is required for WhatsApp notifications'); return; }
    setLoading(true);
    const fullPhone = `${countryCode}${phone.replace(/^0+/, '').replace(/\D/g, '')}`;
    try {
      await register(username, fullName, email, password, fullPhone);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Username or email might be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 py-12 relative overflow-hidden">
      {/* Background Neon Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-glow/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand/10 border border-brand/20 shadow-neon mb-3">
            <Calendar className="h-10 w-10 text-brand" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            DELEGATE
          </h1>
          <p className="text-zinc-400 font-medium">Team Scheduling & Coordination PWA</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-card p-8 shadow-2xl relative">
          <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent"></div>
          
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          {error && (
            <div className="mb-4 p-3.5 rounded-inner bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-red-200 text-sm">
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Phone Number *
                <span className="ml-2 normal-case text-emerald-400/80 font-normal inline-flex items-center gap-1">
                  <MessageCircle size={11} /> WhatsApp alerts
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  id="country-code-select"
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="bg-dark-900 border border-zinc-800 rounded-inner py-3 px-3 text-white text-sm focus:outline-none focus:border-brand transition-all shrink-0"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.label} {c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="phone-input"
                    type="tel"
                    required
                    placeholder="876 123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 mt-1.5">Used to receive WhatsApp shift alerts. Silently skipped if not configured.</p>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow hover:shadow-neon-strong active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center text-sm text-zinc-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-brand font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
