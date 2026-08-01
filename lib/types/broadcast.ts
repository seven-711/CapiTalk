export type BroadcastStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface GlobalBroadcast {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  image_url?: string | null;
  action_url?: string | null;
  status: BroadcastStatus;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  impressions_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBroadcastInput {
  title: string;
  description: string;
  owner_id?: string;
  owner_name?: string;
  image_url?: string;
  action_url?: string;
  duration_minutes?: number;
}
