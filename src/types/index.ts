export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  role: 'owner' | 'member';
  passwordHash: string;
  recoveryCodeHash: string;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeen?: number | null; // epoch ms
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTyping: boolean;
  blockScreenshots: boolean;
  isLocked: boolean;
  isTyping?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface Invitation {
  code: string; // e.g. KIN-ABCD
  createdBy: string;
  status: 'pending' | 'used' | 'revoked';
  usedBy?: string | null;
  usedAt?: number | null;
  expiresAt: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    timestamp: number;
  } | null;
  pinnedMessageId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'system_screenshot';
  mediaUrl?: string | null;
  mediaName?: string | null;
  mediaSize?: number;
  replyToId?: string | null;
  replyToText?: string | null;
  replyToSender?: string | null;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  readBy: string[]; // array of userIds
  isEdited: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUser?: string | null;
  details: string;
  timestamp: number;
}

export interface HelpMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}
