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

/** Ayanamsa in degrees: the gap between the tropical and sidereal zodiacs at a given instant. */
export function ayanamsa(ms: number, kind: AyanamsaKind = 'lahiri'): number {
	const T = centuriesSinceJ2000(ms);
	return AYANAMSAS[kind].atJ2000 + (PRECESSION_ARCSEC * T + PRECESSION_ARCSEC_T2 * T * T) / 3600;
}

export interface SiderealPlacement {
	/** Sidereal longitude, 0–360. */
	longitude: number;
	sign: Sign;
	/** Degrees within the sign, 0–30. */
	degree: number;
}

export function toSidereal(tropicalDeg: number, ayanamsaDeg: number): SiderealPlacement {
	const longitude = norm360(tropicalDeg - ayanamsaDeg);
	return { longitude, sign: SIGNS[Math.floor(longitude / 30)], degree: longitude % 30 };
}

/** "18°04′" style. Truncates rather than rounds, the astrological convention. */
export function formatDegree(degree: number): string {
	const d = Math.floor(degree);
	const m = Math.floor((degree - d) * 60);
	return `${d}°${String(m).padStart(2, '0')}′`;
}
