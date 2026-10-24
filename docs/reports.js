/* AAARON OneWork — Report Centre. 28 management reports computed in the browser from records the signed-in
   user is permitted to read (Supabase row-level security still applies). Print-to-PDF and CSV export built in. */
(window.OneWorkPlugins=window.OneWorkPlugins||[]).push(function(ow){
'use strict';
const {S,esc,ico,btn,badge,toast}=ow,C=window.OWCharts;
const D=()=>S.data;
const num=v=>Number(v)||0;
const om=v=>'OMR '+Math.round(num(v)).toLocaleString('en-US');
const cn=v=>num(v).toLocaleString('en-US');
const pc=(a,b)=>b>0?a/b*100:null;
const fp=v=>v==null?'—':(Math.round(v*10)/10)+'%';
const ISO=d=>d.toLocaleDateString('en-CA');
const TODAY=()=>ISO(new Date());
const d10=v=>v?String(v).slice(0,10):'';
const dayDiff=(a,b)=>Math.round((new Date(d10(b)+'T12:00:00')-new Date(d10(a)+'T12:00:00'))/864e5);
const sum=(a,f)=>a.reduce((s,x)=>s+num(f(x)),0);
const avg=(a,f)=>a.length?sum(a,f)/a.length:0;
const group=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m};
const mKey=d=>d10(d).slice(0,7);
const mLabel=k=>new Date(k+'-15T12:00:00').toLocaleDateString('en-GB',{month:'short',year:'2-digit'});
const sellers=()=>D().profiles.filter(p=>p.department==='sales'&&p.active!==false);
const who=id=>ow.personName(id);
const PROB={'Walk-in':10,'New Lead':10,Qualified:20,'Meeting / Site Visit':30,'Meeting / Shop Visit':35,'Enquiry or Sale':40,'Presentation / Mock-up':45,'Price List / Quotation':50,'Specification / Approval':55,'Interested / Escalated':60,'Quotation / Tender':65,'Terms Agreed':75,Negotiation:80};
const CHANNELS=['Project','Trade','Counter','Application'];
const omr=o=>num(o.estimated_value)*num(o.exchange_rate||1);
const wOmr=o=>omr(o)*num(o.probability)/100;
const wonOmr=o=>num(o.won_value??o.estimated_value)*num(o.exchange_rate||1);
const closeDate=o=>d10(o.actual_close||o.updated_at||o.created_at);
const isOpen=o=>!['Closed Won','Closed Lost'].includes(o.stage);
const ops=()=>D().opportunities||[];
const lastActivity=oid=>{const a=(D().sales_activities||[]).filter(x=>x.opportunity_id===oid).map(x=>d10(x.activity_at)).sort();return a.length?a[a.length-1]:null};

/* ─────────────── state & context ─────────────── */
const R={cat:'All',id:null,range:'ytd',from:'',to:'',channel:'All',owner:'All',brand:'All',currency:'OMR',type:'All',dept:'All'};
const RANGES=[['month','This month'],['lastmonth','Last month'],['quarter','This quarter'],['lastquarter','Last quarter'],['ytd','Year to date'],['last12','Last 12 months'],['all','All time'],['custom','Custom range']];
function makeCtx(){
  const t=new Date(),y=t.getFullYear(),m=t.getMonth();let f=null,to=null;
  switch(R.range){
    case'month':f=new Date(y,m,1);to=new Date(y,m+1,0);break;
    case'lastmonth':f=new Date(y,m-1,1);to=new Date(y,m,0);break;
    case'quarter':{const q=Math.floor(m/3)*3;f=new Date(y,q,1);to=new Date(y,q+3,0);break}
    case'lastquarter':{const q=Math.floor(m/3)*3-3;f=new Date(y,q,1);to=new Date(y,q+3,0);break}
    case'ytd':f=new Date(y,0,1);to=t;break;
    case'last12':f=new Date(y,m-11,1);to=t;break;
    case'custom':f=R.from?new Date(R.from+'T12:00:00'):null;to=R.to?new Date(R.to+'T12:00:00'):null;break;
  }
  const from=f?ISO(f):null,till=to?ISO(to):null;
  const label=from||till?`${from?ow.date(from):'Beginning'} – ${till?ow.date(till):'Today'}`:'All dates';
  return {from,to:till,label,inR:d=>{d=d10(d);if(!d)return false;return(!from||d>=from)&&(!till||d<=till)},R};
}
function monthsList(c,max=12){
  let a=c.from?new Date(c.from+'T12:00:00'):null,b=c.to?new Date(c.to+'T12:00:00'):new Date();
  if(b>new Date())b=new Date();
  if(!a){a=new Date(b.getFullYear(),b.getMonth()-11,1)}
  const out=[];let d=new Date(a.getFullYear(),a.getMonth(),1);
  while(d<=b&&out.length<60){out.push(ISO(d).slice(0,7));d=new Date(d.getFullYear(),d.getMonth()+1,1)}
  return out.slice(-max);
}
const fOpp=()=>o=>(R.channel==='All'||o.channel===R.channel)&&(R.owner==='All'||o.owner_id===R.owner);
const bucket=(d,edges=[7,14,30,60])=>{const n=d;return n<=edges[0]?`0–${edges[0]} days`:n<=edges[1]?`${edges[0]+1}–${edges[1]} days`:n<=edges[2]?`${edges[1]+1}–${edges[2]} days`:n<=edges[3]?`${edges[2]+1}–${edges[3]} days`:`${edges[3]}+ days`};
const BUCKETS=['0–7 days','8–14 days','15–30 days','31–60 days','60+ days'];
const mt=(label,value,foot,icon,color)=>ow.metric(label,value,foot||'',icon||'chart',color||'gold');
const COL={sun:'#FFC20E',amber:'#FF9A00',flame:'#FF6A00',ember:'#E8590C',ink:'#2B1A0A',pale:'#FFE07A'};

/* ─────────────── table helpers ─────────────── */
const NUMT=['num','omr','omr3','pct','days'];
function cell(col,row){const v=row[col.k];switch(col.t){case'num':return v==null?'—':cn(v);case'omr':return v==null?'—':om(v);case'omr3':return ow.money(v);case'pct':return fp(v);case'date':return ow.date(v);case'badge':return badge(v);case'html':return v??'';case'days':return v==null?'—':cn(v)+' d';default:{const t=String(v??'—');return /^[A-Z]{2,5}(-[A-Z0-9]+)+$/.test(t)?`<span class="nowrap">${esc(t)}</span>`:esc(t)}}}
function rawCell(col,row){const v=row[col.k];if(col.t==='html')return String(v??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();if(col.t==='pct')return v==null?'':Math.round(v*10)/10;return v??''}
function tableHTML(t,idx){
  const head=t.cols.map(c=>`<th class="${NUMT.includes(c.t)?'num':''}">${esc(c.label)}</th>`).join('');
  const body=t.rows.map(r=>`<tr>${t.cols.map((c,i)=>`<td class="${NUMT.includes(c.t)?'num':''}">${i===0&&c.t==='text'?`<strong>${cell(c,r)}</strong>`:cell(c,r)}</td>`).join('')}</tr>`).join('');
  const foot=t.foot?`<tfoot><tr>${t.cols.map((c,i)=>`<td class="${NUMT.includes(c.t)?'num':''}">${i===0&&t.foot[c.k]==null?'Total':cell(c,t.foot)}</td>`).join('')}</tr></tfoot>`:'';
  return `<div class="panel"><div class="panel-header"><div><div class="panel-title">${esc(t.title)}</div>${t.sub?`<div class="panel-sub">${esc(t.sub)}</div>`:''}</div><div class="panel-actions rpt-noprint">${t.rows.length?btn('rpt-csv',ico('download',13)+' CSV','sm',String(idx)):''}</div></div><div class="table-wrap"><table class="data-table table-inpanel"><thead><tr>${head}</tr></thead><tbody>${body||`<tr><td colspan="${t.cols.length}">${ow.empty(t.empty||'No records for this selection','Try a wider period or different filters.')}</td></tr>`}</tbody>${t.rows.length?foot:''}</table></div>${t.more?`<div class="pagination-note">${esc(t.more)}</div>`:''}</div>`;
}
const T=(title,cols,rows,o={})=>({title,cols,rows,...o});
const col=(k,label,t='text')=>({k,label,t});

/* ─────────────── report catalogue ─────────────── */
const sales=()=>ow.access(['sales']),buyers=()=>ow.access(['purchase']),mgmt=()=>ow.isSalesManager();
const REPORTS=[];
const def=(id,cat,title,desc,icon,filters,acc,build)=>REPORTS.push({id,cat,title,desc,icon,filters,acc,build});

/* ── SALES & PIPELINE ── */
def('pipeline-stage','Sales','Pipeline by stage','Open opportunities by stage with value, weighted forecast and overdue follow-ups.','chart',['channel','owner'],sales,c=>{
  const open=ops().filter(isOpen).filter(fOpp());
  const by=[...group(open,o=>o.stage)].map(([stage,a])=>({stage,n:a.length,val:sum(a,omr),w:sum(a,wOmr),over:a.filter(o=>o.next_followup&&d10(o.next_followup)<TODAY()).length,p:PROB[stage]??0})).sort((a,b)=>a.p-b.p);
  const byCh=CHANNELS.map(ch=>({label:ch,value:sum(open.filter(o=>o.channel===ch),omr)}));
  const overdue=open.filter(o=>o.next_followup&&d10(o.next_followup)<TODAY());
  return {kpis:[['Open opportunities',cn(open.length),'Across selected channels','briefcase','gold'],['Open pipeline',om(sum(open,omr)),'Unweighted, converted to OMR','chart','blue'],['Weighted forecast',om(sum(open,wOmr)),'Value × probability','trend','green'],['Average deal size',om(avg(open,omr)),'Per open opportunity','coins','gold'],['Overdue follow-ups',cn(overdue.length),om(sum(overdue,omr))+' at stake','alert','purple']],
    charts:[{title:'Pipeline by stage',sub:'Value (OMR), ordered by win probability',html:C.hbar(by.map(b=>({label:b.stage,sub:b.n+' deal'+(b.n===1?'':'s'),value:b.val,text:om(b.val)})),{fmt:om})},
      {title:'Pipeline by channel',sub:'Share of open value',html:C.donut(byCh,{fmt:om,center:C.compact(sum(open,omr)),centerSub:'OMR open'})}],
    tables:[T('Stage summary',[col('stage','Stage'),col('n','Deals','num'),col('val','Pipeline','omr'),col('w','Weighted','omr'),col('over','Overdue follow-ups','num')],by,{foot:{n:open.length,val:sum(open,omr),w:sum(open,wOmr),over:overdue.length}}),
      T('Ten largest open opportunities',[col('no','Ref'),col('title','Opportunity'),col('customer','Customer'),col('channel','Channel','badge'),col('stage','Stage','badge'),col('owner','Owner'),col('val','Value','omr'),col('prob','Prob.','pct'),col('close','Expected close','date'),col('fu','Next follow-up','date')],
        open.slice().sort((a,b)=>omr(b)-omr(a)).slice(0,10).map(o=>({no:o.opportunity_no,title:o.title,customer:o.customer,channel:o.channel,stage:o.stage,owner:who(o.owner_id),val:omr(o),prob:num(o.probability),close:o.expected_close,fu:o.next_followup})))]};
});

def('forecast-month','Sales','Forecast by month','Weighted sales forecast by expected close date, split by channel, with past-due deals flagged.','trend',['channel','owner'],sales,c=>{
  const open=ops().filter(isOpen).filter(fOpp()),t=TODAY(),cur=t.slice(0,7);
  const months=[];let d=new Date();d=new Date(d.getFullYear(),d.getMonth(),1);for(let i=0;i<6;i++){months.push(ISO(new Date(d.getFullYear(),d.getMonth()+i,1)).slice(0,7))}
  const bk=o=>{const ed=d10(o.expected_close);if(!ed||ed<t)return 'Past due';const k=ed.slice(0,7);return months.includes(k)?k:'Later'};
  const keys=['Past due',...months,'Later'];const g=group(open,bk);
  const rows=keys.map(k=>{const a=g.get(k)||[];return {m:k.length===7?mLabel(k):k,n:a.length,val:sum(a,omr),w:sum(a,wOmr),...Object.fromEntries(CHANNELS.map(ch=>['w'+ch,sum(a.filter(o=>o.channel===ch),wOmr)]))}});
  const next30=open.filter(o=>d10(o.expected_close)>=t&&d10(o.expected_close)<=ISO(new Date(Date.now()+30*864e5)));
  const next90=open.filter(o=>d10(o.expected_close)>=t&&d10(o.expected_close)<=ISO(new Date(Date.now()+90*864e5)));
  const past=open.filter(o=>!o.expected_close||d10(o.expected_close)<t);
  return {kpis:[['Total weighted forecast',om(sum(open,wOmr)),cn(open.length)+' open opportunities','trend','gold'],['Next 30 days (weighted)',om(sum(next30,wOmr)),cn(next30.length)+(next30.length===1?' deal':' deals')+' closing','calendar','blue'],['Next 90 days (weighted)',om(sum(next90,wOmr)),cn(next90.length)+(next90.length===1?' deal':' deals')+' closing','calendar','green'],['Past expected close',om(sum(past,omr)),cn(past.length)+(past.length===1?' deal needs':' deals need')+' a new date','alert','purple']],
    charts:[{title:'Pipeline vs weighted forecast',sub:'By expected close month (OMR)',wide:true,html:C.columns({labels:rows.map(r=>r.m),series:[{name:'Pipeline',color:COL.pale,values:rows.map(r=>r.val)},{name:'Weighted forecast',color:COL.flame,values:rows.map(r=>r.w)}],fmt:C.compact,label:'Forecast by month'})}],
    tables:[T('Forecast by month and channel',[col('m','Expected close'),col('n','Deals','num'),col('val','Pipeline','omr'),col('w','Weighted','omr'),...CHANNELS.map(ch=>col('w'+ch,ch+' (wtd)','omr'))],rows,{foot:{n:open.length,val:sum(open,omr),w:sum(open,wOmr),...Object.fromEntries(CHANNELS.map(ch=>['w'+ch,sum(open.filter(o=>o.channel===ch),wOmr)]))}})],
    notes:['Probabilities follow each opportunity’s current stage unless the salesperson changed them manually. “Past due” deals have an expected close date that has already passed — ask owners to confirm a realistic new date.']};
});

def('win-loss','Sales','Win / loss analysis','Closed deals in the period: win rate, deal size, sales cycle, lost reasons and outcome trend.','trophy',['range','channel','owner'],sales,c=>{
  const cl=ops().filter(o=>!isOpen(o)&&c.inR(closeDate(o))).filter(fOpp());
  const won=cl.filter(o=>o.stage==='Closed Won'),lost=cl.filter(o=>o.stage==='Closed Lost');
  const cyc=won.map(o=>dayDiff(o.created_at,closeDate(o))).filter(x=>x>=0);
  const reasons=[...group(lost,o=>o.lost_reason||'Not given')].map(([label,a])=>({label,value:a.length})).sort((a,b)=>b.value-a.value);
  const ms=monthsList(c);
  return {kpis:[['Won value',om(sum(won,wonOmr)),cn(won.length)+' deals won','trophy','gold'],['Lost value',om(sum(lost,omr)),cn(lost.length)+' deals lost','alert','purple'],['Win rate (deals)',fp(pc(won.length,cl.length)),'Won / closed','percent','green'],['Win rate (value)',fp(pc(sum(won,wonOmr),sum(won,wonOmr)+sum(lost,omr))),'Won value / closed value','percent','blue'],['Average sales cycle',cyc.length?Math.round(avg(cyc,x=>x))+' days':'—','Created → closed (won deals)','clock','gold']],
    charts:[{title:'Why we lose deals',sub:'Lost opportunities by recorded reason',html:C.donut(reasons,{center:String(lost.length),centerSub:'lost deals'})},
      {title:'Won vs lost value by month',sub:'OMR, by close date',html:C.columns({labels:ms.map(mLabel),series:[{name:'Won',color:COL.amber,values:ms.map(m=>sum(won.filter(o=>mKey(closeDate(o))===m),wonOmr))},{name:'Lost',color:COL.ink,values:ms.map(m=>sum(lost.filter(o=>mKey(closeDate(o))===m),omr))}],label:'Won vs lost'})}],
    tables:[T('Closed opportunities',[col('d','Closed','date'),col('no','Ref'),col('title','Opportunity'),col('customer','Customer'),col('ch','Channel','badge'),col('owner','Owner'),col('res','Outcome','badge'),col('val','Value','omr'),col('why','Reason / competitor'),col('cy','Cycle','days')],
      cl.slice().sort((a,b)=>closeDate(b).localeCompare(closeDate(a))).slice(0,60).map(o=>({d:closeDate(o),no:o.opportunity_no,title:o.title,customer:o.customer,ch:o.channel,owner:who(o.owner_id),res:o.stage==='Closed Won'?'Won':'Lost',val:o.stage==='Closed Won'?wonOmr(o):omr(o),why:o.stage==='Closed Lost'?[o.lost_reason,o.competitor].filter(Boolean).join(' · '):o.competitor,cy:dayDiff(o.created_at,closeDate(o))})),{more:cl.length>60?`Showing the 60 most recent of ${cl.length} closed deals. Export CSV for the full list.`:''})]};
});

def('sales-performance','Sales','Salesperson scorecard','Open pipeline, wins, win rate, activity, quotations and target attainment for every salesperson.','users',['range','channel'],sales,c=>{
  const tp=D().sales_targets||[];
  const rows=sellers().map(p=>{
    const mine=ops().filter(o=>o.owner_id===p.id&&(R.channel==='All'||o.channel===R.channel)),open=mine.filter(isOpen);
    const won=mine.filter(o=>o.stage==='Closed Won'&&c.inR(closeDate(o))),lost=mine.filter(o=>o.stage==='Closed Lost'&&c.inR(closeDate(o)));
    const acts=(D().sales_activities||[]).filter(a=>a.owner_id===p.id&&c.inR(a.activity_at));
    const qs=(D().quotations||[]).filter(q=>q.created_by===p.id&&c.inR(q.created_at));
    const tgt=sum(tp.filter(t=>t.target_type==='Salesperson'&&t.target_name===p.full_name&&(!c.from||t.period>=c.from.slice(0,7))&&(!c.to||t.period<=c.to.slice(0,7))),t=>t.target_value);
    return {name:p.full_name,open:open.length,pipe:sum(open,omr),won:won.length,wonv:sum(won,wonOmr),lost:lost.length,wr:pc(won.length,won.length+lost.length),acts:acts.length,quotes:qs.length,qv:sum(qs.filter(q=>q.currency==='OMR'),q=>q.total),tgt,att:pc(sum(won,wonOmr),tgt)};
  }).sort((a,b)=>b.wonv-a.wonv);
  const tot=k=>sum(rows,r=>r[k]);
  return {kpis:[['Team won value',om(tot('wonv')),cn(tot('won'))+' deals in period','trophy','gold'],['Team open pipeline',om(tot('pipe')),cn(tot('open'))+' open deals','chart','blue'],['Team win rate',fp(pc(tot('won'),tot('won')+tot('lost'))),'Won / (won + lost)','percent','green'],['Activities logged',cn(tot('acts')),'Calls, visits, meetings, messages','check','purple']],
    charts:[{title:'Won value vs target',sub:'OMR, selected period',html:C.columns({labels:rows.map(r=>r.name.split(' – ')[0]),series:[{name:'Target',color:COL.pale,values:rows.map(r=>r.tgt)},{name:'Won',color:COL.flame,values:rows.map(r=>r.wonv)}],label:'Won vs target'})},
      {title:'Target attainment',sub:'Won value as % of target',html:C.hbar(rows.filter(r=>r.tgt>0).map(r=>({label:r.name.split(' – ')[0],sub:r.name.split(' – ')[1],value:r.att||0,text:fp(r.att)})),{fmt:v=>fp(v)})}],
    tables:[T('Scorecard',[col('name','Salesperson'),col('open','Open deals','num'),col('pipe','Open pipeline','omr'),col('won','Won','num'),col('wonv','Won value','omr'),col('lost','Lost','num'),col('wr','Win rate','pct'),col('acts','Activities','num'),col('quotes','Quotes','num'),col('qv','Quote value','omr'),col('tgt','Target','omr'),col('att','Attainment','pct')],rows,{foot:{open:tot('open'),pipe:tot('pipe'),won:tot('won'),wonv:tot('wonv'),lost:tot('lost'),wr:pc(tot('won'),tot('won')+tot('lost')),acts:tot('acts'),quotes:tot('quotes'),qv:tot('qv'),tgt:tot('tgt'),att:pc(tot('wonv'),tot('tgt'))}})],
    notes:['Targets are summed for every month inside the selected period. Quote value counts OMR quotations only.']};
});

def('channel-performance','Sales','Channel performance','Project, Trade, Counter and Application channels compared: pipeline, wins, win rate, deal size and cycle time.','layers',['range','owner'],sales,c=>{
  const rows=CHANNELS.map(ch=>{const all=ops().filter(o=>o.channel===ch&&(R.owner==='All'||o.owner_id===R.owner)),open=all.filter(isOpen),won=all.filter(o=>o.stage==='Closed Won'&&c.inR(closeDate(o))),lost=all.filter(o=>o.stage==='Closed Lost'&&c.inR(closeDate(o)));
    const cyc=won.map(o=>dayDiff(o.created_at,closeDate(o))).filter(x=>x>=0);
    return {ch,open:open.length,pipe:sum(open,omr),w:sum(open,wOmr),won:won.length,wonv:sum(won,wonOmr),lost:lost.length,wr:pc(won.length,won.length+lost.length),deal:won.length?sum(won,wonOmr)/won.length:null,cyc:cyc.length?Math.round(avg(cyc,x=>x)):null}});
  const tot=k=>sum(rows,r=>r[k]);
  return {kpis:[['Won value',om(tot('wonv')),cn(tot('won'))+' deals won','trophy','gold'],['Open pipeline',om(tot('pipe')),cn(tot('open'))+' open deals','chart','blue'],['Best channel (won value)',rows.slice().sort((a,b)=>b.wonv-a.wonv)[0].wonv>0?rows.slice().sort((a,b)=>b.wonv-a.wonv)[0].ch:'—','Highest closed-won value','star','green']],
    charts:[{title:'Open pipeline vs won value',sub:'OMR by channel',html:C.columns({labels:rows.map(r=>r.ch),series:[{name:'Open pipeline',color:COL.pale,values:rows.map(r=>r.pipe)},{name:'Won in period',color:COL.flame,values:rows.map(r=>r.wonv)}],label:'Channel comparison'})},
      {title:'Share of won value',sub:'Selected period',html:C.donut(rows.map(r=>({label:r.ch,value:r.wonv})),{fmt:om,center:C.compact(tot('wonv')),centerSub:'OMR won'})}],
    tables:[T('Channel comparison',[col('ch','Channel'),col('open','Open deals','num'),col('pipe','Pipeline','omr'),col('w','Weighted','omr'),col('won','Won','num'),col('wonv','Won value','omr'),col('lost','Lost','num'),col('wr','Win rate','pct'),col('deal','Avg won deal','omr'),col('cyc','Avg cycle','days')],rows,{foot:{open:tot('open'),pipe:tot('pipe'),w:tot('w'),won:tot('won'),wonv:tot('wonv'),lost:tot('lost'),wr:pc(tot('won'),tot('won')+tot('lost'))}})]};
});

def('top-customers','Sales','Top customers & concentration','Who generates the business: won value, open pipeline, quotations and concentration risk.','building',['range','channel'],sales,c=>{
  const all=ops().filter(o=>R.channel==='All'||o.channel===R.channel);
  const names=[...new Set(all.map(o=>o.customer))];
  const rows=names.map(n=>{const a=all.filter(o=>o.customer===n),won=a.filter(o=>o.stage==='Closed Won'&&c.inR(closeDate(o))),open=a.filter(isOpen);
    const la=(D().sales_activities||[]).filter(x=>x.customer===n).map(x=>d10(x.activity_at)).sort().pop();
    return {name:n,wonv:sum(won,wonOmr),won:won.length,pipe:sum(open,omr),open:open.length,quotes:(D().quotations||[]).filter(q=>q.customer===n&&c.inR(q.created_at)).length,last:la||null}}).filter(r=>r.wonv>0||r.pipe>0).sort((a,b)=>b.wonv-a.wonv||b.pipe-a.pipe);
  const totW=sum(rows,r=>r.wonv);let cum=0;rows.forEach(r=>{r.share=pc(r.wonv,totW);cum+=r.wonv;r.cum=pc(cum,totW)});
  const top5=sum(rows.slice(0,5),r=>r.wonv);
  return {kpis:[['Customers with wins',cn(rows.filter(r=>r.wonv>0).length),'In selected period','users','gold'],['Won value',om(totW),'Closed-won, OMR','trophy','blue'],['Top 5 share',fp(pc(top5,totW)),'Concentration of won value','percent',pc(top5,totW)>60?'purple':'green'],['Open pipeline',om(sum(rows,r=>r.pipe)),'Across these customers','chart','gold']],
    charts:[{title:'Top 10 customers by won value',sub:'OMR, selected period',wide:true,html:C.hbar(rows.filter(r=>r.wonv>0).slice(0,10).map(r=>({label:r.name,value:r.wonv,text:om(r.wonv)})),{fmt:om})}],
    tables:[T('Customer league table',[col('name','Customer'),col('wonv','Won value','omr'),col('won','Deals won','num'),col('share','Share','pct'),col('cum','Cumulative','pct'),col('pipe','Open pipeline','omr'),col('open','Open deals','num'),col('quotes','Quotes','num'),col('last','Last activity','date')],rows.slice(0,30),{more:rows.length>30?`Top 30 of ${rows.length} customers shown. Export CSV for all.`:''})],
    notes:['If the top five customers account for more than 60% of won value, the business depends heavily on a few accounts — worth a retention plan.']};
});

def('competitor-intel','Sales','Competitor intelligence','Who we meet most often, who beats us, and how our price compares when it is known.','flag',['range','channel'],sales,c=>{
  const a=ops().filter(o=>o.competitor&&(R.channel==='All'||o.channel===R.channel)&&(c.inR(o.created_at)||c.inR(closeDate(o))));
  const rows=[...group(a,o=>o.competitor)].map(([name,l])=>{const won=l.filter(o=>o.stage==='Closed Won'),lost=l.filter(o=>o.stage==='Closed Lost'),open=l.filter(isOpen);
    const priced=lost.filter(o=>num(o.competitor_price)>0);const gap=priced.length?avg(priced,o=>(num(o.estimated_value)-num(o.competitor_price))/num(o.competitor_price)*100):null;
    return {name,n:l.length,open:open.length,won:won.length,lost:lost.length,wr:pc(won.length,won.length+lost.length),val:sum(l,omr),gap}}).sort((x,y)=>y.val-x.val);
  return {kpis:[['Contested opportunities',cn(a.length),'With a named competitor','flag','gold'],['Value contested',om(sum(a,omr)),'OMR','coins','blue'],['Head-to-head win rate',fp(pc(a.filter(o=>o.stage==='Closed Won').length,a.filter(o=>!isOpen(o)).length)),'Where a competitor was named','percent','green']],
    charts:[{title:'Value at stake by competitor',sub:'OMR',html:C.hbar(rows.map(r=>({label:r.name,sub:r.n+' deals',value:r.val,text:om(r.val)})),{fmt:om})},
      {title:'Outcome by competitor',sub:'Won vs lost deals',html:C.columns({labels:rows.map(r=>r.name.replace(' ','\u00A0')),series:[{name:'Won',color:COL.amber,values:rows.map(r=>r.won)},{name:'Lost',color:COL.ink,values:rows.map(r=>r.lost)}],fmt:v=>String(Math.round(v)),label:'Outcome by competitor'})}],
    tables:[T('Competitor summary',[col('name','Competitor'),col('n','Deals','num'),col('open','Open','num'),col('won','Won','num'),col('lost','Lost','num'),col('wr','Win rate','pct'),col('val','Value contested','omr'),col('gap','Our price vs theirs (lost, known)','pct')],rows)],
    notes:['“Our price vs theirs” compares our quoted value with the competitor price recorded on lost deals. A positive figure means we were more expensive.']};
});

def('stalled-deals','Sales','Stalled & at-risk deals','Open deals with an overdue follow-up, a passed close date or no recorded activity for 30 days.','alert',['channel','owner'],sales,c=>{
  const t=TODAY(),cut=ISO(new Date(Date.now()-30*864e5));
  const rows=ops().filter(isOpen).filter(fOpp()).map(o=>{const la=lastActivity(o.id),f=[];
    if(o.next_followup&&d10(o.next_followup)<t)f.push('Follow-up overdue');if(o.expected_close&&d10(o.expected_close)<t)f.push('Past close date');
    if((!la||la<cut)&&d10(o.created_at)<cut)f.push('No activity 30 days');
    return {no:o.opportunity_no,title:o.title,customer:o.customer,ch:o.channel,stage:o.stage,owner:who(o.owner_id),val:omr(o),flags:f,risk:f.length,la}}).filter(r=>r.risk>0).sort((a,b)=>b.risk-a.risk||b.val-a.val);
  const cnt=k=>rows.filter(r=>r.flags.includes(k)).length;
  const byOwner=[...group(rows,r=>r.owner)].map(([label,a])=>({label,value:sum(a,r=>r.val),text:om(sum(a,r=>r.val))})).sort((a,b)=>b.value-a.value);
  return {kpis:[['At-risk deals',cn(rows.length),'Of '+cn(ops().filter(isOpen).filter(fOpp()).length)+' open','alert','purple'],['Value at risk',om(sum(rows,r=>r.val)),'OMR, unweighted','coins','gold'],['Follow-ups overdue',cn(cnt('Follow-up overdue')),'Next step date has passed','clock','blue'],['Past close date',cn(cnt('Past close date')),'Needs a new date','calendar','gold'],['No activity (30 days)',cn(cnt('No activity 30 days')),'No call, visit or message logged','users','green']],
    charts:[{title:'Value at risk by owner',sub:'OMR',html:C.hbar(byOwner,{fmt:om})},{title:'Risk signals',sub:'Number of deals showing each signal',html:C.donut(['Follow-up overdue','Past close date','No activity 30 days'].map(k=>({label:k,value:cnt(k)})),{center:String(rows.length),centerSub:'deals'})}],
    tables:[T('Deals needing attention',[col('no','Ref'),col('title','Opportunity'),col('customer','Customer'),col('ch','Channel','badge'),col('stage','Stage','badge'),col('owner','Owner'),col('val','Value','omr'),col('risk','Signals','num'),col('why','What is wrong'),col('la','Last activity','date')],rows.map(r=>({...r,why:r.flags.join(' · ')})).slice(0,50))]};
});

def('lead-aging','Sales','Enquiry ageing','How long open enquiries have been waiting, by age band and stage, with the oldest listed first.','clock',['owner','brand'],sales,c=>{
  const t=TODAY(),open=D().enquiries.filter(e=>!['Won','Lost'].includes(e.stage)&&(R.owner==='All'||e.assigned_to===R.owner)&&(R.brand==='All'||e.brand_id===R.brand)).map(e=>({...e,age:Math.max(0,dayDiff(e.created_at,t))}));
  const byB=BUCKETS.map(b=>({label:b,a:open.filter(e=>bucket(e.age)===b)}));
  const stages=[...group(open,e=>e.stage)].map(([label,a])=>({label,value:a.length}));
  return {kpis:[['Open enquiries',cn(open.length),'Not yet won or lost','briefcase','gold'],['Open value',om(sum(open,e=>e.estimated_value)),'Indicative, OMR','coins','blue'],['Average age',Math.round(avg(open,e=>e.age))+' days','Since created','clock','green'],['Older than 30 days',cn(open.filter(e=>e.age>30).length),'Likely to go cold','alert','purple']],
    charts:[{title:'Enquiries by age',sub:'Number of open enquiries per age band',html:C.columns({labels:byB.map(b=>b.label.replace(' days','d')),series:[{name:'Enquiries',color:COL.amber,values:byB.map(b=>b.a.length)}],fmt:v=>String(Math.round(v)),label:'Enquiry ageing'})},{title:'Open enquiries by stage',sub:'Count',html:C.donut(stages,{center:String(open.length),centerSub:'open'})}],
    tables:[T('Oldest open enquiries',[col('no','Enquiry'),col('cust','Customer'),col('subj','Requirement'),col('brand','Brand'),col('stage','Stage','badge'),col('owner','Owner'),col('val','Value','omr'),col('age','Age','days'),col('fu','Next follow-up','date')],open.sort((a,b)=>b.age-a.age).slice(0,25).map(e=>({no:e.enquiry_no,cust:e.customer,subj:e.subject,brand:ow.brandName(e.brand_id),stage:e.stage,owner:who(e.assigned_to),val:num(e.estimated_value),age:e.age,fu:e.next_followup})))]};
});

def('brand-performance','Sales','Brand performance','Enquiries, conversion, purchase spend, products and technical documents for each distribution brand.','layers',['range','brand'],sales,c=>{
  const rows=D().brands.filter(b=>R.brand==='All'||b.id===R.brand).map(b=>{const en=D().enquiries.filter(e=>e.brand_id===b.id&&c.inR(e.created_at)),po=D().purchase_orders.filter(p=>p.brand_id===b.id&&c.inR(p.order_date)&&!['Cancelled','Draft'].includes(p.status));
    return {name:b.name,en:en.length,env:sum(en,e=>e.estimated_value),won:en.filter(e=>e.stage==='Won').length,cr:pc(en.filter(e=>e.stage==='Won').length,en.filter(e=>['Won','Lost'].includes(e.stage)).length),po:po.length,pov:sum(po.filter(p=>p.currency==='OMR'),p=>p.total),prods:D().products.filter(p=>p.brand_id===b.id&&p.status==='Active').length,docs:D().technical_documents.filter(d=>d.brand_id===b.id).length}});
  const tot=k=>sum(rows,r=>r[k]);
  return {kpis:[['Enquiries',cn(tot('en')),'Created in period','briefcase','gold'],['Enquiry value',om(tot('env')),'Indicative, OMR','coins','blue'],['Purchase orders',cn(tot('po')),om(tot('pov'))+' (OMR orders)','box','green'],['Active products',cn(tot('prods')),cn(tot('docs'))+' technical documents','layers','purple']],
    charts:[{title:'Enquiry value by brand',sub:'OMR',html:C.hbar(rows.map(r=>({label:r.name,sub:r.en+' enquiries',value:r.env,text:om(r.env)})),{fmt:om})},{title:'Purchase orders by brand',sub:'Count, excluding draft and cancelled',html:C.donut(rows.map(r=>({label:r.name,value:r.po})),{center:String(tot('po')),centerSub:'POs'})}],
    tables:[T('Brand summary',[col('name','Brand'),col('en','Enquiries','num'),col('env','Enquiry value','omr'),col('won','Won','num'),col('cr','Enquiry win rate','pct'),col('po','POs','num'),col('pov','PO value (OMR)','omr'),col('prods','Products','num'),col('docs','TDS files','num')],rows,{foot:{en:tot('en'),env:tot('env'),won:tot('won'),po:tot('po'),pov:tot('pov'),prods:tot('prods'),docs:tot('docs')}})],
    notes:['PO value counts OMR purchase orders only; other currencies are not mixed.']};
});

/* ── QUOTATIONS ── */
const qOwn=q=>R.owner==='All'||q.created_by===R.owner;
const qOMR=q=>(q.currency||'OMR')==='OMR';
def('quote-register','Quotations','Quotation register','Every quotation issued in the period with status mix, value, acceptance rate and average discount.','file',['range','owner'],sales,c=>{
  const qs=(D().quotations||[]).filter(q=>c.inR(q.created_at)&&qOwn(q)),acc=qs.filter(q=>q.status==='Accepted'),dec=qs.filter(q=>['Accepted','Rejected','Expired'].includes(q.status));
  const lines=qs.flatMap(q=>q.line_items||[]);const ms=monthsList(c);
  const maxDisc=q=>Math.max(0,...(q.line_items||[]).map(l=>num(l.discount_percent)));
  const st=[...group(qs,q=>q.status)].map(([label,a])=>({label,value:a.length}));
  return {kpis:[['Quotations issued',cn(qs.length),'Created in period','file','gold'],['Quoted value',om(sum(qs.filter(qOMR),q=>q.total)),'Incl. VAT, OMR quotes','coins','blue'],['Accepted value',om(sum(acc.filter(qOMR),q=>q.total)),cn(acc.length)+' accepted','trophy','green'],['Acceptance rate',fp(pc(acc.length,dec.length)),'Accepted / decided','percent','gold'],['Average discount',fp(lines.length?avg(lines,l=>l.discount_percent):null),'Across all quoted lines','percent','purple']],
    charts:[{title:'Quotations by status',sub:'Count',html:C.donut(st,{center:String(qs.length),centerSub:'quotes'})},{title:'Quoted value by month',sub:'OMR quotations incl. VAT',html:C.columns({labels:ms.map(mLabel),series:[{name:'Quoted',color:COL.amber,values:ms.map(m=>sum(qs.filter(q=>qOMR(q)&&mKey(q.created_at)===m),q=>q.total))}],label:'Quoted value by month'})}],
    tables:[T('Quotation register',[col('no','Quotation'),col('cust','Customer'),col('rev','Rev.','num'),col('st','Status','badge'),col('d','Created','date'),col('valid','Valid until','date'),col('own','Prepared by'),col('md','Max discount','pct'),col('tot','Total','omr3')],qs.slice().sort((a,b)=>d10(b.created_at).localeCompare(d10(a.created_at))).slice(0,60).map(q=>({no:q.quote_no,cust:q.customer,rev:q.revision||1,st:q.status,d:q.created_at,valid:q.valid_until,own:who(q.created_by),md:maxDisc(q),tot:q.total})),{more:qs.length>60?`Showing 60 of ${qs.length}. Export CSV for all.`:''})]};
});

def('quote-discount','Quotations','Discount & approval control','Where discounts exceed the 5% policy, who gives them, and whether approval is recorded before sending.','percent',['range','owner'],mgmt,c=>{
  const qs=(D().quotations||[]).filter(q=>c.inR(q.created_at)&&qOwn(q));
  const lineD=l=>num(l.quantity)*num(l.unit_price)*num(l.discount_percent)/100;
  const maxDisc=q=>Math.max(0,...(q.line_items||[]).map(l=>num(l.discount_percent)));
  const hi=qs.filter(q=>maxDisc(q)>5),sent=['Sent','Under Negotiation','Accepted'];
  const bad=hi.filter(q=>sent.includes(q.status)&&!q.approved_by);
  const lines=qs.flatMap(q=>(q.line_items||[]).map(l=>({...l,own:q.created_by})));
  const bands=[['No discount',l=>num(l.discount_percent)===0],['1–5% (within policy)',l=>l.discount_percent>0&&l.discount_percent<=5],['6–10%',l=>l.discount_percent>5&&l.discount_percent<=10],['Over 10%',l=>l.discount_percent>10]];
  const byOwn=[...group(lines,l=>l.own)].map(([id,a])=>({label:who(id),value:avg(a,l=>l.discount_percent),text:fp(avg(a,l=>l.discount_percent))})).sort((a,b)=>b.value-a.value);
  return {kpis:[['Quotes above 5%',cn(hi.length),'Of '+cn(qs.length)+' issued','percent','gold'],['Discount given',om(sum(lines,lineD)),'Value of all line discounts','coins','blue'],['Average line discount',fp(lines.length?avg(lines,l=>l.discount_percent):null),'Simple average','percent','green'],['Sent without approval',cn(bad.length),'Check before customer commitment','alert',bad.length?'purple':'green']],
    charts:[{title:'Average discount by salesperson',sub:'Across all quoted lines',html:C.hbar(byOwn,{fmt:fp})},{title:'Lines by discount band',sub:'Number of quotation lines',html:C.donut(bands.map(([label,f])=>({label,value:lines.filter(f).length})),{center:String(lines.length),centerSub:'lines'})}],
    tables:[T('Quotations above the 5% policy limit',[col('no','Quotation'),col('cust','Customer'),col('own','Prepared by'),col('st','Status','badge'),col('md','Max discount','pct'),col('dv','Discount value','omr'),col('tot','Total','omr3'),col('ap','Approval')],hi.sort((a,b)=>maxDisc(b)-maxDisc(a)).map(q=>({no:q.quote_no,cust:q.customer,own:who(q.created_by),st:q.status,md:maxDisc(q),dv:sum(q.line_items||[],lineD),tot:q.total,ap:q.approved_by?'Approved by '+who(q.approved_by):(sent.includes(q.status)?'NOT RECORDED':'Pending')})))],
    notes:['Policy: discounts above 5% on any line must be approved by a sales manager before the quotation is sent.']};
});

def('quote-followup','Quotations','Quotation follow-up & expiry','Quotations waiting on the customer: how long, what is expiring and what has already lapsed.','clock',['owner'],sales,c=>{
  const t=TODAY(),act=(D().quotations||[]).filter(q=>['Pending Approval','Approved','Sent','Under Negotiation'].includes(q.status)&&qOwn(q)).map(q=>({...q,age:Math.max(0,dayDiff(q.created_at,t)),left:q.valid_until?dayDiff(t,q.valid_until):null}));
  const exp=act.filter(q=>q.left!=null&&q.left>=0&&q.left<=14),lapsed=act.filter(q=>q.left!=null&&q.left<0);
  const byB=BUCKETS.map(b=>({label:b,a:act.filter(q=>bucket(q.age)===b)}));
  return {kpis:[['Open quotations',cn(act.length),om(sum(act.filter(qOMR),q=>q.total))+' value','file','gold'],['Awaiting customer',cn(act.filter(q=>['Sent','Under Negotiation'].includes(q.status)).length),'Sent or in negotiation','users','blue'],['Expiring in 14 days',cn(exp.length),om(sum(exp.filter(qOMR),q=>q.total)),'calendar','green'],['Past validity',cn(lapsed.length),'Renew or close','alert','purple']],
    charts:[{title:'Open quotation value by age',sub:'OMR incl. VAT, since quotation created',wide:true,html:C.columns({labels:byB.map(b=>b.label),series:[{name:'Value',color:COL.amber,values:byB.map(b=>sum(b.a.filter(qOMR),q=>q.total))}],label:'Quotation age'})}],
    tables:[T('Quotations to chase',[col('no','Quotation'),col('cust','Customer'),col('st','Status','badge'),col('own','Prepared by'),col('age','Age','days'),col('valid','Valid until','date'),col('left','Validity','html'),col('tot','Total','omr3')],act.sort((a,b)=>b.age-a.age).slice(0,40).map(q=>({no:q.quote_no,cust:q.customer,st:q.status,own:who(q.created_by),age:q.age,valid:q.valid_until,left:q.left==null?'—':q.left<0?`<span class="var-down">Expired ${-q.left} d ago</span>`:`${q.left} d left`,tot:q.total})))]};
});

/* ── CUSTOMERS ── */
const custs=()=>D().contacts.filter(x=>x.type!=='Supplier');
def('customer-base','Customers','Customer base & data quality','Customer mix by channel and status, plus records with missing contact details or possible duplicates.','users',['channel'],sales,c=>{
  const cs=custs().filter(x=>R.channel==='All'||(x.sales_channel||'Project')===R.channel);
  const names=group(D().contacts,x=>(x.company||'').trim().toLowerCase());
  const issues=cs.map(x=>{const f=[];if(!x.phone)f.push('No phone');if(!x.email)f.push('No email');if(!x.contact_person)f.push('No contact person');if(!x.cr_no)f.push('No CR number');if((names.get((x.company||'').trim().toLowerCase())||[]).length>1)f.push('Possible duplicate');return {x,f}});
  const bad=issues.filter(i=>i.f.length),checks=cs.length*4,miss=issues.reduce((s,i)=>s+i.f.filter(k=>k!=='Possible duplicate').length,0);
  const byCh=[...group(cs,x=>x.sales_channel||'Project')].map(([label,a])=>({label,value:a.length}));
  const byStatus=[...group(cs,x=>x.customer_status||'Prospect')].map(([label,a])=>({label,value:a.length}));
  return {kpis:[['Customers',cn(cs.length),'In selected channels','users','gold'],['Active',cn(cs.filter(x=>x.customer_status==='Active').length),cn(cs.filter(x=>(x.customer_status||'Prospect')==='Prospect').length)+' prospects','check','green'],['Data completeness',fp(pc(checks-miss,checks)),'Phone, email, contact, CR number','percent','blue'],['Records to fix',cn(bad.length),'With at least one gap','alert',bad.length?'purple':'green']],
    charts:[{title:'Customers by channel',sub:'Count',html:C.donut(byCh,{center:String(cs.length),centerSub:'customers'})},{title:'Customers by status',sub:'Count',html:C.hbar(byStatus.map(s=>({...s,text:String(s.value)})),{fmt:v=>String(v)})}],
    tables:[T('Records with missing or doubtful details',[col('no','Customer ID'),col('name','Company'),col('ch','Channel','badge'),col('st','Status','badge'),col('owner','Owner'),col('f','Issues')],bad.map(i=>({no:i.x.customer_no||'—',name:i.x.company,ch:i.x.sales_channel||'Project',st:i.x.customer_status||'Prospect',owner:who(i.x.owner_id),f:i.f.join(' · ')})))]};
});

def('new-customers','Customers','New customer acquisition','Customers added in the period by month and channel.','userplus',['range','channel'],sales,c=>{
  const cs=custs().filter(x=>c.inR(x.created_at)&&(R.channel==='All'||(x.sales_channel||'Project')===R.channel)),ms=monthsList(c);
  return {kpis:[['New customers',cn(cs.length),'Added in period','userplus','gold'],...CHANNELS.slice(0,3).map((ch,i)=>[ch+' channel',cn(cs.filter(x=>(x.sales_channel||'Project')===ch).length),'New accounts',['box','users','briefcase'][i],['blue','green','purple'][i]])],
    charts:[{title:'New customers by month',sub:'Stacked by sales channel',wide:true,html:C.columns({labels:ms.map(mLabel),stacked:true,series:CHANNELS.map((ch,i)=>({name:ch,color:[COL.sun,COL.amber,COL.flame,COL.ink][i],values:ms.map(m=>cs.filter(x=>mKey(x.created_at)===m&&(x.sales_channel||'Project')===ch).length)})),fmt:v=>String(Math.round(v)),label:'New customers'})}],
    tables:[T('New customers',[col('d','Added','date'),col('no','Customer ID'),col('name','Company'),col('ch','Channel','badge'),col('cat','Trader type'),col('owner','Owner'),col('ct','Contact')],cs.sort((a,b)=>d10(b.created_at).localeCompare(d10(a.created_at))).map(x=>({d:x.created_at,no:x.customer_no||'—',name:x.company,ch:x.sales_channel||'Project',cat:x.trader_category||'—',owner:who(x.owner_id),ct:x.contact_person||'—'})))]};
});

def('trade-network','Customers','Trader network & credit watch','Distributors, sub-distributors and retailers with price tiers and, for managers, credit exposure.','shield',[],sales,c=>{
  const tr=D().contacts.filter(x=>x.trader_category),cr=D().trader_credit||[];
  const rows=tr.map(x=>{const k=cr.find(y=>y.contact_id===x.id);return {name:x.company,cat:x.trader_category,parent:x.parent_company||'Independent',tier:x.pricing_tier||'—',st:x.credit_status||'Good',lim:k?num(k.credit_limit):null,out:k?num(k.outstanding_balance):null,use:k&&num(k.credit_limit)>0?num(k.outstanding_balance)/num(k.credit_limit)*100:null}}).sort((a,b)=>(b.use??-1)-(a.use??-1));
  const hasCr=rows.some(r=>r.lim!=null),cats=[...group(tr,x=>x.trader_category)].map(([label,a])=>({label,value:a.length}));
  const high=rows.filter(r=>r.use!=null&&r.use>=80);
  const cols=[col('name','Trader'),col('cat','Category','badge'),col('parent','Parent network'),col('tier','Price tier'),col('st','Credit status','badge')];if(hasCr)cols.push(col('lim','Credit limit','omr'),col('out','Outstanding','omr'),col('use','Utilisation','pct'));
  return {kpis:[['Trade accounts',cn(tr.length),'Distributors, sub-distributors, retailers','users','gold'],['On watch or hold',cn(rows.filter(r=>r.st!=='Good').length),'Credit status not “Good”','alert','purple'],hasCr?['Credit exposure',om(sum(rows,r=>r.out)),'Outstanding balances','coins','blue']:['Price tiers',cn(new Set(rows.map(r=>r.tier)).size),'In use','layers','blue'],hasCr?['Above 80% of limit',cn(high.length),'Review before new orders','shield','green']:['Parent networks',cn(new Set(rows.map(r=>r.parent).filter(x=>x!=='Independent')).size),'Sub-distribution groups','box','green']],
    charts:[{title:'Traders by category',sub:'Count',html:C.donut(cats,{center:String(tr.length),centerSub:'traders'})},hasCr?{title:'Credit utilisation',sub:'Outstanding / limit',html:C.hbar(rows.filter(r=>r.use!=null).slice(0,8).map(r=>({label:r.name,value:r.use,text:fp(r.use)})),{fmt:fp})}:{title:'Credit exposure',sub:'Management only',html:'<p class="hint">Credit limits and balances are visible to sales managers and management only.</p>'}],
    tables:[T('Trader network',cols,rows)]};
});

/* ── PROJECTS & TECHNICAL ── */
def('project-pipeline','Projects','Project pipeline & specification','Construction projects by stage, specification and approval status, stakeholder coverage and linked sales value.','box',['owner'],sales,c=>{
  const ps=(D().projects||[]).filter(p=>R.owner==='All'||p.owner_id===R.owner),st=D().project_stakeholders||[];
  const rows=ps.map(p=>{const s=st.filter(x=>x.project_id===p.id),o=ops().filter(x=>x.project_id===p.id&&isOpen(x));const miss=[!p.developer&&'Developer',!p.consultant&&'Consultant',!p.main_contractor&&'Main contractor'].filter(Boolean);
    return {name:p.name,loc:p.location,stage:p.construction_stage,spec:p.specification_status,appr:p.approval_status,val:num(p.estimated_project_value),area:num(p.area_m2),stk:s.length,open:sum(o,omr),gap:miss.length?'Missing: '+miss.join(', '):'Complete',fu:p.next_followup}});
  const stages=['Design','Tendering','Awarded','Under construction','Finishing','Handover','On hold'].map(s=>({label:s,value:sum(rows.filter(r=>r.stage===s),r=>r.val)}));
  const specs=[...group(rows,r=>r.spec)].map(([label,a])=>({label,value:a.length}));
  return {kpis:[['Projects',cn(rows.length),cn(st.length)+' stakeholders recorded','box','gold'],['Total project value',om(sum(rows,r=>r.val)),'Estimated, OMR','coins','blue'],['Area',cn(sum(rows,r=>r.area))+' m²','Across all projects','layers','green'],['Specified with our product',fp(pc(rows.filter(r=>r.spec==='Specified (our product)').length,rows.length)),'Of all projects','star','purple']],
    charts:[{title:'Project value by construction stage',sub:'OMR',html:C.columns({labels:stages.map(s=>s.label.replace('Under construction','Building')),series:[{name:'Value',color:COL.amber,values:stages.map(s=>s.value)}],label:'Project value by stage'})},{title:'Specification status',sub:'Number of projects',html:C.donut(specs,{center:String(rows.length),centerSub:'projects'})}],
    tables:[T('Project register',[col('name','Project'),col('loc','Location'),col('stage','Stage','badge'),col('spec','Specification','badge'),col('appr','Approval','badge'),col('val','Value','omr'),col('area','Area m²','num'),col('stk','Stakeholders','num'),col('open','Open sales','omr'),col('gap','Stakeholder gaps'),col('fu','Next follow-up','date')],rows.sort((a,b)=>b.val-a.val))]};
});

const POS=['Approved','Approved with comments','Completed','Awarded','Handed over'],NEG=['Rejected','Lost','Re-do'];
def('technical-tracker','Projects','Mock-ups, approvals & tenders','Technical submissions, trials, tenders and application jobs: outcomes, approval rate, cost and overdue items.','shield',['range','type'],sales,c=>{
  const a=(D().technical_actions||[]).filter(x=>c.inR(x.created_at)&&(R.type==='All'||x.action_type===R.type)),t=TODAY();
  const out=x=>POS.includes(x.status)?'Positive':NEG.includes(x.status)?'Negative':'Open';
  const apr=a.filter(x=>x.action_type==='Approval'),tend=a.filter(x=>x.action_type==='Tender'),od=a.filter(x=>out(x)==='Open'&&x.due_date&&d10(x.due_date)<t);
  const types=['Mock-up','Approval','Tender','Application Job'];
  return {kpis:[['Technical records',cn(a.length),'Created in period','shield','gold'],['Approval success',fp(pc(apr.filter(x=>POS.includes(x.status)).length,apr.filter(x=>out(x)!=='Open').length)),'Approved / decided submittals','percent','green'],['Tender win rate',fp(pc(tend.filter(x=>x.status==='Awarded').length,tend.filter(x=>['Awarded','Lost'].includes(x.status)).length)),'Awarded / decided','trophy','blue'],['Trial & job cost',om(sum(a,x=>x.cost_incurred)),'Mock-ups and application jobs','coins','gold'],['Overdue',cn(od.length),'Past due date, still open','alert','purple']],
    charts:[{title:'Outcomes by type',sub:'Number of records',html:C.columns({labels:types,stacked:true,series:['Positive','Open','Negative'].map((o,i)=>({name:o,color:[COL.amber,COL.pale,COL.ink][i],values:types.map(ty=>a.filter(x=>x.action_type===ty&&out(x)===o).length)})),fmt:v=>String(Math.round(v)),label:'Outcomes by type'})},{title:'Cost by type',sub:'OMR',html:C.donut(types.map(ty=>({label:ty,value:sum(a.filter(x=>x.action_type===ty),x=>x.cost_incurred)})),{fmt:om,center:C.compact(sum(a,x=>x.cost_incurred)),centerSub:'OMR cost'})}],
    tables:[T('Technical register',[col('t','Type','badge'),col('title','Title'),col('cust','Customer'),col('sys','System'),col('st','Status','badge'),col('due','Due','date'),col('area','Area m²','num'),col('cost','Cost','omr')],a.sort((x,y)=>d10(y.created_at).localeCompare(d10(x.created_at))).map(x=>({t:x.action_type,title:x.title,cust:x.customer,sys:x.system_name,st:x.status,due:x.due_date,area:x.area_m2,cost:x.cost_incurred})))]};
});

/* ── ACTIVITY & TARGETS ── */
const GROUPS={'Visits':['Site Visit','Trader Shop Visit'],'Calls & messages':['Phone Call','Email','WhatsApp'],'Meetings & demos':['Meeting','Presentation','Mock-up','Training'],'Other':['Sample Delivery','Follow-up']};
const grpOf=t=>Object.keys(GROUPS).find(g=>GROUPS[g].includes(t))||'Other';
def('activity-summary','Activity','Field activity report','Visits, calls, messages and meetings per salesperson, outcome quality and the weekly activity trend.','check',['range','owner'],sales,c=>{
  const a=(D().sales_activities||[]).filter(x=>c.inR(x.activity_at)&&(R.owner==='All'||x.owner_id===R.owner));
  const owners=sellers().filter(p=>R.owner==='All'||p.id===R.owner);
  const rows=owners.map(p=>{const m=a.filter(x=>x.owner_id===p.id);return {name:p.full_name,total:m.length,...Object.fromEntries(Object.keys(GROUPS).map(g=>['g'+g,m.filter(x=>grpOf(x.activity_type)===g).length])),pos:pc(m.filter(x=>x.outcome==='Positive').length,m.length)}});
  const wk=[];let d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));for(let i=7;i>=0;i--){const s=new Date(d);s.setDate(s.getDate()-i*7);wk.push(s)}
  const wkv=wk.map(s=>{const lo=ISO(s),hi=ISO(new Date(s.getTime()+6*864e5));return a.filter(x=>d10(x.activity_at)>=lo&&d10(x.activity_at)<=hi).length});
  return {kpis:[['Activities logged',cn(a.length),'In selected period','check','gold'],['Visits',cn(a.filter(x=>grpOf(x.activity_type)==='Visits').length),'Site and trader shop visits','building','blue'],['Positive outcomes',fp(pc(a.filter(x=>x.outcome==='Positive').length,a.length)),'Of logged activities','trophy','green'],['Per salesperson',owners.length?(a.length/owners.length).toFixed(1):'—','Average in period','users','purple']],
    charts:[{title:'Activity by salesperson',sub:'Stacked by activity group',html:C.columns({labels:rows.map(r=>r.name.split(' – ')[0]),stacked:true,series:Object.keys(GROUPS).map((g,i)=>({name:g,color:[COL.sun,COL.amber,COL.flame,COL.ink][i],values:rows.map(r=>r['g'+g])})),fmt:v=>String(Math.round(v)),label:'Activity by salesperson'})},{title:'Weekly trend',sub:'Activities per week, last 8 weeks (within period)',html:C.columns({labels:wk.map(s=>s.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})),series:[{name:'Activities',color:COL.flame,values:wkv}],fmt:v=>String(Math.round(v)),label:'Weekly activity'})}],
    tables:[T('Activity by salesperson',[col('name','Salesperson'),col('total','Total','num'),...Object.keys(GROUPS).map(g=>col('g'+g,g,'num')),col('pos','Positive outcomes','pct')],rows,{foot:{total:rows.reduce((s,r)=>s+r.total,0),...Object.fromEntries(Object.keys(GROUPS).map(g=>['g'+g,sum(rows,r=>r['g'+g])])),pos:pc(a.filter(x=>x.outcome==='Positive').length,a.length)}}),
      T('Latest activities',[col('d','Date','date'),col('type','Type','badge'),col('cust','Customer'),col('owner','Owner'),col('out','Outcome','badge'),col('next','Next step')],a.sort((x,y)=>d10(y.activity_at).localeCompare(d10(x.activity_at))).slice(0,15).map(x=>({d:x.activity_at,type:x.activity_type,cust:x.customer,owner:who(x.owner_id),out:x.outcome,next:x.next_step})))]};
});

