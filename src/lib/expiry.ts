export const RESOURCE_EXPIRY_HOURS = 36;
export const RESOURCE_EXPIRY_MS = RESOURCE_EXPIRY_HOURS * 60 * 60 * 1000;

export const isExpiredResource = (createdAt: string): boolean => {
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return false;
  }
  return Date.now() - createdAtMs > RESOURCE_EXPIRY_MS;
};

export const getExpiryCountdown = (createdAt: string): string => {
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return "unknown";
  }
  const remaining = Math.max(0, createdAtMs + RESOURCE_EXPIRY_MS - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};
