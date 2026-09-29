export const STORAGE_PURPOSES = [
  'ktp',
  'sim',
  'payment_proof',
  'vehicle_photo',
] as const;

export type StoragePurpose = (typeof STORAGE_PURPOSES)[number];

export const SIGNED_URL_EXPIRES_SECONDS = 600;
