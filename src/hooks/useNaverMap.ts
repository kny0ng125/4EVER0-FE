import { useEffect, useRef, useState, useCallback } from 'react';
import type { NaverMapOptions, MarkerOptions } from '@/types/naverMap';

const NAVER_MAPS_CLIENT_ID = import.meta.env.VITE_NCP_CLIENT_ID as string;
const NAVER_MAPS_SCRIPT_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}&submodules=panorama,geocoder,drawing,visualization`;

/** Naver Maps 스크립트를 비동기로 로드합니다. 이미 로드된 경우 즉시 resolve합니다. */
function loadNaverMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 완전히 로드된 경우
    if (typeof window !== 'undefined' && window.naver?.maps?.Map && window.naver?.maps?.Marker) {
      resolve();
      return;
    }

    // 이미 스크립트 태그가 삽입된 경우 (로딩 중)
    const existing = document.querySelector('[data-naver-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Naver Maps 스크립트 로드 실패')));
      return;
    }

    // 새 스크립트 태그 삽입
    const script = document.createElement('script');
    script.src = NAVER_MAPS_SCRIPT_URL;
    script.async = true;
    script.dataset.naverMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Naver Maps 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

export function useNaverMap(options: NaverMapOptions = {}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | undefined>(undefined);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const initializationAttemptedRef = useRef(false);
  const retryCountRef = useRef(0);

  const {
    center = { lat: 37.5665, lng: 126.978 },
    zoom = 14,
    minZoom = 6,
    maxZoom = 20,
    zoomControl = false,
    mapDataControl = false,
    scaleControl = false,
    logoControl = false,
  } = options;

  // naver.maps.MapTypeId는 API 로드 후에만 접근 가능하므로 별도 처리
  const mapTypeId = options.mapTypeId;

  // 네이버 맵 API 완전 로드 확인용
  const isNaverMapsFullyLoaded = useCallback((): boolean => {
    try {
      return !!(
        typeof window !== 'undefined' &&
        window.naver?.maps?.Map &&
        window.naver?.maps?.Marker &&
        window.naver?.maps?.LatLng &&
        window.naver?.maps?.Event
      );
    } catch {
      return false;
    }
  }, []);

  const addMarker = useCallback(
    (markerOptions: MarkerOptions) => {
      if (!mapInstanceRef.current || !isNaverMapsFullyLoaded()) return null;

      try {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(markerOptions.position.lat, markerOptions.position.lng),
          map: mapInstanceRef.current,
          title: markerOptions.title,
          icon: markerOptions.icon,
          clickable: markerOptions.clickable ?? true,
        });

        markersRef.current.push(marker);
        return marker;
      } catch (error) {
        console.error('마커 추가 실패:', error);
        return null;
      }
    },
    [isNaverMapsFullyLoaded],
  );

  const clearMarkers = useCallback(() => {
    try {
      markersRef.current.forEach((marker) => {
        try {
          if (marker && typeof marker.setMap === 'function') marker.setMap(null);
        } catch (e) {
          // ignore
        }
      });
      markersRef.current = [];
    } catch (error) {
      console.error('마커 제거 중 오류:', error);
    }
  }, []);

  const setCenter = useCallback(
    (lat: number, lng: number) => {
      if (!mapInstanceRef.current || !isNaverMapsFullyLoaded()) return;
      try {
        mapInstanceRef.current.setCenter(new naver.maps.LatLng(lat, lng));
      } catch (error) {
        console.error('지도 중심 설정 실패:', error);
      }
    },
    [isNaverMapsFullyLoaded],
  );

  const setZoom = useCallback(
    (zoomLevel: number) => {
      if (!mapInstanceRef.current || !isNaverMapsFullyLoaded()) return;
      try {
        mapInstanceRef.current.setZoom(zoomLevel);
      } catch (error) {
        console.error('지도 줌 설정 실패:', error);
      }
    },
    [isNaverMapsFullyLoaded],
  );

  const getMarkers = useCallback(() => markersRef.current, []);

  // 지도 초기화 함수
  const initializeMap = useCallback((): boolean => {
    if (initializationAttemptedRef.current && mapInstanceRef.current) return true;
    if (!mapRef.current || !isNaverMapsFullyLoaded()) return false;

    try {
      initializationAttemptedRef.current = true;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy?.();
        } catch {
          /* ignore */
        }
      }

      mapInstanceRef.current = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom,
        mapTypeId: mapTypeId ?? naver.maps.MapTypeId.NORMAL,
        minZoom,
        maxZoom,
        zoomControl,
        mapDataControl,
        scaleControl,
        logoControl,
      });

      if (mapInstanceRef.current) {
        setIsLoaded(true);
        retryCountRef.current = 0;
        return true;
      }
      return false;
    } catch {
      initializationAttemptedRef.current = false;
      return false;
    }
  }, [
    center.lat,
    center.lng,
    zoom,
    mapTypeId,
    minZoom,
    maxZoom,
    zoomControl,
    mapDataControl,
    scaleControl,
    logoControl,
    isNaverMapsFullyLoaded,
  ]);

  // 재시도 로직이 포함된 초기화
  const attemptInitialization = useCallback(() => {
    const maxRetries = 10;
    if (retryCountRef.current >= maxRetries) return;

    if (initializeMap()) {
      console.log('✅ 지도 초기화 성공');
      return;
    }

    retryCountRef.current++;
    setTimeout(() => attemptInitialization(), 500 * retryCountRef.current);
  }, [initializeMap]);

  // 비동기 스크립트 로딩 + API 준비 + 지도 초기화 메인 effect
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1. 스크립트가 아직 로드되지 않았으면 비동기로 로드
        if (!isNaverMapsFullyLoaded()) {
          await loadNaverMapsScript();
        }

        if (cancelled) return;

        // 2. API 준비 완료 상태 업데이트
        setIsApiReady(true);

        // 3. 지도 초기화 시도
        setTimeout(attemptInitialization, 100);
      } catch (err) {
        console.error('❌ Naver Maps 로드 실패:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      clearMarkers();

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy?.();
          mapInstanceRef.current = undefined;
        } catch {
          /* ignore */
        }
      }

      initializationAttemptedRef.current = false;
      retryCountRef.current = 0;
      setIsLoaded(false);
      setIsApiReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  return {
    mapRef,
    mapInstance: mapInstanceRef.current,
    isLoaded,
    isApiReady,
    addMarker,
    clearMarkers,
    setCenter,
    setZoom,
    getMarkers,
  };
}
