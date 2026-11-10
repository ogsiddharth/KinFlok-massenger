import React, { useState } from 'react';
import { recoverAccount } from '../../services/storage';
import {
  Key,
  Lock,
  User,
  X,
  CheckCircle2,
} from 'lucide-react';

interface RecoveryModalProps {
  onSuccess: () => void;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  onSuccess,
  onClose,
  onShowToast,
}) => {
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanKey = recoveryCode.trim().toUpperCase();

    if (!cleanUser || !cleanKey || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await recoverAccount(cleanUser, cleanKey, newPassword);
      onShowToast('Password reset successfully! Please log in.', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Account recovery failed. Verify your recovery code.');
    } finally {
      setLoading(false);
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

        <div className="flex items-center gap-2 text-forest-900 text-xs font-bold uppercase tracking-wider mb-1">
          <Key className="w-4 h-4 text-forest-800" />
          <span>Emergency Recovery</span>
        </div>
        <h2 className="text-xl font-extrabold text-forest-900 mb-2">
          Reset Your Password
        </h2>
        <p className="text-xs text-sage-600 mb-5 leading-relaxed">
          Provide your username and the 12-character recovery key (e.g. KIN-XXXX-YYYY) that was generated when you joined Kinfolk.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRecover} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-forest-900 mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sage-500 text-xs font-mono">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-900 mb-1">
              Emergency Recovery Code
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
              <input
                type="text"
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="KIN-XXXX-YYYY"
                className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-wider bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-900 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-sage-500" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-warm-border rounded-xl text-forest-900 focus:outline-none focus:ring-1 focus:ring-forest-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-900 mb-1">
              Confirm New Password
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
            {loading ? 'Resetting Password...' : 'Reset Password & Return'}
          </button>
        </form>
      </div>
    </div>
  );
};
