import React from 'react';
import { Message } from '../../types';
import { AudioPlayer } from './AudioPlayer';
import { Check, CheckCheck, FileText, Download, AlertTriangle, MoreVertical } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  showReadReceipts: boolean;
  onOpenActions: (msg: Message) => void;
  onImageClick: (url: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  showReadReceipts,
  onOpenActions,
  onImageClick,
  onReact,
}) => {
  const isSent = message.senderId === currentUserId;

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isReadByOther = message.readBy && message.readBy.some(uid => uid !== message.senderId);

  // System screenshot alert notice
  if (message.type === 'system_screenshot') {
    return (
      <div className="flex justify-center my-3 px-4">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-medium shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>{message.content}</span>
          <span className="text-[10px] text-amber-700 ml-1">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col my-1.5 ${isSent ? 'items-end' : 'items-start'}`}>
      <div className={`relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%] ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Chat Bubble */}
        <div
          className={`relative px-4 py-2.5 shadow-sm transition-all text-sm leading-relaxed ${
            isSent
              ? 'bg-[#2C443B] text-[#FBF9F5] rounded-2xl rounded-tr-sm'
              : 'bg-[#ECE7DE] text-[#1E2E28] rounded-2xl rounded-tl-sm border border-warm-border/50'
          }`}
        >
          {/* Sender Display Name on Received message */}
          {!isSent && (
            <div className="text-[11px] font-bold text-sage-600 mb-1 tracking-wide">
              {message.senderName}
            </div>
          )}

          {/* Quoted Reply Snippet */}
          {message.replyToText && (
            <div
              className={`mb-2 pl-2.5 py-1 text-xs rounded-r border-l-2 ${
                isSent
                  ? 'bg-forest-950/40 border-sage-400 text-sage-100'
                  : 'bg-warm-surface border-forest-600 text-forest-800'
              }`}
            >
              <div className="font-semibold text-[11px] opacity-90">{message.replyToSender || 'Reply'}</div>
              <div className="truncate max-w-[200px] sm:max-w-[300px] opacity-80">{message.replyToText}</div>
            </div>
          )}

          {/* Message Content: Image */}
          {message.type === 'image' && message.mediaUrl && (
            <div className="mb-1.5">
              <img
                src={message.mediaUrl}
                alt={message.mediaName || 'Photo'}
                onClick={() => onImageClick(message.mediaUrl!)}
                className="rounded-xl max-h-64 w-auto object-cover cursor-pointer hover:opacity-95 transition shadow-sm"
              />
            </div>
          )}

          {/* Message Content: Audio Voice Memo */}
          {message.type === 'audio' && message.mediaUrl && (
            <div className="py-0.5">
              <AudioPlayer src={message.mediaUrl} isSent={isSent} />
            </div>
          )}

          {/* Message Content: Document */}
          {message.type === 'document' && message.mediaUrl && (
            <div
              className={`flex items-center gap-3 p-2.5 rounded-xl my-1 ${
                isSent ? 'bg-forest-800/80 text-white' : 'bg-warm-surface text-forest-900 border border-warm-border'
              }`}
            >
              <FileText className="w-6 h-6 text-ochre-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{message.mediaName || 'document'}</div>
                {message.mediaSize ? (
                  <div className="text-[10px] opacity-75">
                    {(message.mediaSize / 1024).toFixed(1)} KB
                  </div>
                ) : null}
              </div>
              <a
                href={message.mediaUrl}
                download={message.mediaName || 'file'}
                className="p-1.5 rounded-lg hover:bg-black/10 transition"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Text Content */}
          {message.content && message.type !== 'image' && message.type !== 'audio' && (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}

          {/* Metadata Footer: Timestamp & Read status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
              isSent ? 'text-sage-200' : 'text-sage-600'
            }`}
          >
            {message.isEdited && <span className="italic mr-0.5">edited</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isSent && showReadReceipts && (
              <span title={isReadByOther ? 'Read' : 'Sent'}>
                {isReadByOther ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sage-300" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-sage-400" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Hover / Touch Quick Action Menu Trigger */}
        <button
          onClick={() => onOpenActions(message)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-warm-variant text-sage-700 transition"
          title="Message actions"
          aria-label="Message actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji Reactions Bar */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isSent ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
          {Object.entries(message.reactions).map(([emoji, uids]) => {
            if (!uids || uids.length === 0) return null;
            const hasUserReacted = uids.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border shadow-xs ${
                  hasUserReacted
                    ? 'bg-ochre-100 border-ochre-300 text-ochre-900 font-semibold'
                    : 'bg-warm-surface border-warm-border text-forest-900 hover:bg-warm-variant'
                }`}
                title={`Reacted by ${uids.length} family member${uids.length > 1 ? 's' : ''}`}
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{uids.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
