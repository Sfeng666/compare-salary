const COMMUNITY=new Set(['AZ','CA','ID','LA','NV','NM','TX','WA','WI']);
export function interpolate(xs,ys,x){if(x<xs[0]||x>xs.at(-1))throw Error('Income exceeds the published tax table (up to $2 million)');let l=0,h=xs.length-1;while(h-l>1){const m=(l+h)>>1;if(xs[m]<x)l=m;else h=m;}return ys[l]+(ys[h]-ys[l])*(x-xs[l])/(xs[h]-xs[l]);}
const payroll=(wages,filing)=>wages.reduce((s,x)=>s+Math.min(x,184500)*.062+x*.0145,0)+.009*(filing==='joint'?Math.max(0,wages.reduce((a,b)=>a+b,0)-250000):wages.reduce((s,x)=>s+Math.max(0,x-(filing==='single'?200000:125000)),0));
function local(place,wages){const t=place.localTax;if(!t)return 0;return wages.reduce((s,w)=>s+t.income.reduce((a,r)=>a+Math.max(0,w-r.exemption_per_person)*r.rate,0)+t.occupational.reduce((a,r)=>a+(w>0&&w>=r.minimum_annual_wages?r.amount*({year:1,month:12,week:52}[r.period]):0),0),0);}
export function tableTax(tables,place,gross,partner,filing){
 const t=tables.states[place.state];if(!t)throw Error('Tax tables unavailable for state');
 const wages=filing==='single'?[gross]:[gross,partner],total=gross+partner;
 const it=(mode,x)=>interpolate(tables.gross,t[mode],x);
 const single=()=>it('single',gross)+payroll([gross],'single')+local(place,[gross]);
 const joint=()=>it('joint',total)+payroll(wages,'joint')+local(place,wages);
 const separate=()=>{const taxed=COMMUNITY.has(place.state)?[total/2,total/2]:wages;return taxed.reduce((s,x)=>s+it('separate',x),0)+payroll(wages,'separate')+local(place,wages);};
 const choices=filing==='single'?[{filing:'SINGLE',tax:single()}]:[{filing:'JOINT',tax:joint()},{filing:'SEPARATE',tax:separate()}];
 const chosen=filing==='joint'?choices[0]:filing==='separate'?choices[1]:choices.reduce((a,b)=>a.tax<=b.tax?a:b);
 return {gross,net:total-chosen.tax,...chosen,jointTax:choices[0].tax,separateTax:choices.at(-1).tax};
}
export function tableCurve(tables,place,options,partner){
 const gross=tables.gross.filter(x=>x+partner<=tables.gross.at(-1));
 return {engine:tables.engine,approximate:true,year:tables.year,rows:gross.map(x=>tableTax(tables,place,x,partner,options.filing))};
}
