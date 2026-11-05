import Image from 'next/image'

const MASCOT_ASSETS = {
  'cloud-monster-night-bounce': {
    gif: '/brand/mascot/cloud-monster-night-bounce.gif',
    poster: '/brand/mascot/cloud-monster-night-bounce.webp',
  },
  'cloud-monster-thumbs-up': {
    gif: '/brand/mascot/cloud-monster-thumbs-up.gif',
    poster: '/brand/mascot/cloud-monster-thumbs-up.webp',
  },
  'ghost-sparkle-jump': {
    gif: '/brand/mascot/ghost-sparkle-jump.gif',
    poster: '/brand/mascot/ghost-sparkle-jump.webp',
  },
} as const

export type MascotGifName = keyof typeof MASCOT_ASSETS

type MascotGifProps = {
  mascot: MascotGifName
  width: number
  height: number
  className?: string
}

export function MascotGif({ mascot, width, height, className }: MascotGifProps) {
  const assets = MASCOT_ASSETS[mascot]

  return (
    <picture>
      <source
        srcSet={assets.poster}
        type="image/webp"
        media="(prefers-reduced-motion: reduce)"
      />
      <Image
        src={assets.gif}
        alt=""
        width={width}
        height={height}
        unoptimized
        className={className}
      />
    </picture>
  )
}