def('target-vs-actual','Activity','Targets vs achievement','Sales value and visit targets against actual results for each salesperson and key trader.','target',['range'],sales,c=>{
  const tp=D().sales_targets||[],inP=t=>(!c.from||t.period>=c.from.slice(0,7))&&(!c.to||t.period<=c.to.slice(0,7));
  const rows=sellers().map(p=>{const tg=tp.filter(t=>t.target_type==='Salesperson'&&t.target_name===p.full_name&&inP(t));const won=sum(ops().filter(o=>o.owner_id===p.id&&o.stage==='Closed Won'&&c.inR(closeDate(o))),wonOmr);
    const vis=(D().sales_activities||[]).filter(a=>a.owner_id===p.id&&c.inR(a.activity_at)&&grpOf(a.activity_type)==='Visits').length;const tv=sum(tg,t=>t.target_visits),tt=sum(tg,t=>t.target_value);
    return {name:p.full_name,tgt:tt,act:won,att:pc(won,tt),bar:C.bullet(won,tt),tv,vis,vatt:pc(vis,tv)}}).filter(r=>r.tgt>0||r.act>0);
  const traders=tp.filter(t=>t.target_type==='Trader'&&inP(t)).map(t=>{const won=sum(ops().filter(o=>o.customer===t.target_name&&o.stage==='Closed Won'&&c.inR(closeDate(o))),wonOmr);return {name:t.target_name,per:t.period,tgt:num(t.target_value),act:won,att:pc(won,num(t.target_value))}});
  const T1=sum(rows,r=>r.tgt),A1=sum(rows,r=>r.act);
  return {kpis:[['Team target',om(T1),'Selected period','target','gold'],['Team actual',om(A1),'Closed-won value','trophy','blue'],['Attainment',fp(pc(A1,T1)),'Actual / target','percent',pc(A1,T1)>=100?'green':'purple'],['On or above target',cn(rows.filter(r=>r.att>=100).length)+' / '+cn(rows.filter(r=>r.tgt>0).length),'Salespeople','check','green'],['Visits',cn(sum(rows,r=>r.vis))+' / '+cn(sum(rows,r=>r.tv)),'Actual / target','building','gold']],
    charts:[{title:'Target vs actual',sub:'OMR, by salesperson',wide:true,html:C.columns({labels:rows.map(r=>r.name.split(' – ')[0]),series:[{name:'Target',color:COL.pale,values:rows.map(r=>r.tgt)},{name:'Actual',color:COL.flame,values:rows.map(r=>r.act)}],label:'Target vs actual'})}],
    tables:[T('Salesperson targets',[col('name','Salesperson'),col('tgt','Sales target','omr'),col('act','Actual won','omr'),col('att','Attainment','pct'),col('bar','Progress','html'),col('tv','Visit target','num'),col('vis','Visits','num'),col('vatt','Visit attainment','pct')],rows,{foot:{tgt:T1,act:A1,att:pc(A1,T1),tv:sum(rows,r=>r.tv),vis:sum(rows,r=>r.vis),vatt:pc(sum(rows,r=>r.vis),sum(rows,r=>r.tv))}}),
      T('Trader targets',[col('name','Trader'),col('per','Period'),col('tgt','Target','omr'),col('act','Actual won','omr'),col('att','Attainment','pct')],traders,{empty:'No trader targets set for this period'})],
    notes:['The progress bar marks the target with a dark line; the bar turns green once the target is reached. Actual value is closed-won opportunity value in OMR by close date.']};
});

