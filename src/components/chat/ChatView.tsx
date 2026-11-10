import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Conversation, Message } from '../../types';
import { MessageItem } from './MessageItem';
import { MessageActionsModal } from './MessageActionsModal';
import { AudioRecorder } from './AudioRecorder';
import { ImageLightbox } from './ImageLightbox';
import {
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  markAsRead,
  togglePinMessage,
  setUserTyping,
  notifyScreenshot,
} from '../../services/storage';
import {
  Send,
  Mic,
  Plus,
  Image as ImageIcon,
  FileText,
  Search,
  Settings,
  Sparkles,
  Pin,
  X,
  Shield,
  ChevronDown,
} from 'lucide-react';

interface ChatViewProps {
  currentUser: UserProfile;
  otherUser: UserProfile | null;
  conversation: Conversation;
  messages: Message[];
  onOpenSettings: () => void;
  onOpenAiHelp: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  otherUser,
  conversation,
  messages,
  onOpenSettings,
  onOpenAiHelp,
  onShowToast,
}) => {
  const [textInput, setTextInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessageState, setEditingMessageState] = useState<Message | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputPhotoRef = useRef<HTMLInputElement | null>(null);
  const fileInputDocRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!currentUser.showReadReceipts) return;
    messages.forEach(msg => {
      if (msg.senderId !== currentUser.userId && (!msg.readBy || !msg.readBy.includes(currentUser.userId))) {
        markAsRead(conversation.id, msg.id, currentUser.userId);
      }
    });
  }, [messages, currentUser.userId, conversation.id, currentUser.showReadReceipts]);

  // Screenshot Detection Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        onShowToast('⚠️ Screenshot detected! Alerting the family chat.', 'info');
        notifyScreenshot(conversation.id, currentUser.userId, currentUser.displayName);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [conversation.id, currentUser.userId, currentUser.displayName, onShowToast]);

  // Typing indicator debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
    if (!currentUser.showTyping) return;

    setUserTyping(currentUser.userId, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      setUserTyping(currentUser.userId, false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    const clean = textInput.trim();
    if (!clean) return;

    if (editingMessageState) {
      await editMessage(conversation.id, editingMessageState.id, clean);
      setEditingMessageState(null);
      setTextInput('');
      onShowToast('Message updated', 'success');
      return;
    }

    try {
      await sendMessage(
        conversation.id,
        currentUser.userId,
        currentUser.displayName,
        clean,
        'text',
        {
          replyToId: replyTo?.id,
          replyToText: replyTo?.content,
          replyToSender: replyTo?.senderName,
        }
      );
      setTextInput('');
      setReplyTo(null);
      setUserTyping(currentUser.userId, false);
    } catch (err: any) {
      onShowToast('Failed to send message', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Photo upload handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Photo must be less than 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await sendMessage(
        conversation.id,
        currentUser.userId,
        currentUser.displayName,
        'Shared a photo',
        'image',
        {
          mediaUrl: dataUrl,
          mediaName: file.name,
          mediaSize: file.size,
        }
      );
      onShowToast('Photo sent', 'success');
    };
    reader.readAsDataURL(file);
    setShowAttachmentMenu(false);
    if (fileInputPhotoRef.current) fileInputPhotoRef.current.value = '';
  };

  // Document upload handler
  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Document must be under 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await sendMessage(
        conversation.id,
        currentUser.userId,
        currentUser.displayName,
        'Shared a document',
        'document',
        {
          mediaUrl: dataUrl,
          mediaName: file.name,
          mediaSize: file.size,
        }
      );
      onShowToast('Document sent', 'success');
    };
    reader.readAsDataURL(file);
    setShowAttachmentMenu(false);
    if (fileInputDocRef.current) fileInputDocRef.current.value = '';
  };

  // Voice memo complete handler
  const handleAudioComplete = async (audioDataUrl: string, durationSec: number) => {
    setIsRecordingAudio(false);
    try {
      await sendMessage(
        conversation.id,
        currentUser.userId,
        currentUser.displayName,
        'Voice memo',
        'audio',
        {
          mediaUrl: audioDataUrl,
          mediaName: `Voice Memo (${durationSec}s)`,
          mediaSize: audioDataUrl.length,
        }
      );
      onShowToast('Voice memo sent', 'success');
    } catch {
      onShowToast('Failed to send voice memo', 'error');
    }
  };

  // Pinned message
  const pinnedMsg = messages.find(m => m.id === conversation.pinnedMessageId);

  // Filter messages by search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Presence status string
  const isOtherOnline = otherUser?.isOnline && (otherUser?.showLastSeen ?? true);
  const otherIsTyping = otherUser?.isTyping && (otherUser?.showTyping ?? true);

  const presenceSubtitle = otherIsTyping
    ? 'typing...'
    : isOtherOnline
    ? 'Active now'
    : otherUser?.showLastSeen && otherUser?.lastSeen
    ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Private status';

  return (
    <div
      className={`flex flex-col h-full bg-[#FBF9F5] select-text ${
        currentUser.blockScreenshots ? 'privacy-protected' : ''
      }`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputPhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />
      <input
        ref={fileInputDocRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip"
        className="hidden"
        onChange={handleDocSelect}
      />

      {/* Top App Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#F3EFE8] border-b border-warm-border shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#1E2E28] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {otherUser?.displayName?.charAt(0).toUpperCase() || 'F'}
            </div>
            {isOtherOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-[#1E2E28] text-sm md:text-base leading-tight">
              {otherUser?.displayName || 'Family Member'}
            </span>
            <span
              className={`text-xs ${
                otherIsTyping
                  ? 'text-ochre-600 font-semibold animate-pulse'
                  : isOtherOnline
                  ? 'text-emerald-700 font-medium'
                  : 'text-sage-600'
              }`}
            >
              {presenceSubtitle}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            className={`p-2 rounded-xl transition ${
              isSearching ? 'bg-warm-variant text-forest-900' : 'text-sage-700 hover:bg-warm-variant'
            }`}
            title="Search conversation"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* AI Help Assistant Button */}
          <button
            onClick={onOpenAiHelp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ochre-100 hover:bg-ochre-200 border border-ochre-300 text-ochre-900 text-xs font-semibold transition shadow-xs"
            title="Open Kinfolk AI Assistant"
          >
            <Sparkles className="w-4 h-4 text-ochre-600 animate-spin-slow" />
            <span className="hidden md:inline">AI Guide</span>
          </button>

          {/* Settings / Profile */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-sage-700 hover:bg-warm-variant transition"
            title="Settings & Profile"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Inline Search Bar */}
      {isSearching && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-warm-variant/80 border-b border-warm-border animate-slide-down">
          <Search className="w-4 h-4 text-sage-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search in family chat..."
            className="flex-1 bg-transparent border-none text-sm focus:outline-none text-[#1E2E28] placeholder-sage-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-sage-600 hover:text-forest-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <div className="flex items-center justify-between px-4 py-2 bg-ochre-50 border-b border-ochre-200 text-ochre-950 text-xs shadow-xs">
          <div className="flex items-center gap-2 truncate flex-1 mr-2">
            <Pin className="w-3.5 h-3.5 text-ochre-700 flex-shrink-0" />
            <span className="font-semibold">{pinnedMsg.senderName}:</span>
            <span className="truncate opacity-90">{pinnedMsg.content}</span>
          </div>
          <button
            onClick={() => togglePinMessage(conversation.id, null)}
            className="p-1 hover:bg-ochre-100 rounded text-ochre-700 transition"
            title="Unpin message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 text-sage-600">
            <div className="w-14 h-14 rounded-2xl bg-warm-surface border border-warm-border flex items-center justify-center mb-3 shadow-xs">
              <Shield className="w-7 h-7 text-sage-600" />
            </div>
            <h3 className="font-bold text-forest-900 text-base mb-1">Welcome to Kinfolk</h3>
            <p className="text-xs max-w-sm text-sage-600">
              This space is strictly private for you and your family. Send your first message, photo, or voice memo below!
            </p>
          </div>
        ) : (
          filteredMessages.map(msg => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUser.userId}
              showReadReceipts={currentUser.showReadReceipts}
              onOpenActions={setSelectedMessageForAction}
              onImageClick={setPreviewImageUrl}
              onReact={(msgId, emoji) => toggleReaction(conversation.id, msgId, emoji, currentUser.userId)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-warm-surface border-t border-warm-border text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sage-600">Replying to</span>
            <span className="font-semibold text-forest-900">{replyTo.senderName}:</span>
            <span className="truncate text-sage-700">{replyTo.content}</span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 hover:bg-warm-variant rounded-full text-sage-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessageState && (
        <div className="flex items-center justify-between px-4 py-2 bg-ochre-50 border-t border-ochre-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ochre-900">Editing message</span>
          </div>
          <button
            onClick={() => {
              setEditingMessageState(null);
              setTextInput('');
            }}
            className="p-1 hover:bg-ochre-100 rounded-full text-ochre-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom Composer */}
      <div className="relative p-3 sm:p-4 bg-[#F3EFE8] border-t border-warm-border shadow-md">
        {/* Attachment Popup Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-16 left-4 bg-warm-surface border border-warm-border rounded-2xl shadow-xl p-2 flex flex-col gap-1 z-30 animate-slide-up">
            <button
              onClick={() => {
                fileInputPhotoRef.current?.click();
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-forest-900 hover:bg-warm-variant transition text-left"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Share Photo</span>
            </button>
            <button
              onClick={() => {
                fileInputDocRef.current?.click();
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-forest-900 hover:bg-warm-variant transition text-left"
            >
              <FileText className="w-4 h-4 text-ochre-600" />
              <span>Share Document</span>
            </button>
            <button
              onClick={() => {
                setIsRecordingAudio(true);
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-forest-900 hover:bg-warm-variant transition text-left"
            >
              <Mic className="w-4 h-4 text-sage-600" />
              <span>Record Voice Memo</span>
            </button>
          </div>
        )}

        {isRecordingAudio ? (
          <AudioRecorder
            onComplete={handleAudioComplete}
            onCancel={() => setIsRecordingAudio(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className={`p-2.5 rounded-full transition ${
                showAttachmentMenu
                  ? 'bg-forest-900 text-white'
                  : 'bg-warm-variant hover:bg-sage-200 text-forest-900'
              }`}
              title="Add attachment"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input field */}
            <input
              type="text"
              value={textInput}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessageState ? 'Update your message...' : 'Message Kinfolk...'}
              className="flex-1 bg-white border border-warm-border rounded-2xl px-4 py-2.5 text-sm text-forest-900 placeholder-sage-500 focus:outline-none focus:ring-2 focus:ring-forest-900/30 transition shadow-inner"
            />

            {/* Mic or Send button */}
            {textInput.trim() ? (
              <button
                onClick={handleSendMessage}
                className="p-2.5 rounded-full bg-[#1E2E28] hover:bg-[#2C443B] text-white transition shadow-sm"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingAudio(true)}
                className="p-2.5 rounded-full bg-warm-variant hover:bg-sage-200 text-forest-900 transition"
                title="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Message Action Sheet Modal */}
      {selectedMessageForAction && (
        <MessageActionsModal
          message={selectedMessageForAction}
          currentUserId={currentUser.userId}
          isOwner={currentUser.role === 'owner'}
          isPinned={conversation.pinnedMessageId === selectedMessageForAction.id}
          onReact={emoji => toggleReaction(conversation.id, selectedMessageForAction.id, emoji, currentUser.userId)}
          onReply={msg => setReplyTo(msg)}
          onCopy={text => {
            navigator.clipboard.writeText(text);
            onShowToast('Copied to clipboard', 'success');
          }}
          onEdit={msg => {
            setEditingMessageState(msg);
            setTextInput(msg.content);
          }}
          onTogglePin={msgId => {
            const nextPinned = conversation.pinnedMessageId === msgId ? null : msgId;
            togglePinMessage(conversation.id, nextPinned);
            onShowToast(nextPinned ? 'Message pinned to top' : 'Message unpinned', 'success');
          }}
          onDelete={msgId => {
            deleteMessage(conversation.id, msgId);
            onShowToast('Message deleted', 'info');
          }}
          onClose={() => setSelectedMessageForAction(null)}
        />
      )}

      {/* Image Preview Lightbox */}
      {previewImageUrl && (
        <ImageLightbox src={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      )}
    </div>
  );
};
