import { UserProfile, Invitation, Conversation, Message, AuditLog } from '../types';
import { hashPassword, generateRecoveryCode, generateInviteCode, generateUniqueId } from './security';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Firestore,
  serverTimestamp,
  arrayUnion,
  runTransaction
} from 'firebase/firestore';

// Check if Firebase credentials exist
const env = (import.meta as any).env || {};
export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_API_KEY !== 'your_firebase_web_api_key'
);

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };

    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreDb = getFirestore(firebaseApp);

  } catch (err) {
    console.warn('Failed to initialize Firebase, falling back to local persistent store:', err);
    firestoreDb = null;
  }
}


// -----------------------------------------------------------------------------
// LOCAL / HYBRID REAL-TIME STORE (IndexedDB / LocalStorage + BroadcastChannel)
// -----------------------------------------------------------------------------
const STORAGE_PREFIX = 'kinfolk_data_';
const CHANNEL_NAME = 'kinfolk_realtime_broadcast';
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

// Subscribers for local mode
type Listener<T> = (data: T) => void;
const subscribers = {
  users: new Set<Listener<UserProfile[]>>(),
  invitations: new Set<Listener<Invitation[]>>(),
  conversations: new Set<Listener<Conversation[]>>(),
  messages: new Map<string, Set<Listener<Message[]>>>(),
  auditLogs: new Set<Listener<AuditLog[]>>(),
};

function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    if (channel) {
      channel.postMessage({ type: 'CHANGE', key });
    }
    notifyLocalSubscribers(key);
  } catch (err) {
    console.error('Error saving local item', err);
  }
}

if (channel) {
  channel.onmessage = (event) => {
    if (event.data?.type === 'CHANGE') {
      notifyLocalSubscribers(event.data.key);
    }
  };
}

function notifyLocalSubscribers(key: string) {
  if (key === 'users') {
    const users = getLocalItem<UserProfile[]>('users', []);
    subscribers.users.forEach(fn => fn(users));
  } else if (key === 'invitations') {
    const invites = getLocalItem<Invitation[]>('invitations', []);
    subscribers.invitations.forEach(fn => fn(invites));
  } else if (key === 'conversations') {
    const convs = getLocalItem<Conversation[]>('conversations', []);
    subscribers.conversations.forEach(fn => fn(convs));
  } else if (key.startsWith('messages_')) {
    const convId = key.replace('messages_', '');
    const msgs = getLocalItem<Message[]>(key, []);
    subscribers.messages.get(convId)?.forEach(fn => fn(msgs));
  } else if (key === 'auditLogs') {
    const logs = getLocalItem<AuditLog[]>('auditLogs', []);
    subscribers.auditLogs.forEach(fn => fn(logs));
  }
}

// -----------------------------------------------------------------------------
// PUBLIC STORAGE API
// -----------------------------------------------------------------------------

export async function hasAnyRegisteredOwner(): Promise<boolean> {
  if (firestoreDb) {
    try {
      const q = query(collection(firestoreDb, 'users'), where('role', '==', 'owner'), limit(1));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (e) {
      console.warn('Firestore query failed, checking local store:', e);
    }
  }
  const users = getLocalItem<UserProfile[]>('users', []);
  return users.some(u => u.role === 'owner');
}

export async function bootstrapOwner(
  username: string,
  displayName: string,
  password: string
): Promise<{ profile: UserProfile; inviteCode: string; recoveryCode: string }> {
  const cleanUsername = username.toLowerCase().trim();
  const cleanDisplay = displayName.trim();
  const uid = generateUniqueId();
  const passwordHash = await hashPassword(password, cleanUsername);
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashPassword(recoveryCode, cleanUsername);

  const ownerProfile: UserProfile = {
    userId: uid,
    username: cleanUsername,
    displayName: cleanDisplay,
    role: 'owner',
    passwordHash,
    recoveryCodeHash: recoveryHash,
    isOnline: true,
    lastSeen: Date.now(),
    showLastSeen: true,
    showReadReceipts: true,
    showTyping: true,
    blockScreenshots: false,
    isLocked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sisterInviteCode = generateInviteCode();
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const invite: Invitation = {
    code: sisterInviteCode,
    createdBy: uid,
    status: 'pending',
    expiresAt: expiry,
    createdAt: Date.now(),
  };

  const log: AuditLog = {
    id: generateUniqueId(),
    action: 'FAMILY_SPACE_INITIALIZED',
    performedBy: uid,
    details: `Family space initialized by owner ${cleanDisplay} (${cleanUsername}). Sister invite ${sisterInviteCode} generated.`,
    timestamp: Date.now(),
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'users', uid), ownerProfile);
      await setDoc(doc(firestoreDb, 'admins', uid), { userId: uid, role: 'owner', createdAt: serverTimestamp() });
      await setDoc(doc(firestoreDb, 'invitations', sisterInviteCode), invite);
      await setDoc(doc(firestoreDb, 'audit_logs', log.id), log);
    } catch (e) {
      console.error('Firestore bootstrap failed, persisting locally:', e);
    }
  }

  // Always update local cache & state
  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem('users', [...users.filter(u => u.userId !== uid), ownerProfile]);

  const invites = getLocalItem<Invitation[]>('invitations', []);
  setLocalItem('invitations', [...invites, invite]);

  const logs = getLocalItem<AuditLog[]>('auditLogs', []);
  setLocalItem('auditLogs', [log, ...logs]);

  saveCurrentSession(uid);
  return { profile: ownerProfile, inviteCode: sisterInviteCode, recoveryCode };
}

