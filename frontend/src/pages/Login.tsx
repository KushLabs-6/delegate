import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Calendar, ShieldAlert, Key, Mail, Lock } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Mocked request to password reset
      setResetSent(true);
    } catch (err: any) {
      setError('Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 relative overflow-hidden">
      {/* Background Neon Glow Dots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-glow/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand/10 border border-brand/20 shadow-neon mb-3">
            <Calendar className="h-10 w-10 text-brand" />
          </div>
          <h1 className="text-4xl font-extrabold font-sans tracking-tight text-white mb-2">
            DELEGATE
          </h1>
          <p className="text-zinc-400 font-medium">Team Scheduling & Coordination PWA</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-card p-8 shadow-2xl relative">
          <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent"></div>
          
          <h2 className="text-2xl font-bold text-white mb-6">
            {isResetMode ? 'Reset Password' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-4 p-3.5 rounded-inner bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-red-200 text-sm">
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isResetMode ? (
            resetSent ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 mb-4">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Reset Link Sent</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  We've sent a recovery link to <span className="text-white font-medium">{email}</span>. Click the link inside to set a new password.
                </p>
                <button
                  onClick={() => {
                    setIsResetMode(false);
                    setResetSent(false);
                  }}
                  className="w-full py-3 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow hover:shadow-neon-strong active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Recovery Email'}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(false)}
                    className="text-brand text-sm hover:underline"
                  >
                    Cancel and go back
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Email / Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="admin@delegate.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-brand text-xs hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
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
                className="w-full py-3.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow hover:shadow-neon-strong active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-center text-sm text-zinc-500 mt-4">
                Don't have an account?{' '}
                <Link to="/register" className="text-brand font-semibold hover:underline">
                  Create Account
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Demo Box */}
        {!isResetMode && (
          <div className="mt-6 p-4 rounded-card bg-brand/5 border border-brand/10 text-center text-zinc-400 text-xs flex flex-col items-center gap-1.5 shadow-neon">
            <div className="flex items-center gap-1.5 text-brand font-bold uppercase tracking-wider">
              <Key className="h-4 w-4" />
              <span>Developer Demo Access</span>
            </div>
            <p>Seeded accounts are ready for testing. Login with:</p>
            <div className="font-mono text-zinc-200 mt-1 select-all bg-dark-950 px-3 py-1.5 rounded-inner border border-zinc-800">
              User: <span className="text-brand">admin@delegate.app</span> <br/>
              Pass: <span className="text-brand">admin123</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
