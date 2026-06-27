export function createParticipantId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 18);
  return `p_${value}`;
}

export function createClientMutationId(): string {
  return `m_${crypto.randomUUID()}`;
}
