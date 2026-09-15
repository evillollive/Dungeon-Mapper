import { FIRST_USE_ILLUSTRATIONS, type FirstUseScene } from '../assets/firstUseIllustrations';
import './FirstUseIllustration.css';

export default function FirstUseIllustration({ scene }: { scene: FirstUseScene }) {
  return <svg className="first-use-illustration" data-scene={scene} width="240" height="144"
    viewBox="0 0 240 144" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    {FIRST_USE_ILLUSTRATIONS[scene].map((layer, index) =>
      <path key={index} d={layer.d} className={`illustration-${layer.treatment}`} />)}
  </svg>;
}
