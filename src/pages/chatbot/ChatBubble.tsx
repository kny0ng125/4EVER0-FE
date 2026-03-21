import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { Message } from '@/types/chat';
import { PlanRecommendation } from '@/types/streaming';
import { AvatarComponent } from '@/components/Avatar';
import { SubscriptionCard } from '@/components/SubscriptionCard/SubscriptionCard';
import { UsageAnalysisCard } from '@/components/UsageAnalysisCard/UsageAnalysisCard';
import { cn } from '@/lib/utils';
import { IMAGES } from '@/constant/imagePath';
import { useNavigate } from 'react-router-dom';
import { PlanSwiper } from '@/components/PlanCard/PlanSwiper';
import { toast } from 'sonner';
import { changeCouponLike } from '@/apis/coupon/changeCouponlike';

interface ChatBubbleProps {
  message: Message;
  isStreaming?: boolean;
  isLatestBotMessage?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = React.memo(
  ({ message, isStreaming = false, isLatestBotMessage = false }: ChatBubbleProps) => {
    const isBot = message.type === 'bot';
    const navigate = useNavigate();

    // 고유 키 생성 (timestamp 타입 안전 처리용)
    const uniqueMessageKey = React.useMemo(() => {
      const timestampValue =
        message.timestamp instanceof Date
          ? message.timestamp.getTime()
          : typeof message.timestamp === 'number'
            ? message.timestamp
            : Date.now();

      return message.id || `fallback-${timestampValue}-${message.type}`;
    }, [message.id, message.timestamp, message.type]);

    // 메시지 내용 전처리
    const processedContent = React.useMemo(() => {
      let content = message.content;

      // 빈 콘텐츠 조기 반환
      if (!content || content.trim() === '') {
        return '';
      }

      // 1. 기본 정리
      content = content.replace(/^data:\s*/gm, '');
      content = content.replace(/\[DONE\]/g, '');

      // 2. 백슬래시-n을 실제 줄바꿈으로 변환
      content = content.replace(/\\n/g, '\n');

      // 3. 체크마크 앞에 줄바꿈 추가 (조건부)
      content = content.replace(/([^\n])(✅)/g, '$1\n\n$2');

      // 4. 불완전한 마크다운 태그 정리
      content = content.replace(/\*{3,}/g, '**');

      // 5. 앞뒤 공백 제거
      content = content.trim();

      return content;
    }, [message.content]);

    // [지연 스트리밍] 텍스트가 모두 수신된 후 클라이언트 자체적으로 한 글자씩 보여주는 기능
    const [displayedContent, setDisplayedContent] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);

    React.useEffect(() => {
      if (processedContent) {
        // 봇의 최신 메시지이면서 아직 출력된 내용이 없을 때 타이핑 애니메이션 시작
        if (isBot && isLatestBotMessage && displayedContent === '') {
          setIsTyping(true);
        } else if (!isTyping || !isLatestBotMessage) {
          // 이미 지나간 메시지거나 사용자 메시지면 즉시 완성된 텍스트 표시
          setDisplayedContent(processedContent);
          setIsTyping(false);
        }
      } else {
        setDisplayedContent('');
      }
    }, [processedContent, isLatestBotMessage, isBot]);

    React.useEffect(() => {
      if (!isTyping || !processedContent) return;

      const intervalId = setInterval(() => {
        setDisplayedContent((prev) => {
          // 한 번에 출력할 글자수 (속도 조절, 2글자씩)
          const nextLength = prev.length + 2;
          if (nextLength >= processedContent.length) {
            clearInterval(intervalId);
            setIsTyping(false);
            return processedContent;
          }
          return processedContent.slice(0, nextLength);
        });
      }, 15); // 출력 간격

      return () => clearInterval(intervalId);
    }, [isTyping, processedContent]);

    // 마크다운 사용 조건
    const shouldUseMarkdown = React.useMemo(() => {
      if (!isBot || !processedContent) return false;

      // 스트리밍 중이라도 기본적인 마크다운 요소가 있으면 사용
      const hasMarkdownElements = /(\*\*.*?\*\*|✅|^\s*[-*•]\s|[\u{1F300}-\u{1F9FF}])/mu.test(
        processedContent,
      );

      return hasMarkdownElements || !isStreaming;
    }, [isBot, isStreaming, processedContent]);



    // 카드 표시 조건 검사
    const shouldShowPlanCards = React.useMemo(() => {
      // 통신 중이거나 아직 타이핑 중이면 카드 숨김
      if (
        isStreaming ||
        isTyping ||
        !message.planRecommendations ||
        message.planRecommendations.length === 0
      )
        return false;
      return true;
    }, [message.planRecommendations, isStreaming, isTyping]);

    const shouldShowSubscriptionCard = React.useMemo(() => {
      // 통신 중이거나 아직 타이핑 중이면 숨김
      if (
        isStreaming ||
        isTyping ||
        !message.subscriptionRecommendations ||
        Object.keys(message.subscriptionRecommendations).length === 0
      )
        return false;
      return true;
    }, [message.subscriptionRecommendations, isStreaming, isTyping]);

    const shouldShowUsageAnalysisCard = React.useMemo(() => {
      // 통신 중이거나 아직 타이핑 중이면 숨김
      if (isStreaming || isTyping || !message.usageAnalysis) return false;
      return true;
    }, [message.usageAnalysis, isStreaming, isTyping]);

    // 타임스탬프 포맷팅 최적화
    const formatTimestamp = React.useMemo(() => {
      const timestamp = message.timestamp;
      let date: Date;

      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        date = new Date();
      }

      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [message.timestamp]);

    // react-markdown 렌더러 파싱 설정
    const markdownComponents: Components = React.useMemo(
      () => ({
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1 text-foreground">{children}</h3>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 whitespace-pre-wrap leading-relaxed">{children}</p>
        ),
        br: () => <br />,
        code: ({ children }) => (
          <code className="bg-secondary px-1 py-0.5 rounded text-xs font-mono text-secondary-foreground">
            {children}
          </code>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }),
      [],
    );

    const handlePlanSelect = React.useCallback((plan: PlanRecommendation) => {
      navigate(`/plans/${plan.id}`);
    }, []);

    const handleSubscriptionSelect = React.useCallback(() => {
      navigate('/home#subscription');
    }, [navigate]);

    const handleBrandSelect = React.useCallback(
      (
        brand:
          | NonNullable<typeof message.subscriptionRecommendations>['life_brand']
          | null
          | undefined,
      ) => {
        if (!brand) {
          toast.error('브랜드 정보가 없습니다.', {
            description: '잠시 후 다시 시도해주세요',
          });
          return;
        }
        changeCouponLike(brand.id)
          .then((response) => {
            const isLiked = response.data.data.liked;

            if (isLiked) {
              toast.success('쿠폰을 찜했어요! 💜', {
                description: '좋아요한 쿠폰함에서 확인할 수 있어요',
              });
            } else {
              toast.success('쿠폰 찜을 해제했어요', {
                description: '언제든 다시 찜할 수 있어요',
              });
            }
          })
          .catch((error) => {
            console.error('쿠폰 좋아요 토글 실패:', error);
            toast.error('쿠폰 찜하기에 실패했어요', {
              description: '잠시 후 다시 시도해주세요',
            });
          });
      },
      [navigate],
    );

    // 렌더링할 내용이 없으면 null 반환
    // 단, 현재 스트리밍 중인 관송 중 최신 봇 메시지는 유지 (아바타 가리지 않으므로)
    if (!processedContent && !shouldShowPlanCards && !shouldShowSubscriptionCard && !isStreaming) {
      return null;
    }

    return (
      <div
        className={cn('flex w-full mb-4', isBot ? 'justify-start' : 'justify-end')}
        data-message-id={uniqueMessageKey}
      >
        {/* 봇 아바타 */}
        {isBot && (
          <div className="w-8 h-8 mr-2 mt-1 flex-shrink-0">
            <AvatarComponent src={IMAGES.MOONER['mooner-chat']} />
          </div>
        )}

        <div className={cn('max-w-[80%] flex flex-col gap-3')}>
          {/* 텍스트 메시지 */}
          {processedContent && (
            <div
              className={cn(
                'px-4 py-2 rounded-lg',
                isBot
                  ? 'bg-brand-yellow-light text-secondary-foreground rounded-tl-none shadow-sm'
                  : 'bg-brand-darkblue-light text-brand-darkblue rounded-tr-none',
              )}
            >
              <div className="text-sm">
                {isBot && shouldUseMarkdown && !isTyping ? (
                  // 타이핑 완료 후에만 ReactMarkdown 적용
                  // 타이핑 중에는 15ms 간격으로 재파싱이 발생하므로 일반 텍스트로 표시
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkBreaks]}
                    skipHtml={true}
                  >
                    {displayedContent}
                  </ReactMarkdown>
                ) : (
                  <div
                    className="whitespace-pre-wrap leading-relaxed"
                    style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                  >
                    {displayedContent}
                  </div>
                )}

                {/* 지연 스트리밍 커서 */}
                {isTyping && isBot && (
                  <span className="inline-block w-2 h-4 bg-current opacity-50 animate-pulse ml-1">
                    |
                  </span>
                )}
              </div>

              {/* 타임스탬프 */}
              <p className="text-xs opacity-50 text-right mt-1">{formatTimestamp}</p>
            </div>
          )}

