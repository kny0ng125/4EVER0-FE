interface MarkerClusteringOptions {
  minClusterSize?: number;
  maxZoom?: number;
  map: naver.maps.Map;
  markers: naver.maps.Marker[];
  disableClickZoom?: boolean;
  gridSize?: number;
  icons?: Array<{
    content: string;
    size: naver.maps.Size;
    anchor: naver.maps.Point;
  }>;
  indexGenerator?: number[];
  stylingFunction?: (
    clusterMarker: { getElement: () => HTMLElement | null },
    count: number,
  ) => void;
}

export interface MarkerClusteringInstance {
  setMap: (map: naver.maps.Map | null) => void;
}

declare global {
  interface Window {
    MarkerClustering?: new (options: MarkerClusteringOptions) => MarkerClusteringInstance;
  }
}

export const createClusterIcons = () => {
  const baseStyle = `
    cursor: pointer;
    color: white;
    text-align: center;
    font-weight: 700;
    border-radius: 50%;
    border: 2.5px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Pretendard', 'Inter', sans-serif;
    letter-spacing: -0.5px;
    transition: transform 0.15s ease;
  `;

  return [
    {
      // 소규모 (2~9개)
      content: `<div style="${baseStyle}
        width: 25px;
        height: 25px;
        font-size: 12px;
        background: #6366f1;
        box-shadow: 0 2px 8px rgba(99,102,241,0.45);
      "></div>`,
      size: new naver.maps.Size(32, 32),
      anchor: new naver.maps.Point(16, 16),
    },
    {
      // 중규모 (10~49개)
      content: `<div style="${baseStyle}
        width: 25px;
        height: 25px;
        font-size: 13px;
        background: #ec4899;
        box-shadow: 0 3px 10px rgba(236,72,153,0.45);
      "></div>`,
      size: new naver.maps.Size(32, 32),
      anchor: new naver.maps.Point(16, 16),
    },
    {
      // 대규모 (50개+)
      content: `<div style="${baseStyle}
        width: 25px;
        height: 25px;
        font-size: 13px;
        background: #f43f5e;
        box-shadow: 0 4px 14px rgba(244,63,94,0.45);
      "></div>`,
      size: new naver.maps.Size(32, 32),
      anchor: new naver.maps.Point(16, 16),
    },
  ];
};

export const createMarkerClustering = (
  mapInstance: naver.maps.Map,
  markers: naver.maps.Marker[],
  onClusterClick?: (members: naver.maps.Marker[]) => void,
): MarkerClusteringInstance | null => {
  if (!window.MarkerClustering) {
    console.warn('MarkerClustering 라이브러리가 로드되지 않았습니다.');
    return null;
  }

  const icons = createClusterIcons();

  const clusterer = new window.MarkerClustering({
    minClusterSize: 2,
    maxZoom: 16,
    map: mapInstance,
    markers: markers,
    disableClickZoom: true, // 확대 대신 커스텀 클릭 이벤트를 위해 비활성화
    gridSize: 30, // 기존 120에서 30(px)으로 줄여 마커가 반 이상 겹칠 때만 클러스터링되도록 조정
    icons: icons,
    indexGenerator: [10, 50, 100],
    stylingFunction: function (
      clusterMarker: any, // naver.maps.Marker
      count: number,
    ) {
      const element = clusterMarker.getElement();
      if (element) {
        const div = element.querySelector('div');
        if (div) {
          div.textContent = count.toString();
        }
      }

      // 클릭 이벤트 오버라이드
      if (onClusterClick) {
        naver.maps.Event.clearListeners(clusterMarker, 'click');
        naver.maps.Event.addListener(clusterMarker, 'click', (e: any) => {
          e.domEvent?.stopPropagation();
          const clusters = (clusterer as any)._clusters;
          if (clusters) {
            const cluster = clusters.find((c: any) => c._clusterMarker === clusterMarker);
            if (cluster && cluster._clusterMember) {
              onClusterClick(cluster._clusterMember);
            }
          }
        });
      }
    },
  });

  return clusterer;
};
