/* AAARON OneWork — AI assistants.
   • AI Assistant (everyone): scoped to the signed-in person's OWN records.
   • Management AI (admin, management, sales managers): company-wide view of what the account may read.
   Both are READ-ONLY: they answer questions and draft text; they never change records.
   Built-in mode computes every answer in the browser. If config.js has an `aiEndpoint`, open-ended questions
   are sent (as a compact, role-scoped summary) to your own secure cloud function; see AI_GUIDE.md. */
(window.OneWorkPlugins=window.OneWorkPlugins||[]).push(function(ow){
'use strict';
const {S,esc,ico,btn,badge,toast}=ow,D=()=>S.data,CFG=window.AAARON_CONFIG||{};
const num=v=>Number(v)||0,cn=v=>num(v).toLocaleString('en-US'),om=v=>'OMR '+Math.round(num(v)).toLocaleString('en-US');
const fp=v=>v==null?'—':(Math.round(v*10)/10)+'%',pc=(a,b)=>b>0?a/b*100:null;
const ISO=d=>d.toLocaleDateString('en-CA'),T0=()=>ISO(new Date()),d10=v=>v?String(v).slice(0,10):'';
const dayDiff=(a,b)=>Math.round((new Date(d10(b)+'T12:00:00')-new Date(d10(a)+'T12:00:00'))/864e5);
const sum=(a,f)=>a.reduce((s,x)=>s+num(f(x)),0),group=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m};
const omr=o=>num(o.estimated_value)*num(o.exchange_rate||1),wOmr=o=>omr(o)*num(o.probability)/100,wonOmr=o=>num(o.won_value??o.estimated_value)*num(o.exchange_rate||1);
const closeDate=o=>d10(o.actual_close||o.updated_at||o.created_at),isOpen=o=>!['Closed Won','Closed Lost'].includes(o.stage);
const who=id=>ow.personName(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const has=(q,re)=>re.test(q);

const AI={msgs:{employee:[],manager:[]},persona:'demo-s1',busy:false,drafts:{},seq:0};
const curRole=()=>S.view==='aimanager'?'manager':'employee';
const meId=()=>S.mode==='demo'?AI.persona:S.user?.id;
const meFull=()=>who(meId());
const meFirst=()=>meFull().split(/\s[–-]\s/)[0].split(' ')[0];
const meTitle=()=>(meFull().split(/\s[–-]\s/)[1]||'');
const cloudReady=()=>S.mode==='live'&&!!CFG.aiEndpoint&&!!S.sb;

/* ─────────── data scope ─────────── */
function scope(role){
  const me=meId(),mgr=role==='manager',own=(a,f)=>mgr?(a||[]):(a||[]).filter(x=>x[f]===me);
  return {mgr,me,opps:own(D().opportunities,'owner_id'),quotes:own(D().quotations,'created_by'),acts:own(D().sales_activities,'owner_id'),tasks:own(D().tasks,'assigned_to'),
    meetings:own(D().meetings,'assigned_to'),enq:own(D().enquiries,'assigned_to'),projects:own(D().projects,'owner_id'),
    pos:mgr?(D().purchase_orders||[]):(D().purchase_orders||[]).filter(p=>p.created_by===me),leaves:mgr?(D().leave_requests||[]):(D().leave_requests||[]).filter(l=>l.employee_id===me)};
}
const lastAct=(oid)=>((D().sales_activities||[]).filter(a=>a.opportunity_id===oid).map(a=>d10(a.activity_at)).sort().pop())||null;
function atRisk(opps){const t=T0(),cut=ISO(new Date(Date.now()-30*864e5));
  return opps.filter(isOpen).map(o=>{const f=[],la=lastAct(o.id);if(o.next_followup&&d10(o.next_followup)<t)f.push('follow-up overdue');if(o.expected_close&&d10(o.expected_close)<t)f.push('past close date');if((!la||la<cut)&&d10(o.created_at)<cut)f.push('no activity in 30 days');return {o,f,val:omr(o)}}).filter(x=>x.f.length).sort((a,b)=>b.f.length-a.f.length||b.val-a.val)}
function findCustomer(q,sc){
  const nq=' '+norm(q)+' ',names=new Set([...(D().contacts||[]).filter(c=>c.type!=='Supplier').map(c=>c.company),...sc.opps.map(o=>o.customer)]);let best=null;
  for(const n of names){const nn=norm(n);if(!nn)continue;if(nq.includes(' '+nn+' ')){if(!best||nn.length>norm(best).length)best=n}}
  if(!best)for(const n of names){const w=norm(n).split(' ');if(w.length>=2&&w[0].length>2&&nq.includes(' '+w[0]+' '+w[1]+' ')){best=n;break}}
  if(!best)for(const n of names){const w=norm(n).split(' ');if(w[0].length>=5&&w[0]!=='counter'&&nq.includes(' '+w[0]+' ')){best=n;break}}
  return best;
}
const tbl=(cols,rows)=>({cols,rows});
const c=(k,label,t='text')=>({k,label,t});

/* ─────────── MANAGEMENT answers ─────────── */
const M={};
M.brief=()=>{
  const sc=scope('manager'),t=T0(),mk=t.slice(0,7),open=sc.opps.filter(isOpen),won=sc.opps.filter(o=>o.stage==='Closed Won'&&closeDate(o).slice(0,7)===mk);
  const tgt=sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.period===mk),x=>x.target_value),risk=atRisk(sc.opps);
  const exp=sc.quotes.filter(q=>['Sent','Under Negotiation','Approved'].includes(q.status)&&q.valid_until&&d10(q.valid_until)>=t&&d10(q.valid_until)<=ISO(new Date(Date.now()+7*864e5)));
  const poW=sc.pos.filter(p=>p.status==='Submitted'),noAppr=sc.quotes.filter(q=>['Sent','Under Negotiation','Accepted'].includes(q.status)&&!q.approved_by&&Math.max(0,...(q.line_items||[]).map(l=>num(l.discount_percent)))>5);
  const overdue=open.filter(o=>o.next_followup&&d10(o.next_followup)<t).length;
  const b=[`**Sales this month:** ${om(sum(won,wonOmr))} won from ${won.length} deal${won.length===1?'':'s'}`+(tgt?` — ${Math.round(sum(won,wonOmr)/tgt*100)}% of the ${om(tgt)} team target.`:'.'),
    `**Pipeline:** ${om(sum(open,omr))} across ${open.length} open deals; weighted forecast ${om(sum(open,wOmr))}.`,
    `**At risk:** ${risk.length} deal${risk.length===1?'':'s'} worth ${om(sum(risk,x=>x.val))} show a warning sign (overdue follow-up, past close date or 30 days without activity).`,
    `**Quotations:** ${exp.length} expiring within 7 days; ${noAppr.length} sent with a discount above 5% and no approval recorded.`,
    `**Purchasing:** ${poW.length} purchase order${poW.length===1?'':'s'} awaiting approval${poW.length?' ('+cn(sum(poW,p=>p.total))+' in order currency)':''}.`];
  if(ow.access(['hr']))b.push(`**People:** ${sc.leaves.filter(l=>l.status==='Pending').length} leave request(s) waiting for HR.`);
  const tips=[];if(noAppr.length)tips.push(`review the ${noAppr.length} discounted quotation(s) sent without approval`);if(risk.length)tips.push(`ask owners to update the ${risk.length} at-risk deals`);if(poW.length)tips.push(`approve or query the ${poW.length} pending PO(s)`);
  return {title:'Executive briefing',text:`Here is where the business stands on ${ow.date(t)}.`,bullets:b,text2:tips.length?`**Suggested focus:** ${tips.join('; ')}.`:'Nothing urgent stands out today.',
    actions:[{label:'Open executive pack',action:'ai-report',value:'exec-summary'},{label:'At-risk deals',action:'ai-report',value:'stalled-deals'},{label:'Weekly review',action:'ai-report',value:'weekly-review'}]};
};
M.approvals=()=>{
  const sc=scope('manager'),rows=[];
  sc.pos.filter(p=>p.status==='Submitted').forEach(p=>rows.push({type:'Purchase order',ref:p.po_no,det:p.vendor,amt:p.currency+' '+Math.round(num(p.total)).toLocaleString('en-US'),age:dayDiff(p.order_date,T0())}));
  sc.quotes.filter(q=>q.status==='Pending Approval').forEach(q=>rows.push({type:'Quotation',ref:q.quote_no,det:q.customer,amt:om(q.total),age:dayDiff(q.created_at,T0())}));
  sc.leaves.filter(l=>l.status==='Pending'&&ow.access(['hr'])).forEach(l=>rows.push({type:'Leave',ref:l.leave_type,det:who(l.employee_id)+' · '+ow.date(l.start_date),amt:'—',age:dayDiff(l.created_at,T0())}));
  return {title:'Waiting for a decision',text:rows.length?`${rows.length} item${rows.length===1?' is':'s are'} waiting. I cannot approve anything for you; use the buttons to open the right screen.`:'No approvals are waiting.',table:rows.length?tbl([c('type','Type','badge'),c('ref','Reference'),c('det','Detail'),c('amt','Amount'),c('age','Waiting','days')],rows.sort((a,b)=>b.age-a.age)):null,
    actions:[{label:'Purchase orders',action:'ai-nav',value:'purchases'},{label:'Quotations',action:'ai-nav',value:'quotations'},...(ow.access(['hr'])?[{label:'Leave requests',action:'ai-nav',value:'leaves'}]:[])]};
};
M.risk=()=>{const r=atRisk(scope('manager').opps);return {title:'Deals at risk',text:r.length?`${r.length} open deals worth **${om(sum(r,x=>x.val))}** need attention. The most serious are listed first.`:'No open deals show a warning sign.',
  table:r.length?tbl([c('t','Opportunity'),c('cu','Customer'),c('ow','Owner'),c('v','Value','omr'),c('w','Warning')],r.slice(0,8).map(x=>({t:x.o.title,cu:x.o.customer,ow:who(x.o.owner_id),v:x.val,w:x.f.join(', ')}))):null,
  actions:[{label:'Full at-risk report',action:'ai-report',value:'stalled-deals'},{label:'Overdue follow-ups',action:'ai-report',value:'followup-overdue'}]}};
