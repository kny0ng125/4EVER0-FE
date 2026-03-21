import { useNaverMap } from '@/hooks/useNaverMap';
import { getNearbyCoupons } from '@/apis/coupon/getNearbyCoupons';
import type { PlaceInfo } from '@/types/brand';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import MapPopover from './MapPopover';
import { createMarkerClustering, type MarkerClusteringInstance } from '@/utils/markerClustering';
import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingMooner from '@/pages/common/LoadingMooner';
import { getrawBackgroundColor } from '@/utils/brandColor';

interface StoreMapProps {
  className?: string;
  style?: React.CSSProperties;
  allBrandIds: number[];
  selectedIds: number[];
  onLoadingChange?: (loading: boolean) => void;
  onChangeSelectedIds?: (ids: number[]) => void;
}

interface StoreData {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  brandName: string;
}

export default function StoreMap({
  className = '',
  style = {},
  selectedIds,
  allBrandIds,
  onLoadingChange,
  onChangeSelectedIds,
}: StoreMapProps) {
  const [nearbyStores, setNearbyStores] = useState<StoreData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [selectedStores, setSelectedStores] = useState<StoreData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const DEFAULT_LOCATION = { lat: 37.503325874722, lng: 127.04403462366 };

  const { mapRef, isLoaded, isApiReady, mapInstance, addMarker, setCenter, setZoom } = useNaverMap({
    center: DEFAULT_LOCATION,
    zoom: 14,
  });

  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerClusterRef = useRef<MarkerClusteringInstance | null>(null);
  const currentLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const mapEventListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  const markersInitializedRef = useRef(false);

  // 단일 마커 클릭용
  const openPopover = useCallback((store: StoreData) => {
    setSelectedStores([store]);
    setSelectedIndex(0);
    setPopoverOpen(true);
  }, []);

  // 클러스터 클릭용 (여러 개)
  const openClusterPopover = useCallback((stores: StoreData[]) => {
    setSelectedStores(stores);
    setSelectedIndex(0);
    setPopoverOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setSelectedStores([]);
    setSelectedIndex(0);
    setPopoverOpen(false);
  }, []);

  // 매장 데이터 호출 — currentLocation이 설정된 이후에만 실행
  useEffect(() => {
    if (!currentLocation) return;

    const fetchStores = async () => {
      try {
        setLoading(true);
        setError(null);
        onLoadingChange?.(true);

        if (selectedIds.length === 0) {
          setNearbyStores([]);
          setLoading(false);
          return;
        }

        const response = await getNearbyCoupons(
          currentLocation.lat,
          currentLocation.lng,
          selectedIds,
        );

        if (Array.isArray(response)) {
          const stores: StoreData[] = response.map((place: PlaceInfo) => ({
            id: place.id,
            name: place.name,
            address: place.address,
            latitude: place.lat,
            longitude: place.lng,
            brandName: place.brandName,
          }));
          setNearbyStores(stores);
        } else {
          setError('데이터 형식이 올바르지 않습니다.');
        }
      } catch {
        setError('매장 조회 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    fetchStores();
  }, [currentLocation, selectedIds]);

  // 지도 idle 이벤트 + 300ms 디바운싱: 지도 이동 후 현재 중심 기준으로 매장 재조회
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStoresAtMapCenter = useCallback(() => {
    if (!mapInstance || !isLoaded || !isApiReady) return;
    if (selectedIds.length === 0) return;

    if (debouncedFetchRef.current) clearTimeout(debouncedFetchRef.current);

    debouncedFetchRef.current = setTimeout(async () => {
      try {
        const mapCenter = mapInstance.getCenter() as naver.maps.LatLng;
        const lat = mapCenter.lat();
        const lng = mapCenter.lng();

        setLoading(true);
        onLoadingChange?.(true);
        const response = await getNearbyCoupons(lat, lng, selectedIds);
        if (Array.isArray(response)) {
          const stores: StoreData[] = response.map((place: PlaceInfo) => ({
            id: place.id,
            name: place.name,
            address: place.address,
            latitude: place.lat,
            longitude: place.lng,
            brandName: place.brandName,
          }));
          setNearbyStores(stores);
          setError(null);
        }
      } catch {
        // 개별 에러는 무시 (초기 로딩 에러가 아님)
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }, 300);
  }, [mapInstance, isLoaded, isApiReady, selectedIds, onLoadingChange]);

  // idle 이벤트 리스너 등록 (지도 이동/줌 완료 시 디바운스 재조회)
  useEffect(() => {
    if (!isLoaded || !isApiReady || !mapInstance) return;

    const idleListener = naver.maps.Event.addListener(mapInstance, 'idle', fetchStoresAtMapCenter);

    return () => {
      naver.maps.Event.removeListener(idleListener);
      if (debouncedFetchRef.current) clearTimeout(debouncedFetchRef.current);
    };
  }, [isLoaded, isApiReady, mapInstance, fetchStoresAtMapCenter]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      setCurrentLocation(DEFAULT_LOCATION);
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setCenter(latitude, longitude);
        setZoom(14);
        setLoadingLocation(false);
      },
      (error) => {
        console.error('위치 조회 실패:', error);
        // 위치 권한 실패 시 fallback 좌표 사용
        setCurrentLocation((prev) => prev ?? DEFAULT_LOCATION);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [setCenter, setZoom]);

  // 마운트 시 자동으로 사용자 위치 가져오기
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const safeCleanupMarkers = useCallback(() => {
    markersRef.current.forEach((marker, index) => {
      try {
        if (marker && typeof marker.setMap === 'function') {
          marker.setMap(null);
        }
      } catch (e) {
        console.warn(`마커 ${index + 1} 제거 중 오류:`, e);
      }
    });
    markersRef.current = [];

    if (currentLocationMarkerRef.current) {
      try {
        if (typeof currentLocationMarkerRef.current.setMap === 'function') {
          currentLocationMarkerRef.current.setMap(null);
        }
      } catch (e) {
        console.warn('현재 위치 마커 제거 중 오류:', e);
      }
      currentLocationMarkerRef.current = null;
    }

    mapEventListenersRef.current.forEach((listener) => {
      try {
        naver.maps.Event.removeListener(listener);
      } catch (e) {
        console.warn('이벤트 리스너 제거 중 오류:', e);
      }
    });
    mapEventListenersRef.current = [];

    if (markerClusterRef.current) {
      try {
        if (typeof markerClusterRef.current.setMap === 'function') {
          markerClusterRef.current.setMap(null);
        }
      } catch (e) {
        console.warn('클러스터 제거 중 오류:', e);
      }
      markerClusterRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isApiReady || !mapInstance) {
      markersInitializedRef.current = false;
      return;
    }

    if (!currentLocation) return;

    mapInstance.setCenter(new naver.maps.LatLng(currentLocation.lat, currentLocation.lng));
    mapInstance.setZoom(14);
    if (markersInitializedRef.current && markersRef.current.length === nearbyStores.length) return;

    safeCleanupMarkers();

    try {
      if (currentLocation) {
        console.log(currentLocation);
        const locationMarker = addMarker({
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          title: '현재 위치',
          icon: {
            content: `
              <div style="
                width: 20px;
                height: 20px;
                background: var(--color-brand-red);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 3px 10px rgba(221, 70, 64, 0.4);
                position: relative;
              ">
                <div style="
                  width: 6px;
                  height: 6px;
                  background: white;
                  border-radius: 50%;
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                "></div>
              </div>
            `,
            anchor: new naver.maps.Point(10, 10),
          },
        });
        if (locationMarker) currentLocationMarkerRef.current = locationMarker;
      }

      nearbyStores.forEach((store) => {
        console.log(store.brandName);
        const fillColor = getrawBackgroundColor(store.brandName);
        console.log(fillColor);

        const dynamicPinSvg = `
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
            viewBox="0 0 24 24"
            fill="${fillColor}"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `;

        const marker = addMarker({
          position: { lat: store.latitude, lng: store.longitude },
          title: store.name,
          icon: {
            content: `
              <div style="
                width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                border-radius: 50%;
                cursor: pointer;
              ">
                ${dynamicPinSvg}
              </div>
            `,
            anchor: new naver.maps.Point(16, 16),
            size: new naver.maps.Size(32, 32),
          },
        });
        if (marker) {
          // 마커 객체에 원본 store 데이터를 심어둡니다 (클러스터에서 역추적용)
          (marker as naver.maps.Marker & { _storeData?: StoreData })._storeData = store;
          markersRef.current.push(marker);
        }

        const clickListener = naver.maps.Event.addListener(marker, 'click', (e) => {
          e.domEvent?.stopPropagation();
          openPopover(store);
        });
        mapEventListenersRef.current.push(clickListener);
      });

      if (markersRef.current.length > 0 && mapInstance) {
        markerClusterRef.current = createMarkerClustering(
          mapInstance,
          markersRef.current,
          (clickedMembers) => {
            // 클릭된 클러스터 내의 마커들에 심어둔 _storeData 추출
            const storesInCluster = clickedMembers
              .map((m) => (m as naver.maps.Marker & { _storeData?: StoreData })._storeData)
              .filter((s): s is StoreData => Boolean(s));
            if (storesInCluster.length > 0) {
              openClusterPopover(storesInCluster);
            }
          },
        );
      }

      const mapClickListener = naver.maps.Event.addListener(mapInstance, 'click', () => {
        closePopover();
      });
      mapEventListenersRef.current.push(mapClickListener);

      markersInitializedRef.current = true;
    } catch {
      markersInitializedRef.current = false;
    }
    return () => {
      // Cleanup
      safeCleanupMarkers();
      markersInitializedRef.current = false;
    };
  }, [
    isLoaded,
    isApiReady,
    mapInstance,
    nearbyStores,
    currentLocation,
    addMarker,
    openPopover,
    closePopover,
    mapRef,
    safeCleanupMarkers,
  ]);

  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '500px', ...style }}>
      {/* 지도 컨테이너 — 항상 DOM에 유지 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 로딩 오버레이 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <LoadingMooner />
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <div className="text-center">
            <div className="text-red-500 text-sm mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-500 hover:underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* API 연결 중 오버레이 */}
      {!isApiReady && !loading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            지도 API 연결 중...
          </div>
        </div>
      )}

      {/* 지도 컨트롤 — 지도와 API가 준비됐을 때만 표시 */}
      {!loading && !error && isApiReady && (
        <>
          <MapControls
            loadingLocation={loadingLocation}
            onGetCurrentLocation={getCurrentLocation}
            brandIds={allBrandIds}
            selectedIds={selectedIds}
            onChangeSelectedIds={onChangeSelectedIds ?? (() => {})}
          />

          <MapLegend popupCount={nearbyStores.length} hasCurrentLocation={!!currentLocation} />

          {selectedStores.length > 0 && (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
              <MapPopover
                stores={selectedStores}
                currentIndex={selectedIndex}
                onChangeIndex={setSelectedIndex}
                open={popoverOpen}
                onOpenChange={(open: boolean) => {
                  if (!open) closePopover();
                }}
              >
                <div style={{ width: '1px', height: '1px', pointerEvents: 'auto' }} />
              </MapPopover>
            </div>
          )}
        </>
      )}
    </div>
  );
}
