import React from 'react';
import { ToneSwitch } from './ToneSwitch';
import { Sparkles, MessageCircle, Crown, Lock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { ChatSession } from '@/types/chat';

interface ChatHeaderProps {
  ubtiInProgress: boolean;
  isMunerTone: boolean;
  onToneToggle: (isMuner: boolean) => void;
  onResetChat: () => void;
  buttonDisabled: boolean;
  currentSession: ChatSession | null;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  ubtiInProgress,
  isMunerTone,
  onToneToggle,
  onResetChat,
  buttonDisabled,
  currentSession,
}) => {
  const { isLoggedIn } = useAuthStore();

  const usageDisplay = React.useMemo(
    () => (currentSession ? `${currentSession.usageCount}/5` : '0/5'),
    [currentSession?.usageCount],
  );

  const usageCount = currentSession?.usageCount || 0;
  const isWarningLevel = usageCount >= 4;

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 px-0 py-2 bg-white border-b border-gray-100 shrink-0 transition-all duration-300',
        'sm:flex-row sm:items-center sm:h-12s',
        ubtiInProgress && 'bg-gradient-to-r from-purple-50 to-blue-50',
      )}
    >
      {/* 첫 번째 줄: 제목 + UBTI 상태 */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-brand-darkblue truncate">
            {ubtiInProgress ? '🐙 타코시그널' : '무너와 대화하기'}
          </h1>

          {!ubtiInProgress && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetChat}
              disabled={buttonDisabled}
              className="h-7 w-7 text-gray-400 hover:text-brand-darkblue hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              title="대화 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}

          {ubtiInProgress && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span className="font-medium">분석 진행중</span>
            </div>
          )}
        </div>

        {ubtiInProgress && (
          <div className="sm:hidden flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span className="font-medium">진행중</span>
          </div>
        )}
      </div>

      {/* 컨트롤바 */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 sm:w-auto">
        {/* 로그인 상태 표시 */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-xs bg-brand-red/10 text-brand-darkblue px-2 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              <span className="font-medium hidden sm:inline">U+멤버십</span>
              <span className="font-medium sm:hidden">Premium</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:inline">무료 채팅</span>
              <span className="text-xs text-gray-500 sm:hidden">무료</span>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  isWarningLevel
                    ? 'bg-red-100 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-600',
                )}
              >
                {usageDisplay}
              </span>
            </div>
          )}
        </div>

        {/* 톤 스위치 - 로그인 상태에 따라 제어 */}
        <div className="flex-shrink-0 relative">
          {isLoggedIn ? (
            <div id="tutorial-tone-switch">
              {/* 튜토리얼용 ID 추가 */}
              <ToneSwitch
                isMunerTone={isMunerTone}
                onToggle={onToneToggle}
                disabled={buttonDisabled}
              />
            </div>
          ) : (
            <div className="relative group">
              <div id="tutorial-tone-switch" className="opacity-50 pointer-events-none">
                {/* 튜토리얼용 ID 추가 */}
                <ToneSwitch isMunerTone={false} onToggle={() => {}} disabled={true} />
              </div>

              {/* 잠금 아이콘 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-800/80 text-white p-1 rounded-full">
                  <Lock className="w-3 h-3" />
                </div>
              </div>

              {/* 툴팁 */}
              <div
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                            bg-gray-800 text-white text-xs px-2 py-1 rounded 
                            opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
              >
                로그인 후 이용가능
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