M.team=()=>{
  const sc=scope('manager'),t=T0(),mk=t.slice(0,7),cut=ISO(new Date(Date.now()-30*864e5));
  const rows=(D().profiles||[]).filter(p=>p.department==='sales'&&p.active!==false).map(p=>{const m=sc.opps.filter(o=>o.owner_id===p.id),won=sum(m.filter(o=>o.stage==='Closed Won'&&closeDate(o).slice(0,7)===mk),wonOmr),
    tg=sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.target_name===p.full_name&&x.period===mk),x=>x.target_value);
    return {n:p.full_name,won,tg,att:pc(won,tg),pipe:sum(m.filter(isOpen),omr),od:m.filter(o=>isOpen(o)&&o.next_followup&&d10(o.next_followup)<t).length,acts:sc.acts.filter(a=>a.owner_id===p.id&&d10(a.activity_at)>=cut).length}}).sort((a,b)=>(b.att??-1)-(a.att??-1));
  const withT=rows.filter(r=>r.att!=null),low=withT[withT.length-1],top=withT[0];
  return {title:'Team performance this month',text:withT.length?`**${top.n.split(' – ')[0]}** leads at ${fp(top.att)} of target; **${low.n.split(' – ')[0]}** is furthest behind at ${fp(low.att)}.`:'No monthly targets are set, so I cannot measure attainment.',
    table:tbl([c('n','Salesperson'),c('won','Won (month)','omr'),c('tg','Target','omr'),c('att','Attainment','pct'),c('pipe','Open pipeline','omr'),c('od','Overdue','num'),c('acts','Activities (30d)','num')],rows),
    actions:[{label:'Scorecard report',action:'ai-report',value:'sales-performance'},{label:'Targets report',action:'ai-report',value:'target-vs-actual'}]};
};
M.forecast=()=>{
  const sc=scope('manager'),open=sc.opps.filter(isOpen),t=T0(),rows=[];
  for(let i=0;i<3;i++){const d=new Date();const k=ISO(new Date(d.getFullYear(),d.getMonth()+i,1)).slice(0,7),a=open.filter(o=>d10(o.expected_close).slice(0,7)===k&&d10(o.expected_close)>=t);rows.push({m:new Date(k+'-15T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}),n:a.length,v:sum(a,omr),w:sum(a,wOmr)})}
  const past=open.filter(o=>!o.expected_close||d10(o.expected_close)<t);
  return {title:'Forecast: next three months',text:`Weighted forecast for the next three months is **${om(sum(rows,r=>r.w))}** on ${om(sum(rows,r=>r.v))} of pipeline.`+(past.length?` Another ${past.length} deal${past.length===1?'':'s'} (${om(sum(past,omr))}) ${past.length===1?'has':'have'} a close date that has already passed and ${past.length===1?'is':'are'} not counted.`:''),
    table:tbl([c('m','Month'),c('n','Deals','num'),c('v','Pipeline','omr'),c('w','Weighted','omr')],rows),actions:[{label:'Forecast report',action:'ai-report',value:'forecast-month'}]};
};
M.winloss=()=>{
  const sc=scope('manager'),cut=ISO(new Date(Date.now()-90*864e5)),cl=sc.opps.filter(o=>!isOpen(o)&&closeDate(o)>=cut),won=cl.filter(o=>o.stage==='Closed Won'),lost=cl.filter(o=>o.stage==='Closed Lost');
  const rs=[...group(lost,o=>o.lost_reason||'Not given')].map(([r,a])=>({r,n:a.length,v:sum(a,omr)})).sort((a,b)=>b.n-a.n).slice(0,5);
  const comp=[...group(lost.filter(o=>o.competitor),o=>o.competitor)].map(([k,a])=>[k,a.length]).sort((a,b)=>b[1]-a[1])[0];
  return {title:'Win / loss, last 90 days',kpis:[['Win rate (deals)',fp(pc(won.length,cl.length))],['Won value',om(sum(won,wonOmr))],['Lost value',om(sum(lost,omr))]],
    text:rs.length?`The most common reason for losing is **${rs[0].r.toLowerCase()}** (${rs[0].n} of ${lost.length} lost deals).`+(comp?` The competitor named most often on lost deals is **${comp[0]}**.`:''):'No lost deals in this period.',
    table:rs.length?tbl([c('r','Lost reason'),c('n','Deals','num'),c('v','Value','omr')],rs):null,actions:[{label:'Win / loss report',action:'ai-report',value:'win-loss'},{label:'Competitors',action:'ai-report',value:'competitor-intel'}]};
};
M.pipeline=()=>{
  const sc=scope('manager'),open=sc.opps.filter(isOpen),by=['Project','Trade','Counter','Application'].map(ch=>{const a=open.filter(o=>o.channel===ch);return {ch,n:a.length,v:sum(a,omr),w:sum(a,wOmr)}});
  const top=open.slice().sort((a,b)=>omr(b)-omr(a)).slice(0,5);
  return {title:'Open pipeline',kpis:[['Open deals',cn(open.length)],['Pipeline',om(sum(open,omr))],['Weighted',om(sum(open,wOmr))]],table:tbl([c('ch','Channel','badge'),c('n','Deals','num'),c('v','Pipeline','omr'),c('w','Weighted','omr')],by),
    text:`The five largest open deals are ${top.map(o=>`${o.customer} (${om(omr(o))})`).join(', ')}.`,actions:[{label:'Pipeline by stage',action:'ai-report',value:'pipeline-stage'},{label:'Channel report',action:'ai-report',value:'channel-performance'}]};
};
M.quotes=()=>{
  const sc=scope('manager'),t=T0(),act=sc.quotes.filter(q=>['Pending Approval','Approved','Sent','Under Negotiation'].includes(q.status)),exp=act.filter(q=>q.valid_until&&d10(q.valid_until)>=t&&d10(q.valid_until)<=ISO(new Date(Date.now()+14*864e5))),lapsed=act.filter(q=>q.valid_until&&d10(q.valid_until)<t);
  const hi=sc.quotes.filter(q=>Math.max(0,...(q.line_items||[]).map(l=>num(l.discount_percent)))>5),bad=hi.filter(q=>['Sent','Under Negotiation','Accepted'].includes(q.status)&&!q.approved_by);
  return {title:'Quotations',kpis:[['Open quotations',cn(act.length)],['Expiring in 14 days',cn(exp.length)],['Past validity',cn(lapsed.length)],['Discount >5% w/o approval',cn(bad.length)]],
    text:bad.length?`**${bad.length} quotation(s)** went to customers with a discount above 5% and no recorded approval: ${bad.slice(0,4).map(q=>q.quote_no).join(', ')}.`:'No quotation above the 5% limit was sent without approval.',
    actions:[{label:'Follow-up & expiry',action:'ai-report',value:'quote-followup'},{label:'Discount control',action:'ai-report',value:'quote-discount'}]};
};
M.purchase=()=>{
  const sc=scope('manager'),t=T0(),mk=t.slice(0,7),mo=sc.pos.filter(p=>p.order_date&&d10(p.order_date).slice(0,7)===mk&&!['Draft','Cancelled'].includes(p.status)),open=sc.pos.filter(p=>['Approved','Ordered','Partially Received'].includes(p.status)),late=open.filter(p=>p.delivery_date&&d10(p.delivery_date)<t);
  const cur=[...group(mo,p=>p.currency)].map(([k,a])=>k+' '+Math.round(sum(a,p=>p.total)).toLocaleString('en-US')).join(' · ')||'none yet';
  return {title:'Purchasing',kpis:[['Awaiting approval',cn(sc.pos.filter(p=>p.status==='Submitted').length)],['Open commitments',cn(open.length)],['Late deliveries',cn(late.length)]],text:`Spend this month (by currency): **${cur}**. Currencies are never added together.`+(late.length?` ${late.length} order(s) are past their delivery date: ${late.slice(0,3).map(p=>p.po_no+' ('+p.vendor+')').join(', ')}.`:''),
    actions:[{label:'Spend analysis',action:'ai-report',value:'purchase-spend'},{label:'PO status',action:'ai-report',value:'po-status'}]};
};
M.customers=()=>{
  const sc=scope('manager'),won=sc.opps.filter(o=>o.stage==='Closed Won'&&closeDate(o).startsWith(String(new Date().getFullYear()))),tot=sum(won,wonOmr);
  const rows=[...group(won,o=>o.customer)].map(([n,a])=>({n,v:sum(a,wonOmr),d:a.length,sh:pc(sum(a,wonOmr),tot)})).sort((a,b)=>b.v-a.v).slice(0,6);const top5=sum(rows.slice(0,5),r=>r.v);
  return {title:'Top customers this year',text:`The top five customers account for **${fp(pc(top5,tot))}** of won value (${om(tot)} in total).`+(pc(top5,tot)>60?' That is a concentration risk worth a retention plan.':''),
    table:tbl([c('n','Customer'),c('v','Won value','omr'),c('d','Deals','num'),c('sh','Share','pct')],rows),actions:[{label:'Customer league table',action:'ai-report',value:'top-customers'}]};
};
M.hr=()=>{
  if(!ow.access(['hr']))return {title:'People',text:'Your account does not have access to HR records, so I cannot report on headcount or leave.'};
  const sc=scope('manager'),pend=sc.leaves.filter(l=>l.status==='Pending');
  return {title:'People',kpis:[['Headcount',cn((D().employees||[]).length)],['Leave pending',cn(pend.length)],['On leave now',cn((D().employees||[]).filter(e=>e.employment_status==='On Leave').length)]],
    table:pend.length?tbl([c('e','Employee'),c('t','Type'),c('f','From','date'),c('to','To','date')],pend.map(l=>({e:who(l.employee_id),t:l.leave_type,f:l.start_date,to:l.end_date}))):null,actions:[{label:'Leave requests',action:'ai-nav',value:'leaves'},{label:'Headcount report',action:'ai-report',value:'hr-headcount'}]};
};
M.overdue=()=>{
  const sc=scope('manager'),t=T0(),rows=[];
  sc.opps.filter(isOpen).forEach(o=>{if(o.next_followup&&d10(o.next_followup)<t)rows.push({t:'Deal',i:o.title+' · '+o.customer,o:who(o.owner_id),late:dayDiff(o.next_followup,t)})});
  sc.tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)&&x.due_date&&d10(x.due_date)<t).forEach(x=>rows.push({t:'Task',i:x.title,o:who(x.assigned_to),late:dayDiff(x.due_date,t)}));
  rows.sort((a,b)=>b.late-a.late);
  return {title:'Overdue follow-ups',text:rows.length?`${rows.length} items are past due; the oldest is ${rows[0].late} days late.`:'Nothing is overdue.',table:rows.length?tbl([c('t','Type','badge'),c('i','Item'),c('o','Owner'),c('late','Days late','days')],rows.slice(0,8)):null,actions:[{label:'Overdue report',action:'ai-report',value:'followup-overdue'}]};
};
M.help=()=>({fallback:true,title:'I can help with company-wide questions',text:'I read your CRM data and answer in plain language. Try one of these:',bullets:['**Briefing:** “Give me today’s executive briefing”','**Approvals:** “What needs my approval?”','**Risk:** “Which deals are at risk?”','**Team:** “How is the team doing against target?”','**Forecast, win/loss, quotations, purchasing, top customers, leave**'],prompts:true});
const MGR_INTENTS=[[/approv|sign.?off|waiting for (me|my)|decision/,M.approvals],[/brief|summary|summar|overview|how (are|is) (we|the business)|status|update me|morning|state of/,M.brief],[/risk|stall|stuck|attention|problem|worr|slipp|danger/,M.risk],
  [/team|salesperson|sales ?people|perform|scorecard|leaderboard|behind|\btargets?\b|\bquota\b|\breps?\b/,M.team],[/forecast|next (month|quarter|3)|expect|project(ion|ed)|weighted/,M.forecast],[/win rate|conversion|lost|lose|losing|compet/,M.winloss],
  [/quot|discount/,M.quotes],[/purchas|\bpos?\b|supplier|vendor|spend|procure/,M.purchase],[/top customer|customers|client|account|concentration/,M.customers],[/leave|headcount|employee|\bhr\b|absen|staff/,M.hr],[/overdue|late|follow.?up/,M.overdue],[/pipeline|open deals|channel|funnel|stage/,M.pipeline]];

/* ─────────── EMPLOYEE answers ─────────── */
const E={};
const myMonthTarget=()=>sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.target_name===meFull()&&x.period===T0().slice(0,7)),x=>x.target_value);
const myMonthVisitTarget=()=>sum((D().sales_targets||[]).filter(x=>x.target_type==='Salesperson'&&x.target_name===meFull()&&x.period===T0().slice(0,7)),x=>x.target_visits);
E.plan=()=>{
  const sc=scope('employee'),t=T0(),tom=ISO(new Date(Date.now()+864e5)),items=[];
  sc.opps.filter(isOpen).forEach(o=>{if(o.next_followup&&d10(o.next_followup)<t)items.push({p:1,t:'Overdue',i:o.title+' · '+o.customer,w:dayDiff(o.next_followup,t)+' days late',v:omr(o),s:o.next_step});else if(o.next_followup&&d10(o.next_followup)===t)items.push({p:2,t:'Due today',i:o.title+' · '+o.customer,w:'Today',v:omr(o),s:o.next_step})});
  sc.quotes.filter(q=>['Sent','Under Negotiation','Approved'].includes(q.status)&&q.valid_until&&d10(q.valid_until)>=t&&d10(q.valid_until)<=ISO(new Date(Date.now()+7*864e5))).forEach(q=>items.push({p:2,t:'Quote expiring',i:q.quote_no+' · '+q.customer,w:'Expires '+ow.date(q.valid_until),v:q.total,s:'Chase the customer'}));
  sc.meetings.filter(m=>m.status==='Scheduled'&&d10(m.starts_at)>=t&&d10(m.starts_at)<=tom).forEach(m=>items.push({p:2,t:'Meeting',i:m.title,w:ow.datetime(m.starts_at),v:null,s:m.company||m.location||''}));
  sc.tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)&&x.due_date&&d10(x.due_date)<=t).forEach(x=>items.push({p:d10(x.due_date)<t?1:2,t:d10(x.due_date)<t?'Task overdue':'Task today',i:x.title,w:ow.date(x.due_date),v:null,s:x.priority}));
  items.sort((a,b)=>a.p-b.p||num(b.v)-num(a.v));
  const first=items[0];
  return {title:`Your plan for today, ${meFirst()}`,text:items.length?`You have **${items.length} item${items.length===1?'':'s'}** needing action. ${first?`I would start with **${first.i}** (${first.t.toLowerCase()}${first.v?', '+om(first.v):''}) because it is the highest-priority item on your list.`:''}`:'Nothing is overdue or due today. A good use of the time: log yesterday’s visits and book follow-ups for your largest open deals.',
    table:items.length?tbl([c('t','Priority','badge'),c('i','What'),c('w','When'),c('v','Value','omr'),c('s','Next step')],items.slice(0,10)):null,actions:[{label:'My follow-ups',action:'ai-nav',value:'tasks'},{label:'Log an activity',action:'ai-new',value:'activity'}]};
};
E.deals=()=>{
  const sc=scope('employee'),open=sc.opps.filter(isOpen).sort((a,b)=>omr(b)-omr(a));
  return {title:'Your open deals',kpis:[['Open deals',cn(open.length)],['Pipeline',om(sum(open,omr))],['Weighted',om(sum(open,wOmr))]],
    table:open.length?tbl([c('t','Opportunity'),c('cu','Customer'),c('st','Stage','badge'),c('v','Value','omr'),c('p','Prob.','pct'),c('f','Next follow-up','date')],open.slice(0,8).map(o=>({t:o.title,cu:o.customer,st:o.stage,v:omr(o),p:num(o.probability),f:o.next_followup}))):null,
    text:open.length?'':'You have no open opportunities. Create one from a new enquiry or after a visit.',actions:[{label:'Open opportunities',action:'ai-nav',value:'opportunities'},{label:'New opportunity',action:'ai-new',value:'opportunity'}]};
};
E.target=()=>{
  const sc=scope('employee'),mk=T0().slice(0,7),won=sum(sc.opps.filter(o=>o.stage==='Closed Won'&&closeDate(o).slice(0,7)===mk),wonOmr),tg=myMonthTarget(),vt=myMonthVisitTarget(),
    vis=sc.acts.filter(a=>d10(a.activity_at).slice(0,7)===mk&&['Site Visit','Trader Shop Visit'].includes(a.activity_type)).length,
    wk=sum(sc.opps.filter(o=>isOpen(o)&&d10(o.expected_close).slice(0,7)===mk&&d10(o.expected_close)>=T0()),wOmr);
  if(!tg)return {title:'Your target',text:`No sales target is set for you this month. You have won ${om(won)} so far. Ask your sales manager to set one under Targets.`};
  const gap=Math.max(0,tg-won);
  return {title:'How you are doing this month',kpis:[['Won so far',om(won)],['Target',om(tg)],['Attainment',fp(pc(won,tg))],['Visits',`${vis}${vt?' / '+vt:''}`]],
    text:gap?`You need **${om(gap)}** more to reach target. Your open deals expected to close this month are worth about **${om(wk)}** weighted${wk>=gap?', which would cover the gap if they land.':', which is not enough on its own, so you may need to bring more deals forward.'}`:'You have reached your target this month. Well done.',
    actions:[{label:'My open deals',action:'ai-ask',value:'Show my open deals'}]};
};
E.overdue=()=>{
  const sc=scope('employee'),t=T0(),rows=[];
  sc.opps.filter(isOpen).forEach(o=>{if(o.next_followup&&d10(o.next_followup)<t)rows.push({t:'Deal',i:o.title+' · '+o.customer,d:o.next_followup,late:dayDiff(o.next_followup,t),s:o.next_step})});
  sc.tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)&&x.due_date&&d10(x.due_date)<t).forEach(x=>rows.push({t:'Task',i:x.title,d:x.due_date,late:dayDiff(x.due_date,t),s:x.priority}));
  rows.sort((a,b)=>b.late-a.late);
  return {title:'Your overdue follow-ups',text:rows.length?`${rows.length} item${rows.length===1?' is':'s are'} overdue. Clearing the oldest first keeps customers from going cold.`:'You have nothing overdue. Nice work.',table:rows.length?tbl([c('t','Type','badge'),c('i','What'),c('d','Due','date'),c('late','Late','days'),c('s','Next step')],rows.slice(0,10)):null,actions:[{label:'Open follow-ups',action:'ai-nav',value:'tasks'}]};
};
E.quotes=()=>{
  const sc=scope('employee'),t=T0(),act=sc.quotes.filter(q=>['Draft','Pending Approval','Approved','Sent','Under Negotiation'].includes(q.status));
  return {title:'Your quotations',kpis:[['Open',cn(act.length)],['Awaiting customer',cn(act.filter(q=>['Sent','Under Negotiation'].includes(q.status)).length)],['Drafts',cn(act.filter(q=>q.status==='Draft').length)]],
    table:act.length?tbl([c('n','Quotation'),c('cu','Customer'),c('s','Status','badge'),c('v','Valid until','date'),c('tt','Total','omr')],act.sort((a,b)=>d10(a.valid_until).localeCompare(d10(b.valid_until))).slice(0,8).map(q=>({n:q.quote_no,cu:q.customer,s:q.status,v:q.valid_until,tt:q.total}))):null,
    text:act.length?'Quotations closest to expiry are listed first. Discounts above 5% need manager approval before sending.':'You have no open quotations.',actions:[{label:'Quotations',action:'ai-nav',value:'quotations'},{label:'Prepare quotation',action:'ai-new',value:'quote'}]};
};
E.meetings=()=>{
  const sc=scope('employee'),t=T0(),end=ISO(new Date(Date.now()+7*864e5)),ms=sc.meetings.filter(m=>m.status==='Scheduled'&&d10(m.starts_at)>=t&&d10(m.starts_at)<=end).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  return {title:'Your meetings, next 7 days',text:ms.length?'':'You have no meetings scheduled this week.',table:ms.length?tbl([c('w','When'),c('t','Meeting'),c('co','Company'),c('l','Location')],ms.map(m=>({w:ow.datetime(m.starts_at),t:m.title,co:m.company||'Internal',l:m.location}))):null,actions:[{label:'Schedule a meeting',action:'ai-new',value:'meeting'},{label:'Calendar',action:'ai-nav',value:'meetings'}]};
};
E.tasks=()=>{const sc=scope('employee'),a=sc.tasks.filter(x=>!['Completed','Cancelled'].includes(x.status)).sort((x,y)=>d10(x.due_date).localeCompare(d10(y.due_date)));
  return {title:'Your open tasks',text:a.length?'':'No open tasks.',table:a.length?tbl([c('t','Task'),c('d','Due','date'),c('p','Priority','badge'),c('s','Status','badge')],a.slice(0,10).map(x=>({t:x.title,d:x.due_date,p:x.priority,s:x.status}))):null,actions:[{label:'New follow-up',action:'ai-new',value:'task'}]}};
