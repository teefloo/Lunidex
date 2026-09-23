type RGB = readonly [number, number, number];

function parseHexColor(color: string): RGB {
  const hex = color.trim().replace(/^#/, '');
  const expanded = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join('') : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return [0, 0, 0];

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance([red, green, blue]: RGB): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

export function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(background: string): '#111111' | '#ffffff' {
  return getContrastRatio('#111111', background) >= getContrastRatio('#ffffff', background)
    ? '#111111'
    : '#ffffff';
}