export async function joinWithInvitation(
  inviteCode: string,
  username: string,
  displayName: string,
  password: string
): Promise<{ profile: UserProfile; recoveryCode: string }> {
  const cleanCode = inviteCode.toUpperCase().trim();
  const cleanUsername = username.toLowerCase().trim();
  const cleanDisplay = displayName.trim();

  let invite: Invitation | null = null;

  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'invitations', cleanCode));
      if (snap.exists()) {
        invite = snap.data() as Invitation;
      }
    } catch (e) {
      console.warn('Firestore fetch failed for invite:', e);
    }
  }

  if (!invite) {
    const invites = getLocalItem<Invitation[]>('invitations', []);
    invite = invites.find(i => i.code.toUpperCase() === cleanCode) || null;
  }

  if (!invite) {
    throw new Error('Invalid invitation code.');
  }
  if (invite.status !== 'pending') {
    throw new Error('This invitation has already been used or revoked.');
  }
  if (invite.expiresAt && invite.expiresAt < Date.now()) {
    throw new Error('This invitation code has expired.');
  }

  // Check username uniqueness
  const users = getLocalItem<UserProfile[]>('users', []);
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username '${cleanUsername}' is already taken.`);
  }

  const uid = generateUniqueId();
  const passwordHash = await hashPassword(password, cleanUsername);
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashPassword(recoveryCode, cleanUsername);

  const memberProfile: UserProfile = {
    userId: uid,
    username: cleanUsername,
    displayName: cleanDisplay,
    role: 'member',
    passwordHash,
    recoveryCodeHash: recoveryHash,
    isOnline: true,
    lastSeen: Date.now(),
    showLastSeen: true,
    showReadReceipts: true,
    showTyping: true,
    blockScreenshots: false,
    isLocked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedInvite: Invitation = {
    ...invite,
    status: 'used',
    usedBy: uid,
    usedAt: Date.now(),
  };

  const log: AuditLog = {
    id: generateUniqueId(),
    action: 'MEMBER_JOINED',
    performedBy: uid,
    details: `New family member ${cleanDisplay} (${cleanUsername}) joined using invite code ${cleanCode}.`,
    timestamp: Date.now(),
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'users', uid), memberProfile);
      await updateDoc(doc(firestoreDb, 'invitations', cleanCode), {
        status: 'used',
        usedBy: uid,
        usedAt: serverTimestamp(),
      });
      await setDoc(doc(firestoreDb, 'audit_logs', log.id), log);
    } catch (e) {
      console.warn('Firestore save for member failed:', e);
    }
  }

  setLocalItem('users', [...users.filter(u => u.userId !== uid), memberProfile]);

  const allInvites = getLocalItem<Invitation[]>('invitations', []);
  setLocalItem(
    'invitations',
    allInvites.map(i => (i.code.toUpperCase() === cleanCode ? updatedInvite : i))
  );

  const allLogs = getLocalItem<AuditLog[]>('auditLogs', []);
  setLocalItem('auditLogs', [log, ...allLogs]);

  saveCurrentSession(uid);
  return { profile: memberProfile, recoveryCode };
}

export async function login(username: string, password: string): Promise<UserProfile> {
  const cleanUsername = username.toLowerCase().trim();
  const passwordHash = await hashPassword(password, cleanUsername);

  let profile: UserProfile | null = null;

  if (firestoreDb) {
    try {
      const q = query(collection(firestoreDb, 'users'), where('username', '==', cleanUsername), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        profile = snap.docs[0].data() as UserProfile;
      }
    } catch (e) {
      console.warn('Firestore login lookup failed:', e);
    }
  }

  if (!profile) {
    const users = getLocalItem<UserProfile[]>('users', []);
    profile = users.find(u => u.username.toLowerCase() === cleanUsername) || null;
  }

  if (!profile) {
    throw new Error(`No account found with username '${cleanUsername}'.`);
  }

  if (profile.isLocked) {
    throw new Error('This account has been locked by the family owner.');
  }

  if (profile.passwordHash !== passwordHash) {
    throw new Error('Incorrect password. Please try again or use account recovery.');
  }

  // Update presence
  profile.isOnline = true;
  profile.lastSeen = Date.now();

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', profile.userId), {
        isOnline: true,
        lastSeen: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore update presence failed:', e);
    }
  }

  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem(
    'users',
    users.map(u => (u.userId === profile!.userId ? { ...u, isOnline: true, lastSeen: Date.now() } : u))
  );

  saveCurrentSession(profile.userId);
  return profile;
}

export async function recoverAccount(
  username: string,
  recoveryCode: string,
  newPassword: string
): Promise<void> {
  const cleanUsername = username.toLowerCase().trim();
  const cleanRecovery = recoveryCode.toUpperCase().trim();
  const recoveryHash = await hashPassword(cleanRecovery, cleanUsername);

  let profile: UserProfile | null = null;
  const users = getLocalItem<UserProfile[]>('users', []);
  profile = users.find(u => u.username.toLowerCase() === cleanUsername) || null;

  if (!profile) {
    throw new Error(`No account found with username '${cleanUsername}'.`);
  }

  if (profile.recoveryCodeHash !== recoveryHash) {
    throw new Error('Invalid emergency recovery code.');
  }

  const newHash = await hashPassword(newPassword, cleanUsername);

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', profile.userId), {
        passwordHash: newHash,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore password reset update failed:', e);
    }
  }

  setLocalItem(
    'users',
    users.map(u => (u.userId === profile!.userId ? { ...u, passwordHash: newHash, updatedAt: Date.now() } : u))
  );
}

// -----------------------------------------------------------------------------
// SESSION
// -----------------------------------------------------------------------------
const SESSION_KEY = 'kinfolk_current_user_id';

export function saveCurrentSession(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, userId);
  }
}

export function getSavedSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function clearCurrentSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function logout(userId?: string): Promise<void> {
  if (userId) {
    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'users', userId), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore logout presence failed:', e);
      }
    }
    const users = getLocalItem<UserProfile[]>('users', []);
    setLocalItem(
      'users',
      users.map(u => (u.userId === userId ? { ...u, isOnline: false, lastSeen: Date.now() } : u))
    );
  }
  clearCurrentSession();
}

// -----------------------------------------------------------------------------
// SUBSCRIPTIONS (Real-time updates)
// -----------------------------------------------------------------------------

export function subscribeCurrentUser(
  userId: string,
  callback: (user: UserProfile | null) => void
): () => void {
  if (firestoreDb) {
    const unsub = onSnapshot(
      doc(firestoreDb, 'users', userId),
      snap => {
        if (snap.exists()) {
          callback(snap.data() as UserProfile);
        } else {
          callback(null);
        }
      },
      err => {
        console.warn('Firestore user observer error:', err);
      }
    );
    return unsub;
  }

  // Local mode subscription
  const listener: Listener<UserProfile[]> = users => {
    const found = users.find(u => u.userId === userId) || null;
    callback(found);
  };
  subscribers.users.add(listener);

  // Initial call
  const users = getLocalItem<UserProfile[]>('users', []);
  callback(users.find(u => u.userId === userId) || null);

  return () => {
    subscribers.users.delete(listener);
  };
}

export function subscribeMembers(callback: (members: UserProfile[]) => void): () => void {
  if (firestoreDb) {
    const q = query(collection(firestoreDb, 'users'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => d.data() as UserProfile);
        callback(list);
      },
      err => {
        console.warn('Firestore members observer error:', err);
      }
    );
    return unsub;
  }

  const listener: Listener<UserProfile[]> = users => callback(users);
  subscribers.users.add(listener);
  callback(getLocalItem<UserProfile[]>('users', []));
  return () => {
    subscribers.users.delete(listener);
  };
}

export function subscribeInvitations(callback: (invites: Invitation[]) => void): () => void {
  if (firestoreDb) {
    const q = query(collection(firestoreDb, 'invitations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => d.data() as Invitation);
        callback(list);
      },
      err => {
        console.warn('Firestore invites observer error:', err);
      }
    );
    return unsub;
  }

  const listener: Listener<Invitation[]> = invites => callback(invites);
  subscribers.invitations.add(listener);
  callback(getLocalItem<Invitation[]>('invitations', []));
  return () => {
    subscribers.invitations.delete(listener);
  };
}

export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  if (firestoreDb) {
    const q = query(collection(firestoreDb, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => d.data() as AuditLog);
        callback(list);
      },
      err => {
        console.warn('Firestore audit logs observer error:', err);
      }
    );
    return unsub;
  }

  const listener: Listener<AuditLog[]> = logs => callback(logs);
  subscribers.auditLogs.add(listener);
  callback(getLocalItem<AuditLog[]>('auditLogs', []));
  return () => {
    subscribers.auditLogs.delete(listener);
  };
}

// -----------------------------------------------------------------------------
// CONVERSATIONS & MESSAGING
// -----------------------------------------------------------------------------

export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<Conversation> {
  const convs = getLocalItem<Conversation[]>('conversations', []);
  const existing = convs.find(c =>
    c.participants.includes(currentUserId) && c.participants.includes(otherUserId)
  );
  if (existing) {
    return existing;
  }

  const convId = generateUniqueId();
  const newConvo: Conversation = {
    id: convId,
    participants: [currentUserId, otherUserId],
    lastMessage: {
      content: 'Family chat started',
      senderId: 'system',
      senderName: 'Kinfolk',
      timestamp: Date.now(),
    },
    pinnedMessageId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'conversations', convId), newConvo);
    } catch (e) {
      console.warn('Firestore conversation creation failed:', e);
    }
  }

  setLocalItem('conversations', [...convs, newConvo]);
  return newConvo;
}

export function subscribeConversation(
  convId: string,
  callback: (conv: Conversation | null) => void
): () => void {
  if (firestoreDb) {
    const unsub = onSnapshot(
      doc(firestoreDb, 'conversations', convId),
      snap => {
        callback(snap.exists() ? (snap.data() as Conversation) : null);
      },
      err => {
        console.warn('Firestore conversation listener error:', err);
      }
    );
    return unsub;
  }

  const listener: Listener<Conversation[]> = list => {
    const c = list.find(x => x.id === convId) || null;
    callback(c);
  };
  subscribers.conversations.add(listener);
  const all = getLocalItem<Conversation[]>('conversations', []);
  callback(all.find(x => x.id === convId) || null);
  return () => {
    subscribers.conversations.delete(listener);
  };
}

export function subscribeMessages(
  convId: string,
  callback: (msgs: Message[]) => void
): () => void {
  if (firestoreDb) {
    const q = query(
      collection(firestoreDb, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const msgs = snap.docs.map(d => d.data() as Message);
        callback(msgs);
      },
      err => {
        console.warn('Firestore messages listener error:', err);
      }
    );
    return unsub;
  }

  if (!subscribers.messages.has(convId)) {
    subscribers.messages.set(convId, new Set());
  }
  const listener: Listener<Message[]> = msgs => callback(msgs);
  subscribers.messages.get(convId)!.add(listener);

  const initialMsgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  callback(initialMsgs);

  return () => {
    subscribers.messages.get(convId)?.delete(listener);
  };
}

export async function sendMessage(
  convId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: 'text' | 'image' | 'audio' | 'document' | 'system_screenshot' = 'text',
  options: {
    mediaUrl?: string | null;
    mediaName?: string | null;
    mediaSize?: number;
    replyToId?: string | null;
    replyToText?: string | null;
    replyToSender?: string | null;
  } = {}
): Promise<string> {
  const messageId = generateUniqueId();
  const timestamp = Date.now();

  const msg: Message = {
    id: messageId,
    conversationId: convId,
    senderId,
    senderName,
    content,
    type,
    mediaUrl: options.mediaUrl || null,
    mediaName: options.mediaName || null,
    mediaSize: options.mediaSize || 0,
    replyToId: options.replyToId || null,
    replyToText: options.replyToText || null,
    replyToSender: options.replyToSender || null,
    reactions: {},
    readBy: [senderId],
    isEdited: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const preview =
    type === 'image'
      ? '📷 Photo'
      : type === 'audio'
      ? '🎙️ Voice note'
      : type === 'document'
      ? '📄 Document'
      : type === 'system_screenshot'
      ? '⚠️ Screenshot notification'
      : content.slice(0, 80);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'conversations', convId, 'messages', messageId), msg);
      await updateDoc(doc(firestoreDb, 'conversations', convId), {
        lastMessage: {
          content: preview,
          senderId,
          senderName,
          timestamp,
        },
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore sendMessage failed:', e);
    }
  }

  // Update local message list
  const msgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  setLocalItem(`messages_${convId}`, [...msgs, msg]);

  // Update conversation lastMessage
  const convs = getLocalItem<Conversation[]>('conversations', []);
  setLocalItem(
    'conversations',
    convs.map(c =>
      c.id === convId
        ? {
            ...c,
            lastMessage: { content: preview, senderId, senderName, timestamp },
            updatedAt: timestamp,
          }
        : c
    )
  );

  return messageId;
}

export async function editMessage(
  convId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'conversations', convId, 'messages', messageId), {
        content: newContent.trim(),
        isEdited: true,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore editMessage failed:', e);
    }
  }

  const msgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  setLocalItem(
    `messages_${convId}`,
    msgs.map(m =>
      m.id === messageId ? { ...m, content: newContent.trim(), isEdited: true, updatedAt: Date.now() } : m
    )
  );
}

export async function deleteMessage(convId: string, messageId: string): Promise<void> {
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'conversations', convId, 'messages', messageId));
    } catch (e) {
      console.warn('Firestore deleteMessage failed:', e);
    }
  }

  const msgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  setLocalItem(
    `messages_${convId}`,
    msgs.filter(m => m.id !== messageId)
  );
}

export async function toggleReaction(
  convId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  const msg = msgs.find(m => m.id === messageId);
  if (!msg) return;

  const currentReactions = { ...msg.reactions };
  const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
  const idx = userList.indexOf(userId);

  if (idx >= 0) {
    userList.splice(idx, 1);
    if (userList.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = userList;
    }
  } else {
    userList.push(userId);
    currentReactions[emoji] = userList;
  }

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'conversations', convId, 'messages', messageId), {
        reactions: currentReactions,
      });
    } catch (e) {
      console.warn('Firestore toggleReaction failed:', e);
    }
  }

  setLocalItem(
    `messages_${convId}`,
    msgs.map(m => (m.id === messageId ? { ...m, reactions: currentReactions } : m))
  );
}

export async function markAsRead(
  convId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const msgs = getLocalItem<Message[]>(`messages_${convId}`, []);
  const msg = msgs.find(m => m.id === messageId);
  if (!msg || msg.readBy.includes(userId)) return;

  const newReadBy = [...msg.readBy, userId];

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'conversations', convId, 'messages', messageId), {
        readBy: arrayUnion(userId),
      });
    } catch (e) {
      console.warn('Firestore markAsRead failed:', e);
    }
  }

  setLocalItem(
    `messages_${convId}`,
    msgs.map(m => (m.id === messageId ? { ...m, readBy: newReadBy } : m))
  );
}

export async function togglePinMessage(
  convId: string,
  messageId: string | null
): Promise<void> {
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'conversations', convId), {
        pinnedMessageId: messageId,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore togglePinMessage failed:', e);
    }
  }

  const convs = getLocalItem<Conversation[]>('conversations', []);
  setLocalItem(
    'conversations',
    convs.map(c => (c.id === convId ? { ...c, pinnedMessageId: messageId, updatedAt: Date.now() } : c))
  );
}

export async function setUserTyping(userId: string, isTyping: boolean): Promise<void> {
  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem(
    'users',
    users.map(u => (u.userId === userId ? { ...u, isTyping } : u))
  );

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', userId), { isTyping });
    } catch (e) {
      // Non-critical presence update
    }
  }
}

export async function updatePrivacySettings(
  userId: string,
  settings: Partial<UserProfile>
): Promise<void> {
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', userId), {
        ...settings,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore updatePrivacySettings failed:', e);
    }
  }

  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem(
    'users',
    users.map(u => (u.userId === userId ? { ...u, ...settings, updatedAt: Date.now() } : u))
  );
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const clean = displayName.trim();
  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', userId), {
        displayName: clean,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore updateDisplayName failed:', e);
    }
  }

  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem(
    'users',
    users.map(u => (u.userId === userId ? { ...u, displayName: clean, updatedAt: Date.now() } : u))
  );
}

// -----------------------------------------------------------------------------
// ADMIN ACTIONS
// -----------------------------------------------------------------------------

export async function createInvitation(ownerId: string, durationDays: number = 7): Promise<string> {
  const code = generateInviteCode();
  const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000;

  const invite: Invitation = {
    code,
    createdBy: ownerId,
    status: 'pending',
    expiresAt: expiry,
    createdAt: Date.now(),
  };

  const log: AuditLog = {
    id: generateUniqueId(),
    action: 'INVITATION_CREATED',
    performedBy: ownerId,
    details: `Generated invitation ${code} valid for ${durationDays} days.`,
    timestamp: Date.now(),
  };

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'invitations', code), invite);
      await setDoc(doc(firestoreDb, 'audit_logs', log.id), log);
    } catch (e) {
      console.warn('Firestore createInvitation failed:', e);
    }
  }

  const invites = getLocalItem<Invitation[]>('invitations', []);
  setLocalItem('invitations', [invite, ...invites]);

  const logs = getLocalItem<AuditLog[]>('auditLogs', []);
  setLocalItem('auditLogs', [log, ...logs]);

  return code;
}

export async function revokeInvitation(code: string, ownerId: string): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  const log: AuditLog = {
    id: generateUniqueId(),
    action: 'INVITATION_REVOKED',
    performedBy: ownerId,
    details: `Revoked invitation code ${cleanCode}.`,
    timestamp: Date.now(),
  };

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'invitations', cleanCode), { status: 'revoked' });
      await setDoc(doc(firestoreDb, 'audit_logs', log.id), log);
    } catch (e) {
      console.warn('Firestore revokeInvitation failed:', e);
    }
  }

  const invites = getLocalItem<Invitation[]>('invitations', []);
  setLocalItem(
    'invitations',
    invites.map(i => (i.code.toUpperCase() === cleanCode ? { ...i, status: 'revoked' } : i))
  );

  const logs = getLocalItem<AuditLog[]>('auditLogs', []);
  setLocalItem('auditLogs', [log, ...logs]);
}

export async function toggleLockMember(
  targetUserId: string,
  lock: boolean,
  adminId: string
): Promise<void> {
  const log: AuditLog = {
    id: generateUniqueId(),
    action: lock ? 'ACCOUNT_LOCKED' : 'ACCOUNT_UNLOCKED',
    performedBy: adminId,
    targetUser: targetUserId,
    details: `${lock ? 'Locked' : 'Unlocked'} account ${targetUserId}.`,
    timestamp: Date.now(),
  };

  if (firestoreDb) {
    try {
      await updateDoc(doc(firestoreDb, 'users', targetUserId), { isLocked: lock });
      await setDoc(doc(firestoreDb, 'audit_logs', log.id), log);
    } catch (e) {
      console.warn('Firestore toggleLockMember failed:', e);
    }
  }

  const users = getLocalItem<UserProfile[]>('users', []);
  setLocalItem(
    'users',
    users.map(u => (u.userId === targetUserId ? { ...u, isLocked: lock } : u))
  );

  const logs = getLocalItem<AuditLog[]>('auditLogs', []);
  setLocalItem('auditLogs', [log, ...logs]);
}

export async function notifyScreenshot(
  convId: string,
  senderId: string,
  senderName: string
): Promise<void> {
  await sendMessage(
    convId,
    senderId,
    senderName,
    `${senderName} took a screenshot of the chat`,
    'system_screenshot'
  );
}
