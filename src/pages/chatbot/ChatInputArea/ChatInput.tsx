import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({
    onSendMessage,
    disabled = false,
    placeholder = '무너에게 메시지를 입력하세요...',
    autoFocus = false,
  }) => {
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (trimmedMessage && !disabled) {
          onSendMessage(trimmedMessage);
          setMessage('');
        }
      },
      [message, disabled, onSendMessage],
    );

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e);
        }
      },
      [handleSubmit],
    );

    return (
      <form onSubmit={handleSubmit} className="flex w-full items-center h-10 space-x-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder={disabled ? '무너가 답변을 생각 중...' : placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1 h-full px-3 text-sm rounded-lg border-gray-300 focus:border-brand-yellow focus:ring-brand-yellow/20"
          maxLength={500}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !message.trim()}
          className="shrink-0 rounded-lg w-10 h-10 bg-brand-darkblue hover:bg-brand-darkblue/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    );
  },
);

ChatInput.displayName = 'ChatInput';