def('followup-overdue','Activity','Overdue follow-ups & tasks','Everything past its due date: opportunity next steps, tasks and project follow-ups, oldest first.','alert',['owner'],sales,c=>{
  const t=TODAY(),rows=[];
  ops().filter(isOpen).filter(o=>R.owner==='All'||o.owner_id===R.owner).forEach(o=>{if(o.next_followup&&d10(o.next_followup)<t)rows.push({type:'Opportunity',item:o.title+' · '+o.customer,owner:who(o.owner_id),due:o.next_followup,late:dayDiff(o.next_followup,t),info:om(omr(o)),val:omr(o)})});
  D().tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)&&x.due_date&&d10(x.due_date)<t&&(R.owner==='All'||x.assigned_to===R.owner)).forEach(x=>rows.push({type:'Task',item:x.title,owner:who(x.assigned_to),due:x.due_date,late:dayDiff(x.due_date,t),info:x.priority,val:0}));
  (D().projects||[]).filter(p=>p.next_followup&&d10(p.next_followup)<t&&(R.owner==='All'||p.owner_id===R.owner)).forEach(p=>rows.push({type:'Project',item:p.name,owner:who(p.owner_id),due:p.next_followup,late:dayDiff(p.next_followup,t),info:p.construction_stage,val:0}));
  rows.sort((a,b)=>b.late-a.late);
  const byO=[...group(rows,r=>r.owner)].map(([label,a])=>({label,value:a.length,text:String(a.length)})).sort((a,b)=>b.value-a.value);
  return {kpis:[['Overdue items',cn(rows.length),'Opportunities, tasks, projects','alert','purple'],['More than 7 days late',cn(rows.filter(r=>r.late>7).length),'Escalate to the owner','clock','gold'],['More than 30 days late',cn(rows.filter(r=>r.late>30).length),'Probably forgotten','alert','blue'],['Deal value waiting',om(sum(rows,r=>r.val)),'Opportunities with an overdue step','coins','green']],
    charts:[{title:'Overdue items by owner',sub:'Count',html:C.hbar(byO,{fmt:v=>String(v)})},{title:'By type',sub:'Count',html:C.donut(['Opportunity','Task','Project'].map(k=>({label:k,value:rows.filter(r=>r.type===k).length})),{center:String(rows.length),centerSub:'overdue'})}],
    tables:[T('Overdue list',[col('type','Type','badge'),col('item','Item'),col('owner','Owner'),col('due','Due','date'),col('late','Days late','days'),col('info','Value / priority')],rows.slice(0,60),{more:rows.length>60?`Showing 60 of ${rows.length}. Export CSV for all.`:''})]};
});

