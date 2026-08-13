import { describe, expect, it } from 'vitest';
import { shortAddressLabel } from './useLocationLabel';
import type { Address } from '@/features/geo/api';

/** The required fields nothing here is testing. */
function address(parts: Partial<Address>): Address {
  return {
    formatted: '',
    street: null,
    ward: null,
    district: null,
    province: null,
    latitude: 10.7769,
    longitude: 106.7009,
    provider: 'test',
    isFallbackProvider: false,
    ...parts,
  };
}

describe('shortAddressLabel', () => {
  it('takes the two most specific parts, not the widest ones', () => {
    expect(
      shortAddressLabel(
        address({
          street: 'Lê Lợi',
          ward: 'Phường Bến Nghé',
          district: 'Quận 1',
          province: 'Hồ Chí Minh',
          formatted: 'Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, 70000, Việt Nam',
        }),
      ),
    ).toBe('Lê Lợi, P.Bến Nghé');
  });

  it('writes the administrative prefixes the way a sign does', () => {
    expect(shortAddressLabel(address({ ward: 'Phường 12', district: 'Quận Gò Vấp' }))).toBe(
      'P.12, Q.Gò Vấp',
    );
    expect(
      shortAddressLabel(address({ district: 'Huyện Củ Chi', province: 'Thành phố Hồ Chí Minh' })),
    ).toBe('H.Củ Chi, TP.Hồ Chí Minh');
  });

  /* Nobody says "Tỉnh Quảng Nam" out loud. */
  it('drops the province marker rather than abbreviating it', () => {
    expect(shortAddressLabel(address({ district: 'Hội An', province: 'Tỉnh Quảng Nam' }))).toBe(
      'Hội An, Quảng Nam',
    );
  });

  /*
   * Straight from `GET /geo/reverse` at the simulator's position. HCMC's 2025
   * reform folded the districts into wards, so the geocoder returns no
   * district — and a hard-coded street-then-district pair skipped the empty
   * rung and landed on "63 Lý Tự Trọng, Thành phố Hồ Chí Minh".
   */
  it('does not reach past a missing district to the province', () => {
    expect(
      shortAddressLabel(
        address({
          street: '63 Lý Tự Trọng',
          ward: 'Phường Sài Gòn',
          district: null,
          province: 'Thành phố Hồ Chí Minh',
        }),
      ),
    ).toBe('63 Lý Tự Trọng, P.Sài Gòn');
  });

  /*
   * The common case away from the centre. OpenStreetMap's Vietnamese
   * house-number and street coverage thins out fast, and a ward with no street
   * is the usual shape of that — it must not fall all the way to the province.
   */
  it('uses the ward when there is no street', () => {
    expect(shortAddressLabel(address({ ward: 'Phường 12', district: 'Gò Vấp' }))).toBe(
      'P.12, Gò Vấp',
    );
  });

  it('anchors on the province when there is no district', () => {
    expect(shortAddressLabel(address({ street: 'Bạch Đằng', province: 'Đà Nẵng' }))).toBe(
      'Bạch Đằng, Đà Nẵng',
    );
  });

  it('says the one part it has rather than nothing', () => {
    expect(shortAddressLabel(address({ district: 'Quận 7' }))).toBe('Q.7');
  });

  /*
   * A long truncated label still beats an empty chip, so `formatted` is the
   * floor rather than a state the caller has to handle.
   */
  it('falls back to the full address when every part is missing', () => {
    expect(shortAddressLabel(address({ formatted: 'Somewhere in Việt Nam' }))).toBe(
      'Somewhere in Việt Nam',
    );
  });
});
