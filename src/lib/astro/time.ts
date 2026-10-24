export const DAY_MS = 86_400_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Earliest and latest instants the app will scrub to. The truncated VSOP87 model in
 *  astronomy-engine stays accurate to well under a degree across this window. */
export const MIN_TIME = Date.UTC(1000, 0, 1);
export const MAX_TIME = Date.UTC(3000, 0, 1);

export function clampTime(ms: number): number {
	return Math.min(MAX_TIME, Math.max(MIN_TIME, ms));
}

/** Julian centuries since J2000.0 (UT, close enough for ayanamsa and mean node). */
export function centuriesSinceJ2000(ms: number): number {
	return (ms - J2000_MS) / DAY_MS / 36_525;
}

/** Normalize degrees to [0, 360). The extra +360 handles negative inputs, because
 *  JavaScript's % keeps the sign of the left side (-30 % 360 is -30, not 330). */
export function norm360(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}

/** Normalize a degree difference to (-180, 180]. Used to keep drags and speeds continuous:
 *  going from 359° to 1° is a step of +2°, not -358°. */
export function wrap180(degrees: number): number {
	const normalized = norm360(degrees);
	return normalized > 180 ? normalized - 360 : normalized;
}
