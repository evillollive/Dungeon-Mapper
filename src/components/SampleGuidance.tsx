import type { SampleGuide } from '../utils/sampleGuides';

export default function SampleGuidance({ guide }: { guide: SampleGuide }) {
  return <section aria-label="Sample purpose and use">
    <p><strong>{guide.role}</strong></p>
    <p><strong>Purpose:</strong> {guide.purpose}</p>
    <p><strong>How to use:</strong> {guide.use}</p>
    <p>DM guidance is retained at the start of the first note on each level.
      Review publication and visibility before showing the map to players.</p>
  </section>;
}
