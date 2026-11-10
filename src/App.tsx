import React, { useState, useEffect } from 'react';
import { UserProfile, Conversation, Message } from './types';
import {
  hasAnyRegisteredOwner,
  getSavedSession,
  subscribeCurrentUser,
  subscribeMembers,
  subscribeConversation,
  subscribeMessages,
  getOrCreateConversation,
  logout,
} from './services/storage';

import { OfflineBanner } from './components/common/OfflineBanner';
import { Toast, ToastProps } from './components/common/Toast';
import { WelcomeView } from './components/auth/WelcomeView';
import { OwnerBootstrapModal } from './components/auth/OwnerBootstrapModal';
import { JoinWithInviteModal } from './components/auth/JoinWithInviteModal';
import { RecoveryModal } from './components/auth/RecoveryModal';
import { ChatView } from './components/chat/ChatView';
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { AiHelpDrawer } from './components/ai/AiHelpDrawer';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [hasOwner, setHasOwner] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Real-time Chat & Members
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Modals & Panels
  const [showOwnerBootstrap, setShowOwnerBootstrap] = useState(false);
  const [showJoinInvite, setShowJoinInvite] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAiHelp, setShowAiHelp] = useState(false);

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // 1. Initial owner check & saved session recovery
  useEffect(() => {
    const initAuth = async () => {
      try {
        const ownerExists = await hasAnyRegisteredOwner();
        setHasOwner(ownerExists);

        const savedUid = getSavedSession();
        if (savedUid) {
          const unsub = subscribeCurrentUser(savedUid, user => {
            if (user && !user.isLocked) {
              setCurrentUser(user);
            } else {
              setCurrentUser(null);
            }
            setIsLoadingAuth(false);
          });
          return () => unsub();
        } else {
          setIsLoadingAuth(false);
        }
      } catch (err) {
        console.error('Initialization error', err);
        setIsLoadingAuth(false);
      }
    };

    initAuth();
  }, []);

  // 2. Subscribe to members list
  useEffect(() => {
    const unsub = subscribeMembers(list => {
      setMembers(list);
      const ownerExists = list.some(u => u.role === 'owner');
      setHasOwner(ownerExists);
    });
    return () => unsub();
  }, []);

  // 3. Resolve conversation when logged in
  useEffect(() => {
    if (!currentUser) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    // Identify the other family member (e.g. Sister if user is Owner, or Owner if user is Sister)
    const otherMember = members.find(m => m.userId !== currentUser.userId);
    const otherUserId = otherMember?.userId || 'kinfolk_family_member';

    let unsubConv: (() => void) | null = null;
    let unsubMsgs: (() => void) | null = null;

    getOrCreateConversation(currentUser.userId, otherUserId).then(conv => {
      setActiveConversation(conv);

      unsubConv = subscribeConversation(conv.id, c => {
        if (c) setActiveConversation(c);
      });

      unsubMsgs = subscribeMessages(conv.id, msgs => {
        setMessages(msgs);
      });
    });

    return () => {
      if (unsubConv) unsubConv();
      if (unsubMsgs) unsubMsgs();
    };
  }, [currentUser?.userId, members]);

  // 4. Strict Privacy Mode handling (Window blur overlay & context menu)
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  useEffect(() => {
    if (!currentUser?.blockScreenshots) {
      setIsWindowBlurred(false);
      return;
    }

    const handleBlur = () => setIsWindowBlurred(true);
    const handleFocus = () => setIsWindowBlurred(false);
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [currentUser?.blockScreenshots]);

  const handleLogout = async () => {
    if (currentUser) {
      await logout(currentUser.userId);
    }
    setCurrentUser(null);
    setShowSettings(false);
    setShowAdmin(false);
    showToast('Signed out successfully', 'info');
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FBF9F5] text-forest-900">
        <div className="w-12 h-12 rounded-2xl bg-forest-900 text-white flex items-center justify-center font-black text-2xl shadow-lg mb-4 animate-bounce">
          K
        </div>
        <div className="text-sm font-semibold text-sage-600 animate-pulse">
          Opening Kinfolk Messenger...
        </div>
      </div>
    );
  }

  // Find other user object
  const otherUser = members.find(m => m.userId !== currentUser?.userId) || null;

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-[#FBF9F5] ${isWindowBlurred ? 'window-unfocused-blur' : ''}`}>
      {/* Offline banner */}
      <OfflineBanner />

      {/* Main Flow: Chat or Welcome */}
      {currentUser && activeConversation ? (
        <main className="flex-1 overflow-hidden">
          <ChatView
            currentUser={currentUser}
            otherUser={otherUser}
            conversation={activeConversation}
            messages={messages}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAiHelp={() => setShowAiHelp(true)}
            onShowToast={showToast}
          />
        </main>
      ) : (
        <WelcomeView
          hasOwner={hasOwner}
          onOpenOwnerBootstrap={() => setShowOwnerBootstrap(true)}
          onOpenJoinInvite={() => setShowJoinInvite(true)}
          onOpenRecovery={() => setShowRecovery(true)}
          onOpenAiHelp={() => setShowAiHelp(true)}
          onLoginSuccess={() => {
            const uid = getSavedSession();
            if (uid) {
              subscribeCurrentUser(uid, u => setCurrentUser(u));
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Modals & Drawers */}
      {showOwnerBootstrap && (
        <OwnerBootstrapModal
          onSuccess={() => {
            setShowOwnerBootstrap(false);
            const uid = getSavedSession();
            if (uid) subscribeCurrentUser(uid, u => setCurrentUser(u));
          }}
          onClose={() => setShowOwnerBootstrap(false)}
          onShowToast={showToast}
        />
      )}

      {showJoinInvite && (
        <JoinWithInviteModal
          onSuccess={() => {
            setShowJoinInvite(false);
            const uid = getSavedSession();
            if (uid) subscribeCurrentUser(uid, u => setCurrentUser(u));
          }}
          onClose={() => setShowJoinInvite(false)}
          onShowToast={showToast}
        />
      )}

      {showRecovery && (
        <RecoveryModal
          onSuccess={() => setShowRecovery(false)}
          onClose={() => setShowRecovery(false)}
          onShowToast={showToast}
        />
      )}

      {showSettings && currentUser && (
        <ProfileSettingsModal
          userProfile={currentUser}
          onNavigateToAdmin={currentUser.role === 'owner' ? () => setShowAdmin(true) : undefined}
          onOpenAiHelp={() => setShowAiHelp(true)}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
          onShowToast={showToast}
        />
      )}

      {showAdmin && currentUser && (
        <AdminDashboardModal
          currentUserId={currentUser.userId}
          onClose={() => setShowAdmin(false)}
          onShowToast={showToast}
        />
      )}

      {showAiHelp && (
        <AiHelpDrawer onClose={() => setShowAiHelp(false)} />
      )}

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
