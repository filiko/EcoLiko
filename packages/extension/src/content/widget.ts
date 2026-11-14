/**
 * Floating on-page widget — ISOLATED world content script.
 * Injects a persistent pill into AI site pages showing live eco stats.
 */

import { aggregateEvents, WATER_BENCHMARKS, type UsageEvent, type EcoScore } from '@ecoliko/core';

const { jug, flush, shower } = WATER_BENCHMARKS;

function formatEnergy(kwh: number): string {
  if (kwh < 0.001) return `${(kwh * 1_000_000).toFixed(1)} μWh`;
  if (kwh < 1)     return `${(kwh * 1000).toFixed(1)} Wh`;
  return `${kwh.toFixed(3)} kWh`;
}

function formatWater(liters: number): { icon: string; value: string } {
  const ml = liters * 1000;
  if (ml < 1000) {
    if (ml < 44)   return { icon: '', value: `${ml.toFixed(0)} mL` };
    if (ml < 500)  return { icon: '', value: `${(ml / 44).toFixed(1)} shots` };
    return { icon: '', value: `${(ml / 500).toFixed(1)} bottles` };
  }

  const litersDisplay = liters < jug ? `${liters.toFixed(1)} L` : '';
  const fraction = liters / shower;
  const decimal = fraction.toFixed(2).replace(/\.?0+$/, '');

  if (liters < shower) {
    return { icon: TOILET_SVG, value: `${litersDisplay} ${decimal}` };
  }

  const showers = Math.floor(fraction);
  const remainder = liters - (showers * shower);
  const remainderDecimal = remainder > 0 ? (remainder / shower).toFixed(2).replace(/\.?0+$/, '') : '';

  return {
    icon: showers > 0 ? SHOWER_SVG + (remainderDecimal ? TOILET_SVG : '') : TOILET_SVG,
    value: remainderDecimal ? `${showers}.${remainderDecimal}` : `${showers}.0`,
  };
}

