import { helioLongitude, meanMotion, type Planet } from './positions';
import { DAY_MS, clampTime, wrap180 } from './time';

/**
 * Find the instant near `fromMs` at which `planet` sits at heliocentric longitude `targetDeg`.
 *
 * This is what makes every planet a slider: dragging one sets a target angle, we solve for
 * the time, and every other planet follows from that time.
 *
 * Newton's method: measure how far off the planet is, divide by how fast it is moving right
 * now, and jump by that many days. Repeat until close enough; it converges in two or three
 * tries. (The mean motion alone is not enough: Mercury's speed swings ±40% around its orbit,
 * so mean-rate steps undershoot.) The gap is always measured the shortest way round
 * (wrap180), so continuous drags never jump an orbit.
 */
export function solveTimeForAngle(planet: Planet, fromMs: number, targetDeg: number): number {
	let guessMs = fromMs;
	for (let attempt = 0; attempt < 6; attempt++) {
		const degreesToGo = wrap180(targetDeg - helioLongitude(planet, guessMs));
		if (Math.abs(degreesToGo) < 1e-5) break;
		const daysToGo = degreesToGo / localMotion(planet, guessMs);
		guessMs = clampTime(guessMs + daysToGo * DAY_MS);
	}
	return guessMs;
}

/** Heliocentric angular speed right now, degrees per day, measured over a tenth of a day.
 *  Always positive (planets never move backwards around the Sun), with the mean motion
 *  as a fallback. */
function localMotion(planet: Planet, ms: number): number {
	const sampleDays = 0.1;
	const halfSampleMs = (sampleDays / 2) * DAY_MS;
	const before = helioLongitude(planet, ms - halfSampleMs);
	const after = helioLongitude(planet, ms + halfSampleMs);
	const degreesPerDay = wrap180(after - before) / sampleDays;
	return degreesPerDay > 0 ? degreesPerDay : meanMotion(planet);
}
