import React, { useState } from 'react';
import { bootstrapOwner } from '../../services/storage';
import confetti from 'canvas-confetti';
import {
  Shield,
  Key,
  Copy,
  Check,
  ArrowRight,
  X,
  User,
  Lock,
  Sparkles,
} from 'lucide-react';

interface OwnerBootstrapModalProps {
  onSuccess: () => void;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OwnerBootstrapModal: React.FC<OwnerBootstrapModalProps> = ({
  onSuccess,
  onClose,
  onShowToast,
}) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with generated credentials
  const [completedData, setCompletedData] = useState<{
    inviteCode: string;
    recoveryCode: string;
  } | null>(null);

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !displayName.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await bootstrapOwner(username, displayName, password);
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setCompletedData({
        inviteCode: res.inviteCode,
        recoveryCode: res.recoveryCode,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize family space.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'invite' | 'recovery') => {
    navigator.clipboard.writeText(text);
    if (type === 'invite') {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
      onShowToast('Invitation code copied!', 'success');
    } else {
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2500);
      onShowToast('Emergency recovery code copied!', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-warm-surface border border-warm-border rounded-3xl shadow-2xl overflow-hidden p-6 relative max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-sage-600 hover:bg-warm-variant transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!completedData ? (
          <div>
            <div className="flex items-center gap-2 text-ochre-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Initial Setup</span>
            </div>
            <h2 className="text-xl font-extrabold text-forest-900 mb-2">
              Initialize Family Space
            </h2>
            <p className="text-xs text-sage-600 mb-5 leading-relaxed">
              As the family space owner, you establish this secure circle and generate the first private invite for your sister or family member.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleBootstrap} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Owner Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sage-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alex"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Alex (Brother)"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Owner Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-forest-900 hover:bg-forest-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'Initializing Family Space...' : 'Create Family Space'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Space Initialized Successfully!</span>
            </div>
            <h2 className="text-xl font-extrabold text-forest-900">
              Welcome to Kinfolk
            </h2>

            {/* Sister Invitation Card */}
            <div className="p-4 rounded-2xl bg-ochre-50 border border-ochre-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ochre-900 uppercase">
                  Sister Invitation Code
                </span>
                <span className="text-[10px] text-ochre-700 font-semibold bg-ochre-200/60 px-2 py-0.5 rounded-full">
                  Valid for 7 days
                </span>
              </div>
              <p className="text-xs text-ochre-800">
                Send this one-time code to your sister so she can join your family space:
              </p>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-ochre-200">
                <span className="font-mono font-extrabold text-lg tracking-widest text-ochre-950">
                  {completedData.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(completedData.inviteCode, 'invite')}
                  className="flex items-center gap-1 px-3 py-1 bg-ochre-600 hover:bg-ochre-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Emergency Recovery Key */}
            <div className="p-4 rounded-2xl bg-warm-bg border border-warm-border space-y-2">
              <div className="flex items-center gap-2 text-forest-900 text-xs font-bold uppercase">
                <Key className="w-4 h-4 text-forest-800" />
                <span>Your Emergency Recovery Code</span>
              </div>
              <p className="text-[11px] text-sage-600">
                Save this somewhere safe. Kinfolk has no phone numbers or password reset emails. This code is the only way to recover your account if you forget your password.
              </p>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-warm-border">
                <span className="font-mono font-bold text-sm tracking-wider text-forest-900">
                  {completedData.recoveryCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(completedData.recoveryCode, 'recovery')}
                  className="flex items-center gap-1 px-3 py-1 bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold rounded-lg transition"
                >
                  {copiedRecovery ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRecovery ? 'Saved' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-4"
            >
              <span>Enter Kinfolk Messenger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