function formatCO2(grams: number): string {
  if (grams < 1)     return `${(grams * 1000).toFixed(1)} mg`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams.toFixed(1)} g`;
}

function chipColors(grade: EcoScore['grade']): string {
  if (grade === 'A+' || grade === 'A') return 'color:#3d6b4f;background:#edf3ef;';
  if (grade === 'B') return 'color:#92400e;background:#fef3c7;';
  if (grade === 'C') return 'color:#c2410c;background:#ffedd5;';
  return 'color:#991b1b;background:#fee2e2;';
}

const LEAF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
const ZAP_SVG  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
const DROP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
const WIND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`;
const TOILET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12h10"/><path d="M6 8h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M7 12a5 5 0 0 0 10 0V8H7z"/></svg>`;
const SHOWER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v2a8 8 0 0 1-16 0V4z"/><path d="M8 6v4"/><path d="M12 6v4"/><path d="M16 6v4"/><path d="M7 14l1 4"/><path d="M11 14l1 4"/><path d="M15 14l1 4"/></svg>`;

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .pill {
    display: flex; align-items: center; gap: 7px;
    background: #faf9f7; border: 1px solid #e8e3dc; border-radius: 20px;
    padding: 6px 11px 6px 8px; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.10); transition: box-shadow .15s;
    white-space: nowrap; user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  .pill:hover { box-shadow: 0 3px 14px rgba(0,0,0,.15); }
  .pill-icon { width:14px; height:14px; color:#3d6b4f; flex-shrink:0; }
  .pill-grade {
    font-size:10px; font-weight:600; padding:1px 6px; border-radius:10px;
    background:#edf3ef; color:#3d6b4f;
  }
  .pill-energy { font-size:11px; font-weight:500; color:#78716c; font-variant-numeric:tabular-nums; }

  .card {
    display: none; width: 224px;
    background: #faf9f7; border: 1px solid #e8e3dc; border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,.12); overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 12px 8px; border-bottom: 1px solid #e8e3dc;
  }
  .card-logo { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:#1c1917; }
  .card-logo-icon { width:13px; height:13px; color:#3d6b4f; }
  .card-grade { font-size:10px; font-weight:600; padding:2px 7px; border-radius:10px; }
  .close-btn {
    background:none; border:none; font-size:16px; color:#a8a29e;
    cursor:pointer; line-height:1; padding:0; margin-left:auto;
  }
  .close-btn:hover { color:#1c1917; }
  .metrics { padding: 3px 0; }
  .metric-row {
    display:flex; justify-content:space-between; align-items:center;
    padding: 6px 12px; border-bottom: 1px solid #f0ede9;
  }
  .metric-row:last-child { border-bottom: none; }
  .metric-left { display:flex; align-items:center; gap:6px; font-size:11px; color:#78716c; }
  .metric-icon { width:12px; height:12px; color:#a8a29e; }
  .metric-val { font-size:12px; font-weight:600; color:#1c1917; font-variant-numeric:tabular-nums; }
  .card-footer { padding:6px 12px 8px; font-size:10px; color:#a8a29e; border-top:1px solid #e8e3dc; }
`;

function init() {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>${STYLES}</style>
    <div class="pill">
      <span class="pill-icon">${LEAF_SVG}</span>
      <span class="pill-grade">A+</span>
      <span class="pill-energy">—</span>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-logo"><span class="card-logo-icon">${LEAF_SVG}</span>EcoLiko</div>
        <span class="card-grade">A+</span>
        <button class="close-btn">&#x2715;</button>
      </div>
      <div class="metrics">
        <div class="metric-row">
          <div class="metric-left"><span class="metric-icon">${ZAP_SVG}</span>Energy</div>
          <span class="metric-val" id="w-energy">—</span>
        </div>
        <div class="metric-row">
          <div class="metric-left"><span class="metric-icon">${DROP_SVG}</span>Water</div>
          <span class="metric-val" id="w-water">—</span>
        </div>
        <div class="metric-row">
          <div class="metric-left"><span class="metric-icon">${WIND_SVG}</span>Carbon</div>
          <span class="metric-val" id="w-co2">—</span>
        </div>
      </div>
      <div class="card-footer" id="w-footer">0 interactions today</div>
    </div>
  `;

  const pill     = shadow.querySelector<HTMLElement>('.pill')!;
  const card     = shadow.querySelector<HTMLElement>('.card')!;
  const closeBtn = shadow.querySelector<HTMLElement>('.close-btn')!;

  pill.addEventListener('click', () => {
    pill.style.display = 'none';
    card.style.display = 'block';
  });
  closeBtn.addEventListener('click', () => {
    card.style.display = 'none';
    pill.style.display = 'flex';
  });

  async function render() {
    const result = await chrome.storage.local.get('events');
    const events: UsageEvent[] = (result.events as UsageEvent[]) ?? [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEvents = events.filter(e => e.timestamp >= todayStart.getTime());
    const totals = aggregateEvents(todayEvents);

    const grade = totals.ecoScore.grade;
    const gradeStyle = chipColors(grade);

    // Pill
    shadow.querySelector<HTMLElement>('.pill-grade')!.style.cssText = gradeStyle;
    shadow.querySelector<HTMLElement>('.pill-grade')!.textContent = grade;
    shadow.querySelector<HTMLElement>('.pill-energy')!.textContent = formatEnergy(totals.impact.energyKwh);

    // Card
    const cardGrade = shadow.querySelector<HTMLElement>('.card-grade')!;
    cardGrade.style.cssText = gradeStyle;
    cardGrade.textContent = grade;
    shadow.getElementById('w-energy')!.textContent = formatEnergy(totals.impact.energyKwh);
    const waterResult = formatWater(totals.impact.waterLiters);
    shadow.getElementById('w-water')!.innerHTML = waterResult.icon + waterResult.value;
    shadow.getElementById('w-co2')!.textContent    = formatCO2(totals.impact.co2Grams);
    const n = totals.eventCount;
    shadow.getElementById('w-footer')!.textContent = `${n} interaction${n !== 1 ? 's' : ''} today`;
  }

  render();
  chrome.storage.onChanged.addListener(changes => {
    if (changes.events) render();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
