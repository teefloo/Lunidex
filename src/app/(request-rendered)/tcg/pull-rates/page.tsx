import { BoosterExplainer, boosterGuideMetadata } from '../BoosterExplainer';

export function generateMetadata() {
  return boosterGuideMetadata('pull');
}

export default function PullRatesPage() {
  return <BoosterExplainer kind="pull" />;
}
