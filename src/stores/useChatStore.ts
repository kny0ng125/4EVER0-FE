import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession, ChatStore } from '@/types/chat';

export const useChatStore = create<ChatStore>()((set, get) => ({
  sessions: {},
  currentSessionId: null,

  createSession: () => {
    const sessionId = uuidv4();
    const newSession: ChatSession = {
      sessionId,
      messages: [],
      usageCount: 0,
      isCompleted: false,
      createdAt: Date.now(),
    };

    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: newSession,
      },
      currentSessionId: sessionId,
    }));
    return sessionId;
  },

  addMessage: (sessionId, content, type) => {
    const message: Message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
    };

    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, message],
          },
        },
      };
    });

    return message.id;
  },

  updateLastBotMessage: (sessionId, content) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      // findIndex로 마지막 봇 메시지 인덱스 탐색 (전체 spread copy 최소화)
      let lastBotIdx = -1;
      for (let i = session.messages.length - 1; i >= 0; i--) {
        if (session.messages[i].type === 'bot') { lastBotIdx = i; break; }
      }
      if (lastBotIdx === -1) return state;

      const updatedMessage = {
        ...session.messages[lastBotIdx],
        content,
        timestamp: new Date(),
      };
      const messages = [
        ...session.messages.slice(0, lastBotIdx),
        updatedMessage,
        ...session.messages.slice(lastBotIdx + 1),
      ];

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, messages },
        },
      };
    });
  },

  // 카드 정보와 사용량 분석도 함께 업데이트
  updateLastBotMessageWithCards: (
    sessionId,
    content,
    planRecommendations,
    subscriptionRecommendations,
    usageAnalysis,
  ) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      // findIndex로 마지막 봇 메시지 인덱스 탐색
      let lastBotIdx = -1;
      for (let i = session.messages.length - 1; i >= 0; i--) {
        if (session.messages[i].type === 'bot') { lastBotIdx = i; break; }
      }
      if (lastBotIdx === -1) return state;

      const updatedMessage = {
        ...session.messages[lastBotIdx],
        content,
        timestamp: new Date(),
        planRecommendations,
        subscriptionRecommendations,
        usageAnalysis,
      };
      const messages = [
        ...session.messages.slice(0, lastBotIdx),
        updatedMessage,
        ...session.messages.slice(lastBotIdx + 1),
      ];

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, messages },
        },
      };
    });
  },

  incrementUsage: (sessionId) => {
    const state = get();
    const session = state.sessions[sessionId];

    if (!session) return false;

    if (session.usageCount >= 5) {
      // 세션 종료
      set((currentState) => ({
        ...currentState,
        sessions: {
          ...currentState.sessions,
          [sessionId]: {
            ...currentState.sessions[sessionId],
            isCompleted: true,
          },
        },
        currentSessionId: null,
      }));
      return false;
    }

    set((currentState) => ({
      ...currentState,
      sessions: {
        ...currentState.sessions,
        [sessionId]: {
          ...currentState.sessions[sessionId],
          usageCount: currentState.sessions[sessionId].usageCount + 1,
        },
      },
    }));

    return true;
  },

  endSession: (sessionId) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isCompleted: true,
          },
        },
        currentSessionId: null,
      };
    });
  },

  clearAllSessions: () => {
    set(() => ({
      sessions: {},
      currentSessionId: null,
    }));
  },

  getCurrentSession: () => {
    const state = get();
    const id = state.currentSessionId;
    if (!id) return null;
    return state.sessions[id] || null;
  },

  addPlanRecommendationsToMessage: (sessionId, messageId, plans) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, planRecommendations: plans } : msg,
      );

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: updatedMessages,
          },
        },
      };
    });
  },

  addSubscriptionRecommendationsToMessage: (sessionId, messageId, subscriptions) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, subscriptionRecommendations: subscriptions } : msg,
      );

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: updatedMessages,
          },
        },
      };
    });
  },

  markMessageAsRecommendation: (sessionId, messageId) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, isRecommendationMessage: true } : msg,
      );

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: updatedMessages,
          },
        },
      };
    });
  },

  getLatestBotMessageId: (sessionId) => {
    const session = get().sessions[sessionId];
    if (!session) return null;

    const botMessages = session.messages.filter((msg) => msg.type === 'bot');
    return botMessages.length > 0 ? botMessages[botMessages.length - 1].id : null;
  },
}));