E.leave=()=>{const sc=scope('employee');return {title:'Your leave',text:sc.leaves.length?'':'You have no leave requests on record.',table:sc.leaves.length?tbl([c('t','Type'),c('f','From','date'),c('to','To','date'),c('s','Status','badge')],sc.leaves.slice(0,8).map(l=>({t:l.leave_type,f:l.start_date,to:l.end_date,s:l.status}))):null,actions:[{label:'Request leave',action:'ai-new',value:'leave'}]}};
E.customer=(name)=>{
  const sc=scope('employee'),co=(D().contacts||[]).find(x=>x.company===name)||{},opps=sc.opps.filter(o=>o.customer===name),open=opps.filter(isOpen),won=opps.filter(o=>o.stage==='Closed Won');
  const qs=sc.quotes.filter(q=>q.customer===name&&['Sent','Under Negotiation','Approved','Pending Approval','Draft'].includes(q.status)),acts=sc.acts.filter(a=>a.customer===name).sort((a,b)=>d10(b.activity_at).localeCompare(d10(a.activity_at)));
  const since=acts[0]?dayDiff(acts[0].activity_at,T0()):null,tips=[];
  if(since==null)tips.push('You have not logged any contact with this customer. Book an introduction call.');else if(since>21)tips.push(`It has been ${since} days since your last contact; schedule a call or visit.`);
  qs.filter(q=>q.status==='Sent'&&dayDiff(q.created_at,T0())>7).forEach(q=>tips.push(`Quotation ${q.quote_no} was sent ${dayDiff(q.created_at,T0())} days ago; chase a decision.`));
  if(!open.length)tips.push('There is no open opportunity; ask about upcoming needs.');
  return {title:name,kpis:[['Open pipeline',om(sum(open,omr))],['Won to date',om(sum(won,wonOmr))],['Open quotes',cn(qs.length)],['Last contact',since==null?'None':since+' days ago']],
    bullets:[`**Contact:** ${co.contact_person||'—'}${co.phone?' · '+co.phone:''}${co.email?' · '+co.email:''}`,`**Channel:** ${co.sales_channel||'—'}${co.pricing_tier?' · '+co.pricing_tier:''}`,...open.slice(0,3).map(o=>`**Open deal:** ${o.title} — ${om(omr(o))}, ${o.stage}. Next step: ${o.next_step||'none set'}.`),...tips.map(x=>`**Suggestion:** ${x}`)],
    actions:[{label:'Draft follow-up email',action:'ai-ask',value:'Draft a follow-up email to '+name},{label:'Draft WhatsApp message',action:'ai-ask',value:'Draft a WhatsApp message to '+name},{label:'Log an activity',action:'ai-new',value:'activity'}]};
};
function draft(q,sc){
  const name=findCustomer(q,sc),wa=has(q.toLowerCase(),/whatsapp|\bwa\b|text message|sms/),kind=has(q.toLowerCase(),/quot|offer|proposal/)?'quote':has(q.toLowerCase(),/visit|met\b|meeting|thank/)?'thanks':has(q.toLowerCase(),/intro|introduc|first contact|new customer/)?'intro':has(q.toLowerCase(),/payment|invoice|outstanding|due amount/)?'payment':'followup';
  if(!name){const mine=[...new Set(sc.opps.filter(isOpen).map(o=>o.customer))].slice(0,4);return {title:'Which customer?',text:'Tell me who the message is for, for example “Draft a follow-up email to '+(mine[0]||'Customer name')+'”.',actions:mine.map(n=>({label:n,action:'ai-ask',value:(wa?'Draft a WhatsApp message to ':'Draft a follow-up email to ')+n}))}}
  const co=(D().contacts||[]).find(x=>x.company===name)||{},open=sc.opps.filter(o=>o.customer===name&&isOpen(o)).sort((a,b)=>omr(b)-omr(a)),quote=sc.quotes.filter(x=>x.customer===name&&['Sent','Under Negotiation','Approved'].includes(x.status)).sort((a,b)=>d10(b.created_at).localeCompare(d10(a.created_at)))[0];
  const greet='Dear '+(co.contact_person||'Sir/Madam')+',',sign=meFirst()+(meTitle()?'\n'+meTitle():'')+'\nAAARON Commercial Services LLC',proj=open[0]?open[0].title:'your requirement';
  let subj,body;
  if(kind==='quote'&&quote){subj=`Quotation ${quote.quote_no} – follow-up`;body=`${greet}\n\nI hope you are well. I am following up on our quotation ${quote.quote_no} for ${proj}, valid until ${ow.date(quote.valid_until)}.\n\nPlease let me know if you would like any clarification on the items, pricing or delivery. I would be happy to arrange a call or visit to go through it together.\n\nKind regards,\n${sign}`}
  else if(kind==='thanks'){subj='Thank you for your time';body=`${greet}\n\nThank you for meeting with me. It was helpful to understand your requirements for ${proj}.\n\nAs discussed, I will send the technical data sheets and the proposed system. Please let me know if there is anything else you would like me to include.\n\nKind regards,\n${sign}`}
  else if(kind==='intro'){subj='Introduction – AAARON Commercial Services LLC';body=`${greet}\n\nI am ${meFirst()} from AAARON Commercial Services LLC. We supply construction chemicals, waterproofing, coatings and related products, with technical support and application services.\n\nI would welcome the chance to learn about your upcoming projects and show how we can help. Would you be available for a short call this week?\n\nKind regards,\n${sign}`}
  else if(kind==='payment'){subj='Payment reminder';body=`${greet}\n\nThis is a friendly reminder regarding the outstanding payment on your account. Kindly confirm the expected payment date, or let me know if you need a copy of the invoice or statement.\n\nThank you for your cooperation.\n\nKind regards,\n${sign}`}
  else{subj='Following up'+(open[0]?' – '+proj:'');body=`${greet}\n\nI hope you are well. I wanted to follow up on ${proj}${open[0]&&open[0].next_step?' ('+open[0].next_step.toLowerCase()+')':''}.\n\nPlease let me know if you need anything further from us, or if a short call would be easier.\n\nKind regards,\n${sign}`}
  if(wa)body=body.replace(/^Dear [^\n]*\n\n/,'Hello '+(co.contact_person||'')+',\n\n').replace(/\n\nKind regards,[\s\S]*$/,'\n\n'+meFirst()+', AAARON Commercial Services');
  const id='d'+(++AI.seq);AI.drafts[id]={channel:wa?'WhatsApp':'Email',to:co.email||'',phone:co.phone||'',subject:subj,body};
  return {title:`Draft ${wa?'WhatsApp message':'email'} for ${name}`,draftId:id,text:'Review and edit before sending. I only write the text; nothing is sent from here.'};
}
const FAQ=[
 [/quot/,'Create a quotation',['Open **Quotations** and press **Prepare quotation**.','Choose the customer and the linked opportunity.','Add each item with quantity, unit price and discount. Discounts above 5% must be approved by a manager before sending.','Save as **Draft**, then **Submit** if approval is needed, or **Mark sent**.','Use **Print** to produce the PDF with the AAARON letterhead.'],[{label:'Prepare quotation',action:'ai-new',value:'quote'}]],
 [/close|won|lost|lose|win/,'Close a deal as won or lost',['Open **Opportunities** and edit the deal.','Set the stage to **Closed Won** or **Closed Lost**.','A lost deal needs a **lost reason**; add the competitor and their price if you know it.','Save. The close date and value are recorded for reports.'],[{label:'Open opportunities',action:'ai-nav',value:'opportunities'}]],
 [/opportun|deal|lead|enquir/,'Add an opportunity',['Open **Opportunities** and press **New opportunity**.','Choose the channel (Project, Trade, Counter or Application) and the stage.','Enter value, probability and expected close date.','A **next step** and **next follow-up date** are mandatory.'],[{label:'New opportunity',action:'ai-new',value:'opportunity'}]],
 [/log|visit|call|activity|activities|whatsapp|gps/,'Log a visit, call or message',['Open **Visits & activities** and press **Log activity**.','Pick the type, customer and outcome.','Add the next step and follow-up date.','For site visits, press **Use current GPS position** to capture the location.'],[{label:'Log an activity',action:'ai-new',value:'activity'}]],
 [/customer|contact|add (a )?client/,'Add a customer',['Open **Customers & traders** and press **Add customer / supplier**.','Fill in the company, contact person, phone and email.','Choose the sales channel and, for traders, the category and price tier.'],[{label:'Customers',action:'ai-nav',value:'contacts'}]],
 [/meeting|calendar/,'Schedule a meeting',['Open **Meetings** and press **Schedule meeting**.','Set date, time, company and location.','Use **Download calendar file** to add meetings to Outlook or Google Calendar.'],[{label:'Schedule a meeting',action:'ai-new',value:'meeting'}]],
 [/task|follow.?up|remind/,'Create a follow-up task',['Open **Follow-ups & tasks** and press **New task**.','Set the due date, priority and who it is assigned to.'],[{label:'New follow-up',action:'ai-new',value:'task'}]],
 [/report|print|pdf|export|csv|excel/,'Print or export a report',['Open **Report centre** and choose a report.','Set the period and filters.','Press **Print / save PDF** (choose “Save as PDF”), or **Export CSV** for Excel.'],[{label:'Report centre',action:'ai-nav',value:'reports'}]],
 [/leave|holiday|vacation/,'Request leave',['Open **Leave requests** and press **Request leave**.','Choose the type and dates. HR will approve or reject it.'],[{label:'Request leave',action:'ai-new',value:'leave'}]],
 [/purchase|\bpo\b|supplier order/,'Create a purchase order',['Open **Purchase orders** (Purchase team) and press **Create purchase order**.','Add the supplier, brand and each line.','The order starts as **Draft**; submit it for approval.'],[{label:'Purchase orders',action:'ai-nav',value:'purchases'}]],
 [/tds|sds|datasheet|data sheet|document|upload|catalogue/,'Find or upload a technical document',['Open **TDS library**.','Filter by brand and search for the product.','Press **Open file**. Upload new documents with **Upload document**.'],[{label:'TDS library',action:'ai-nav',value:'documents'}]],
 [/password|login|sign in|account/,'Sign-in help',['Use **Forgot password?** on the sign-in screen to receive a reset link.','If your account is disabled, ask your administrator to activate it under Team & permissions.'],[]]
];
E.help=(q)=>{
  const hit=FAQ.find(f=>f[0].test(q));
  if(hit)return {title:hit[1],bullets:hit[2],actions:hit[3]};
  return {fallback:true,title:'How can I help?',text:'I can guide you through the CRM. Pick a topic:',actions:FAQ.slice(0,8).map(f=>({label:f[1],action:'ai-ask',value:'How do I '+f[1].toLowerCase()+'?'}))};
};
E.fallback=()=>({fallback:true,title:'I can help with your own work',text:'I look at your deals, quotations, meetings, tasks and targets, draft messages and explain how to use the CRM. Try:',prompts:true});

