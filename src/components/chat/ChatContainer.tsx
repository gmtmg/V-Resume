'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, ProfileData, ProfileField, ProfileQuestion } from '@/types';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    field: 'fullName',
    question: 'はじめまして!V-Resumeへようこそ。まずはお名前を教えてください。',
    placeholder: '山田 太郎',
    validation: (v) => v.length < 2 ? '2文字以上で入力してください' : null,
  },
  {
    field: 'email',
    question: 'ありがとうございます!次に、メールアドレスを教えてください。',
    placeholder: 'example@email.com',
    validation: (v) => !v.includes('@') ? '有効なメールアドレスを入力してください' : null,
  },
  {
    field: 'phone',
    question: '連絡先の電話番号を教えてください。',
    placeholder: '090-1234-5678',
    validation: (v) => v.replace(/\D/g, '').length < 10 ? '有効な電話番号を入力してください' : null,
  },
  {
    field: 'desiredJobType',
    question: 'どのような職種を希望されていますか?',
    placeholder: 'フロントエンドエンジニア、プロダクトマネージャーなど',
  },
  {
    field: 'experience',
    question: '最後に、これまでのご経歴を簡単に教えてください。',
    placeholder: 'Web開発5年、スタートアップでの経験あり...',
  },
];

interface ChatContainerProps {
  onComplete: (data: ProfileData) => void;
}

export function ChatContainer({ onComplete }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = PROFILE_QUESTIONS[currentQuestionIndex];
  const isComplete = currentQuestionIndex >= PROFILE_QUESTIONS.length;

  // Add initial AI message
  useEffect(() => {
    if (messages.length === 0) {
      addAIMessage(PROFILE_QUESTIONS[0].question);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAIMessage = (content: string) => {
    setIsTyping(true);
    // Simulate typing delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleSubmit = (value: string) => {
    if (!currentQuestion || isTyping) return;

    // Validate input
    if (currentQuestion.validation) {
      const validationError = currentQuestion.validation(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: value,
        timestamp: new Date(),
      },
    ]);

    // Update profile data
    const newProfileData = {
      ...profileData,
      [currentQuestion.field]: value,
    };
    setProfileData(newProfileData);

    // Move to next question or complete
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);

    if (nextIndex < PROFILE_QUESTIONS.length) {
      addAIMessage(PROFILE_QUESTIONS[nextIndex].question);
    } else {
      // All questions answered
      addAIMessage('素晴らしいですね!プロフィールの登録が完了しました。次はカメラとマイクの設定を確認しましょう。');
      setTimeout(() => {
        onComplete(newProfileData as ProfileData);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isComplete && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
          <ChatInput
            placeholder={currentQuestion?.placeholder || '入力してください...'}
            onSubmit={handleSubmit}
            disabled={isTyping}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
