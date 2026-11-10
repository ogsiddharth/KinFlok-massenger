import React, { useState } from 'react';
import { joinWithInvitation } from '../../services/storage';
import confetti from 'canvas-confetti';
import {
  Key,
  Copy,
  Check,
  ArrowRight,
  X,
  User,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

interface JoinWithInviteModalProps {
  onSuccess: () => void;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const JoinWithInviteModal: React.FC<JoinWithInviteModalProps> = ({
  onSuccess,
  onClose,
  onShowToast,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode || !username.trim() || !displayName.trim() || !password) {
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
      const res = await joinWithInvitation(cleanCode, username, displayName, password);
      try {
        confetti({ particleCount: 70, spread: 55, origin: { y: 0.6 } });
      } catch {}
      setRecoveryCode(res.recoveryCode);
    } catch (err: any) {
      setError(err?.message || 'Failed to join family space. Check your invite code.');
    } finally {
      setLoading(false);
    }
  };

  const copyRecovery = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2500);
    onShowToast('Emergency recovery code copied!', 'success');
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

        {!recoveryCode ? (
          <div>
            <div className="flex items-center gap-2 text-sage-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Mail className="w-4 h-4" />
              <span>Invitation Access</span>
            </div>
            <h2 className="text-xl font-extrabold text-forest-900 mb-2">
              Join Your Family Circle
            </h2>
            <p className="text-xs text-sage-600 mb-5 leading-relaxed">
              Enter the single-use invitation code provided by your family owner to set up your private account.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Invitation Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="KIN-XXXX"
                  className="w-full px-3 py-2 text-sm font-mono uppercase tracking-wider bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Choose Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sage-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="maya"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Your Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Maya (Sister)"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest-900 mb-1">
                  Password
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
                {loading ? 'Joining Family Space...' : 'Accept Invitation & Join'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Joined Successfully!</span>
            </div>
            <h2 className="text-xl font-extrabold text-forest-900">
              Welcome to Kinfolk!
            </h2>
            <p className="text-xs text-sage-600">
              Your account is ready. Below is your private emergency recovery code.
            </p>

            {/* Emergency Recovery Key */}
            <div className="p-4 rounded-2xl bg-warm-bg border border-warm-border space-y-2">
              <div className="flex items-center gap-2 text-forest-900 text-xs font-bold uppercase">
                <Key className="w-4 h-4 text-forest-800" />
                <span>Your Emergency Recovery Code</span>
              </div>
              <p className="text-[11px] text-sage-600">
                Please save this code in your notes or password manager. If you ever lose your password, this code is the only way to recover your account.
              </p>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-warm-border">
                <span className="font-mono font-bold text-sm tracking-wider text-forest-900">
                  {recoveryCode}
                </span>
                <button
                  type="button"
                  onClick={copyRecovery}
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
              <span>Start Family Chat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
