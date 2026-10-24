<script lang="ts">
	import { skyAt, type SkyBody } from '#lib/astro/positions.ts';
	import { MAX_TIME, MIN_TIME, clampTime } from '#lib/astro/time.ts';
	import { AYANAMSAS, formatDegree, type AyanamsaKind } from '#lib/astro/zodiac.ts';
	import Orrery from '#lib/orrery/Orrery.svelte';
	import Readouts from '#lib/sky/Readouts.svelte';

	const AYANAMSA_KINDS = Object.keys(AYANAMSAS) as AyanamsaKind[];

	const SPEEDS = [
		{ value: 1, label: 'Real time' },
		{ value: 1e4, label: '×10⁴' },
		{ value: 1e6, label: '×10⁶' },
		{ value: 1e7, label: '×10⁷' }
	];

	let time = $state(Date.now());
	let speed = $state(1);
	let playing = $state(true);
	let scrubbing = $state(false);
	let ayanamsaKind = $state<AyanamsaKind>('lahiri');
	let active = $state<SkyBody | null>('Sun');

	const sky = $derived(skyAt(time, ayanamsaKind));
	const date = $derived(new Date(time));
	const dateLine = $derived(
		date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
	);
	const timeLine = $derived(date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

	// The clock: one requestAnimationFrame loop that advances simulated time by real elapsed
	// time × speed. Dragging a planet pauses it; the drag sets `time` directly.
	$effect(() => {
		let raf = 0;
		let last = performance.now();
		const tick = (now: number) => {
			const dt = now - last;
			last = now;
			if (playing && !scrubbing) {
				time = clampTime(time + dt * speed);
				if (time === MAX_TIME || time === MIN_TIME) playing = false;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	function setSpeed(v: number) {
		speed = v;
		playing = true;
	}

	function toNow() {
		time = Date.now();
		speed = 1;
		playing = true;
	}
</script>

<svelte:head>
	<title>Trips Around the Sun · Sidereal sky</title>
	<meta
		name="description"
		content="A live, draggable orrery of the solar system with sidereal placements as seen from Earth."
	/>
</svelte:head>

<div class="page">
	<header class="masthead">
		<a class="wordmark" href="/">Trips Around the Sun</a>
		<nav aria-label="Main">
			<a href="/" aria-current="page">Today's Sky</a>
			<span class="soon">Birth Chart</span>
			<span class="soon">Transits</span>
			<span class="soon">Why Sidereal</span>
		</nav>
	</header>

	<main class="layout">
		<section class="stage" aria-label="Orrery">
			<Orrery
				{time}
				ayanamsa={sky.ayanamsa}
				sky={sky.bodies}
				bind:active
				onscrub={(t) => (time = t)}
				onscrubstart={() => {
					scrubbing = true;
					playing = false;
				}}
				onscrubend={() => (scrubbing = false)}
			/>
			<p class="caption">
				Drag any planet to move through time; the rest follow. Orbits are drawn to relation, not
				scale. The red thread runs from Earth through the Sun to the Sun's sign; the outer glyphs
				mark where each body appears from Earth.
			</p>
		</section>

		<aside class="panel">
			<div class="when">
				<div class="eyebrow">The sky as it stands</div>
				<div class="date" aria-live="off">{dateLine}</div>
				<div class="sub">
					{timeLine} · {AYANAMSAS[ayanamsaKind].label} ayanamsa {formatDegree(sky.ayanamsa)}
				</div>
			</div>

			<div class="controls">
				<div class="eyebrow" id="pace">Pace of time</div>
				<div class="row" role="group" aria-labelledby="pace">
					{#each SPEEDS as s (s.value)}
						<button
							type="button"
							class="pill"
							aria-pressed={playing && speed === s.value}
							onclick={() => setSpeed(s.value)}>{s.label}</button
						>
					{/each}
				</div>
				<div class="row">
					<button type="button" class="pill quiet" onclick={() => (playing = !playing)}>
						{playing ? 'Pause' : 'Resume'}
					</button>
					<button type="button" class="pill quiet" onclick={toNow}>Return to now</button>
				</div>
				<label class="ayanamsa">
					<span class="eyebrow">Ayanamsa</span>
					<select bind:value={ayanamsaKind}>
						{#each AYANAMSA_KINDS as key (key)}
							<option value={key}>{AYANAMSAS[key].label}</option>
						{/each}
					</select>
				</label>
			</div>

			<Readouts sky={sky.bodies} bind:active />
			<p class="note">
				Rx marks apparent retrograde. Speed time up, or drag Earth, to watch Mercury loop back.
				Rahu and Ketu are the mean lunar nodes.
			</p>
		</aside>
	</main>
</div>

<style>
	.page {
		max-width: 1280px;
		margin: 0 auto;
		padding: 28px 16px 56px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.masthead {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		border-bottom: 1px solid var(--ink);
		padding-bottom: 12px;
	}
	.wordmark {
		font-family: var(--font-script);
		font-size: clamp(32px, 6vw, 44px);
		line-height: 1.1;
		color: var(--ink);
		text-decoration: none;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 22px;
		font-family: var(--font-caps);
		font-size: 17px;
		letter-spacing: 1px;
	}
	nav a,
	nav .soon {
		padding: 10px 0;
	}
	nav a {
		text-decoration: none;
		color: var(--ink);
		border-bottom: 1px solid var(--sepia);
	}
	nav .soon {
		color: var(--muted);
	}
	.layout {
		display: flex;
		flex-wrap: wrap;
		gap: 32px;
		align-items: flex-start;
	}
	.stage {
		flex: 999 1 520px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.caption {
		margin: 0;
		max-width: 600px;
		text-align: center;
		font-style: italic;
		font-size: 16px;
		color: var(--muted);
	}
	.panel {
		flex: 1 1 320px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.eyebrow {
		font-family: var(--font-caps);
		font-size: 15px;
		letter-spacing: 1.5px;
		color: var(--muted);
	}
	.date {
		font-family: var(--font-script);
		font-size: 40px;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
	}
	.sub {
		font-size: 17px;
		color: var(--muted);
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.pill {
		min-height: 44px;
		padding: 0 16px;
		border: 1px solid var(--ink);
		border-radius: 2px;
		background: transparent;
		color: var(--ink);
		font-family: var(--font-body);
		font-size: 18px;
		cursor: pointer;
	}
	.pill[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.pill.quiet {
		font-style: italic;
	}
	.pill:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--vermilion);
		outline-offset: 2px;
	}
	.ayanamsa {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	select {
		min-height: 44px;
		padding: 0 10px;
		border: 1px solid var(--ink);
		border-radius: 2px;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-body);
		font-size: 18px;
	}
	.note {
		margin: 0;
		font-size: 15px;
		font-style: italic;
		color: var(--muted);
	}
</style>
