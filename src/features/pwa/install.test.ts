import { describe, expect, it } from 'vitest';
import { isIos, resolveInstallMode, type InstallEnvironment } from './install';

const base: InstallEnvironment = {
  native: false,
  standalone: false,
  ios: false,
  canPrompt: false,
  online: true,
  dismissed: false,
  onboarding: false,
};

describe('resolveInstallMode', () => {
  it('uses the browser prompt when one is being held', () => {
    expect(resolveInstallMode({ ...base, canPrompt: true })).toBe('prompt');
  });

  it('falls back to the Share-menu hint on iOS, which has no prompt', () => {
    expect(resolveInstallMode({ ...base, ios: true })).toBe('ios');
  });

  it('says nothing on a browser that can do neither', () => {
    expect(resolveInstallMode(base)).toBe('none');
  });

  it.each([
    ['inside the native app', { native: true }],
    ['already on the home screen', { standalone: true }],
    ['turned down before', { dismissed: true }],
    ['during onboarding', { onboarding: true }],
    ['offline', { online: false }],
  ] as const)('stays quiet when %s', (_label, override) => {
    expect(resolveInstallMode({ ...base, canPrompt: true, ios: true, ...override })).toBe('none');
  });
});

describe('isIos', () => {
  it('recognises an iPhone', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
  });

  it('recognises an iPad that reports itself as a Mac', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });

  it('does not mistake a real Mac or an Android phone for one', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false);
  });
});
