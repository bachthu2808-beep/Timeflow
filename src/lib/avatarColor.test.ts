import { avatarColorFor, initialsFor } from './avatarColor';

describe('avatarColorFor', () => {
  it('is deterministic for the same input', () => {
    const a = avatarColorFor('staff-123');
    const b = avatarColorFor('staff-123');
    expect(a).toEqual(b);
  });

  it('returns a background and text color', () => {
    const color = avatarColorFor('staff-123');
    expect(color.background).toMatch(/^#/);
    expect(color.text).toMatch(/^#/);
  });

  it('can produce different colors for different ids', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => avatarColorFor(id).background));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('initialsFor', () => {
  it('takes the first letter of the first and last word (family name + given name)', () => {
    expect(initialsFor('Bùi Thanh Tùng')).toBe('BT');
    expect(initialsFor('Nguyễn Minh An')).toBe('NA');
    expect(initialsFor('Trần Thu Hà')).toBe('TH');
  });

  it('handles a two-word name', () => {
    expect(initialsFor('Dương Anh')).toBe('DA');
  });

  it('handles a single word', () => {
    expect(initialsFor('Trâm')).toBe('T');
  });

  it('handles empty input', () => {
    expect(initialsFor('')).toBe('');
  });
});
