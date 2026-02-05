'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function ChatInput({ placeholder, onSubmit, disabled, error }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-red-500 text-sm px-2">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="chat-input"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="p-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
