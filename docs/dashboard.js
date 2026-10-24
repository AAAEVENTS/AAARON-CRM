/* AAARON OneWork — command dashboard. */
(window.OneWorkPlugins=window.OneWorkPlugins||[]).push(function(ow){
'use strict';
const {S,esc,ico,btn,badge}=ow,C=window.OWCharts,D=()=>S.data;
const num=v=>Number(v)||0,cn=v=>num(v).toLocaleString('en-US'),om=v=>'OMR '+Math.round(num(v)).toLocaleString('en-US');
const ISO=d=>d.toLocaleDateString('en-CA'),T0=()=>ISO(new Date()),d10=v=>v?String(v).slice(0,10):'';
const sum=(a,f)=>a.reduce((s,x)=>s+num(f(x)),0);
const omr=o=>num(o.estimated_value)*num(o.exchange_rate||1),wOmr=o=>omr(o)*num(o.probability)/100,wonOmr=o=>num(o.won_value??o.estimated_value)*num(o.exchange_rate||1);
const closeDate=o=>d10(o.actual_close||o.updated_at||o.created_at),isOpen=o=>!['Closed Won','Closed Lost'].includes(o.stage);
const PROB={'Walk-in':10,'New Lead':10,Qualified:20,'Meeting / Site Visit':30,'Meeting / Shop Visit':35,'Enquiry or Sale':40,'Presentation / Mock-up':45,'Price List / Quotation':50,'Specification / Approval':55,'Interested / Escalated':60,'Quotation / Tender':65,'Terms Agreed':75,Negotiation:80};
const dayDiff=(a,b)=>Math.round((new Date(d10(b)+'T12:00:00')-new Date(d10(a)+'T12:00:00'))/864e5);

ow.views.dashboard=function(){
  const now=new Date(),t=T0(),hr=now.getHours(),first=(S.profile?.full_name||'Team').split(/[ –-]/)[0]||'Team';
  const canSales=ow.access(['sales']),canBuy=ow.access(['purchase']),canHr=ow.access(['hr']);
  const ops=(D().opportunities||[]),open=ops.filter(isOpen),qs=D().quotations||[];
  const monthKey=t.slice(0,7),wonM=ops.filter(o=>o.stage==='Closed Won'&&closeDate(o).slice(0,7)===monthKey);
  const tgtM=sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.period===monthKey),x=>x.target_value);
  const in30=ISO(new Date(Date.now()+30*864e5)),next30=open.filter(o=>d10(o.expected_close)>=t&&d10(o.expected_close)<=in30);
  const awaiting=qs.filter(q=>['Sent','Under Negotiation'].includes(q.status));
  const overdueOpp=open.filter(o=>o.next_followup&&d10(o.next_followup)<t);
  const overdueTasks=D().tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)&&x.due_date&&d10(x.due_date)<t);
  const poWait=D().purchase_orders.filter(p=>p.status==='Submitted');
  const lvWait=D().leave_requests.filter(l=>l.status==='Pending');
  const upcoming=D().meetings.filter(m=>m.starts_at&&new Date(m.starts_at)>=now&&m.status==='Scheduled').sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,4);

  /* months for the won-vs-target chart */
  const ms=[];for(let i=5;i>=0;i--){ms.push(ISO(new Date(now.getFullYear(),now.getMonth()-i,1)).slice(0,7))}
  const mLab=k=>new Date(k+'-15T12:00:00').toLocaleDateString('en-GB',{month:'short'});
  const byStage=[...open.reduce((m,o)=>m.set(o.stage,(m.get(o.stage)||0)+omr(o)),new Map())].map(([label,value])=>({label,value,text:om(value),p:PROB[label]??0})).sort((a,b)=>a.p-b.p);
  const byCh=['Project','Trade','Counter','Application'].map(ch=>({label:ch,value:sum(open.filter(o=>o.channel===ch),omr)}));

  /* attention list */
  const att=[];
  overdueOpp.sort((a,b)=>d10(a.next_followup).localeCompare(d10(b.next_followup))).slice(0,3).forEach(o=>att.push({icon:'alert',cls:'red',title:o.title,sub:`${o.customer} · follow-up overdue · ${ow.personName(o.owner_id)}`,right:`${dayDiff(o.next_followup,t)} d late`,go:['ext-jump','opportunities']}));
  qs.filter(q=>['Sent','Under Negotiation','Approved'].includes(q.status)&&q.valid_until&&d10(q.valid_until)>=t&&d10(q.valid_until)<=ISO(new Date(Date.now()+7*864e5))).slice(0,2).forEach(q=>att.push({icon:'file',cls:'',title:`${q.quote_no} expires soon`,sub:`${q.customer} · ${ow.money(q.total,q.currency)}`,right:ow.date(q.valid_until),go:['ext-jump','quotations']}));
  if(ow.access(['purchase']))poWait.slice(0,2).forEach(p=>att.push({icon:'box',cls:'blue',title:`${p.po_no} awaiting approval`,sub:`${p.vendor} · ${ow.money(p.total,p.currency)}`,right:ow.date(p.order_date),go:['ext-jump','purchases']}));
  overdueTasks.slice(0,2).forEach(x=>att.push({icon:'check',cls:'red',title:x.title,sub:`${ow.personName(x.assigned_to)} · task overdue`,right:ow.date(x.due_date),go:['ext-jump','tasks']}));

  const kp1=canSales?`<div class="metric-grid">${ow.metric('Open pipeline',om(sum(open,omr)),`${cn(open.length)} open deals across 4 channels`,'chart','gold')}${ow.metric('Weighted forecast',om(sum(open,wOmr)),`${om(sum(next30,wOmr))} expected in the next 30 days`,'trend','blue')}${ow.metric('Won this month',om(sum(wonM,wonOmr)),tgtM?`${Math.round(sum(wonM,wonOmr)/tgtM*100)}% of the ${om(tgtM)} team target`:`${cn(wonM.length)} deals closed`,'trophy','green')}${ow.metric('Quotes awaiting decision',cn(awaiting.length),`${om(sum(awaiting.filter(q=>(q.currency||'OMR')==='OMR'),q=>q.total))} sent or in negotiation`,'file','purple')}</div>`:'';
  const ops2=[];
  ops2.push(ow.metric('Overdue follow-ups',cn((canSales?overdueOpp.length:0)+overdueTasks.length),`${cn(overdueTasks.length)} tasks · ${cn(canSales?overdueOpp.length:0)} deal steps`,'clock',overdueOpp.length+overdueTasks.length?'red':'green'));
  if(canBuy)ops2.push(ow.metric('POs awaiting approval',cn(poWait.length),`${cn(D().purchase_orders.filter(p=>['Approved','Ordered','Partially Received'].includes(p.status)).length)} open commitments`,'box','plain'));
  if(canHr)ops2.push(ow.metric('Leave to review',cn(lvWait.length),`${cn(D().employees.length)} employees on record`,'users','plain'));
  ops2.push(ow.metric('Meetings ahead',cn(D().meetings.filter(m=>m.starts_at&&new Date(m.starts_at)>=now&&m.status==='Scheduled').length),upcoming[0]?`Next: ${upcoming[0].title}`:'Nothing scheduled','calendar','plain'));
  const kp2=`<div class="metric-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${ops2.join('')}</div>`;

  const chartPanel=(title,sub,html,extra='')=>`<div class="panel"><div class="panel-header"><div><div class="panel-title">${esc(title)}</div><div class="panel-sub">${esc(sub)}</div></div>${extra}</div><div class="panel-body">${html}</div></div>`;
  const charts=canSales?`<div class="columns">${chartPanel('Won value vs target','Last six months, OMR',C.columns({labels:ms.map(mLab),series:[{name:'Team target',color:'#FFE07A',values:ms.map(m=>sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.period===m),x=>x.target_value))},{name:'Won',color:'#FF6A00',values:ms.map(m=>sum(ops.filter(o=>o.stage==='Closed Won'&&closeDate(o).slice(0,7)===m),wonOmr))}],label:'Won value vs target'}),btn('rpt-open','Target report','sm','target-vs-actual'))}${chartPanel('Pipeline by channel','Share of open value',C.donut(byCh,{fmt:om,center:C.compact(sum(open,omr)),centerSub:'OMR open'}))}</div>
  <div class="columns equal">${chartPanel('Pipeline funnel','Open value by stage, ordered by win probability',C.hbar(byStage,{fmt:om}),btn('rpt-open','Full report','sm','pipeline-stage'))}<div class="panel"><div class="panel-header"><div><div class="panel-title">Needs attention</div><div class="panel-sub">Overdue steps, expiring quotes and approvals</div></div>${btn('rpt-open','All overdue','sm','followup-overdue')}</div><div class="entry-list">${att.map(a=>`<div class="entry"><div class="entry-mark ${a.cls}">${ico(a.icon,17)}</div><div class="entry-main"><strong>${esc(a.title)}</strong><small>${esc(a.sub)}</small></div><div class="entry-time">${esc(a.right)}</div></div>`).join('')||ow.empty('All caught up','Nothing overdue or expiring.')}</div></div></div>`:'';

  const recent=D().enquiries.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
  const bottom=`<div class="columns"><div class="panel"><div class="panel-header"><div><div class="panel-title">Latest enquiries</div><div class="panel-sub">Newest customer requests</div></div><button class="btn sm" data-nav="enquiries">View all ${ico('right',13)}</button></div>${ow.dataTable(['Reference / customer','Brand','Value','Stage'],recent.map(x=>ow.tr(`<strong>${esc(x.enquiry_no)}</strong><div class="hint">${esc(x.customer)}</div>`,esc(ow.brandName(x.brand_id)),ow.money(x.estimated_value),badge(x.stage))),'No enquiries entered')}</div>
  <div class="panel"><div class="panel-header"><div><div class="panel-title">Upcoming meetings</div><div class="panel-sub">Next client touchpoints</div></div>${ico('calendar',17)}</div><div class="entry-list">${upcoming.map(x=>`<div class="entry"><div class="entry-mark blue">${ico('calendar',17)}</div><div class="entry-main"><strong>${esc(x.title)}</strong><small>${esc(x.company||x.location||'Internal')}</small></div><div class="entry-time">${ow.datetime(x.starts_at)}</div></div>`).join('')||ow.empty('No meetings ahead','Schedule a meeting to see it here.')}</div><div class="panel-actions" style="padding:10px 20px 18px">${btn('new-meeting',ico('plus',14)+' Schedule meeting','sm')}</div></div></div>`;
  const shortcuts=canSales?`<div class="stack" style="margin:-8px 0 22px"><span class="hint" style="font-weight:800">Quick reports</span>${[['pipeline-stage','Pipeline'],['win-loss','Win / loss'],['sales-performance','Scorecard'],['weekly-review','Weekly review'],['exec-summary','Executive pack']].filter(([id])=>ow.reports.list().some(r=>r.id===id)).map(([id,l])=>`<button class="chip" data-action="rpt-open" data-id="${id}">${l}</button>`).join('')}</div>`:'';

  const hero=`<div class="hero"><h2>One workspace. Every deal, quote and approval.</h2><p>Enquiry → Opportunity → Quotation → Follow-up → Purchase order → Management reporting</p><div class="stack">${btn('rpt-open',ico('pie',15)+' Open report centre','gold','pipeline-stage')}<button class="btn white" data-nav="ai">${ico('bot',15)} Ask AI assistant</button>${ow.isSalesManager()?`<button class="btn white" data-nav="aimanager">${ico('spark',15)} Management AI</button>`:''}</div></div>`;
  const dateStr=now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  return `${ow.layoutHead(`Good ${hr<12?'morning':hr<17?'afternoon':'evening'}, ${first}`,`${dateStr}. Here is where the business stands.`,`<div class="stack">${canSales?btn('ext-new',ico('plus',15)+' New opportunity','gold','','data-value="opportunity"'):''}${canSales?btn('new-enquiry',ico('plus',15)+' New enquiry'):''}${btn('new-task',ico('plus',15)+' Follow-up')}</div>`)}${hero}${shortcuts}${kp1}${kp2}${charts}${bottom}`;
};
});
