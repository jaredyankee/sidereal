<script lang="ts">
	import type { SkyBody, SkyPosition } from '#lib/astro/positions.ts';
	import { GLYPHS, formatDegree } from '#lib/astro/zodiac.ts';

	let { sky, active = $bindable(null) }: { sky: SkyPosition[]; active?: SkyBody | null } = $props();
</script>

<table class="readouts">
	<caption class="visually-hidden">Sidereal positions as seen from Earth</caption>
	<thead class="visually-hidden">
		<tr><th scope="col">Body</th><th scope="col">Sign</th><th scope="col">Degree</th><th scope="col">Motion</th></tr>
	</thead>
	<tbody>
		{#each sky as position (position.body)}
			<tr class:on={active === position.body} onpointerenter={() => (active = position.body)}>
				<th scope="row"><span class="glyph" aria-hidden="true">{GLYPHS[position.body]}</span>{position.body}</th>
				<td class="sign">{position.sign}</td>
				<td class="deg">{formatDegree(position.degree)}</td>
				<td class="rx">{#if position.retrograde}<abbr title="Retrograde">Rx</abbr>{/if}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.readouts {
		width: 100%;
		border-collapse: collapse;
		border-top: 1px solid var(--ink);
	}
	tr {
		border-bottom: 1px solid var(--rule);
		transition: background 0.15s;
	}
	tr.on {
		background: var(--highlight);
	}
	th,
	td {
		padding: 8px 4px;
		text-align: left;
		font-weight: 400;
		vertical-align: baseline;
	}
	th {
		font-style: italic;
		font-size: 19px;
		white-space: nowrap;
	}
	.glyph {
		display: inline-block;
		width: 1.5em;
		font-family: var(--font-glyph);
		font-style: normal;
		font-size: 16px;
		color: var(--ink-soft);
	}
	.sign {
		font-family: var(--font-caps);
		font-size: 17px;
		letter-spacing: 1px;
	}
	.deg {
		font-size: 18px;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.rx {
		width: 2.2em;
		text-align: right;
		color: var(--vermilion);
		font-size: 17px;
	}
	abbr {
		text-decoration: none;
	}
</style>
