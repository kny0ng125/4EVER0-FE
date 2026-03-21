import React from 'react';
import { BRAND_META } from './Branddata';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface StoreData {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  brandName: string;
}

interface MapPopoverProps {
  stores: StoreData[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function StorePopover({
  stores,
  currentIndex,
  onChangeIndex,
  children,
  open = false,
  onOpenChange,
}: MapPopoverProps) {
  if (!open || stores.length === 0) return <>{children}</>;

  const store = stores[currentIndex];
  const meta = BRAND_META.find((b) => b.name === store.brandName);
  const brandLogoUrl = meta?.logoUrl ?? '';

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) onChangeIndex(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stores.length - 1) onChangeIndex(currentIndex + 1);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ pointerEvents: 'auto' }}
      className="
        absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        z-10 w-80 shadow-lg overflow-hidden rounded-2xl gap-2
      "
    >
      {children}

      {/* 헤더 */}
      <div className="px-4 py-2 bg-gray-100 border-border rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">매장 정보</span>
            {stores.length > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                {currentIndex + 1} / {stores.length}
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
      <div className="p-4 bg-white rounded-b-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          {/* 좌측 정보 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate mb-1">{store.name}</h4>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{store.address}</p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-600">사용 가능 쿠폰</p>
              <p className="text-xs text-gray-500">{meta?.benefit ?? '쿠폰 정보 없음'}</p>
            </div>
          </div>

          {/* 우측 로고 이미지 */}
          <div>
            {brandLogoUrl && (
              <img
                src={brandLogoUrl}
                alt={store.brandName}
                className="w-15 h-15 shadow-md object-contain rounded-2xl"
              />
            )}
          </div>
        </div>

        {/* 캐러셀 컨트롤 (항목이 여러 개일 때만 표시) */}
        {stores.length > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 mt-4 pt-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                currentIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              이전 매장
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === stores.length - 1}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                currentIndex === stores.length - 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
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