/* ── PURCHASE & PRODUCTS ── */
const poFilter=c=>D().purchase_orders.filter(p=>c.inR(p.order_date)&&p.currency===R.currency&&(R.brand==='All'||p.brand_id===R.brand));
def('purchase-spend','Purchase','Purchase spend analysis','Spend by month, supplier and brand for the chosen currency. Draft and cancelled orders are excluded.','coins',['range','brand','currency'],buyers,c=>{
  const all=D().purchase_orders.filter(p=>c.inR(p.order_date)&&(R.brand==='All'||p.brand_id===R.brand)&&!['Draft','Cancelled'].includes(p.status));
  const po=all.filter(p=>p.currency===R.currency),ms=monthsList(c);
  const ven=[...group(po,p=>p.vendor)].map(([name,a])=>({name,n:a.length,val:sum(a,p=>p.total),last:a.map(p=>d10(p.order_date)).sort().pop()})).sort((a,b)=>b.val-a.val);const tv=sum(po,p=>p.total);ven.forEach(v=>v.share=pc(v.val,tv));
  const other=[...group(all.filter(p=>p.currency!==R.currency),p=>p.currency)].map(([k,a])=>k+' '+Math.round(sum(a,p=>p.total)).toLocaleString('en-US')).join(' · ');
  const money=v=>R.currency+' '+Math.round(num(v)).toLocaleString('en-US');
  return {kpis:[['Purchase orders',cn(po.length),R.currency+' orders in period','box','gold'],['Total spend',money(tv),'Incl. VAT','coins','blue'],['Average order',money(po.length?tv/po.length:0),'Per purchase order','chart','green'],['Top supplier share',fp(ven[0]?.share),ven[0]?.name||'—','percent','purple']],
    charts:[{title:'Spend by month',sub:R.currency+' incl. VAT',html:C.columns({labels:ms.map(mLabel),series:[{name:'Spend',color:COL.amber,values:ms.map(m=>sum(po.filter(p=>mKey(p.order_date)===m),p=>p.total))}],label:'Spend by month'})},{title:'Spend by supplier',sub:R.currency,html:C.hbar(ven.slice(0,8).map(v=>({label:v.name,value:v.val,text:money(v.val)})),{fmt:money})}],
    tables:[T('Supplier summary',[col('name','Supplier'),col('n','Orders','num'),col('val','Spend ('+R.currency+')','num'),col('share','Share','pct'),col('last','Last order','date')],ven,{foot:{n:po.length,val:tv,share:100}}),
      T('Purchase orders',[col('no','PO number'),col('v','Supplier'),col('b','Brand'),col('d','Order date','date'),col('st','Status','badge'),col('t','Total','num')],po.sort((a,b)=>d10(b.order_date).localeCompare(d10(a.order_date))).slice(0,40).map(p=>({no:p.po_no,v:p.vendor,b:ow.brandName(p.brand_id),d:p.order_date,st:p.status,t:p.total})))],
    notes:['Currencies are never mixed.'+(other?' Other currencies in this period: '+other+'. Change the currency filter to see them.':'')]};
});

