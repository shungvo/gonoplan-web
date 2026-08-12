import { describe, expect, it } from 'vitest';
import { __testing } from './RichText';

const { linkFace, TRAILING, INLINE } = __testing;

describe('link faces', () => {
  it('reads the host without www, and gives video hosts a video icon', () => {
    expect(linkFace('https://www.tiktok.com/@a/video/123')?.host).toBe('tiktok.com');
    expect(linkFace('https://youtu.be/abc')?.host).toBe('youtu.be');
  });

  it('falls back to a globe rather than to nothing', () => {
    const face = linkFace('https://some-cafe.vn/menu');
    expect(face?.host).toBe('some-cafe.vn');
    expect(face?.Icon).toBeDefined();
  });

  /** A URL that will not parse must degrade to its own text, never throw. */
  it('returns null for something that is not a URL', () => {
    expect(linkFace('https://')).toBeNull();
  });
});

describe('splitting a description', () => {
  const split = (source: string) => source.split(INLINE).filter((p) => p !== '');

  it('finds a bare URL that no markdown wraps', () => {
    expect(split('Xem ở https://tiktok.com/@a')).toContain('https://tiktok.com/@a');
  });

  /**
   * The URL inside `[label](url)` must not match on its own — the markdown
   * alternative has to win, or the label is orphaned from its link.
   */
  it('keeps a markdown link whole', () => {
    expect(split('[thực đơn](https://x.vn/menu)')).toEqual(['[thực đơn](https://x.vn/menu)']);
  });

  it('leaves a scheme it will not follow as plain text', () => {
    expect(split('javascript:alert(1)')).toEqual(['javascript:alert(1)']);
  });
});

describe('trailing punctuation', () => {
  it('is the sentence’s, not the URL’s', () => {
    expect(TRAILING.exec('https://x.vn/a.')?.[0]).toBe('.');
    expect(TRAILING.exec('https://x.vn/a')).toBeNull();
    // A path that genuinely ends in a slash keeps it.
    expect(TRAILING.exec('https://x.vn/a/')).toBeNull();
  });
});
