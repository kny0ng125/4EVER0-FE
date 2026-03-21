import React from 'react';
import ChatBubble from './ChatBubble';
import {
  TypingIndicator,
  CardLoadingIndicator,
  UBTILoadingIndicator,
  LikesLoadingIndicator,
} from './ChatSkeleton';

import { Message } from '@/types/chat';
import { PlanRecommendation, SubscriptionRecommendationsData } from '@/types/streaming';
import { StreamingState } from '@/hooks/useStreamingChat';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
  streamingState: StreamingState;
  expectingCards: boolean;
  currentPlanRecommendations: PlanRecommendation[];
  currentSubscriptionRecommendations: SubscriptionRecommendationsData | null;
  messagesEndRef: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = React.memo(
  ({ scrollRef, messages, isStreaming, streamingState, messagesEndRef }) => {
    const latestBotMessageId = React.useMemo(() => {
      const botMessages = messages.filter((msg) => msg.type === 'bot');
      return botMessages.length > 0 ? botMessages[botMessages.length - 1].id : null;
    }, [messages]);

    const renderLoadingState = React.useCallback(() => {
      switch (streamingState) {
        case 'waiting':
          return <TypingIndicator />;
        case 'receiving_cards':
          return <CardLoadingIndicator />;
        case 'ubti_loading':
          return <UBTILoadingIndicator />;
        case 'likes_loading':
          return <LikesLoadingIndicator />;
        case 'receiving_text':
          // 지연 스트리밍 방식에서 버퍼링 중에도 로딩 인디케이터 유지
          return <TypingIndicator />;
        default:
          return null;
      }
    }, [streamingState]);

    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 px-1">
        <div className="flex flex-col space-y-2">
          {messages.map((message: Message, index: number) => {
            const isLastMessage = index === messages.length - 1;
            const isLastBotMessage = isLastMessage && message.type === 'bot';
            const isStreamingNow = isStreaming && isLastBotMessage;
            const isLatestBotMessage = message.type === 'bot' && message.id === latestBotMessageId;

            return (
              <ChatBubble
                key={message.id || `msg-${index}`}
                message={message}
                isStreaming={isStreamingNow}
                isLatestBotMessage={isLatestBotMessage}
              />
            );
          })}

          {isStreaming && renderLoadingState()}

          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  },
);

ChatMessages.displayName = 'ChatMessages';