def('po-status','Purchase','PO pipeline & approvals','Orders by status, approval turnaround, open commitments and deliveries that are late.','truck',['range','currency'],buyers,c=>{
  const t=TODAY(),po=D().purchase_orders.filter(p=>c.inR(p.order_date)&&p.currency===R.currency);
  const sts=['Draft','Submitted','Approved','Ordered','Partially Received','Received','Cancelled'];
  const open=po.filter(p=>['Approved','Ordered','Partially Received'].includes(p.status)),late=open.filter(p=>p.delivery_date&&d10(p.delivery_date)<t);
  const wait=po.filter(p=>p.status==='Submitted'),cyc=po.filter(p=>p.approved_at).map(p=>dayDiff(p.created_at||p.order_date,p.approved_at)).filter(x=>x>=0);
  const money=v=>R.currency+' '+Math.round(num(v)).toLocaleString('en-US');
  return {kpis:[['Orders in period',cn(po.length),R.currency,'box','gold'],['Awaiting approval',cn(wait.length),money(sum(wait,p=>p.total)),'clock','purple'],['Open commitments',money(sum(open,p=>p.total)),cn(open.length)+' approved / ordered','coins','blue'],['Late deliveries',cn(late.length),'Delivery date passed','alert',late.length?'purple':'green'],['Approval time',cyc.length?avg(cyc,x=>x).toFixed(1)+' days':'—','Created → approved','check','green']],
    charts:[{title:'Orders by status',sub:'Count',html:C.donut(sts.map(s=>({label:s,value:po.filter(p=>p.status===s).length})),{center:String(po.length),centerSub:'orders'})},{title:'Value by status',sub:R.currency,html:C.hbar(sts.map(s=>({label:s,value:sum(po.filter(p=>p.status===s),p=>p.total),text:money(sum(po.filter(p=>p.status===s),p=>p.total))})).filter(x=>x.value>0),{fmt:money})}],
    tables:[T('Open orders and delivery dates',[col('no','PO number'),col('v','Supplier'),col('st','Status','badge'),col('d','Order date','date'),col('dd','Delivery due','date'),col('late','Delivery','html'),col('t','Total','num')],open.sort((a,b)=>d10(a.delivery_date).localeCompare(d10(b.delivery_date))).map(p=>{const l=p.delivery_date?dayDiff(p.delivery_date,t):null;return {no:p.po_no,v:p.vendor,st:p.status,d:p.order_date,dd:p.delivery_date,late:l==null?'—':l>0?`<span class="var-down">${l} d late</span>`:`in ${-l} d`,t:p.total}}),{empty:'No open purchase commitments'})]};
});

