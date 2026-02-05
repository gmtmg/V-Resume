'use client';

import { ChatMessage } from '@/types';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAI = message.role === 'ai';

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2 flex-shrink-0">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={isAI ? 'chat-bubble-ai' : 'chat-bubble-user'}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
