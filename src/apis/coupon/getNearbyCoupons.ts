import { apiWithoutToken } from '@/lib/api/apiconfig';
import { PlaceInfo, NearbyCouponsResponse } from '@/types/brand';
import qs from 'qs';

export const getNearbyCoupons = async (
  lat: number,
  lng: number,
  brandIds: number[],
): Promise<PlaceInfo[]> => {
  try {
    const response = await apiWithoutToken.get<NearbyCouponsResponse>('/coupons/nearby', {
      params: { lat, lng, brand_id: brandIds },
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
    });

    return (
      response.data?.data?.places?.map((place, index) => ({
        ...place,
        id: index + 1,
      })) || []
    );
  } catch (error) {
    console.error('🔥 근처 매장 조회 실패:', error);
    throw error;
  }
};