def('product-catalogue','Purchase','Product catalogue & price list','Printable price list by brand and category with pack size, origin and status.','layers',['brand','type'],()=>ow.access(['sales','purchase']),c=>{
  const ps=D().products.filter(p=>(R.brand==='All'||p.brand_id===R.brand)&&(R.type==='All'||p.category===R.type));
  const byCat=[...group(ps,p=>p.category)].map(([label,a])=>({label,value:a.length,text:String(a.length)})).sort((a,b)=>b.value-a.value),orig=[...group(ps,p=>p.country_of_origin||'Unknown')].map(([label,a])=>({label,value:a.length}));
  return {kpis:[['Products',cn(ps.length),cn(ps.filter(p=>p.status==='Active').length)+' active','layers','gold'],['Brands',cn(new Set(ps.map(p=>p.brand_id).filter(Boolean)).size),'In this list','box','blue'],['Origins',cn(orig.length),'Countries of origin','building','green'],['Average list price',om(avg(ps,p=>p.list_price)).replace('OMR ','OMR ')+'','Per product','coins','purple']],
    charts:[{title:'Products by category',sub:'Count',html:C.hbar(byCat,{fmt:v=>String(v)})},{title:'Country of origin',sub:'Share of products',html:C.donut(orig,{center:String(ps.length),centerSub:'products'})}],
    tables:[T('Price list',[col('sku','SKU'),col('name','Product'),col('brand','Brand'),col('cat','Category'),col('pack','Pack'),col('unit','Unit'),col('org','Origin'),col('price','List price','omr3'),col('st','Status','badge')],ps.sort((a,b)=>ow.brandName(a.brand_id).localeCompare(ow.brandName(b.brand_id))||a.name.localeCompare(b.name)).map(p=>({sku:p.sku,name:p.name,brand:ow.brandName(p.brand_id),cat:p.category,pack:p.pack_size,unit:p.unit,org:p.country_of_origin,price:p.list_price,st:p.status})))]};
});

