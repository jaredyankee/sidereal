import { helioLongitude, meanMotion, type Planet } from './positions';
import { DAY_MS, clampTime, wrap180 } from './time';

/**
 * Find the instant near `fromMs` at which `planet` sits at heliocentric longitude `targetDeg`.
 *
 * This is what makes every planet a slider: dragging one sets a target angle, we solve for
 * the time, and every other planet follows from that time. Newton's method on the planet's
 * local angular speed converges in two or three iterations. (The mean motion alone is not
 * enough: Mercury's speed swings ±40% around its orbit, so mean-rate steps undershoot.)
 * The step is always the shortest way round (wrap180), so continuous drags never jump an orbit.
 */
export function solveTimeForAngle(planet: Planet, fromMs: number, targetDeg: number): number {
	let t = fromMs;
	for (let i = 0; i < 6; i++) {
		const delta = wrap180(targetDeg - helioLongitude(planet, t));
		if (Math.abs(delta) < 1e-5) break;
		t = clampTime(t + (delta / localMotion(planet, t)) * DAY_MS);
	}
	return t;
}

/** Heliocentric angular speed right now, degrees per day. Always positive (planets never
 *  move backwards around the Sun), with the mean motion as a fallback. */
function localMotion(planet: Planet, ms: number): number {
	const h = 0.05 * DAY_MS;
	const rate = wrap180(helioLongitude(planet, ms + h) - helioLongitude(planet, ms - h)) / 0.1;
	return rate > 0 ? rate : meanMotion(planet);
}
