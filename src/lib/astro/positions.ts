import * as A from 'astronomy-engine';
import { DAY_MS, centuriesSinceJ2000, norm360, wrap180 } from './time';
import { ayanamsa, toSidereal, type AyanamsaKind, type SiderealPlacement } from './zodiac';

export const PLANETS = [
	'Mercury',
	'Venus',
	'Earth',
	'Mars',
	'Jupiter',
	'Saturn',
	'Uranus',
	'Neptune'
] as const;
export type Planet = (typeof PLANETS)[number];

/** Sidereal orbital periods in days (JPL). Used to turn a drag angle into a time step. */
export const ORBITAL_PERIOD_DAYS: Record<Planet, number> = {
	Mercury: 87.969,
	Venus: 224.701,
	Earth: 365.256,
	Mars: 686.98,
	Jupiter: 4332.59,
	Saturn: 10759.22,
	Uranus: 30688.5,
	Neptune: 60182
};

/** Mean angular speed around the Sun, degrees per day. */
export const meanMotion = (p: Planet) => 360 / ORBITAL_PERIOD_DAYS[p];

/**
 * Heliocentric ecliptic longitude of date, in degrees. This is the angle the orrery draws
 * each planet at: real direction from the Sun, on a circle whose radius is only relational.
 */
export function helioLongitude(p: Planet, ms: number): number {
	return A.Ecliptic(A.HelioVector(p as A.Body, new Date(ms))).elon;
}

/** Tropical geocentric longitude of date, the position as seen from Earth. */
export type SkyBody = Exclude<Planet, 'Earth'> | 'Sun' | 'Moon' | 'Rahu' | 'Ketu';

export const SKY_BODIES: SkyBody[] = [
	'Sun',
	'Moon',
	'Mercury',
	'Venus',
	'Mars',
	'Jupiter',
	'Saturn',
	'Uranus',
	'Neptune',
	'Rahu',
	'Ketu'
];

/** Mean lunar node (Rahu), degrees. Ketu sits exactly opposite. Meeus ch. 47. */
function meanNode(ms: number): number {
	const T = centuriesSinceJ2000(ms);
	return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
}

export function geoLongitude(body: SkyBody, ms: number): number {
	const date = new Date(ms);
	switch (body) {
		case 'Sun':
			return A.SunPosition(date).elon;
		case 'Moon':
			return A.EclipticGeoMoon(date).lon;
		case 'Rahu':
			return meanNode(ms);
		case 'Ketu':
			return norm360(meanNode(ms) + 180);
		default:
			return A.Ecliptic(A.GeoVector(body as A.Body, date, true)).elon;
	}
}

/** Apparent daily motion in degrees; negative means retrograde. */
export function dailyMotion(body: SkyBody, ms: number): number {
	const half = DAY_MS / 2;
	return wrap180(geoLongitude(body, ms + half) - geoLongitude(body, ms - half));
}

export interface SkyPosition extends SiderealPlacement {
	body: SkyBody;
	tropical: number;
	retrograde: boolean;
}

/** Everything the readout panel needs for one instant. */
export function skyAt(ms: number, kind: AyanamsaKind = 'lahiri') {
	const ay = ayanamsa(ms, kind);
	const bodies: SkyPosition[] = SKY_BODIES.map((body) => {
		const tropical = geoLongitude(body, ms);
		// The Sun and Moon never go retrograde; the mean nodes always do.
		const retrograde =
			body === 'Rahu' || body === 'Ketu'
				? true
				: body === 'Sun' || body === 'Moon'
					? false
					: dailyMotion(body, ms) < 0;
		return { body, tropical, retrograde, ...toSidereal(tropical, ay) };
	});
	return { ayanamsa: ay, bodies };
}
