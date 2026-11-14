/**
 * Font for text drawn on maps: note numbers, labels, token letters and badges.
 * It matches the interface font, which ships with the app (see fonts.css), and
 * uses the semibold weight. Canvas text needs the font loaded before drawing;
 * main.tsx waits for it before the first render.
 */
export const MAP_LABEL_FAMILY = "'Nunito Sans', sans-serif";
export const MAP_LABEL_WEIGHT = 600;
