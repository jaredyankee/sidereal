import { centuriesSinceJ2000, norm360 } from './time';

export const SIGNS = [
	'Aries',
	'Taurus',
	'Gemini',
	'Cancer',
	'Leo',
	'Virgo',
	'Libra',
	'Scorpio',
	'Sagittarius',
	'Capricorn',
	'Aquarius',
	'Pisces'
] as const;
export type Sign = (typeof SIGNS)[number];

/** Text glyphs for each body; the trailing U+FE0E asks for the text form, never an emoji. */
export const GLYPHS: Record<string, string> = {
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

export type AyanamsaKind = 'lahiri' | 'fagan-bradley';

export const AYANAMSAS: Record<AyanamsaKind, { label: string; atJ2000: number }> = {
	// Lahiri (Chitrapaksha), the Indian government standard: 23°51′25″ at J2000.
	lahiri: { label: 'Lahiri', atJ2000: 23.857 },
	// Fagan-Bradley, the Western sidereal standard: 24°44′ at J2000.
	'fagan-bradley': { label: 'Fagan-Bradley', atJ2000: 24.736 }
};

/** General precession in longitude, arcseconds per Julian century (IAU 2006, linear + quadratic). */
const PRECESSION_ARCSEC = 5028.796195;
const PRECESSION_ARCSEC_T2 = 1.1054348;

/** Ayanamsa in degrees: the gap between the tropical and sidereal zodiacs at a given instant.
 *  It starts at the J2000 value and grows as the equinox precesses (about 50″ a year). */
export function ayanamsa(ms: number, kind: AyanamsaKind = 'lahiri'): number {
	const centuries = centuriesSinceJ2000(ms);
	const precessionArcsec =
		PRECESSION_ARCSEC * centuries + PRECESSION_ARCSEC_T2 * centuries * centuries;
	return AYANAMSAS[kind].atJ2000 + precessionArcsec / 3600;
}

export interface SiderealPlacement {
	/** Sidereal longitude, 0–360. */
	longitude: number;
	sign: Sign;
	/** Degrees within the sign, 0–30. */
	degree: number;
}

export function toSidereal(tropicalDegrees: number, ayanamsaDegrees: number): SiderealPlacement {
	const longitude = norm360(tropicalDegrees - ayanamsaDegrees);
	const signIndex = Math.floor(longitude / 30);
	return { longitude, sign: SIGNS[signIndex], degree: longitude % 30 };
}

/** "18°04′" style. Truncates rather than rounds, the astrological convention. */
export function formatDegree(degree: number): string {
	const wholeDegrees = Math.floor(degree);
	const minutes = Math.floor((degree - wholeDegrees) * 60);
	return `${wholeDegrees}°${String(minutes).padStart(2, '0')}′`;
}
