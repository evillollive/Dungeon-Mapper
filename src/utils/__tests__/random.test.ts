import { describe, it, expect } from 'vitest';
import { makeRng, seedFromString, parseSeed, randomSeed, seedToString } from '../generators/random';

describe('seedFromString', () => {
  it('returns a 32-bit unsigned integer', () => {
    const seed = seedFromString('hello');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(0x100000000);
  });

  it('is deterministic', () => {
    expect(seedFromString('test')).toBe(seedFromString('test'));
  });

  it('produces different seeds for different strings', () => {
    expect(seedFromString('abc')).not.toBe(seedFromString('def'));
  });
});

describe('seedToString / parseSeed roundtrip', () => {
  it('converts seed to hex and back', () => {
    const seed = 0xdeadbeef;
    const hex = seedToString(seed);
    expect(hex).toBe('deadbeef');
    expect(parseSeed(hex)).toBe(seed);
  });
});

describe('parseSeed', () => {
  it('parses decimal digits', () => {
    expect(parseSeed('12345')).toBe(12345);
  });

  it('parses hex with 0x prefix', () => {
    expect(parseSeed('0xff')).toBe(255);
  });

  it('returns random seed for empty string', () => {
    const s = parseSeed('');
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it('hashes arbitrary strings', () => {
    const s = parseSeed('my dungeon seed!');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(parseSeed('my dungeon seed!')).toBe(s);
  });
});

describe('randomSeed', () => {
  it('returns a 32-bit unsigned integer', () => {
    const seed = randomSeed();
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(0x100000000);
  });
});

describe('makeRng', () => {
  it('produces deterministic sequences', () => {
    const rng1 = makeRng(42);
    const rng2 = makeRng(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('next() returns values in [0, 1)', () => {
    const rng = makeRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() returns values in [min, max] inclusive', () => {
    const rng = makeRng(999);
    const results = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const v = rng.int(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      results.add(v);
    }
    expect(results.size).toBe(3);
  });

  it('int() handles reversed min/max', () => {
    const rng = makeRng(42);
    const v = rng.int(5, 1);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(5);
  });

  it('pick() returns elements from the array', () => {
    const rng = makeRng(42);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick() throws on empty array', () => {
    const rng = makeRng(42);
    expect(() => rng.pick([])).toThrow('pick: empty array');
  });

  it('chance() returns boolean', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 20; i++) {
      expect(typeof rng.chance()).toBe('boolean');
    }
  });

  it('chance(0) always returns false', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 20; i++) {
      expect(rng.chance(0)).toBe(false);
    }
  });

  it('chance(1) always returns true', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 20; i++) {
      expect(rng.chance(1)).toBe(true);
    }
  });
});
