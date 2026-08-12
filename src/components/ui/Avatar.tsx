import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * The six sizes a person is drawn at, taken from the six places they appear.
 *
 * Not a guessed scale. Before this component existed the app had four
 * hand-rolled initial circles at `size-9`, `size-10`, `size-11` and `size-14`,
 * each with its own copy of the same six classes — a scale that existed in
 * practice, was never declared, and drifted a step every time somebody typed
 * it again. These are those four, plus the two this component was built for.
 *
 * `px` is the `sizes` hint for the image branch. Wrong there costs a download,
 * not a layout: at `xs` a browser given no hint fetches an image sized for the
 * whole column.
 */
const SIZES = {
  xs: { box: 'size-8', text: 'text-sm', px: '32px' },
  sm: { box: 'size-9', text: 'text-sm', px: '36px' },
  md: { box: 'size-10', text: 'text-base', px: '40px' },
  lg: { box: 'size-11', text: 'text-base', px: '44px' },
  xl: { box: 'size-14', text: 'text-xl', px: '56px' },
  '2xl': { box: 'size-20', text: 'text-3xl', px: '80px' },
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * A person, as a picture or as the letter their name starts with.
 *
 * The initial is not a placeholder for a missing photograph — most accounts
 * will never set one, so it is the normal state and has to look deliberate. It
 * takes the brand tint rather than a grey, for the same reason a place card
 * takes a category colour when it has no photo: a screen full of grey discs
 * reads as broken, a screen full of tinted ones reads as a design.
 */
export function Avatar({
  name,
  url,
  size = 'xl',
  className,
}: {
  name: string;
  url?: string | null | undefined;
  size?: AvatarSize;
  className?: string | undefined;
}) {
  const style = SIZES[size];

  if (url) {
    return (
      <span
        className={cn(
          // `block`, and it is load-bearing. A `<span>` is inline by default,
          // and width and height do not apply to a non-replaced inline
          // element — so `size-20` computed to 80px and the box measured 0×0,
          // collapsing the avatar to nothing the moment somebody actually had
          // a photograph. The initials branch below never showed it because
          // `flex` already takes the element out of inline flow.
          'bg-surface-sunken relative block shrink-0 overflow-hidden rounded-full',
          style.box,
          className,
        )}
      >
        {/* `alt=""`: the name is always rendered beside this, and a screen
            reader announcing it twice is noise, not access. */}
        <Image src={url} alt="" fill sizes={style.px} className="object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary-tint text-primary flex shrink-0 items-center justify-center rounded-full font-semibold',
        style.box,
        style.text,
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
