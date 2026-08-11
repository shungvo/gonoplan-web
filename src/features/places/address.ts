/**
 * A place's address with its administrative tail, without saying anything
 * twice.
 *
 * `address` is free text a contributor typed, and in practice most of them
 * already end in the district — "07 Công Trường Lam Sơn, Phường Bến Nghé,
 * Quận 1". Appending the `district` and `province` columns blindly produces
 * "…, Quận 1, Quận 1, Hồ Chí Minh", which is how the first draft of the share
 * image read. The submit form's own `addressLine` warns about exactly this in
 * the other direction.
 *
 * Compared case-insensitively but with diacritics intact: "Quan 1" and
 * "Quận 1" are different places to a reader, and collapsing them would be a
 * guess. Both values come from the same row anyway, so an exact match is the
 * common case.
 */
export function fullAddress(place: {
  address: string;
  district?: string | null;
  province?: string | null;
}): string {
  const parts = [place.address.trim()].filter(Boolean);

  for (const part of [place.district, place.province]) {
    const trimmed = part?.trim();
    if (!trimmed) continue;

    const alreadySaid = parts.some((existing) =>
      existing.toLowerCase().includes(trimmed.toLowerCase()),
    );
    if (!alreadySaid) parts.push(trimmed);
  }

  return parts.join(', ');
}
