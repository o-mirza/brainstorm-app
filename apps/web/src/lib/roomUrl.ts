export function getRoomUrl(roomSlug: string): string {
  return `${window.location.origin}/r/${roomSlug}`;
}

export function getAdminRoomUrl(roomSlug: string, adminToken: string): string {
  const url = new URL(getRoomUrl(roomSlug));
  url.searchParams.set("admin", adminToken);
  return url.toString();
}
