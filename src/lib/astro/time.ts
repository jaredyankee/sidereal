export const DAY_MS = 86_400_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Earliest and latest instants the app will scrub to. The truncated VSOP87 model in
 *  astronomy-engine stays accurate to well under a degree across this window. */
export const MIN_TIME = Date.UTC(1000, 0, 1);
export const MAX_TIME = Date.UTC(3000, 0, 1);

export const clampTime = (ms: number) => Math.min(MAX_TIME, Math.max(MIN_TIME, ms));

/** Julian centuries since J2000.0 (UT, close enough for ayanamsa and mean node). */
export const centuriesSinceJ2000 = (ms: number) => (ms - J2000_MS) / DAY_MS / 36_525;

/** Normalize degrees to [0, 360). */
export const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Normalize a degree difference to (-180, 180]. Used to keep drags and speeds continuous. */
export const wrap180 = (deg: number) => {
	const d = norm360(deg);
	return d > 180 ? d - 360 : d;
};
