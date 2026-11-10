import React, { useState, useEffect } from 'react';
import { UserProfile, Invitation, AuditLog } from '../../types';
import {
  subscribeMembers,
  subscribeInvitations,
  subscribeAuditLogs,
  createInvitation,
  revokeInvitation,
  toggleLockMember,
} from '../../services/storage';
import {
  X,
  Shield,
  Users,
  Key,
  History,
  Plus,
  Copy,
  Check,
  Ban,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

interface AdminDashboardModalProps {
  currentUserId: string;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  currentUserId,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'invites' | 'members' | 'audit'>('invites');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [durationDays, setDurationDays] = useState(7);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const unsubMembers = subscribeMembers(setMembers);
    const unsubInvites = subscribeInvitations(setInvitations);
    const unsubAudit = subscribeAuditLogs(setAuditLogs);

    return () => {
      unsubMembers();
      unsubInvites();
      unsubAudit();
    };
  }, []);

  const handleCreateInvite = async () => {
    try {
      const code = await createInvitation(currentUserId, durationDays);
      setNewlyCreatedCode(code);
      onShowToast(`Invitation ${code} generated!`, 'success');
    } catch {
      onShowToast('Failed to create invitation', 'error');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    onShowToast(`Invitation code ${code} copied!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleRevoke = async (code: string) => {
    if (!window.confirm(`Are you sure you want to revoke invitation ${code}?`)) return;
    await revokeInvitation(code, currentUserId);
    onShowToast(`Invitation ${code} revoked`, 'info');
  };

  const handleToggleLock = async (member: UserProfile) => {
    if (member.userId === currentUserId) {
      onShowToast('You cannot lock your own owner account', 'error');
      return;
    }
    const nextLocked = !member.isLocked;
    await toggleLockMember(member.userId, nextLocked, currentUserId);
    onShowToast(
      `${member.displayName}'s account has been ${nextLocked ? 'locked' : 'unlocked'}`,
      'info'
    );
  };

  // Metrics
  const activeMembersCount = members.filter(m => !m.isLocked).length;
  const onlineCount = members.filter(m => m.isOnline).length;
  const pendingInvitesCount = invitations.filter(
    i => i.status === 'pending' && (!i.expiresAt || i.expiresAt > Date.now())
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-warm-surface border border-warm-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border bg-warm-surface">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-ochre-700" />
            <h2 className="text-base font-bold text-forest-900">Family Owner Administration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-warm-variant text-sage-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-warm-bg border-b border-warm-border">
          <div className="p-3 rounded-xl bg-warm-surface border border-warm-border text-center">
            <div className="text-xl font-extrabold text-forest-900">{members.length}</div>
            <div className="text-[11px] font-medium text-sage-600">Total Members</div>
          </div>
          <div className="p-3 rounded-xl bg-warm-surface border border-warm-border text-center">
            <div className="text-xl font-extrabold text-emerald-700">{onlineCount}</div>
            <div className="text-[11px] font-medium text-sage-600">Online Now</div>
          </div>
          <div className="p-3 rounded-xl bg-warm-surface border border-warm-border text-center">
            <div className="text-xl font-extrabold text-ochre-700">{pendingInvitesCount}</div>
            <div className="text-[11px] font-medium text-sage-600">Active Invites</div>
          </div>
          <div className="p-3 rounded-xl bg-warm-surface border border-warm-border text-center">
            <div className="text-xl font-extrabold text-sage-700">{auditLogs.length}</div>
            <div className="text-[11px] font-medium text-sage-600">Audit Events</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-warm-border bg-warm-surface">
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'invites'
                ? 'border-forest-900 text-forest-900 bg-warm-bg'
                : 'border-transparent text-sage-600 hover:text-forest-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Invitations</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'members'
                ? 'border-forest-900 text-forest-900 bg-warm-bg'
                : 'border-transparent text-sage-600 hover:text-forest-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Family Members</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'audit'
                ? 'border-forest-900 text-forest-900 bg-warm-bg'
                : 'border-transparent text-sage-600 hover:text-forest-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Security Audit Log</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: INVITATIONS */}
          {activeTab === 'invites' && (
            <div className="space-y-5">
              {/* Generator Card */}
              <div className="p-4 rounded-2xl bg-warm-bg border border-warm-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-2">
                  Generate Invitation for Family Member
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sage-700">Valid for:</span>
                    <select
                      value={durationDays}
                      onChange={e => setDurationDays(Number(e.target.value))}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-warm-border bg-white text-forest-900 focus:outline-none"
                    >
                      <option value={1}>24 Hours</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (Recommended)</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCreateInvite}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Invite Code</span>
                  </button>
                </div>

                {newlyCreatedCode && (
                  <div className="mt-3 p-3 rounded-xl bg-ochre-50 border border-ochre-300 flex items-center justify-between animate-fade-in">
                    <div>
                      <span className="text-[11px] text-ochre-800 font-semibold uppercase block">
                        New Code Generated:
                      </span>
                      <span className="text-lg font-mono font-bold text-ochre-950">
                        {newlyCreatedCode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(newlyCreatedCode)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ochre-600 text-white text-xs font-bold hover:bg-ochre-700 transition"
                    >
                      {copiedCode === newlyCreatedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Existing Invitations List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sage-600 mb-2">
                  All Invitation Codes
                </h4>
                {invitations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-sage-500 bg-warm-bg rounded-xl border border-warm-border">
                    No invitation codes generated yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invitations.map(inv => {
                      const isExpired = inv.expiresAt && inv.expiresAt < Date.now();
                      const status = inv.status === 'pending' && isExpired ? 'expired' : inv.status;

                      const statusBadge =
                        status === 'pending'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : status === 'used'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : status === 'revoked'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200';

                      return (
                        <div
                          key={inv.code}
                          className="flex items-center justify-between p-3 rounded-xl bg-warm-bg border border-warm-border text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm text-forest-900 tracking-wider">
                              {inv.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge}`}
                            >
                              {status}
                            </span>
                            <span className="text-sage-500 text-[11px] hidden sm:inline">
                              Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(inv.code)}
                              className="p-1.5 rounded-lg hover:bg-warm-variant text-sage-700 transition"
                              title="Copy code"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {status === 'pending' && (
                              <button
                                onClick={() => handleRevoke(inv.code)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"
                                title="Revoke code"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {members.map(member => (
                <div
                  key={member.userId}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    member.isLocked
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-warm-bg border-warm-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-forest-900 text-white flex items-center justify-center font-bold text-sm">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      {member.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-forest-900">{member.displayName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            member.role === 'owner'
                              ? 'bg-ochre-100 text-ochre-900'
                              : 'bg-sage-100 text-sage-900'
                          }`}
                        >
                          {member.role}
                        </span>
                        {member.isLocked && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">
                            Locked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-sage-500">@{member.username}</div>
                    </div>
                  </div>

                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleToggleLock(member)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        member.isLocked
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {member.isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-sage-500 bg-warm-bg rounded-xl border border-warm-border">
                  No audit log entries recorded.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-warm-bg border border-warm-border text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sage-800 bg-warm-variant px-1.5 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-sage-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-forest-900 text-xs">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-warm-border bg-warm-surface flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 transition"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