          {/* 요금제 추천 카드(들) */}
          {shouldShowPlanCards && message.planRecommendations && (
            <div className="w-full">
              <PlanSwiper plans={message.planRecommendations} onSelect={handlePlanSelect} />
            </div>
          )}

          {/* 구독 서비스 추천 카드 */}
          {shouldShowSubscriptionCard && message.subscriptionRecommendations && (
            <div key={`subscription-${uniqueMessageKey}`}>
              <SubscriptionCard
                data={message.subscriptionRecommendations}
                onSubscribe={handleSubscriptionSelect}
                onBrandSelect={handleBrandSelect}
                className="max-w-sm"
              />
            </div>
          )}

          {/* 사용량 분석 카드 */}
          {shouldShowUsageAnalysisCard && message.usageAnalysis && (
            <div key={`usage-analysis-${uniqueMessageKey}`}>
              <UsageAnalysisCard data={message.usageAnalysis} className="max-w-sm" />
            </div>
          )}

          {/*  서버 오류시 새로 시작하기 버튼 */}
          {isBot &&
            (message.content.includes('서버에 연결할 수 없습니다') ||
              message.content.includes('요청 처리 중 오류가 발생했습니다') ||
              message.content.includes('시스템 오류가 발생했습니다') ||
              message.content.includes('문제가 발생했습니다. 다시시도해주세요')) && (
              <div className="mt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-brand-darkblue text-white rounded-lg text-sm hover:bg-brand-darkblue/90 transition-colors"
                >
                  🔄 새로 시작하기
                </button>
              </div>
            )}
        </div>
      </div>
    );
  },
  (prevProps: ChatBubbleProps, nextProps: ChatBubbleProps) => {
    // 커스텀 memo 비교 함수
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.isStreaming !== nextProps.isStreaming) return false;
    if (prevProps.isLatestBotMessage !== nextProps.isLatestBotMessage) return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (prevProps.message.planRecommendations !== nextProps.message.planRecommendations)
      return false;
    if (
      prevProps.message.subscriptionRecommendations !==
      nextProps.message.subscriptionRecommendations
    )
      return false;
    // usageAnalysis 비교 누락 보완
    if (prevProps.message.usageAnalysis !== nextProps.message.usageAnalysis) return false;
    return true;
  },
);

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;
