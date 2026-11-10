import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { updatePrivacySettings, updateDisplayName } from '../../services/storage';
import {
  X,
  User,
  Shield,
  Eye,
  CheckCheck,
  Keyboard,
  CameraOff,
  Sliders,
  Sparkles,
  LogOut,
  Key,
  Copy,
  Check,
} from 'lucide-react';

interface ProfileSettingsModalProps {
  userProfile: UserProfile;
  onNavigateToAdmin?: () => void;
  onOpenAiHelp: () => void;
  onLogout: () => void;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  userProfile,
  onNavigateToAdmin,
  onOpenAiHelp,
  onLogout,
  onClose,
  onShowToast,
}) => {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showLastSeen, setShowLastSeen] = useState(userProfile.showLastSeen);
  const [showReadReceipts, setShowReadReceipts] = useState(userProfile.showReadReceipts);
  const [showTyping, setShowTyping] = useState(userProfile.showTyping);
  const [blockScreenshots, setBlockScreenshots] = useState(userProfile.blockScreenshots);

  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    await updateDisplayName(userProfile.userId, displayName.trim());
    setIsEditingName(false);
    onShowToast('Display name updated', 'success');
  };

  const handleTogglePrivacy = async (field: string, val: boolean) => {
    if (field === 'showLastSeen') setShowLastSeen(val);
    if (field === 'showReadReceipts') setShowReadReceipts(val);
    if (field === 'showTyping') setShowTyping(val);
    if (field === 'blockScreenshots') setBlockScreenshots(val);

    await updatePrivacySettings(userProfile.userId, { [field]: val });
    onShowToast('Privacy preference saved', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-warm-surface border border-warm-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border bg-warm-surface">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-forest-900" />
            <h2 className="text-base font-bold text-forest-900">Profile & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-warm-variant text-sage-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Info Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-warm-bg border border-warm-border shadow-xs">
            <div className="w-14 h-14 rounded-full bg-forest-900 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="px-2 py-1 text-sm font-semibold border border-warm-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-forest-900"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1 bg-forest-900 text-white text-xs font-semibold rounded-lg hover:bg-forest-800 transition"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-forest-900 text-base truncate">{displayName}</h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-sage-600 hover:text-forest-900 underline"
                  >
                    Edit
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-sage-600">@{userProfile.username}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    userProfile.role === 'owner'
                      ? 'bg-ochre-100 text-ochre-900 border border-ochre-200'
                      : 'bg-sage-100 text-sage-900 border border-sage-200'
                  }`}
                >
                  {userProfile.role === 'owner' ? 'Family Owner' : 'Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Owner Dashboard Shortcut */}
          {userProfile.role === 'owner' && onNavigateToAdmin && (
            <div className="p-4 rounded-2xl bg-ochre-50 border border-ochre-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ochre-950">Family Space Management</h4>
                <p className="text-xs text-ochre-800">
                  Manage member invites, access controls, and security audit logs.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAdmin();
                }}
                className="px-3.5 py-2 bg-ochre-600 hover:bg-ochre-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Admin Panel
              </button>
            </div>
          )}

          {/* Privacy Controls Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-sage-700 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy & Visibility Controls</span>
            </h4>

            <div className="bg-warm-bg rounded-2xl border border-warm-border divide-y divide-warm-border/60">
              {/* Show Last Seen */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-sage-600" />
                  <div>
                    <div className="text-xs font-semibold text-forest-900">Show Last Seen & Online</div>
                    <div className="text-[11px] text-sage-600">Display when you were last active</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showLastSeen}
                  onChange={e => handleTogglePrivacy('showLastSeen', e.target.checked)}
                  className="w-4 h-4 accent-forest-900 cursor-pointer"
                />
              </div>

              {/* Read Receipts */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <CheckCheck className="w-4 h-4 text-sage-600" />
                  <div>
                    <div className="text-xs font-semibold text-forest-900">Read Receipts (✓✓)</div>
                    <div className="text-[11px] text-sage-600">Let family see when you read messages</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showReadReceipts}
                  onChange={e => handleTogglePrivacy('showReadReceipts', e.target.checked)}
                  className="w-4 h-4 accent-forest-900 cursor-pointer"
                />
              </div>

              {/* Typing Indicator */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-4 h-4 text-sage-600" />
                  <div>
                    <div className="text-xs font-semibold text-forest-900">Typing Indicator</div>
                    <div className="text-[11px] text-sage-600">Show when you are composing a message</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showTyping}
                  onChange={e => handleTogglePrivacy('showTyping', e.target.checked)}
                  className="w-4 h-4 accent-forest-900 cursor-pointer"
                />
              </div>

              {/* Strict Privacy Mode (Block Screenshots) */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <CameraOff className="w-4 h-4 text-sage-600" />
                  <div>
                    <div className="text-xs font-semibold text-forest-900">Strict Privacy Mode</div>
                    <div className="text-[11px] text-sage-600">
                      Disables text selection and alerts on screenshot captures
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={blockScreenshots}
                  onChange={e => handleTogglePrivacy('blockScreenshots', e.target.checked)}
                  className="w-4 h-4 accent-forest-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* In-App AI Help Guide Link */}
          <div className="p-4 rounded-2xl bg-warm-bg border border-warm-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ochre-100 flex items-center justify-center text-ochre-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-forest-900">Need help using Kinfolk?</h4>
                <p className="text-[11px] text-sage-600">Ask the private Gemini in-app assistant</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAiHelp();
              }}
              className="px-3 py-1.5 rounded-lg border border-warm-border hover:bg-warm-variant text-xs font-semibold text-forest-900 transition"
            >
              Open Guide
            </button>
          </div>

          {/* Account Recovery Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
            <Key className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Zero Phone Number Privacy:</span> Kinfolk does not use phone numbers. Make sure you keep your emergency recovery code safe for resetting your password.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-warm-border bg-warm-surface flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