/* ─────────── intent routing ─────────── */
function answer(role,q){
  const sc=scope(role),n=q.toLowerCase();
  if(role==='manager'){const cust=findCustomer(q,sc);
    if(cust&&!has(n,/draft|write/)){return custMgr(cust,sc)}
    for(const [re,fn] of MGR_INTENTS)if(re.test(n))return fn();
    return M.help();}
  if(has(n,/draft|write|compose|reply to|email to|whatsapp|message to|remind/))return draft(q,sc);
  const cust=findCustomer(q,sc);if(cust)return E.customer(cust);
  if(has(n,/\bhow (do|can|to|should)|where (do|can|is)|steps|guide|help me (create|add|log|close|print)|what is the process/))return E.help(n);
  if(has(n,/today|plan|priorit|first|what should|start with|focus|agenda|my day|morning/))return E.plan();
  if(has(n,/\btargets?\b|how am i|performance|\bquota\b|attain/))return E.target();
  if(has(n,/overdue|late|chase|follow.?up/))return E.overdue();
  if(has(n,/quot/))return E.quotes();
  if(has(n,/deal|pipeline|opportun|open/))return E.deals();
  if(has(n,/meeting|calendar|schedule|visit/))return E.meetings();
  if(has(n,/task|to.?do/))return E.tasks();
  if(has(n,/leave|holiday/))return E.leave();
  if(FAQ.some(f=>f[0].test(n)))return E.help(n);
  return E.fallback();
}
function custMgr(name,sc){
  const co=(D().contacts||[]).find(x=>x.company===name)||{},opps=sc.opps.filter(o=>o.customer===name),open=opps.filter(isOpen),won=opps.filter(o=>o.stage==='Closed Won'),lost=opps.filter(o=>o.stage==='Closed Lost'),qs=sc.quotes.filter(q=>q.customer===name);
  return {title:name,kpis:[['Open pipeline',om(sum(open,omr))],['Won to date',om(sum(won,wonOmr))],['Lost',om(sum(lost,omr))],['Quotations',cn(qs.length)]],
    bullets:[`**Contact:** ${co.contact_person||'—'}${co.phone?' · '+co.phone:''}`,`**Account owner:** ${who(co.owner_id)}`,...open.slice(0,3).map(o=>`**Open deal:** ${o.title} — ${om(omr(o))}, ${o.stage}, owner ${who(o.owner_id)}.`)],actions:[{label:'Top customers',action:'ai-ask',value:'Who are our top customers?'}]};
}

