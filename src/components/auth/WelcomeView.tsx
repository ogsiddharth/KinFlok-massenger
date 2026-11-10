import React, { useState } from 'react';
import { login, isFirebaseConfigured } from '../../services/storage';
import {
  Shield,
  Key,
  Lock,
  ArrowRight,
  User,
  Users,
  Sparkles,
  Database,
  HelpCircle,
} from 'lucide-react';

interface WelcomeViewProps {
  hasOwner: boolean;
  onOpenOwnerBootstrap: () => void;
  onOpenJoinInvite: () => void;
  onOpenRecovery: () => void;
  onOpenAiHelp: () => void;
  onLoginSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  hasOwner,
  onOpenOwnerBootstrap,
  onOpenJoinInvite,
  onOpenRecovery,
  onOpenAiHelp,
  onLoginSuccess,
  onShowToast,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanUser, password);
      onShowToast(`Welcome back, @${cleanUser}!`, 'success');
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1E2E28] flex items-center justify-center text-white font-black text-xl shadow-md">
            K
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#1E2E28] leading-none">
              Kinfolk
            </h1>
            <span className="text-[11px] font-semibold text-sage-600">
              Private Family Messenger
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAiHelp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ochre-100 border border-ochre-200 text-ochre-900 text-xs font-semibold hover:bg-ochre-200 transition shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-ochre-600" />
          <span>Need Help?</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-[#F3EFE8] border border-warm-border rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Hero Emblem & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#1E2E28] text-warm-bg mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-ochre-400" />
            </div>
            <h2 className="text-2xl font-black text-[#1E2E28] tracking-tight">
              {hasOwner ? 'Family Sign In' : 'Set Up Family Circle'}
            </h2>
            <p className="text-xs text-sage-600 mt-1 max-w-xs mx-auto leading-relaxed">
              Zero phone numbers. No strangers. Pure privacy exclusively for you and your family.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {!hasOwner ? (
            /* First run: Prompt owner bootstrap */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-warm-bg border border-warm-border text-xs text-sage-700 space-y-2">
                <div className="font-bold text-forest-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ochre-600" />
                  <span>No Family Space Found</span>
                </div>
                <p>
                  You are the first person here! Initialize this private space as the <strong>Family Owner</strong>. You will immediately receive a private invitation code to share with your sister.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenOwnerBootstrap}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1E2E28] hover:bg-[#2C443B] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Initialize Family Space</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-warm-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#F3EFE8] px-3 text-sage-500 font-medium">
                    or already have an invite?
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenJoinInvite}
                className="w-full py-3 px-4 rounded-2xl bg-warm-bg hover:bg-warm-variant border border-warm-border text-forest-900 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-sage-600" />
                <span>Join with Invitation Code</span>
              </button>
            </div>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-sage-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-forest-900">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onOpenRecovery}
                    className="text-[11px] text-sage-600 hover:text-forest-900 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-sage-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900 shadow-inner"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1E2E28] hover:bg-[#2C443B] disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'Signing In...' : 'Sign In to Kinfolk'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-warm-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#F3EFE8] px-3 text-sage-500 font-medium">
                    New family member?
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenJoinInvite}
                className="w-full py-3 px-4 rounded-2xl bg-warm-bg hover:bg-warm-variant border border-warm-border text-forest-900 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-sage-600" />
                <span>Join with Invitation Code</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom Status & Info Bar */}
      <footer className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sage-600 border-t border-warm-border/60 pt-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-sage-500" />
          <span>
            {isFirebaseConfigured ? (
              <span className="text-emerald-700 font-medium">
                Live Firebase Firestore Connected
              </span>
            ) : (
              <span className="text-sage-600">
                Local Multi-Tab Persistent Sync Active
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenRecovery}
            className="hover:text-forest-900 hover:underline"
          >
            Account Recovery
          </button>
          <span>•</span>
          <button
            onClick={onOpenAiHelp}
            className="hover:text-forest-900 hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>AI Guide</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
