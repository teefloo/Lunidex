import { BoosterExplainer, boosterGuideMetadata } from '../BoosterExplainer';

export function generateMetadata() {
  return boosterGuideMetadata('value');
}

export default function BoosterValuePage() {
  return <BoosterExplainer kind="value" />;
}