/* ── PEOPLE ── */
const hr=()=>ow.access(['hr']);
def('hr-headcount','People','Headcount & directory','Employees by department and status with tenure and recent joiners.','users',[],hr,c=>{
  const es=D().employees,t=TODAY(),ten=e=>e.joining_date?dayDiff(e.joining_date,t)/365.25:null;
  const dept=[...group(es,e=>e.department||'Other')].map(([label,a])=>({label,value:a.length}));
  const stat=[...group(es,e=>e.employment_status)].map(([label,a])=>({label,value:a.length,text:String(a.length)}));
  return {kpis:[['Headcount',cn(es.length),cn(es.filter(e=>e.employment_status==='Active').length)+' active','users','gold'],['On leave',cn(es.filter(e=>e.employment_status==='On Leave').length),'Right now','calendar','blue'],['Average tenure',(avg(es.filter(e=>e.joining_date),ten)).toFixed(1)+' yrs','Years in company','clock','green'],['Joined last 12 months',cn(es.filter(e=>e.joining_date&&dayDiff(e.joining_date,t)<=365).length),'New starters','userplus','purple']],
    charts:[{title:'Headcount by department',sub:'Employees',html:C.donut(dept,{center:String(es.length),centerSub:'staff'})},{title:'Employment status',sub:'Employees',html:C.hbar(stat,{fmt:v=>String(v)})}],
    tables:[T('Employee directory',[col('no','Employee ID'),col('name','Name'),col('dept','Department'),col('role','Designation'),col('join','Joined','date'),col('ten','Tenure (yrs)','num'),col('st','Status','badge')],es.slice().sort((a,b)=>(a.department||'').localeCompare(b.department||'')||a.full_name.localeCompare(b.full_name)).map(e=>({no:e.employee_no,name:e.full_name,dept:e.department,role:e.designation,join:e.joining_date,ten:ten(e)==null?null:Math.round(ten(e)*10)/10,st:e.employment_status})))],
    notes:['Employee records hold no salary, passport or identity numbers.']};
});

def('leave-summary','People','Leave & absence summary','Leave days taken, by type and employee, with pending approvals.','calendar',['range'],hr,c=>{
  const lv=D().leave_requests.filter(l=>(!c.from||d10(l.end_date)>=c.from)&&(!c.to||d10(l.start_date)<=c.to));
  const days=l=>{const s=c.from&&d10(l.start_date)<c.from?c.from:d10(l.start_date),e=c.to&&d10(l.end_date)>c.to?c.to:d10(l.end_date);return Math.max(0,dayDiff(s,e)+1)};
  const appr=lv.filter(l=>l.status==='Approved'),types=['Annual','Sick','Emergency','Unpaid','Other'];
  const byE=[...group(appr,l=>l.employee_id)].map(([id,a])=>({label:who(id),value:sum(a,days),text:sum(a,days)+' days'})).sort((a,b)=>b.value-a.value).slice(0,8);
  return {kpis:[['Leave requests',cn(lv.length),'Overlapping the period','calendar','gold'],['Approved days',cn(sum(appr,days)),'Within the period','check','green'],['Pending approval',cn(lv.filter(l=>l.status==='Pending').length),'Needs HR decision','clock','purple'],['Rejected',cn(lv.filter(l=>l.status==='Rejected').length),'Requests declined','alert','blue']],
    charts:[{title:'Approved days by leave type',sub:'Days in period',html:C.donut(types.map(k=>({label:k,value:sum(appr.filter(l=>l.leave_type===k),days)})),{center:String(sum(appr,days)),centerSub:'days'})},{title:'Most days taken',sub:'Approved leave by employee',html:C.hbar(byE,{fmt:v=>v+' days'})}],
    tables:[T('Leave requests',[col('emp','Employee'),col('type','Type'),col('from','From','date'),col('to','To','date'),col('d','Days in period','num'),col('why','Reason'),col('st','Status','badge')],lv.sort((a,b)=>d10(b.start_date).localeCompare(d10(a.start_date))).map(l=>({emp:who(l.employee_id),type:l.leave_type,from:l.start_date,to:l.end_date,d:days(l),why:l.reason,st:l.status})))]};
});

/* ── EXECUTIVE ── */
def('exec-summary','Executive','Executive summary pack','One printable page for management: sales, pipeline, quotations, activity, customers, purchasing and people.','spark',['range'],mgmt,c=>{
  const cl=ops().filter(o=>!isOpen(o)&&c.inR(closeDate(o))),won=cl.filter(o=>o.stage==='Closed Won'),lost=cl.filter(o=>o.stage==='Closed Lost'),open=ops().filter(isOpen);
  const qs=(D().quotations||[]).filter(q=>c.inR(q.created_at)),acts=(D().sales_activities||[]).filter(a=>c.inR(a.activity_at)),nc=custs().filter(x=>c.inR(x.created_at));
  const po=D().purchase_orders.filter(p=>c.inR(p.order_date)&&p.currency==='OMR'&&!['Draft','Cancelled'].includes(p.status));
  const ms=monthsList(c,6),tp=D().sales_targets||[];
  const tgt=m=>sum(tp.filter(t=>t.target_type==='Salesperson'&&t.period===m),t=>t.target_value);
  const top=[...group(won,o=>o.customer)].map(([label,a])=>({label,value:sum(a,wonOmr),text:om(sum(a,wonOmr))})).sort((a,b)=>b.value-a.value).slice(0,6);
  const byCh=CHANNELS.map(ch=>({label:ch,value:sum(open.filter(o=>o.channel===ch),omr)}));
  const kp=[['Won value',om(sum(won,wonOmr)),cn(won.length)+' deals · win rate '+fp(pc(won.length,cl.length)),'trophy','gold'],['Open pipeline',om(sum(open,omr)),'Weighted '+om(sum(open,wOmr)),'chart','blue'],['Quotations',cn(qs.length),om(sum(qs.filter(qOMR),q=>q.total))+' quoted','file','green'],['Field activity',cn(acts.length),cn(nc.length)+' new customers','check','purple']];
  if(ow.access(['purchase']))kp.push(['Purchase spend',om(sum(po,p=>p.total)),cn(po.length)+' OMR orders','box','gold']);
  if(ow.access(['hr']))kp.push(['People',cn(D().employees.length)+' staff',cn(D().leave_requests.filter(l=>l.status==='Pending').length)+' leave requests pending','users','blue']);
  return {kpis:kp,
    charts:[{title:'Won value vs target by month',sub:'OMR, last six months of the period',html:C.columns({labels:ms.map(mLabel),series:[{name:'Target',color:COL.pale,values:ms.map(tgt)},{name:'Won',color:COL.flame,values:ms.map(m=>sum(won.filter(o=>mKey(closeDate(o))===m),wonOmr))}],label:'Won vs target'})},
      {title:'Open pipeline by channel',sub:'OMR',html:C.donut(byCh,{fmt:om,center:C.compact(sum(open,omr)),centerSub:'OMR open'})},
      {title:'Top customers (won value)',sub:'Selected period',html:C.hbar(top,{fmt:om})},
      {title:'Why we lose',sub:'Lost deals by reason',html:C.donut([...group(lost,o=>o.lost_reason||'Not given')].map(([label,a])=>({label,value:a.length})),{center:String(lost.length),centerSub:'lost'})}],
    tables:[T('Largest open opportunities',[col('no','Ref'),col('title','Opportunity'),col('customer','Customer'),col('ch','Channel','badge'),col('stage','Stage','badge'),col('owner','Owner'),col('val','Value','omr'),col('w','Weighted','omr')],open.sort((a,b)=>omr(b)-omr(a)).slice(0,8).map(o=>({no:o.opportunity_no,title:o.title,customer:o.customer,ch:o.channel,stage:o.stage,owner:who(o.owner_id),val:omr(o),w:wOmr(o)})))],
    notes:['Prepared from live CRM records. Values are converted to OMR using each opportunity’s recorded exchange factor.']};
});

