import { PlaceType } from '../../models/saved-place.schema';

export interface UpdateSavedPlaceDto {
  name?: string;
  address?: string;
  type?: PlaceType;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  postalCode?: string;
  metadata?: Record<string, any>;
}


