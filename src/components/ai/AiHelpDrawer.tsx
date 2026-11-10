import React, { useState, useRef, useEffect } from 'react';
import { HelpMessage } from '../../types';
import { askAiAssistant } from '../../services/aiService';
import {
  Sparkles,
  Shield,
  Send,
  X,
  Bot,
  User,
  Loader2,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'How do I invite someone to Kinfolk?',
  'How does screenshot detection work?',
  'Can I block screenshots completely?',
  'How do I record and send voice messages?',
  'What happens if I lose my password?',
];

interface AiHelpDrawerProps {
  onClose: () => void;
}

export const AiHelpDrawer: React.FC<AiHelpDrawerProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Kinfolk Family Assistant. I can help answer questions about using Kinfolk, privacy settings, screenshot protection, invitations, or voice notes. What would you like to know?',
      timestamp: Date.now(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const handleAsk = async (question: string) => {
    const clean = question.trim();
    if (!clean || isLoading) return;

    const userMsg: HelpMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: clean,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const answer = await askAiAssistant(clean);
      const assistantMsg: HelpMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: answer,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: HelpMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: 'Sorry, I encountered an issue retrieving an answer. Please check your network or try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAsk(inputQuery);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-full bg-warm-surface border-l border-warm-border shadow-2xl flex flex-col animate-slide-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border bg-warm-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ochre-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-forest-900 text-sm">Kinfolk Assistant</h3>
              <p className="text-[11px] text-sage-600">Powered by Gemini • Private In-App Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-warm-variant text-sage-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zero Chat Access Guarantee Banner */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-forest-900/10 border-b border-warm-border text-forest-900 text-xs">
          <Shield className="w-4 h-4 text-forest-900 flex-shrink-0" />
          <span className="font-medium text-[11px] leading-tight">
            <strong>Zero Chat Access:</strong> This assistant cannot read your private family conversations.
          </span>
        </div>

        {/* Suggested Quick Question Chips */}
        <div className="p-3 border-b border-warm-border bg-warm-bg overflow-x-auto">
          <div className="flex gap-2">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-warm-surface hover:bg-warm-variant border border-warm-border text-[11px] font-medium text-forest-900 transition flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-warm-bg">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-ochre-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    isUser
                      ? 'bg-forest-900 text-warm-bg rounded-tr-sm shadow-sm'
                      : 'bg-warm-surface text-forest-900 rounded-tl-sm border border-warm-border shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-forest-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-sage-600 text-xs pl-9 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Consulting Gemini guide...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Field */}
        <div className="p-3 border-t border-warm-border bg-warm-surface">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about Kinfolk..."
              className="flex-1 bg-white border border-warm-border rounded-xl px-3.5 py-2 text-xs text-forest-900 placeholder-sage-500 focus:outline-none focus:ring-1 focus:ring-forest-900"
            />
            <button
              onClick={() => handleAsk(inputQuery)}
              disabled={!inputQuery.trim() || isLoading}
              className="p-2 rounded-xl bg-forest-900 hover:bg-forest-800 disabled:opacity-40 text-white transition shadow-sm"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
