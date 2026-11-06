export type Precision = 'unknown' | 'year' | 'month' | 'day';
export type Status = 'pending' | 'approved' | 'rejected';
export type Glacier = { id: string; name: string; region: string; introduction: string; hero_id: string };
export type Observation = {
  rgi_id?: string | null;
  id: string; glacier_id: string | null; viewpoint_id: string | null; filename: string;
  original_path: string; display_path: string; thumb_path: string; width: number; height: number;
  capture_date: string | null; date_precision: Precision; approximate: number; metadata_source: string;
  latitude: number | null; longitude: number | null; location_description: string;
  credit: string; source: string; caption: string; contact: string; permission: string;
  status: Status; receipt_token: string | null; created_at: string; extracted_metadata: string;
};
export type PublicObservation = Pick<Observation, 'id' | 'glacier_id' | 'viewpoint_id' | 'width' | 'height' | 'capture_date' | 'date_precision' | 'approximate' | 'metadata_source' | 'location_description' | 'credit' | 'source' | 'caption'>;
export type Crop = { left: number; top: number; width: number; height: number };
export type Comparison = { id: string; glacier_id: string; before_id: string; after_id: string; before_crop: string; after_crop: string; caption: string; status: 'draft' | 'approved'; created_at: string };
export type Viewpoint = { id: string; glacier_id: string; name: string };
