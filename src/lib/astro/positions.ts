import * as Astronomy from 'astronomy-engine';
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
export function meanMotion(planet: Planet): number {
	return 360 / ORBITAL_PERIOD_DAYS[planet];
}

/**
 * Heliocentric ecliptic longitude of date, in degrees. This is the angle the orrery draws
 * each planet at: real direction from the Sun, on a circle whose radius is only relational.
 */
export function helioLongitude(planet: Planet, ms: number): number {
	const vector = Astronomy.HelioVector(planet as Astronomy.Body, new Date(ms));
	return Astronomy.Ecliptic(vector).elon;
}

/** Everything the readout table lists, as seen from Earth. */
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
	const centuries = centuriesSinceJ2000(ms);
	return norm360(125.0445479 - 1934.1362891 * centuries + 0.0020754 * centuries * centuries);
}

/** Tropical geocentric longitude of date: the position as seen from Earth. */
export function geoLongitude(body: SkyBody, ms: number): number {
	const date = new Date(ms);
	switch (body) {
		case 'Sun':
			return Astronomy.SunPosition(date).elon;
		case 'Moon':
			return Astronomy.EclipticGeoMoon(date).lon;
		case 'Rahu':
			return meanNode(ms);
		case 'Ketu':
			return norm360(meanNode(ms) + 180);
		default: {
			// `true` corrects for aberration: where the planet appears, not where it is.
			const vector = Astronomy.GeoVector(body as Astronomy.Body, date, true);
			return Astronomy.Ecliptic(vector).elon;
		}
	}
}

/** Apparent daily motion in degrees, measured across the day centred on `ms`.
 *  Negative means retrograde. */
export function dailyMotion(body: SkyBody, ms: number): number {
	const halfDay = DAY_MS / 2;
	return wrap180(geoLongitude(body, ms + halfDay) - geoLongitude(body, ms - halfDay));
}

function isRetrograde(body: SkyBody, ms: number): boolean {
	// The mean nodes always move backwards; the Sun and Moon never do.
	if (body === 'Rahu' || body === 'Ketu') return true;
	if (body === 'Sun' || body === 'Moon') return false;
	return dailyMotion(body, ms) < 0;
}

export interface SkyPosition extends SiderealPlacement {
	body: SkyBody;
	tropical: number;
	retrograde: boolean;
}

/** Everything the readout panel needs for one instant. */
export function skyAt(ms: number, kind: AyanamsaKind = 'lahiri') {
	const ayanamsaDegrees = ayanamsa(ms, kind);
	const bodies: SkyPosition[] = SKY_BODIES.map((body) => {
		const tropical = geoLongitude(body, ms);
		return {
			body,
			tropical,
			retrograde: isRetrograde(body, ms),
			...toSidereal(tropical, ayanamsaDegrees)
		};
	});
	return { ayanamsa: ayanamsaDegrees, bodies };
}
