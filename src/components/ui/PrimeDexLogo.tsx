import LunidexLogo, { type LunidexLogoProps } from './LunidexLogo';

/**
 * Compatibility wrapper for existing internal imports. The visible asset is
 * now the Lunidex PNG mark; the historical component name stays intact.
 */
export default function PrimeDexLogo(props: LunidexLogoProps) {
  return <LunidexLogo {...props} />;
}
