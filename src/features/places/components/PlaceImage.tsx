import Image from 'next/image';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import type { CategoryIconKey } from '@/features/categories/api';
import { cn } from '@/lib/utils/cn';

export interface PlaceImageProps {
  url: string | null;
  blurhash?: string | null;
  name: string;
  categoryIconKey: CategoryIconKey;
  categoryColor: string;
  sizes: string;
  className?: string | undefined;
  priority?: boolean | undefined;
  /** Scales the fallback glyph — a rail card needs a smaller mark than a hero. */
  fallbackSize?: 'sm' | 'md' | 'lg' | undefined;
}

const GLYPH_SIZE = { sm: 'size-6', md: 'size-9', lg: 'size-14' } as const;

/**
 * A place photo, or a designed stand-in.
 *
 * Most places have no photo — community submissions arrive without one, and
 * uploads only land in Phase 8. A grey box with a broken-image icon would make
 * a correct, complete listing look broken, so the fallback is a soft gradient
 * in the place's own category colour carrying that category's icon.
 *
 * It uses the same glyph vocabulary as the map markers, so an unphotographed
 * cafe still reads as a cafe, and the card keeps its visual rhythm beside
 * neighbours that do have photos.
 */
export function PlaceImage({
  url,
  name,
  categoryIconKey,
  categoryColor,
  sizes,
  className,
  priority = false,
  fallbackSize = 'md',
}: PlaceImageProps) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} — no photo yet`}
      className={cn('flex h-full w-full items-center justify-center', className)}
      style={{
        background: `linear-gradient(135deg, ${categoryColor}2e 0%, ${categoryColor}0f 55%, ${categoryColor}24 100%)`,
      }}
    >
      <CategoryGlyph
        iconKey={categoryIconKey}
        color={categoryColor}
        className={cn(GLYPH_SIZE[fallbackSize], 'opacity-45')}
      />
    </div>
  );
}
