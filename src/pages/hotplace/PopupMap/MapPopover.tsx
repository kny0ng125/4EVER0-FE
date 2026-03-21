import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PopupData {
  id: number;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  image_url: string;
}

interface MapPopoverProps {
  popups: PopupData[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  children: React.ReactNode;
  showIndex?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function MapPopover({
  popups,
  currentIndex,
  onChangeIndex,
  children,
  open = false,
  onOpenChange,
}: MapPopoverProps) {
  if (!open || popups.length === 0) return <>{children}</>;

  const popup = popups[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) onChangeIndex(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < popups.length - 1) onChangeIndex(currentIndex + 1);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
      className="
        w-80 shadow-lg overflow-hidden rounded-2xl gap-2
      "
    >
      {children}
      <div className="px-4 py-2 bg-gray-100 border-border rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">매장 정보</span>
            {popups.length > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full">
                {currentIndex + 1} / {popups.length}
              </span>
            )}
          </div>

          <button
            onClick={() => onOpenChange?.(false)}
            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4 gap-y-1 gap-x-1 bg-white rounded-b-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          {/* 좌측 정보 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">{popup.name}</h4>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{popup.address}</p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#EC4899]">상세 정보</p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {popup.description?.trim() ? popup.description : '특이사항 없음'}
              </p>
            </div>
          </div>

          {/* 우측 원형 이미지 */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
              <img
                src={popup.image_url}
                alt={popup.name}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/MoonoZ.svg';
                }}
              />
            </div>
          </div>
        </div>

        {/* 캐러셀 컨트롤 (항목이 여러 개일 때만 표시) */}
        {popups.length > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 mt-4 pt-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                currentIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-pink-600 hover:bg-pink-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              이전 매장
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === popups.length - 1}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                currentIndex === popups.length - 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-pink-600 hover:bg-pink-50'
              }`}
            >
              다음 매장
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
