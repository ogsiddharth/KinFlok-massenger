/**
 * Kinfolk Security & Cryptographic Utilities
 * Matching SecurityHelper.kt implementation
 */

const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Hashes password using SHA-256 with static application salt + username salt.
 */
export async function hashPassword(password: string, username: string): Promise<string> {
  const cleanUsername = username.toLowerCase().trim();
  const salt = `kinfolk_family_salt_${cleanUsername}`;
  const message = salt + password;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (cryptoObj && cryptoObj.subtle) {
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Basic fallback if subtle crypto is somehow unavailable
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generates an emergency recovery code formatted as KIN-XXXX-YYYY
 */
export function generateRecoveryCode(): string {
  const getRandomChar = () => CHARSET[Math.floor(Math.random() * CHARSET.length)];
  const part1 = Array.from({ length: 4 }, getRandomChar).join('');
  const part2 = Array.from({ length: 4 }, getRandomChar).join('');
  return `KIN-${part1}-${part2}`;
}

/**
 * Generates an invitation code formatted as KIN-XXXX
 */
export function generateInviteCode(): string {
  const getRandomChar = () => CHARSET[Math.floor(Math.random() * CHARSET.length)];
  const code = Array.from({ length: 4 }, getRandomChar).join('');
  return `KIN-${code}`;
}

/**
 * Generates a unique UUID v4 string
 */
export function generateUniqueId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