/* ─────────── optional cloud model ─────────── */
function buildContext(role,q){
  const sc=scope(role),t=T0(),open=sc.opps.filter(isOpen),lite=o=>({ref:o.opportunity_no,title:o.title,customer:o.customer,channel:o.channel,stage:o.stage,valueOMR:Math.round(omr(o)),prob:o.probability,expectedClose:o.expected_close,nextFollowup:o.next_followup,nextStep:o.next_step,owner:who(o.owner_id)});
  const base={asOf:t,currency:'OMR',user:S.profile?.full_name,department:S.profile?.department,role};
  if(role==='manager'){const risk=atRisk(sc.opps);return {...base,kpis:{openDeals:open.length,pipelineOMR:Math.round(sum(open,omr)),weightedOMR:Math.round(sum(open,wOmr)),atRiskDeals:risk.length,atRiskOMR:Math.round(sum(risk,x=>x.val))},
    topOpenDeals:open.sort((a,b)=>omr(b)-omr(a)).slice(0,15).map(lite),atRisk:risk.slice(0,10).map(x=>({...lite(x.o),warnings:x.f})),
    quotes:Object.fromEntries([...group(sc.quotes,q=>q.status)].map(([k,a])=>[k,a.length])),poAwaitingApproval:sc.pos.filter(p=>p.status==='Submitted').length}}
  const cust=findCustomer(q,sc);
  return {...base,myName:meFull(),myOpenDeals:open.sort((a,b)=>omr(b)-omr(a)).slice(0,15).map(lite),myQuotes:sc.quotes.slice(0,10).map(x=>({ref:x.quote_no,customer:x.customer,status:x.status,total:x.total,validUntil:x.valid_until})),
    myMeetings:sc.meetings.filter(m=>d10(m.starts_at)>=t).slice(0,8).map(m=>({title:m.title,when:m.starts_at,company:m.company})),monthTargetOMR:myMonthTarget(),customerFocus:cust?{name:cust,openDeals:open.filter(o=>o.customer===cust).map(lite)}:null};
}
async function askCloud(role,q){
  const {data}=await S.sb.auth.getSession(),token=data?.session?.access_token;if(!token)throw Error('Session expired. Sign in again.');
  const hist=AI.msgs[role].slice(-6).map(m=>m.r==='user'?{role:'user',content:m.t}:{role:'assistant',content:(m.reply&&(m.reply.text||m.reply.title))||''});
  const res=await fetch(CFG.aiEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,apikey:CFG.supabaseAnonKey},body:JSON.stringify({role,question:q,history:hist,context:buildContext(role,q)})});
  if(!res.ok){let m='';try{m=(await res.json()).error}catch{}throw Error(m||('Service returned '+res.status))}
  const j=await res.json();return {title:'',text:j.answer||'No answer returned.',source:'cloud'};
}

