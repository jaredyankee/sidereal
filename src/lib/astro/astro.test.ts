import { describe, expect, it } from 'vitest';
import { helioLongitude, skyAt } from './positions';
import { solveTimeForAngle } from './scrub';
import { DAY_MS, wrap180 } from './time';
import { ayanamsa, formatDegree, toSidereal } from './zodiac';

const OCT_19_2026 = Date.UTC(2026, 9, 19, 13, 0, 0);
const placement = (ms: number, body: string) => skyAt(ms).bodies.find((b) => b.body === body)!;

describe('ayanamsa', () => {
	it('Lahiri is about 24°13′ in late 2026', () => {
		expect(ayanamsa(OCT_19_2026)).toBeCloseTo(24.22, 1);
	});

	it('Fagan-Bradley runs about 0.88° ahead of Lahiri', () => {
		const gap = ayanamsa(OCT_19_2026, 'fagan-bradley') - ayanamsa(OCT_19_2026, 'lahiri');
		expect(gap).toBeCloseTo(0.879, 2);
	});

	it('grows by about 50.3″ per year', () => {
		const perYear = (ayanamsa(OCT_19_2026 + 365.25 * DAY_MS) - ayanamsa(OCT_19_2026)) * 3600;
		expect(perYear).toBeCloseTo(50.3, 0);
	});
});

describe('sidereal placements', () => {
	it('converts tropical to sidereal and wraps below 0°', () => {
		expect(toSidereal(10, 24).sign).toBe('Pisces');
		expect(toSidereal(10, 24).degree).toBeCloseTo(16);
	});

	it('formats degrees by truncation', () => {
		expect(formatDegree(18.0699)).toBe('18°04′');
		expect(formatDegree(29.999)).toBe('29°59′');
	});

	it('matches the sky on Oct 19, 2026', () => {
		expect(placement(OCT_19_2026, 'Sun').sign).toBe('Libra');
		expect(placement(OCT_19_2026, 'Moon').sign).toBe('Capricorn');
		expect(placement(OCT_19_2026, 'Mars').sign).toBe('Cancer');
		expect(placement(OCT_19_2026, 'Saturn').sign).toBe('Pisces');
	});

	it('the Sun enters sidereal Aries around April 14 (Lahiri)', () => {
		expect(placement(Date.UTC(2026, 3, 10), 'Sun').sign).toBe('Pisces');
		expect(placement(Date.UTC(2026, 3, 18), 'Sun').sign).toBe('Aries');
	});

	it('detects Mercury retrograde (Oct 24 – Nov 13, 2026)', () => {
		expect(placement(Date.UTC(2026, 9, 20), 'Mercury').retrograde).toBe(false);
		expect(placement(Date.UTC(2026, 10, 1), 'Mercury').retrograde).toBe(true);
		expect(placement(Date.UTC(2026, 10, 20), 'Mercury').retrograde).toBe(false);
	});

	it('keeps Ketu opposite Rahu', () => {
		const sky = skyAt(OCT_19_2026);
		const rahu = sky.bodies.find((b) => b.body === 'Rahu')!;
		const ketu = sky.bodies.find((b) => b.body === 'Ketu')!;
		expect(Math.abs(wrap180(ketu.tropical - rahu.tropical))).toBeCloseTo(180);
	});
});

describe('scrubbing', () => {
	it('lands a planet exactly on the dragged angle', () => {
		const target = helioLongitude('Mars', OCT_19_2026) + 40;
		const t = solveTimeForAngle('Mars', OCT_19_2026, target);
		expect(wrap180(helioLongitude('Mars', t) - target)).toBeCloseTo(0, 3);
	});

	it('moves forward in time for counter-clockwise drags and back for clockwise', () => {
		const here = helioLongitude('Jupiter', OCT_19_2026);
		expect(solveTimeForAngle('Jupiter', OCT_19_2026, here + 5)).toBeGreaterThan(OCT_19_2026);
		expect(solveTimeForAngle('Jupiter', OCT_19_2026, here - 5)).toBeLessThan(OCT_19_2026);
	});

	it('gears each planet differently: 1° of Neptune is ~half a year', () => {
		const here = helioLongitude('Neptune', OCT_19_2026);
		const days = (solveTimeForAngle('Neptune', OCT_19_2026, here + 1) - OCT_19_2026) / DAY_MS;
		expect(days).toBeGreaterThan(150);
		expect(days).toBeLessThan(185);
	});

	it('accumulates full orbits over many small steps without snapping back', () => {
		let t = OCT_19_2026;
		for (let i = 0; i < 360 * 3; i++) {
			t = solveTimeForAngle('Mercury', t, helioLongitude('Mercury', t) + 1);
		}
		const days = (t - OCT_19_2026) / DAY_MS;
		expect(days).toBeGreaterThan(3 * 87.969 - 1);
		expect(days).toBeLessThan(3 * 87.969 + 1);
	});
});
