const ADMIN_TOKEN_PREFIX = "brainstorm.adminToken.";

export function getStoredRoomAdminToken(roomSlug: string): string | undefined {
  return window.localStorage.getItem(`${ADMIN_TOKEN_PREFIX}${roomSlug}`) ?? undefined;
}

export function storeRoomAdminToken(roomSlug: string, adminToken: string): void {
  window.localStorage.setItem(`${ADMIN_TOKEN_PREFIX}${roomSlug}`, adminToken);
}

export function getAdminTokenFromSearch(search: string): string | undefined {
  const token = new URLSearchParams(search).get("admin")?.trim();
  return token || undefined;
}

export function removeAdminTokenFromAddressBar(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("admin")) return;
  url.searchParams.delete("admin");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
