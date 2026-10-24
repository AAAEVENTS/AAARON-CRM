/* AAARON OneWork — lightweight chart helpers (inline SVG / CSS, no external libraries). */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAL=['#FFC20E','#FF8A00','#E8590C','#FFE07A','#B45309','#4A3722','#FFA94D','#8A5A2B'];
const FUNNEL=['#FFE07A','#FFD43B','#FFC20E','#FFAE12','#FF9A00','#FF8A1F','#FF7A33','#FF7A33','#FF7A33'];
const compact=n=>{n=Number(n)||0;const a=Math.abs(n);if(a>=1e6)return (n/1e6).toFixed(a>=1e7?0:1).replace(/\.0$/,'')+'M';if(a>=1e3)return (n/1e3).toFixed(a>=1e4?0:1).replace(/\.0$/,'')+'k';return String(Math.round(n*10)/10)};
const niceMax=v=>{if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const f=v/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};

function hbar(items,o={}){
  const fmt=o.fmt||compact,max=Math.max(1e-9,...items.map(i=>Number(i.value)||0));
  if(!items.length)return '<p class="hint">No data for this selection.</p>';
  return `<div class="hbar">${items.map(i=>`<div class="hbar-row"><div class="hbar-label" title="${esc(i.label)}">${esc(i.label)}${i.sub?`<small>${esc(i.sub)}</small>`:''}</div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(1,(Number(i.value)||0)/max*100).toFixed(1)}%${i.color?`;background:${i.color}`:''}"></div></div><div class="hbar-val">${esc(i.text??fmt(i.value))}</div></div>`).join('')}</div>`;
}

function columns(o){
  const labels=o.labels||[],series=o.series||[],H=o.height||240,W=640,L=46,R=10,T=18,B=30;
  const fmt=o.fmt||compact,stacked=!!o.stacked;
  if(!labels.length||!series.length)return '<p class="hint">No data for this selection.</p>';
  const totals=labels.map((_,i)=>stacked?series.reduce((s,x)=>s+(Number(x.values[i])||0),0):Math.max(0,...series.map(x=>Number(x.values[i])||0)));
  const max=niceMax(Math.max(...totals,o.target||0)),pw=W-L-R,ph=H-T-B,band=pw/labels.length;
  const y=v=>T+ph-(Number(v)||0)/max*ph;
  const bw=stacked?Math.min(46,band*.6):Math.min(34,band*.78/series.length);
  let g='';
  for(let k=0;k<=4;k++){const v=max/4*k,yy=y(v);g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-8}" y="${yy+4}" text-anchor="end">${esc(fmt(v))}</text>`}
  let bars='';
  labels.forEach((lab,i)=>{
    const cx=L+band*i+band/2;
    if(stacked){let acc=0;series.forEach((s,si)=>{const v=Number(s.values[i])||0;if(v<=0)return;const y0=y(acc+v),h=y(acc)-y0;bars+=`<rect x="${cx-bw/2}" y="${y0}" width="${bw}" height="${Math.max(h,1)}" rx="${si===series.length-1?5:0}" fill="${s.color||PAL[si%PAL.length]}"><title>${esc(s.name)}: ${esc(fmt(v))}</title></rect>`;acc+=v})}
    else{const w0=bw*series.length+(series.length-1)*4;series.forEach((s,si)=>{const v=Number(s.values[i])||0,x=cx-w0/2+si*(bw+4),yy=y(v);bars+=`<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(ph+T-yy,v>0?2:0)}" rx="5" fill="${s.color||PAL[si%PAL.length]}"><title>${esc(s.name)} · ${esc(lab)}: ${esc(fmt(v))}</title></rect>`;if(series.length===1&&v>0)bars+=`<text class="val" x="${x+bw/2}" y="${yy-5}" text-anchor="middle">${esc(fmt(v))}</text>`})}
    bars+=`<text x="${cx}" y="${H-9}" text-anchor="middle">${esc(lab)}</text>`;
  });
  const tl=o.target?`<line x1="${L}" x2="${W-R}" y1="${y(o.target)}" y2="${y(o.target)}" stroke="#2B1A0A" stroke-width="2" stroke-dasharray="6 5"/><text x="${W-R}" y="${y(o.target)-6}" text-anchor="end" style="fill:#2B1A0A;font-weight:800">${esc(o.targetLabel||'Target')}</text>`:'';
  const legend=series.length>1||o.legend?`<ul class="legend-list">${series.map((s,i)=>`<li><i style="background:${s.color||PAL[i%PAL.length]}"></i>${esc(s.name)}</li>`).join('')}</ul>`:'';
  return `<svg class="cols-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Column chart')}">${g}${bars}${tl}</svg>${legend}`;
}

