import {
  PlanRecommendation,
  SubscriptionRecommendationsData,
  UsageAnalysisData,
} from './streaming';

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  planRecommendations?: PlanRecommendation[]; // 요금제 카드
  subscriptionRecommendations?: SubscriptionRecommendationsData; // 구독 카드
  usageAnalysis?: UsageAnalysisData; // 사용량 분석
  isRecommendationMessage?: boolean; // 추천 메시지인지 여부
}

export interface ChatSession {
  sessionId: string;
  messages: Message[];
  isCompleted: boolean;
  usageCount: number;
  createdAt?: number;
}

export interface ChatState {
  sessions: Record<string, ChatSession>;
  currentSessionId: string | null;
}

export interface UBTIQuestion {
  id: number;
  question: string;
  step: number;
  total_steps: number;
  options?: string[];
}

// 채팅 액션
export interface ChatActions {
  // 세션 관리
  createSession: () => string;
  endSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  getCurrentSession: () => ChatSession | null;

  // 메시지 관리
  addMessage: (sessionId: string, content: string, type: 'user' | 'bot') => string;
  updateLastBotMessage: (sessionId: string, content: string) => void;

  // 카드 정보 관리
  updateLastBotMessageWithCards: (
    sessionId: string,
    content: string,
    planRecommendations?: PlanRecommendation[],
    subscriptionRecommendations?: SubscriptionRecommendationsData,
    usageAnalysis?: UsageAnalysisData,
  ) => void;

  addPlanRecommendationsToMessage: (
    sessionId: string,
    messageId: string,
    plans: PlanRecommendation[],
  ) => void;

  addSubscriptionRecommendationsToMessage: (
    sessionId: string,
    messageId: string,
    subscriptions: SubscriptionRecommendationsData,
  ) => void;

  markMessageAsRecommendation: (sessionId: string, messageId: string) => void;
  getLatestBotMessageId: (sessionId: string) => string | null;
  incrementUsage: (sessionId: string) => boolean;
}

export interface ChatStore extends ChatState, ChatActions {}
