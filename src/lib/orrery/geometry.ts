/** SVG geometry for the orrery. Ecliptic longitude 0° points right; angles grow counter-clockwise. */

export const SIZE = 900;
/** The Sun sits at the centre of the square drawing. */
export const CENTER = SIZE / 2;

/** Zodiac band and where geocentric markers sit. */
export const RING_INNER = 400;
export const RING_OUTER = 440;
export const MARKER_R = 384;

/** Orbit radii are relational, not to scale. Neptune would otherwise sit 77× farther than Mercury. */
export const ORBIT_R = {
	Mercury: 70,
	Venus: 104,
	Earth: 140,
	Mars: 176,
	Jupiter: 222,
	Saturn: 266,
	Uranus: 306,
	Neptune: 344
} as const;

export const PLANET_SIZE = {
	Mercury: 4,
	Venus: 6,
	Earth: 6.5,
	Mars: 5,
	Jupiter: 11,
	Saturn: 9,
	Uranus: 7,
	Neptune: 7
} as const;

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/** The SVG point at `radius` from the Sun, in direction `degrees`.
 *  SVG's y axis points down, so y is subtracted to make angles turn counter-clockwise. */
export function polar(radius: number, degrees: number) {
	return {
		x: CENTER + radius * Math.cos(toRadians(degrees)),
		y: CENTER - radius * Math.sin(toRadians(degrees))
	};
}

/** Ecliptic angle of an SVG point as seen from the Sun. The inverse of `polar`. */
export function angleOf(x: number, y: number): number {
	return (Math.atan2(CENTER - y, x - CENTER) * 180) / Math.PI;
}

/**
 * Where a ray starting at (startX, startY) and heading in direction `degrees` meets the
 * circle of `radius` around the Sun. Used for the Earth → Sun thread out to the zodiac ring.
 *
 * Walking `distance` along the ray lands on the circle when the point's distance from the
 * centre equals `radius`. Squaring that gives a quadratic in `distance`; the start is inside
 * the circle, so we take the positive root (the forward crossing).
 */
export function rayToCircle(startX: number, startY: number, degrees: number, radius: number) {
	const directionX = Math.cos(toRadians(degrees));
	const directionY = -Math.sin(toRadians(degrees));
	const offsetX = startX - CENTER;
	const offsetY = startY - CENTER;
	const projection = offsetX * directionX + offsetY * directionY;
	const startDistanceSquared = offsetX * offsetX + offsetY * offsetY;
	const distance =
		-projection + Math.sqrt(projection * projection - (startDistanceSquared - radius * radius));
	return { x: startX + distance * directionX, y: startY + distance * directionY };
}
