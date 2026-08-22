import Image from 'next/image';

export interface LunidexLogoProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Shared Lunidex mark. The source artwork is raster-only, so every surface
 * uses the same proportional PNG derivative instead of recreating the mark.
 */
export default function LunidexLogo({
  alt = 'Lunidex',
  className = 'h-10 w-10',
  priority = false,
  sizes = '64px',
}: LunidexLogoProps) {
  return (
    <Image
      // Keep the in-app mark on its own URL so an older cached PWA icon cannot
      // reintroduce the former opaque white background in the interface.
      src="/brand/lunidex-mark-square.png"
      alt={alt}
      width={512}
      height={512}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