/* ─────────── sending & rendering ─────────── */
async function send(text,roleOverride){
  const role=roleOverride||curRole();text=String(text||'').trim();if(!text||AI.busy)return;
  const th=AI.msgs[role];th.push({r:'user',t:text});AI.busy=true;ow.render();toBottom();
  await sleep(320);let reply;
  try{reply=answer(role,text)}catch(e){console.error(e);reply={title:'Something went wrong',text:'I could not work that out: '+e.message}}
  if(reply.fallback&&cloudReady()){try{reply=await askCloud(role,text)}catch(e){reply={...reply,note:'Cloud AI is unavailable ('+e.message+'). Showing the built-in answer.'}}}
  th.push({r:'bot',reply,q:text});AI.busy=false;ow.render();toBottom();
}
const toBottom=()=>setTimeout(()=>{const t=document.querySelector('.ai-thread');if(t)t.scrollTop=t.scrollHeight},40);
const inl=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
function md(t){const lines=String(t||'').split('\n');let out='',ul=false;for(const L of lines){const m=L.match(/^\s*[-*]\s+(.*)/);if(m){if(!ul){out+='<ul>';ul=true}out+='<li>'+inl(m[1])+'</li>'}else{if(ul){out+='</ul>';ul=false}if(L.trim())out+='<p>'+inl(L)+'</p>'}}return out+(ul?'</ul>':'')}
const fcell=(col,r)=>{const v=r[col.k];switch(col.t){case'omr':return v==null?'—':om(v);case'num':return v==null?'—':cn(v);case'pct':return fp(v);case'date':return ow.date(v);case'badge':return badge(v);case'days':return v==null?'—':v+' d';default:return esc(v??'—')}};
const miniTable=t=>`<div class="ai-table table-wrap"><table class="data-table"><thead><tr>${t.cols.map(x=>`<th>${esc(x.label)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${t.cols.map(x=>`<td>${fcell(x,r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const PROMPTS={manager:['Give me today’s executive briefing','What needs my approval?','Which deals are at risk?','How is the team doing against target?','What is the forecast for the next 3 months?','Why are we losing deals?','Which quotations are expiring or above the discount limit?','Who are our top customers?'],
  employee:()=>{const mine=[...new Set(scope('employee').opps.filter(isOpen).map(o=>o.customer))];return ['What should I do first today?','Show my open deals','How am I doing against my target?','What follow-ups are overdue?',...(mine[0]?['Draft a follow-up email to '+mine[0],'Tell me about '+(mine[1]||mine[0])]:[]),'How do I create a quotation?','Show my meetings this week']}};
const promptList=role=>role==='manager'?PROMPTS.manager:PROMPTS.employee();
function replyHTML(r,id){
  let h='';if(r.title)h+=`<h4>${esc(r.title)}</h4>`;
  if(r.kpis)h+=`<div class="ai-kpis">${r.kpis.map(k=>`<div class="ai-kpi"><small>${esc(k[0])}</small><b>${esc(k[1])}</b></div>`).join('')}</div>`;
  if(r.text)h+=md(r.text);
  if(r.bullets)h+='<ul>'+r.bullets.map(b=>`<li>${inl(b)}</li>`).join('')+'</ul>';
  if(r.text2)h+=md(r.text2);
  if(r.table)h+=miniTable(r.table);
  if(r.draftId&&AI.drafts[r.draftId]){const d=AI.drafts[r.draftId];h+=`<div class="ai-draft"><div class="meta">${esc(d.channel)}${d.channel==='Email'&&d.to?' · To: '+esc(d.to):''}${d.phone&&d.channel==='WhatsApp'?' · To: '+esc(d.phone):''}</div>${d.channel==='Email'?`<div class="meta">Subject: ${esc(d.subject)}</div>`:''}<pre>${esc(d.body)}</pre></div><div class="ai-actions">${btn('ai-copy','Copy text','sm',r.draftId)}${d.channel==='Email'?btn('ai-mail','Open in email app','sm',r.draftId):btn('ai-wa','Open WhatsApp','sm',r.draftId)}</div>`}
  if(r.prompts)h+=`<div class="ai-actions">${promptList(curRole()).slice(0,5).map(p=>`<button class="btn sm" data-action="ai-ask" data-value="${esc(p)}">${esc(p)}</button>`).join('')}</div>`;
  if(r.actions&&r.actions.length)h+=`<div class="ai-actions">${r.actions.map(a=>btn(a.action,esc(a.label),'sm','',`data-value="${esc(a.value)}"`)).join('')}</div>`;
  if(r.note)h+=`<div class="ai-src">${esc(r.note)}</div>`;
  h+=`<div class="ai-src">${r.source==='cloud'?'Cloud AI answer · check figures against the reports':'Built-in answer · computed from your CRM data in this browser'}</div>`;
  return h;
}
function welcome(role){
  const mgr=role==='manager';
  return `<h4>${mgr?'Good day. I am your Management AI.':`Hello ${esc(meFirst())}. I am your AI assistant.`}</h4>`+md(mgr?'I can brief you on sales, risks, forecast, team performance, quotations, purchasing and people across the whole company. I read your data; I never change it.':'I can plan your day, check your deals and targets, draft emails and WhatsApp messages, summarise a customer and explain how to use the CRM. I only look at **your own** records and never change anything.')+`<div class="ai-actions">${promptList(role).slice(0,4).map(p=>`<button class="btn sm" data-action="ai-ask" data-value="${esc(p)}">${esc(p)}</button>`).join('')}</div>`;
}
function aiView(role){
  const mgr=role==='manager',th=AI.msgs[role],cloud=cloudReady();
  const msgs=th.map(m=>m.r==='user'?`<div class="ai-msg user"><div class="ai-bubble">${esc(m.t)}</div></div>`:`<div class="ai-msg"><div class="ai-av">AI</div><div class="ai-bubble">${replyHTML(m.reply)}</div></div>`).join('');
  const personas=(D().profiles||[]).filter(p=>['sales','purchase'].includes(p.department)&&p.active!==false);
  return `${ow.layoutHead(mgr?'Management AI Assistant':'AI Assistant',mgr?'Ask about sales, risk, forecast, team performance, quotations, purchasing and people across the company.':'Your personal assistant: plan your day, check your deals, draft messages and learn the CRM.',th.length?btn('ai-clear',ico('close',13)+' Clear chat','sm'):'')}
  <div class="ai-wrap"><div class="panel ai-chat"><div class="panel-header"><div class="ai-title"><span class="ai-badge">${ico(mgr?'spark':'bot',22)}</span><div><div class="panel-title">${mgr?'Management AI':'My AI Assistant'}</div><div class="panel-sub">${mgr?'Company-wide · read-only':'Your own records · read-only'}</div></div></div><span class="ai-mode ${cloud?'cloud':''}">${cloud?'Cloud AI connected':'Built-in assistant'}</span></div>
  <div class="ai-thread" id="aiThread"><div class="ai-msg"><div class="ai-av">AI</div><div class="ai-bubble">${welcome(role)}</div></div>${msgs}${AI.busy?'<div class="ai-msg"><div class="ai-av">AI</div><div class="ai-bubble"><span class="ai-typing"><i></i><i></i><i></i></span></div></div>':''}</div>
  <form id="aiForm" class="ai-composer"><textarea id="aiInput" rows="1" placeholder="${mgr?'Ask about the business…':'Ask about your day, deals, customers…'}" ${AI.busy?'disabled':''}></textarea><button class="btn gold" type="submit" ${AI.busy?'disabled':''}>${ico('send',15)} Send</button></form></div>
  <div class="ai-side"><div class="panel"><div class="panel-header"><div class="panel-title">Try asking</div></div><div class="panel-body"><div class="ai-prompts">${promptList(role).map(p=>`<button class="ai-prompt" data-action="ai-ask" data-value="${esc(p)}">${esc(p)}</button>`).join('')}</div></div></div>
  ${!mgr&&S.mode==='demo'?`<div class="panel"><div class="panel-header"><div class="panel-title">Demo: act as</div></div><div class="panel-body"><select class="filter-select" style="max-width:100%;width:100%" data-ai="persona">${personas.map(p=>`<option value="${esc(p.id)}" ${p.id===AI.persona?'selected':''}>${esc(p.full_name)}</option>`).join('')}</select><p class="ai-scope" style="margin-top:10px">The assistant only sees this person’s records, as it would for a real employee.</p></div></div>`:''}
  <div class="panel"><div class="panel-header"><div class="panel-title">What I can see</div></div><div class="panel-body"><p class="ai-scope">${mgr?'<b>Company-wide</b> records your account is permitted to read: opportunities, quotations, activities, purchase orders and, if you have HR access, leave.':'<b>Only your own</b> opportunities, quotations, activities, meetings, tasks, targets and leave. Other people’s data and credit limits are never used.'}<br><br>${cloud?'Open-ended questions are sent to your company’s secure cloud AI as a short summary of this data. Nothing is changed.':'Answers are calculated inside your browser. Nothing leaves this device.'}<br><br>Always check important figures against the reports.</p></div></div></div></div>`;
}
ow.views.ai=()=>aiView('employee');
ow.views.aimanager=()=>aiView('manager');
ow.gates.aimanager=()=>ow.isSalesManager();
ow.title('ai','AI Assistant');ow.title('aimanager','Management AI Assistant');
ow.NAV.splice(1,0,['AI assistants',[['ai','AI Assistant','bot'],['aimanager','Management AI','spark']]]);

/* ─────────── actions ─────────── */
const trigger=(action,value,id)=>{const b=document.createElement('button');b.dataset.action=action;if(value)b.dataset.value=value;if(id)b.dataset.id=id;b.style.display='none';document.body.appendChild(b);b.click();b.remove()};
const go=v=>{S.view=v;S.query='';S.filter='All';ow.render();window.scrollTo(0,0)};
ow.actions['ai-ask']=(b,id,v)=>send(v);
ow.actions['ai-nav']=(b,id,v)=>go(v);
ow.actions['ai-report']=(b,id,v)=>ow.actions['rpt-open'](null,v);
ow.actions['ai-new']=(b,id,v)=>{const map={quote:['ext-new','quote'],opportunity:['ext-new','opportunity'],activity:['ext-new','activity'],task:['new-task'],meeting:['new-meeting'],leave:['new-leave'],enquiry:['new-enquiry']}[v];if(map)trigger(map[0],map[1])};
ow.actions['ai-clear']=()=>{AI.msgs[curRole()]=[];ow.render()};
const copyText=async t=>{try{await navigator.clipboard.writeText(t);return true}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}};
ow.actions['ai-copy']=async(b,id)=>{const d=AI.drafts[id];if(d)toast(await copyText((d.channel==='Email'?'Subject: '+d.subject+'\n\n':'')+d.body)?'Draft copied':'Could not copy; select the text manually',false)};
ow.actions['ai-mail']=(b,id)=>{const d=AI.drafts[id];if(d)window.location.href='mailto:'+encodeURIComponent(d.to)+'?subject='+encodeURIComponent(d.subject)+'&body='+encodeURIComponent(d.body)};
ow.actions['ai-wa']=(b,id)=>{const d=AI.drafts[id];if(!d)return;const p=(d.phone||'').replace(/\D/g,'');window.open('https://wa.me/'+p+'?text='+encodeURIComponent(d.body),'_blank','noopener,noreferrer')};
ow.onChange.push(e=>{if(e.target.dataset?.ai==='persona'){AI.persona=e.target.value;AI.msgs.employee=[];ow.render();return true}return false});
document.addEventListener('submit',e=>{if(e.target.id==='aiForm'){e.preventDefault();const t=document.getElementById('aiInput');send(t.value)}});
document.addEventListener('keydown',e=>{if(e.target.id==='aiInput'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e.target.value)}});

/* ─────────── global search (top bar) ─────────── */
ow.searchBox=()=>`<div class="topsearch"><div class="field">${ico('search',16)}<input id="globalSearch" type="search" autocomplete="off" placeholder="Search customer, deal, quotation, PO, product… or ask AI" aria-label="Search"></div><div class="gs-results" id="gsResults"></div></div>`;
function gsFind(q){
  q=q.trim().toLowerCase();if(q.length<2)return [];const out=[],m=(...a)=>a.join(' ').toLowerCase().includes(q),add=(type,label,sub,view,cap=3)=>{if(out.filter(x=>x.type===type).length<cap)out.push({type,label,sub,view})};
  (D().contacts||[]).forEach(x=>{if(m(x.company,x.customer_no,x.contact_person,x.phone))add(x.type==='Supplier'?'Supplier':'Customer',x.company,[x.customer_no,x.contact_person].filter(Boolean).join(' · '),'contacts')});
  (D().opportunities||[]).forEach(x=>{if(m(x.title,x.customer,x.opportunity_no))add('Opportunity',x.title,x.customer+' · '+x.stage,'opportunities')});
  (D().quotations||[]).forEach(x=>{if(m(x.quote_no,x.customer))add('Quotation',x.quote_no,x.customer+' · '+x.status,'quotations')});
  (D().enquiries||[]).forEach(x=>{if(m(x.enquiry_no,x.customer,x.subject))add('Enquiry',x.enquiry_no,x.customer+' · '+x.subject,'enquiries')});
  (D().purchase_orders||[]).forEach(x=>{if(m(x.po_no,x.vendor))add('Purchase order',x.po_no,x.vendor+' · '+x.status,'purchases')});
  (D().products||[]).forEach(x=>{if(m(x.name,x.sku))add('Product',x.name,x.sku,'products')});
  (D().projects||[]).forEach(x=>{if(m(x.name,x.project_no,x.location))add('Project',x.name,x.location,'projects')});
  return out.slice(0,9);
}
function gsPaint(q){const box=document.getElementById('gsResults');if(!box)return;if(q.trim().length<2){box.innerHTML='';return}
  const r=gsFind(q);box.innerHTML=r.map(x=>`<button class="gs-item" data-action="gs-open" data-value="${esc(x.view)}" data-id="${esc(q.trim())}"><span class="t">${esc(x.type)}</span><span><strong>${esc(x.label)}</strong><small>${esc(x.sub)}</small></span></button>`).join('')+`<button class="gs-item gs-ai" data-action="gs-ask" data-value="${esc(q.trim())}"><span class="t">Ask AI</span><span><strong>“${esc(q.trim())}”</strong><small>${ow.isSalesManager()?'Ask the Management AI':'Ask your AI assistant'}</small></span></button>`}
const looksLikeQuestion=q=>/^(who|what|which|how|why|when|where|show|list|give|draft|write|tell|summar|compare|can you|please)\b/i.test(q.trim())||/\?$/.test(q.trim())||q.trim().split(/\s+/).length>=5;
ow.actions['gs-open']=(b,id,v)=>{S.view=v;S.query=id;S.filter='All';ow.render();window.scrollTo(0,0)};
ow.actions['gs-ask']=(b,id,v)=>{const role=ow.isSalesManager()?'manager':'employee';S.view=role==='manager'?'aimanager':'ai';ow.render();send(v,role)};
document.addEventListener('input',e=>{if(e.target.id==='globalSearch')gsPaint(e.target.value)});
document.addEventListener('keydown',e=>{if(e.target.id!=='globalSearch')return;const v=e.target.value;
  if(e.key==='Escape'){e.target.value='';gsPaint('')}
  if(e.key==='Enter'&&v.trim().length>=2){e.preventDefault();const r=gsFind(v);if(r.length&&!looksLikeQuestion(v))ow.actions['gs-open'](null,v.trim(),r[0].view);else ow.actions['gs-ask'](null,null,v.trim())}});
document.addEventListener('click',e=>{if(!e.target.closest('.topsearch')){const b=document.getElementById('gsResults');if(b)b.innerHTML=''}});
ow.ai={ask:send,answer,scope};
});
