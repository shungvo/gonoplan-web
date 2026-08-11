import { describe, expect, it } from 'vitest';
import { fullAddress } from './address';

describe('fullAddress', () => {
  it('adds the parts the street line is missing', () => {
    expect(
      fullAddress({ address: '2B Phan Châu Trinh', district: 'Hội An', province: 'Quảng Nam' }),
    ).toBe('2B Phan Châu Trinh, Hội An, Quảng Nam');
  });

  /*
   * The case that sent the first share image out reading "…, Quận 1, Quận 1,
   * Hồ Chí Minh": most contributors type the district into the address itself.
   */
  it('does not repeat a district the address already carries', () => {
    expect(
      fullAddress({
        address: '07 Công Trường Lam Sơn, Phường Bến Nghé, Quận 1',
        district: 'Quận 1',
        province: 'Hồ Chí Minh',
      }),
    ).toBe('07 Công Trường Lam Sơn, Phường Bến Nghé, Quận 1, Hồ Chí Minh');
  });

  it('ignores case when deciding whether something was already said', () => {
    expect(
      fullAddress({ address: '12 Bạch Đằng, hải châu', district: 'Hải Châu', province: null }),
    ).toBe('12 Bạch Đằng, hải châu');
  });

  it('keeps diacritics apart', () => {
    // Different words to a reader; collapsing them would be a guess.
    expect(fullAddress({ address: '5 Lê Lợi, Quan 1', district: 'Quận 1' })).toBe(
      '5 Lê Lợi, Quan 1, Quận 1',
    );
  });

  it('survives a place with no administrative columns filled', () => {
    expect(fullAddress({ address: '5 Lê Lợi', district: null, province: null })).toBe('5 Lê Lợi');
  });
});
