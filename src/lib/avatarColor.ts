export interface AvatarColor {
  background: string;
  text: string;
}

const PALETTE: AvatarColor[] = [
  { background: '#D9F2E3', text: '#1F7A4D' }, // mint
  { background: '#DCEAFB', text: '#2563EB' }, // blue
  { background: '#E6E0FB', text: '#7C3AED' }, // purple
  { background: '#FBE0EC', text: '#DB2777' }, // pink
  { background: '#FCE4D8', text: '#EA580C' }, // peach
  { background: '#FEF3C7', text: '#B45309' }, // amber
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic pastel color for an avatar chip, derived from a stable id. */
export function avatarColorFor(id: string): AvatarColor {
  return PALETTE[hashString(id) % PALETTE.length];
}

/** Family name initial + given name initial (Vietnamese naming order: first word + last word). */
export function initialsFor(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
