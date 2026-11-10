import React from 'react';
import { Message } from '../../types';
import { Reply, Copy, Edit2, Pin, PinOff, Trash2, X } from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageActionsModalProps {
  message: Message;
  currentUserId: string;
  isOwner: boolean;
  isPinned: boolean;
  onReact: (emoji: string) => void;
  onReply: (message: Message) => void;
  onCopy: (text: string) => void;
  onEdit: (message: Message) => void;
  onTogglePin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onClose: () => void;
}

export const MessageActionsModal: React.FC<MessageActionsModalProps> = ({
  message,
  currentUserId,
  isOwner,
  isPinned,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onTogglePin,
  onDelete,
  onClose,
}) => {
  const isOwnMessage = message.senderId === currentUserId;
  const canDelete = isOwnMessage || isOwner;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-warm-surface dark:bg-warm-darkSurface border border-warm-border rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-warm-border">
          <span className="text-xs font-semibold text-sage-600 uppercase tracking-wider">
            Message Options
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-warm-onSurfaceVariant hover:bg-warm-variant transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reaction Bar */}
        <div className="flex justify-between py-4 border-b border-warm-border">
          {REACTION_EMOJIS.map(emoji => {
            const hasReacted = message.reactions?.[emoji]?.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                className={`text-2xl p-2 rounded-xl transition transform hover:scale-125 active:scale-95 ${
                  hasReacted ? 'bg-ochre-100 dark:bg-ochre-900/40 ring-2 ring-ochre-400' : 'hover:bg-warm-variant'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Action list */}
        <div className="flex flex-col gap-1 pt-3">
          <button
            onClick={() => {
              onReply(message);
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-warm-variant transition text-left"
          >
            <Reply className="w-4 h-4 text-sage-600" />
            <span>Reply to message</span>
          </button>

          <button
            onClick={() => {
              onCopy(message.content);
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-warm-variant transition text-left"
          >
            <Copy className="w-4 h-4 text-sage-600" />
            <span>Copy text</span>
          </button>

          {isOwnMessage && message.type === 'text' && (
            <button
              onClick={() => {
                onEdit(message);
                onClose();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-warm-variant transition text-left"
            >
              <Edit2 className="w-4 h-4 text-sage-600" />
              <span>Edit message</span>
            </button>
          )}

          <button
            onClick={() => {
              onTogglePin(message.id);
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-warm-variant transition text-left"
          >
            {isPinned ? (
              <>
                <PinOff className="w-4 h-4 text-ochre-600" />
                <span>Unpin message</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 text-ochre-600" />
                <span>Pin to top</span>
              </>
            )}
          </button>

          {canDelete && (
            <button
              onClick={() => {
                onDelete(message.id);
                onClose();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Delete message</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
