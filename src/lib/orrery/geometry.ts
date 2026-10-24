/** SVG geometry for the orrery. Ecliptic longitude 0° points right; angles grow counter-clockwise. */

export const SIZE = 900;
export const C = SIZE / 2;

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

const rad = (deg: number) => (deg * Math.PI) / 180;

export function polar(r: number, deg: number) {
	return { x: C + r * Math.cos(rad(deg)), y: C - r * Math.sin(rad(deg)) };
}

/** Ecliptic angle of an SVG point as seen from the Sun. */
export function angleOf(x: number, y: number) {
	return (Math.atan2(C - y, x - C) * 180) / Math.PI;
}

/** Where a ray from (px, py) at `deg` meets the circle of radius r around the Sun. */
export function rayToCircle(px: number, py: number, deg: number, r: number) {
	const dx = Math.cos(rad(deg));
	const dy = -Math.sin(rad(deg));
	const ox = px - C;
	const oy = py - C;
	const b = ox * dx + oy * dy;
	const s = -b + Math.sqrt(b * b - (ox * ox + oy * oy - r * r));
	return { x: px + s * dx, y: py + s * dy };
}

/** Text glyphs; the trailing U+FE0E asks for the text form, never an emoji. */
export const GLYPH: Record<string, string> = {
	Sun: '☉︎',
	Moon: '☽︎',
	Mercury: '☿︎',
	Venus: '♀︎',
	Earth: '⊕︎',
	Mars: '♂︎',
	Jupiter: '♃︎',
	Saturn: '♄︎',
	Uranus: '♅︎',
	Neptune: '♆︎',
	Rahu: '☊︎',
	Ketu: '☋︎'
};