function donut(items,o={}){
  const fmt=o.fmt||compact,total=items.reduce((s,i)=>s+(Number(i.value)||0),0);
  if(!items.length||total<=0)return '<p class="hint">No data for this selection.</p>';
  const r=44,c=2*Math.PI*r;let off=0,segs='';
  items.forEach((it,i)=>{const v=Number(it.value)||0;if(v<=0)return;const len=v/total*c;segs+=`<circle cx="60" cy="60" r="${r}" fill="none" stroke="${it.color||PAL[i%PAL.length]}" stroke-width="20" stroke-dasharray="${len.toFixed(2)} ${(c-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(it.label)}: ${esc(fmt(v))}</title></circle>`;off+=len});
  const centre=o.center??compact(total);
  return `<div class="donut-wrap"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(o.label||'Share chart')}">${segs}<text class="donut-center" x="60" y="${o.centerSub?60:65}" text-anchor="middle" font-size="17">${esc(centre)}</text>${o.centerSub?`<text class="donut-center-sub" x="60" y="74" text-anchor="middle">${esc(o.centerSub)}</text>`:''}</svg><ul class="legend-list">${items.filter(i=>(Number(i.value)||0)>0).map((it,i)=>`<li><span><i style="background:${it.color||PAL[i%PAL.length]}"></i>${esc(it.label)}</span><b>${esc(it.text??fmt(it.value))} <small style="color:var(--hint);font-weight:700">${Math.round((Number(it.value)||0)/total*100)}%</small></b></li>`).join('')}</ul></div>`;
}

function funnel(items,o={}){
  const fmt=o.fmt||compact,max=Math.max(1e-9,...items.map(i=>Number(i.value)||0));
  if(!items.length)return '<p class="hint">No data for this selection.</p>';
  let h='<div class="funnel">';
  items.forEach((it,i)=>{
    const w=Math.max(46,(Number(it.value)||0)/max*100);
    if(i>0&&o.conversion&&Number(items[i-1].count)>0)h+=`<div class="funnel-conv">▼ ${Math.round((Number(it.count)||0)/Number(items[i-1].count)*100)}%</div>`;
    h+=`<div class="funnel-step" style="width:${w.toFixed(1)}%;background:${it.color||FUNNEL[Math.min(i,FUNNEL.length-1)]}" title="${esc(it.label)}"><span>${esc(it.label)}${it.sub?` <small>${esc(it.sub)}</small>`:''}</span><b>${esc(it.text??fmt(it.value))}</b></div>`;
  });
  return h+'</div>';
}

/* actual vs target bar. */
function bullet(actual,target){
  const a=Number(actual)||0,t=Number(target)||0,top=Math.max(a,t,1)*1.08;
  return `<div class="progress-pair"><div class="bullet ${a>=t&&t>0?'over':''}"><i style="width:${(a/top*100).toFixed(1)}%"></i>${t>0?`<u style="left:calc(${(t/top*100).toFixed(1)}% - 1px)"></u>`:''}</div></div>`;
}

function spark(values,color='#2B1A0A'){
  const v=(values||[]).map(Number);if(v.length<2)return '';
  const max=Math.max(...v),min=Math.min(...v),rng=(max-min)||1,w=100,h=30;
  const pts=v.map((x,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-3-(x-min)/rng*(h-6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

window.OWCharts={PAL,compact,hbar,columns,donut,funnel,bullet,spark};
})();