def('weekly-review','Executive','Weekly sales review','Last seven days against the week before, plus what is due in the next seven days. Built for the Monday meeting.','calendar',[],sales,c=>{
  const t=TODAY(),d=n=>ISO(new Date(Date.now()+n*864e5)),w1=x=>d10(x)>d(-7)&&d10(x)<=t,w0=x=>d10(x)>d(-14)&&d10(x)<=d(-7);
  const cnt=(f)=>[f(w1).length,f(w0).length];
  const nOpp=cnt(w=>ops().filter(o=>w(o.created_at))),nWon=cnt(w=>ops().filter(o=>o.stage==='Closed Won'&&w(closeDate(o)))),nLost=cnt(w=>ops().filter(o=>o.stage==='Closed Lost'&&w(closeDate(o)))),nQ=cnt(w=>(D().quotations||[]).filter(q=>w(q.created_at))),nA=cnt(w=>(D().sales_activities||[]).filter(a=>w(a.activity_at)));
  const wv=[sum(ops().filter(o=>o.stage==='Closed Won'&&w1(closeDate(o))),wonOmr),sum(ops().filter(o=>o.stage==='Closed Won'&&w0(closeDate(o))),wonOmr)];
  const delta=(a,b)=>a===b?'Same as last week':(a>b?'▲ ':'▼ ')+Math.abs(a-b)+' vs last week';
  const next=ops().filter(isOpen).filter(o=>o.next_followup&&d10(o.next_followup)>=t&&d10(o.next_followup)<=d(7)).sort((a,b)=>d10(a.next_followup).localeCompare(d10(b.next_followup)));
  const mtgs=D().meetings.filter(m=>m.starts_at&&d10(m.starts_at)>=t&&d10(m.starts_at)<=d(7)&&m.status==='Scheduled').sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  const exp=(D().quotations||[]).filter(q=>['Sent','Under Negotiation','Approved'].includes(q.status)&&q.valid_until&&d10(q.valid_until)>=t&&d10(q.valid_until)<=d(7));
  return {kpis:[['Won this week',om(wv[0]),nWon[0]+' deals · '+(wv[0]>=wv[1]?'▲':'▼')+' '+om(Math.abs(wv[0]-wv[1]))+' vs last week','trophy','gold'],['New opportunities',cn(nOpp[0]),delta(nOpp[0],nOpp[1]),'briefcase','blue'],['Quotations issued',cn(nQ[0]),delta(nQ[0],nQ[1]),'file','green'],['Activities logged',cn(nA[0]),delta(nA[0],nA[1]),'check','purple'],['Deals lost',cn(nLost[0]),delta(nLost[0],nLost[1]),'alert','gold']],
    charts:[{title:'This week vs last week',sub:'Count of new opportunities, wins, quotations and activities',wide:true,html:C.columns({labels:['New opportunities','Deals won','Deals lost','Quotations','Activities'],series:[{name:'Last week',color:COL.pale,values:[nOpp[1],nWon[1],nLost[1],nQ[1],nA[1]]},{name:'This week',color:COL.flame,values:[nOpp[0],nWon[0],nLost[0],nQ[0],nA[0]]}],fmt:v=>String(Math.round(v)),label:'Week comparison'})}],
    tables:[T('Follow-ups due in the next 7 days',[col('d','Due','date'),col('title','Opportunity'),col('customer','Customer'),col('owner','Owner'),col('step','Next step'),col('val','Value','omr')],next.map(o=>({d:o.next_followup,title:o.title,customer:o.customer,owner:who(o.owner_id),step:o.next_step,val:omr(o)})),{empty:'Nothing due in the next 7 days'}),
      T('Meetings in the next 7 days',[col('d','When','date'),col('t','Meeting'),col('co','Company'),col('o','Owner'),col('l','Location')],mtgs.map(m=>({d:m.starts_at,t:m.title,co:m.company||'Internal',o:who(m.assigned_to),l:m.location})),{empty:'No meetings scheduled'}),
      T('Quotations expiring in the next 7 days',[col('no','Quotation'),col('c','Customer'),col('st','Status','badge'),col('v','Valid until','date'),col('t','Total','omr3')],exp.map(q=>({no:q.quote_no,c:q.customer,st:q.status,v:q.valid_until,t:q.total})),{empty:'No quotations expiring'})]};
});

/* ─────────────── rendering ─────────────── */
const CATS=[['Sales','Sales & pipeline','t-sun'],['Quotations','Quotations','t-amber'],['Customers','Customers','t-flame'],['Projects','Projects & technical','t-ember'],['Activity','Activity & targets','t-sun'],['Purchase','Purchase & catalogue','t-amber'],['People','People','t-flame'],['Executive','Executive','t-ink']];
const catOf=id=>CATS.find(c=>c[0]===id)||CATS[0];
const visible=()=>REPORTS.filter(r=>{try{return r.acc()}catch{return false}});
let LAST=null;

function reportCentre(){
  const list=visible(),q=(S.query||'').toLowerCase().trim();
  const shown=list.filter(r=>(R.cat==='All'||r.cat===R.cat)&&(!q||(r.title+' '+r.desc).toLowerCase().includes(q)));
  const feat=(id,cls,h,p)=>list.find(r=>r.id===id)?`<button class="rpt-feature ${cls}" data-action="rpt-open" data-id="${id}"><h3>${h}</h3><p>${p}</p><span class="go">Open report ${ico('right',14)}</span><img src="${ow.assets.mark}" alt=""></button>`:'';
  const f1=feat('exec-summary','a','Executive summary pack','A one-page management view of sales, pipeline, quotations, activity, purchasing and people. Print it straight to PDF.'),f2=feat('weekly-review','b','Weekly sales review','This week against last week, plus the follow-ups, meetings and quotation expiries due next.');
  return `${ow.layoutHead('Report centre',`${list.length} ready-to-run reports. Every report can be filtered, printed to PDF or exported to CSV.`,'')}
  ${f1||f2?`<div class="rpt-hero">${f1}${f2}</div>`:''}
  <div class="toolbar"><div class="search-wrap">${ico('search',16)}<input id="searchRecords" autocomplete="off" placeholder="Search reports…" value="${esc(S.query)}"></div></div>
  <div class="rpt-cats">${[['All','All reports'],...CATS.map(c=>[c[0],c[1]])].map(([id,l])=>`<button class="chip ${R.cat===id?'active':''}" data-action="rpt-cat" data-id="${id}">${esc(l)} <span style="opacity:.6">${id==='All'?list.length:list.filter(r=>r.cat===id).length}</span></button>`).join('')}</div>
  <div class="rpt-grid">${shown.map(r=>`<button class="rpt-card" data-action="rpt-open" data-id="${r.id}"><span class="rpt-tile ${catOf(r.cat)[2]}">${ico(r.icon,22)}</span><h3>${esc(r.title)}</h3><p>${esc(r.desc)}</p><div class="rpt-meta"><span>${esc(catOf(r.cat)[1])}</span><span class="rpt-open">Open ${ico('right',13)}</span></div></button>`).join('')||`<div class="panel" style="grid-column:1/-1">${ow.empty('No reports match','Try a different search or category.')}</div>`}</div>
  <div class="notice info" style="margin-top:22px">Reports use the records your account is allowed to read. A salesperson sees their own figures; managers and management see the whole team.</div>`;
}

function filterBar(r,c){
  const f=r.filters,sel=(k,label,opts,val)=>`<div class="f"><label>${label}</label><select data-rpt="${k}">${opts.map(([v,t])=>`<option value="${esc(v)}" ${String(val)===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
  let h='';
  if(f.includes('range')){h+=sel('range','Period',RANGES,R.range);if(R.range==='custom')h+=`<div class="f"><label>From</label><input type="date" data-rpt="from" value="${esc(R.from)}"></div><div class="f"><label>To</label><input type="date" data-rpt="to" value="${esc(R.to)}"></div>`}
  if(f.includes('channel'))h+=sel('channel','Sales channel',[['All','All channels'],...CHANNELS.map(x=>[x,x])],R.channel);
  if(f.includes('owner'))h+=sel('owner','Salesperson',[['All','Everyone'],...sellers().map(p=>[p.id,p.full_name])],R.owner);
  if(f.includes('brand'))h+=sel('brand','Brand',[['All','All brands'],...D().brands.map(b=>[b.id,b.name])],R.brand);
  if(f.includes('currency'))h+=sel('currency','Currency',['OMR','USD','AED','INR','EUR'].map(x=>[x,x]),R.currency);
  if(f.includes('type')){const opts=r.id==='product-catalogue'?['All',...new Set(D().products.map(p=>p.category))]:['All','Mock-up','Approval','Tender','Application Job'];h+=sel('type',r.id==='product-catalogue'?'Category':'Record type',opts.map(x=>[x,x==='All'?'All':x]),R.type)}
  if(!h)return `<div class="rpt-filters rpt-noprint"><span class="rpt-period">This report shows the position as of today.</span></div>`;
  return `<div class="rpt-filters rpt-noprint">${h}<div class="grow"></div>${f.includes('range')?`<span class="rpt-period">${esc(c.label)}</span>`:''}<button class="btn sm ghost" data-action="rpt-reset">Reset filters</button></div>`;
}

function reportView(r){
  const c=makeCtx();let out;
  try{out=r.build(c)}catch(err){console.error('Report failed',r.id,err);return `<button class="rpt-back" data-action="rpt-back">${ico('left',15)} All reports</button><div class="notice error">This report could not be built: ${esc(err.message)}</div>`}
  LAST={r,out,c};
  const charts=(out.charts||[]);let ch='',i=0;
  while(i<charts.length){const a=charts[i];const box=x=>`<div class="panel"><div class="panel-header"><div><div class="panel-title">${esc(x.title)}</div>${x.sub?`<div class="panel-sub">${esc(x.sub)}</div>`:''}</div></div><div class="panel-body">${x.html}</div></div>`;
    if(a.wide||i===charts.length-1){ch+=box(a);i++}else{ch+=`<div class="rpt-split">${box(a)}${box(charts[i+1])}</div>`;i+=2}}
  const hasRange=r.filters.includes('range');
  return `<div class="rpt-letterhead"><img src="${ow.assets.lockup}" alt="AAARON Commercial Services LLC"><div class="r"><strong>${esc(r.title)}</strong>${hasRange?esc(c.label)+'<br>':''}Generated ${esc(new Date().toLocaleString('en-GB'))}<br>by ${esc(S.profile?.full_name||'User')}</div></div>
  <button class="rpt-back" data-action="rpt-back">${ico('left',15)} All reports</button>
  ${ow.layoutHead(r.title,r.desc,`<div class="stack">${btn('rpt-print',ico('printer',14)+' Print / save PDF','gold')}${btn('rpt-csv',ico('download',14)+' Export CSV','sm','0')}</div>`)}
  ${filterBar(r,c)}
  ${(out.kpis||[]).length?`<div class="metric-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${out.kpis.map(k=>mt(...k)).join('')}</div>`:''}
  ${ch}
  ${(out.tables||[]).map(tableHTML).join('')}
  ${(out.notes||[]).map(n=>`<div class="rpt-callout">${ico('alert',18)}<div>${esc(n)}</div></div>`).join('')}
  <p class="rpt-note">AAARON Commercial Services LLC · ${esc(r.title)} · Figures in OMR unless stated · Generated ${esc(new Date().toLocaleString('en-GB'))} from records visible to ${esc(S.profile?.full_name||'the signed-in user')}.</p>`;
}

ow.views.reports=function(){
  const r=REPORTS.find(x=>x.id===R.id);
  if(r){let ok=false;try{ok=r.acc()}catch{}if(!ok){R.id=null;return reportCentre()}return reportView(r)}
  return reportCentre();
};
ow.views.insights=function(){R.id=R.id||'pipeline-stage';return ow.views.reports()};
ow.title('reports','Report centre');ow.title('insights','Report centre');

function exportCSV(idx){
  if(!LAST)return;const t=LAST.out.tables?.[Number(idx)||0];if(!t||!t.rows.length){toast('This table has no rows to export',true);return}
  const rows=t.rows.map(r=>Object.fromEntries(t.cols.map(c=>[c.label,rawCell(c,r)])));
  ow.csvExport(rows,`AAARON_${LAST.r.id}_${TODAY()}.csv`);
}
ow.actions['rpt-open']=(b,id)=>{R.id=id;S.view='reports';S.query='';const r=REPORTS.find(x=>x.id===id);if(r){if(!r.filters.includes('channel'))R.channel='All';if(!r.filters.includes('owner'))R.owner='All';if(!r.filters.includes('brand'))R.brand='All';if(!r.filters.includes('type'))R.type='All';if(!r.filters.includes('currency'))R.currency='OMR'}ow.render();window.scrollTo(0,0)};
ow.actions['rpt-back']=()=>{R.id=null;S.query='';ow.render();window.scrollTo(0,0)};
ow.actions['rpt-cat']=(b,id)=>{R.cat=id;ow.render()};
ow.actions['rpt-reset']=()=>{Object.assign(R,{range:'ytd',from:'',to:'',channel:'All',owner:'All',brand:'All',currency:'OMR',type:'All'});ow.render()};
ow.actions['rpt-print']=()=>{const old=document.title;document.title='AAARON – '+(LAST?.r.title||'Report')+' – '+TODAY();window.print();setTimeout(()=>document.title=old,500)};
ow.actions['rpt-csv']=(b,id)=>exportCSV(id);
ow.onChange.push(e=>{const k=e.target.dataset?.rpt;if(!k)return false;R[k]=e.target.value;if(k==='range'&&e.target.value==='custom'&&!R.from){R.from=ISO(new Date(new Date().getFullYear(),0,1));R.to=TODAY()}ow.render();return true});
ow.onNav.push(v=>{if(v==='reports'){R.id=null}});
ow.reports={list:visible,count:()=>visible().length,open:id=>ow.actions['rpt-open'](null,id)};
});
