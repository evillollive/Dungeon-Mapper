const paths = {
  build: 'M4 20 6 14 16 4 20 8 10 18 4 20ZM13 7 17 11',
  decorate: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  look: 'M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Zm9-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  levels: 'm3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5',
  tactical: 'M12 3v18M3 12h18M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
  notes: 'M5 3h14v18H5V3Zm3 5h8M8 12h8M8 16h5',
  encounter: 'M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 21v-4a6 6 0 0 1 12 0v4M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 5 5v2',
  info: 'M12 10v7M12 6v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  export: 'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',
  library: 'M4 4h5v16H4V4Zm5 0h5v16H9V4Zm7 1 4-1 3 15-4 1-3-15Z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  undo: 'm8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5M21 9H11a7 7 0 0 0 0 14',
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name }: { name: IconName }) {
  return <svg className="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}
