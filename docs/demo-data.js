/* AAARON OneWork — demonstration data. ALL names, values and people below are FICTIONAL.
   Dates are generated relative to "today" so the demo always looks current. Used only in Demo mode. */
(window.OneWorkPlugins=window.OneWorkPlugins||[]).push(function(ow){
'use strict';
ow.seeders.push(function(base){
  let seed=20261024;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const int=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)],chance=p=>rnd()<p;
  const wpick=pairs=>{const tot=pairs.reduce((s,p)=>s+p[1],0);let r=rnd()*tot;for(const [v,w] of pairs){if((r-=w)<=0)return v}return pairs[0][0]};
  const DAY=86400000,now=Date.now();
  const dISO=n=>new Date(now+n*DAY).toISOString().slice(0,10);
  const tISO=(n,h=9)=>{const d=new Date(now+n*DAY);d.setHours(h,int(0,59),0,0);return d.toISOString()};
  let idc=0;const nid=p=>p+'-'+(++idc);
  const pad=(n,w=5)=>String(n).padStart(w,'0');

  const profiles=[
    {id:'demo-admin',full_name:'Demo Administrator',email:'admin@demo.example',department:'management',role:'admin',active:true},
    {id:'demo-sm',full_name:'Nasser – Sales Manager',email:'nasser@demo.example',department:'sales',role:'manager',active:true},
    {id:'demo-s1',full_name:'Hamad – Project Sales',email:'hamad@demo.example',department:'sales',role:'staff',active:true},
    {id:'demo-s2',full_name:'Laila – Trade Sales',email:'laila@demo.example',department:'sales',role:'staff',active:true},
    {id:'demo-s3',full_name:'Omar – Counter Sales',email:'omar@demo.example',department:'sales',role:'staff',active:true},
    {id:'demo-s4',full_name:'Salma – Application Sales',email:'salma@demo.example',department:'sales',role:'staff',active:true},
    {id:'demo-buy',full_name:'Purchase Officer',email:'purchase@demo.example',department:'purchase',role:'staff',active:true},
    {id:'demo-buym',full_name:'Purchase Manager',email:'purchasing.mgr@demo.example',department:'purchase',role:'manager',active:true},
    {id:'demo-hr',full_name:'HR Coordinator',email:'hr@demo.example',department:'hr',role:'staff',active:true}
  ];
  const sellers=['demo-s1','demo-s2','demo-s3','demo-s4'];
  const chanOwner={Project:'demo-s1',Trade:'demo-s2',Counter:'demo-s3',Application:'demo-s4'};
  const brands=base.brands;

  /* ── customers, traders, suppliers ── */
  const custDefs=[
    ['Northgate Infrastructure','Project'],['Bluewave Developers','Project'],['Sandstone Builders','Project'],['Harbour Point Contracting','Project'],
    ['Desert Rose Properties','Project'],['Meridian Engineering','Project'],['Falcon Industrial Works','Project'],['Oasis Civil Contracting','Project'],
    ['Granite Peak Construction','Project'],['Coastline Marine Works','Project'],
    ['Sohar Builders Mart','Trade','Distributor'],['Al Batinah Paint House','Trade','Sub-distributor'],['Gulf Hardware Trading','Trade','Distributor'],
    ['Muscat Tile & Chemicals','Trade','Retailer'],['Salalah Building Supplies','Trade','Distributor'],['Nizwa Trade Centre','Trade','Retailer'],
    ['Sur Coastal Distributors','Trade','Sub-distributor'],['Barka Hardware Store','Trade','Retailer'],
    ['Counter – Walk-in Contractor','Counter'],['Counter – Walk-in Maintenance Co.','Counter'],
    ['Zenith Facility Services','Application'],['Prime Roofing Solutions','Application'],['Aqua Seal Applicators','Application']
  ];
  const contacts=custDefs.map((c,i)=>({id:'cus-'+(i+1),type:'Customer',company:c[0],contact_person:pick(['Procurement Manager','Site Engineer','Purchasing Officer','Project Manager','Owner','Store Manager']),
    phone:'+968 9'+pad(int(100000,999999),6)+int(0,9),email:chance(.8)?('info'+(i+1)+'@'+c[0].toLowerCase().replace(/[^a-z]+/g,'').slice(0,12)+'.example'):'',
    customer_no:'CUS-'+pad(i+1,6),sales_channel:c[1],trader_category:c[2]||'',parent_company:c[2]==='Sub-distributor'||c[2]==='Retailer'?'Sohar Builders Mart':'',
    pricing_tier:c[1]==='Trade'?pick(['Tier A','Tier B','Tier C']):'Standard',credit_status:wpick([['Good',8],['Watch',2],['On hold',1]]),
    customer_status:wpick([['Active',8],['Prospect',3],['Dormant',1]]),cr_no:chance(.7)?'CR-'+int(1000000,9999999):'',owner_id:chanOwner[c[1]],
    created_at:tISO(-int(8,300)),consent_email:chance(.5),consent_whatsapp:chance(.4)}));
  contacts.find(c=>c.company==='Barka Hardware Store').phone='';
  contacts.find(c=>c.company==='Nizwa Trade Centre').email='';
  const suppliers=['Geobit Manufacturing (principal)','Master Builders Supply (principal)','Seal Coatings Dubai','Weber Distribution Gulf','Nova Chemicals FZE','Orion Tools Trading'];
  suppliers.forEach((s,i)=>contacts.push({id:'sup-'+(i+1),type:'Supplier',company:s,contact_person:'Sales Desk',phone:'+971 4 '+int(2000000,8999999),email:'sales@'+s.toLowerCase().replace(/[^a-z]+/g,'').slice(0,10)+'.example',created_at:tISO(-int(40,300)),customer_no:'CUS-'+pad(custDefs.length+i+1,6)}));
  const tradeCust=contacts.filter(c=>c.sales_channel==='Trade');

  /* ── products ── */
  const prodDefs=[
    ['GEO-WP-101','Geobit Roof Waterproofing Membrane','Waterproofing','Roof systems',0,'Pail','20 kg',38.5,'Oman'],
    ['GEO-WP-114','Geobit Cementitious Waterproof Slurry','Waterproofing','Basements & tanks',0,'Bag','25 kg',14.2,'Oman'],
    ['GEO-PR-210','Geobit Bitumen Primer','Waterproofing','Primers',0,'Drum','18 L',21.0,'Oman'],
    ['MST-FL-301','Master Industrial Floor Hardener','Construction Chemicals','Flooring',1,'Bag','25 kg',9.8,'UAE'],
    ['MST-RP-322','Master Structural Repair Mortar','Construction Chemicals','Concrete repair',1,'Bag','25 kg',12.6,'UAE'],
    ['MST-GR-340','Master Non-shrink Grout','Construction Chemicals','Grouts',1,'Bag','25 kg',11.4,'UAE'],
    ['MST-AD-355','Master Concrete Admixture SP','Construction Chemicals','Admixtures',1,'Drum','200 L',96.0,'UAE'],
    ['SEA-PU-410','Seal PU Elastomeric Coating','Paints','Protective coatings',2,'Pail','20 kg',46.0,'India'],
    ['SEA-EP-422','Seal Epoxy Floor Coating','Paints','Flooring',2,'Kit','20 kg',58.5,'India'],
    ['SEA-AC-433','Seal Acrylic Exterior Paint','Paints','Decorative',2,'Pail','18 L',24.5,'India'],
    ['SEA-AN-445','Seal Anti-corrosion Primer','Paints','Primers',2,'Pail','20 L',31.0,'India'],
    ['WEB-TA-501','Weber Tile Adhesive Standard','Construction Chemicals','Tiling',3,'Bag','25 kg',4.9,'Saudi Arabia'],
    ['WEB-TA-512','Weber Flexible Tile Adhesive','Construction Chemicals','Tiling',3,'Bag','25 kg',7.2,'Saudi Arabia'],
    ['WEB-GR-520','Weber Tile Grout','Construction Chemicals','Tiling',3,'Bag','5 kg',3.6,'Saudi Arabia'],
    ['WEB-PL-533','Weber Skim Coat Plaster','Construction Chemicals','Plasters',3,'Bag','25 kg',5.4,'Saudi Arabia'],
    ['ACC-RL-601','Application Roller & Tool Kit','Accessories','Tools',null,'Set','1 set',18.0,'China'],
    ['ACC-SP-612','Industrial Sprayer 20L','Accessories','Tools',null,'Nos','20 L',42.0,'China'],
    ['PWR-MX-701','Heavy-duty Paddle Mixer','Power Tools','Mixers',null,'Nos','1500 W',68.0,'Europe']
  ];
  const products=prodDefs.map((p,i)=>({id:'prd-'+(i+1),sku:p[0],name:p[1],category:p[2],subcategory:p[3],brand_id:p[4]!=null?brands[p[4]].id:null,
    supplier:p[4]!=null?['Geobit Manufacturing','Master Builders Supply','Seal Coatings Dubai','Weber Distribution Gulf'][p[4]]:'Orion Tools Trading',country_of_origin:p[8],unit:p[5],pack_size:p[6],
    coverage_rate:'As per approved TDS',list_price:p[7],status:i===13?'Phase-out':'Active',created_at:tISO(-int(60,300))}));

  /* ── projects & stakeholders ── */
  const projDefs=[
    ['Sohar Industrial Park – Warehouse Block','Sohar','Industrial','Under construction',58000,14000],
    ['Liwa Port Administration Building','Liwa','Commercial','Finishing',32000,6200],
    ['Barka Residential Complex – Phase 2','Barka','Residential','Awarded',74000,22000],
    ['Muscat Hospital Extension','Muscat','Hospital','Design',120000,18000],
    ['Nizwa School Campus','Nizwa','School','Tendering',45000,9000],
    ['Salalah Water Tank Rehabilitation','Salalah','Water / tank','Under construction',26000,3500],
    ['Duqm Logistics Hub','Duqm','Infrastructure','Awarded',98000,30000],
    ['Sur Marina Retail Centre','Sur','Commercial','Handover',21000,5200],
    ['Suwaiq Fabrication Plant','Suwaiq','Industrial','On hold',37000,8800]
  ];
  const projects=projDefs.map((p,i)=>({id:'prj-'+(i+1),project_no:'PRJ-'+pad(i+1),name:p[0],location:p[1],project_type:p[2],construction_stage:p[3],
    developer:pick(['Northgate Infrastructure','Bluewave Developers','Desert Rose Properties','Government entity']),consultant:chance(.85)?pick(['Meridian Engineering','Gulf Design Consultants','Atlas Project Management']):'',
    main_contractor:chance(.85)?pick(['Sandstone Builders','Harbour Point Contracting','Falcon Industrial Works','Granite Peak Construction']):'',
    specification_status:wpick([['Specified (our product)',3],['Open specification',4],['Competitor specified',2],['Not specified',1]]),
    approval_status:wpick([['Approved',3],['Pending',3],['Submitted',2],['Not required',1],['Rejected',1]]),
    estimated_project_value:p[4],area_m2:p[5],next_followup:dISO(int(-6,25)),owner_id:i%2?'demo-s1':'demo-s4',created_at:tISO(-int(30,200))}));
  const project_stakeholders=[];
  projects.forEach(p=>{[['Developer',p.developer],['Consultant',p.consultant],['Main Contractor',p.main_contractor]].forEach(([r,c])=>{if(c)project_stakeholders.push({id:nid('stk'),project_id:p.id,company:c,stakeholder_role:r,contact_name:pick(['Project Director','Site Manager','Chief Engineer']),phone:'+968 9'+pad(int(100000,999999),6)+'0',created_at:p.created_at})})});

  /* ── opportunities ── */
  const stagesBy={Project:['New Lead','Qualified','Meeting / Site Visit','Presentation / Mock-up','Specification / Approval','Quotation / Tender','Negotiation'],
    Application:['New Lead','Qualified','Meeting / Site Visit','Presentation / Mock-up','Specification / Approval','Quotation / Tender','Negotiation'],
    Trade:['New Lead','Qualified','Meeting / Shop Visit','Price List / Quotation','Terms Agreed'],Counter:['Walk-in','Enquiry or Sale','Interested / Escalated']};
  const prob={'New Lead':10,Qualified:20,'Meeting / Site Visit':30,'Presentation / Mock-up':45,'Specification / Approval':55,'Quotation / Tender':65,Negotiation:80,'Meeting / Shop Visit':35,'Price List / Quotation':50,'Terms Agreed':75,'Walk-in':10,'Enquiry or Sale':40,'Interested / Escalated':60};
  const titles={Project:['Waterproofing system – {p}','Concrete repair package – {p}','Flooring & hardener supply – {p}','Protective coating scope – {p}','Tile adhesive & grout – {p}'],
    Application:['Roof waterproofing application – {p}','Epoxy floor application – {p}','Tank lining application – {p}'],
    Trade:['Monthly distribution order – {p}','Tile adhesive stock order – {p}','Paint range listing – {p}','Quarterly supply agreement – {p}'],
    Counter:['Walk-in purchase – {p}','Small works materials – {p}','Repair kit enquiry – {p}']};
  const lostReasons=['Price','Competitor specification','Technical rejection','Long lead time','Stock unavailable','Credit or payment terms','Project cancelled','No response'];
  const competitors=['Imported Brand A','Imported Brand B','Local Supplier C','Regional Brand D','Brand E'];
  const customersFor={Project:contacts.filter(c=>c.sales_channel==='Project'),Application:contacts.filter(c=>c.sales_channel==='Application'||c.sales_channel==='Project'),Trade:tradeCust,Counter:contacts.filter(c=>c.sales_channel==='Counter')};
  const FX={OMR:1,USD:.385,AED:.1047};
  const opportunities=[];
  const omr0=o=>o.estimated_value*o.exchange_rate;
  const mkOpp=(channel,state)=>{
    const cust=pick(customersFor[channel]),pj=(channel==='Project'||channel==='Application')&&chance(.8)?pick(projects):null;
    const range={Project:[8000,90000],Application:[3000,26000],Trade:[2000,18000],Counter:[150,2600]}[channel];
    const cur=chance(.82)?'OMR':chance(.65)?'USD':'AED';
    const omrVal=Math.round((range[0]+rnd()*rnd()*(range[1]-range[0]))/50)*50;
    const val=Math.round(omrVal/FX[cur]/10)*10;
    const o={id:nid('opp'),title:pick(titles[channel]).replace('{p}',pj?pj.name.split(' – ')[0]:cust.company),customer:cust.company,project_id:pj?.id||null,channel,currency:cur,exchange_rate:FX[cur],
      estimated_value:val,owner_id:chanOwner[channel],competitor:chance(.55)?pick(competitors):'',notes:''};
    if(state==='open'){
      o.stage=pick(stagesBy[channel]);o.probability=prob[o.stage];o.created_at=tISO(-int(3,150));o.expected_close=dISO(int(-10,110));
      o.next_step=pick(['Send revised quotation','Technical submission follow-up','Arrange site visit','Confirm price tier','Chase approval','Present mock-up result']);o.next_followup=dISO(int(-9,21));
    }else{
      const ago=int(0,175),cycle=int(12,95);o.created_at=tISO(-(ago+cycle));o.actual_close=dISO(-ago);o.expected_close=o.actual_close;o.next_step='';o.next_followup=null;
      if(state==='won'){o.stage='Closed Won';o.probability=100;o.won_value=chance(.8)?val:Math.round(val*pick([.92,.95,1.05]));}
      else{o.stage='Closed Lost';o.probability=0;o.lost_reason=wpick([['Price',5],['Competitor specification',3],['Technical rejection',1],['Long lead time',2],['Stock unavailable',1],['Credit or payment terms',1],['Project cancelled',1],['No response',2]]);if(o.competitor)o.competitor_price=Math.round(val*pick([.85,.9,.93]))}
    }
    o.opportunity_no='OPP-'+pad(opportunities.length+1,6);o.updated_at=o.created_at;opportunities.push(o);return o;
  };
  [['Project',9,6,7],['Application',5,3,3],['Trade',7,7,5],['Counter',3,5,3]].forEach(([ch,open,won,lost])=>{for(let i=0;i<open;i++)mkOpp(ch,'open');for(let i=0;i<won;i++)mkOpp(ch,'won');for(let i=0;i<lost;i++)mkOpp(ch,'lost')});
  // make sure the current month has some wins
  for(let i=0;i<3;i++){const o=mkOpp(pick(['Trade','Application','Project']),'won');o.actual_close=dISO(-int(0,5));o.created_at=tISO(-int(25,60));const k=Math.min(1,14000/omr0(o));o.estimated_value=Math.round(o.estimated_value*k/10)*10;o.won_value=o.estimated_value}

  /* ── enquiries ── */
  const enqSubjects=['Waterproof coating – 200 m²','Tile adhesive and grout supply','Floor hardener for warehouse','Concrete repair mortar – bulk','Epoxy flooring system','Roof membrane – 1,200 m²','Anti-corrosion primer for steel','Skim coat plaster supply'];
  const enquiries=[];
  for(let i=0;i<26;i++){const c=pick(contacts.filter(x=>x.type==='Customer'));enquiries.push({id:'enq-'+(i+1),enquiry_no:'ENQ-26-'+pad(i+1),customer:c.company,brand_id:pick(brands).id,subject:pick(enqSubjects),
    estimated_value:Math.round((300+rnd()*rnd()*18000)/10)*10,stage:wpick([['New',6],['Qualified',5],['Quoted',6],['Negotiation',4],['Won',5],['Lost',2]]),priority:wpick([['Low',2],['Medium',6],['High',4],['Urgent',1]]),
    assigned_to:pick(sellers),next_followup:dISO(int(-8,18)),created_at:tISO(-int(1,140)),description:''})}

  /* ── quotations ── */
  const quotations=[];
  const quotable=opportunities.filter(o=>!['New Lead','Walk-in','Qualified'].includes(o.stage));
  for(let i=0;i<34;i++){
    const o=pick(quotable),nLines=int(1,4),lines=[];
    for(let k=0;k<nLines;k++){const p=pick(products);lines.push({item_name:p.name,quantity:int(5,120),unit:p.unit,unit_price:+(p.list_price*(1+rnd()*.15)).toFixed(3),discount_percent:chance(.22)?int(6,12):chance(.5)?int(0,5):0})}
    const subtotal=+lines.reduce((s,l)=>s+l.quantity*l.unit_price*(1-l.discount_percent/100),0).toFixed(3);
    const status=wpick([['Draft',3],['Pending Approval',3],['Approved',3],['Sent',8],['Under Negotiation',4],['Accepted',8],['Rejected',3],['Expired',2]]);
    const age=['Draft','Pending Approval','Approved','Sent','Under Negotiation'].includes(status)?int(0,40):int(0,125);
    quotations.push({id:'quo-'+(i+1),quote_no:'QUO-26-'+pad(i+1),revision:chance(.15)?2:1,customer:o.customer,opportunity_id:o.id,status,currency:'OMR',line_items:lines,subtotal,vat_percent:5,total:+(subtotal*1.05).toFixed(3),
      valid_until:dISO(-age+30),payment_terms:'30 days from invoice',delivery_terms:'Ex-warehouse Sohar',created_by:o.owner_id,created_at:tISO(-age),approved_by:['Approved','Sent','Accepted','Under Negotiation'].includes(status)?'demo-sm':null})
  }

  // two discounted quotations that went out without a recorded approval (for the discount-control reports / Management AI)
  quotations.filter(q=>q.status==='Sent').slice(0,2).forEach(q=>{q.line_items[0].discount_percent=9;q.approved_by=null;q.subtotal=+q.line_items.reduce((s,l)=>s+l.quantity*l.unit_price*(1-l.discount_percent/100),0).toFixed(3);q.total=+(q.subtotal*1.05).toFixed(3)});

  /* ── activities ── */
  const actTypes=[['Meeting',5],['Site Visit',7],['Trader Shop Visit',5],['Presentation',2],['Mock-up',2],['Phone Call',9],['Email',6],['WhatsApp',6],['Sample Delivery',1],['Training',1],['Follow-up',3]];
  const sales_activities=[];
  for(let i=0;i<260;i++){const o=pick(opportunities),type=wpick(actTypes);sales_activities.push({id:'act-'+(i+1),title:type+' – '+o.customer,activity_type:type,purpose:pick(['Introduction','Technical discussion','Site inspection','Quotation follow-up','Negotiation','Payment follow-up','After sales','Product presentation']),
    customer:o.customer,project_id:o.project_id,opportunity_id:o.id,activity_at:tISO(-int(0,95),int(8,17)),outcome:wpick([['Positive',6],['Neutral',4],['No decision',2],['Negative',1]]),
    location:['Site Visit','Trader Shop Visit'].includes(type)?pick(['Sohar','Muscat','Barka','Nizwa','Salalah','Sur']):'',next_step:pick(['Send quotation','Follow up call','Submit samples','Book site visit','Confirm order']),
    next_followup:dISO(int(-5,20)),owner_id:chance(.8)?o.owner_id:pick(sellers),created_at:tISO(-int(0,95))})}

  /* ── technical actions ── */
  const techStatus={'Mock-up':['Planned','Preparing','Completed','Approved','Rejected','Re-do'],Approval:['Submitted','Pending','Approved','Approved with comments','Rejected'],Tender:['Preparing','Submitted','Awarded','Lost'],'Application Job':['Planned','In progress','Completed','Handed over']};
  const technical_actions=[];
  for(let i=0;i<24;i++){const type=wpick([['Mock-up',7],['Approval',7],['Tender',4],['Application Job',6]]),o=pick(opportunities.filter(x=>x.channel==='Project'||x.channel==='Application'));
    technical_actions.push({id:'tec-'+(i+1),action_type:type,title:({'Mock-up':'Mock-up trial','Approval':'Consultant submittal','Tender':'Tender BOQ','Application Job':'Application job'})[type]+' – '+o.customer,customer:o.customer,project_id:o.project_id,opportunity_id:o.id,
      system_name:pick(['Roof waterproofing system','Epoxy flooring system','Concrete repair system','Protective coating system']),status:pick(techStatus[type]),due_date:dISO(int(-15,30)),area_m2:type==='Mock-up'?int(5,40):int(300,4000),
      cost_incurred:type==='Mock-up'?int(40,350):type==='Application Job'?int(1500,14000):0,result:'',notes:'',created_at:tISO(-int(0,140))})}

  /* ── targets & credit ── */
  const sales_targets=[],period=k=>{const d=new Date(now);d.setDate(1);d.setMonth(d.getMonth()-k);return d.toISOString().slice(0,7)};
  for(let k=0;k<7;k++)sellers.forEach(s=>sales_targets.push({id:nid('tgt'),target_type:'Salesperson',target_name:profiles.find(p=>p.id===s).full_name,period:period(k),target_value:{ 'demo-s1':38000,'demo-s2':20000,'demo-s3':3500,'demo-s4':14000}[s]+int(-1500,1500),target_visits:{ 'demo-s1':6,'demo-s2':8,'demo-s3':3,'demo-s4':5}[s],created_at:tISO(-k*30)}));
  tradeCust.slice(0,4).forEach(c=>sales_targets.push({id:nid('tgt'),target_type:'Trader',target_name:c.company,period:period(0),target_value:int(4,9)*1000,target_visits:2,created_at:tISO(-5)}));
  const trader_credit=tradeCust.map(c=>{const lim=int(4,25)*1000;return {id:nid('crd'),contact_id:c.id,credit_limit:lim,credit_terms:pick(['30 days','45 days','60 days']),status:c.credit_status,outstanding_balance:Math.round(lim*(.15+rnd()*.95)/10)*10,created_at:tISO(-60)}});

  /* ── purchase ── */
  const purchase_orders=[],purchase_order_lines=[];
  for(let i=0;i<18;i++){
    const br=pick(brands),cur=wpick([['OMR',3],['USD',4],['AED',3]]),status=wpick([['Draft',2],['Submitted',3],['Approved',3],['Ordered',4],['Partially Received',2],['Received',5],['Cancelled',1]]);
    const id='po-'+(i+1),nL=int(1,4),lines=[];
    for(let k=0;k<nL;k++){const p=pick(products.filter(x=>x.brand_id===br.id)||products);const price=+(((p?p.list_price:10)*(cur==='USD'?.55:cur==='AED'?2.1:.6))).toFixed(3),qty=int(20,400);lines.push({id:nid('pol'),purchase_order_id:id,item_name:(p||products[0]).name,unit:(p||products[0]).unit,quantity:qty,unit_price:price,line_total:+(qty*price).toFixed(3)})}
    const subtotal=+lines.reduce((s,l)=>s+l.line_total,0).toFixed(3),age=int(0,150);
    purchase_order_lines.push(...lines);
    purchase_orders.push({id,po_no:'AA-PO-26-'+pad(i+1),vendor:pick(suppliers),brand_id:br.id,currency:cur,order_date:dISO(-age),delivery_date:dISO(-age+int(20,60)),status,subtotal,vat_percent:5,total:+(subtotal*1.05).toFixed(3),
      payment_terms:'30% advance, balance before shipment',notes:'',created_by:'demo-buy',created_at:tISO(-age),approved_by:['Approved','Ordered','Partially Received','Received'].includes(status)?'demo-buym':null,approved_at:['Approved','Ordered','Partially Received','Received'].includes(status)?tISO(-age+int(1,4)):null})}

  /* ── documents, meetings, tasks ── */
  const technical_documents=[];
  brands.forEach((b,bi)=>['TDS','SDS','Catalogue'].forEach((t,ti)=>technical_documents.push({id:nid('doc'),title:b.name+' '+['Product range','Safety data sheet','Product catalogue'][ti],product:pick(products.filter(p=>p.brand_id===b.id)).name,brand_id:b.id,document_type:t,version:'Rev '+int(1,4),file_name:b.name.replace(/ /g,'_')+'_'+t+'.pdf',storage_path:'DEMO_ONLY',file_size:int(200,2500)*1000,created_at:tISO(-int(10,200))})));
  const meetings=[
    ['Client requirements review','Northgate Infrastructure','Customer',2,10],['Consultant approval meeting','Meridian Engineering','Customer',4,11],['Supplier price negotiation','Seal Coatings Dubai','Supplier',6,14],
    ['Weekly sales review','','Internal',1,9],['Site inspection – Duqm Logistics Hub','Harbour Point Contracting','Site Visit',9,8],['Distributor quarterly review','Sohar Builders Mart','Customer',12,15],
    ['Management monthly review','','Internal',15,10],['Mock-up result presentation','Falcon Industrial Works','Customer',-3,13],['Supplier video call','Weber Distribution Gulf','Online',-8,16]
  ].map((m,i)=>({id:'mtg-'+(i+1),title:m[0],company:m[1],meeting_type:m[2],starts_at:tISO(m[3],m[4]),location:m[2]==='Online'?'Video call':'Sohar',status:m[3]<0?'Completed':'Scheduled',assigned_to:pick(['demo-sm','demo-s1','demo-s2','demo-buy']),agenda:'',created_at:tISO(-10)}));
  const taskTitles=['Follow up waterproofing quotation','Confirm supplier lead time','Prepare tender BOQ','Send TDS pack to consultant','Update customer price tiers','Chase pending PO approval','Collect site measurements','Renew trade licence documents','Issue revised quotation','Check stock before promising dates','Arrange sample delivery','Review monthly targets'];
  const tasks=taskTitles.map((t,i)=>({id:'tsk-'+(i+1),title:t,related_type:pick(['Enquiry','Purchase','Meeting','General']),related_ref:'',due_date:dISO(int(-10,14)),priority:wpick([['Low',2],['Medium',5],['High',4],['Urgent',1]]),
    status:wpick([['Open',5],['In Progress',3],['Completed',4],['Cancelled',1]]),assigned_to:pick(['demo-sm','demo-s1','demo-s2','demo-s3','demo-s4','demo-buy']),created_at:tISO(-int(2,30))}));

  /* ── HR ── */
  const empDefs=[['Nasser – Sales Manager','Sales','Sales Manager',1800],['Hamad – Project Sales','Sales','Senior Sales Executive',1500],['Laila – Trade Sales','Sales','Trade Sales Executive',1000],['Omar – Counter Sales','Sales','Counter Sales Executive',700],
    ['Salma – Application Sales','Sales','Application Specialist',900],['Purchase Officer','Purchase','Purchase Officer',1200],['Purchase Manager','Purchase','Purchase Manager',2400],['HR Coordinator','HR','HR Coordinator',600],
    ['Warehouse Supervisor','Operations','Warehouse Supervisor',1400],['Storekeeper','Operations','Storekeeper',500],['Accounts Executive','Finance','Accounts Executive',820],['Driver / Delivery','Operations','Driver',300]];
  const employees=empDefs.map((e,i)=>({id:'emp-'+(i+1),employee_no:'EMP-'+pad(i+101,4),full_name:e[0],department:e[1],designation:e[2],work_email:'staff'+(i+1)+'@demo.example',joining_date:dISO(-e[3]),employment_status:i===11?'On Leave':'Active',created_at:tISO(-200)}));
  const leave_requests=[];
  for(let i=0;i<14;i++){const emp=pick(profiles),s=int(-80,25),len=int(1,9),status=s>5?'Pending':wpick([['Approved',8],['Rejected',1],['Pending',1]]);
    leave_requests.push({id:nid('lv'),employee_id:emp.id,leave_type:wpick([['Annual',6],['Sick',4],['Emergency',2],['Unpaid',1]]),start_date:dISO(s),end_date:dISO(s+len-1),reason:pick(['Family travel','Medical appointment','Personal matter','Rest']),status,created_at:tISO(s-5)})}

  return {...base,profiles,brands,contacts,enquiries,projects,project_stakeholders,opportunities,quotations,products,sales_activities,technical_actions,sales_targets,trader_credit,
    purchase_orders,purchase_order_lines,technical_documents,meetings,tasks,employees,leave_requests,audit_events:[]};
});
});
