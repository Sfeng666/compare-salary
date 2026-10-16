import {resolveLocation} from './locations.mjs';
import {normalizeSalary,interpolateTax} from './model.mjs';
import {tableCurve} from './tax-tables.mjs';
import {taxCoverageMessage} from './local-tax-coverage.mjs';
export {normalizeSalary,interpolateTax} from './model.mjs';
export const DEFAULTS=Object.freeze({filing:'single',adults:1,children:0,bedrooms:1,resident:true,taxYear:2026,spouse:'none',partnerIncome:0,referencePartnerIncome:0,annualHours:2080,extraLocalAnnual:0,includeAfterRent:true});
export function settings(input={}){
 if(Object.keys(input).some(k=>!Object.hasOwn(DEFAULTS,k)))throw Error('Unsupported household option');
 const o={...DEFAULTS,...input};
 if(!['single','joint','separate','lowest_married_tax'].includes(o.filing))throw Error('Choose Single, Married filing jointly, Married filing separately, or lowest married tax.');
 if(o.adults!==1&&o.adults!==2)throw Error('Choose one or two adults');
 if(o.filing==='single'&&(o.adults!==1||o.spouse!=='none'||o.partnerIncome!==0||o.referencePartnerIncome!==0))throw Error('Single filing currently models one adult with no partner income');
 if(o.filing!=='single'&&o.adults!==2)throw Error('Married filing requires two adults');
 if(o.children!==0||![0,1,2].includes(o.bedrooms)||o.taxYear!==2026||o.resident!==true)throw Error('Supported settings: US resident wage earners, no children, studio to two bedrooms, and tax year 2026');
 if(!['none','fixed','normalized','local_social_worker'].includes(o.spouse))throw Error('Unknown spouse income option');
 if(o.spouse==='normalized'&&o.referencePartnerIncome!==0)throw Error('Comparison-city spouse income is calculated automatically');
 for(const k of ['partnerIncome','referencePartnerIncome','extraLocalAnnual'])if(!Number.isFinite(o[k])||o[k]<0||o[k]>1000000)throw Error(`Invalid ${k}`);
 if(!Number.isFinite(o.annualHours)||o.annualHours<=0||o.annualHours>4160)throw Error('Invalid annual paid hours');
 return o;
}
export async function compareSalary(input,database,{taxCurve}={}){
 if(input.currency&&input.currency!=='USD')throw Error('Only USD wages are supported');
 const o=settings(input.options),origin=input.remote?input.residence:input.location;
 if(input.remote&&!input.residence)throw Error('For fully remote work, specify where you will live');
 const factor={year:1,month:12,week:52,hour:o.annualHours}[input.period||'year'];
 if(!factor||!Number.isFinite(input.salary)||input.salary<=0||input.salary*factor>1500000)throw Error('Enter a positive salary up to $1.5 million annually');
 const annual=input.salary*factor,source=resolveLocation(database,origin,o),baseline=resolveLocation(database,input.reference||'Madison, WI',o);
 const partner=p=>o.spouse==='local_social_worker'?p.spouse?.median:o.spouse==='normalized'?o.partnerIncome:o.spouse==='fixed'?(p===source?o.partnerIncome:o.referencePartnerIncome):0;
 const sp=partner(source);let bp=partner(baseline);if(!Number.isFinite(sp)||!Number.isFinite(bp))throw Error('Social-worker wage data unavailable');
 source.partnerIncome=sp;baseline.partnerIncome=bp;
 const curves=await Promise.all([source,baseline].map(p=>{const wages=p===baseline&&o.spouse==='normalized'?{ratio:sp/annual}:p.partnerIncome;return taxCurve?taxCurve(p,o,wages):tableCurve(database.taxTables,p,o,wages);}));
 const result=normalizeSalary({salary:{min:annual,max:annual,median:annual},source,baseline,sourceTax:curves[0],baselineTax:curves[1],extraLocalAnnual:o.extraLocalAnnual});
 if(o.spouse==='normalized'){bp=result.equivalent*sp/annual;baseline.partnerIncome=bp;}
 const allocate=(tax,gross,partner)=>{const joint=tax.filing==='JOINT',total=gross+partner;const yours=o.filing==='single'?tax.tax:joint?(total?tax.tax*gross/total:0):tax.yourTax;if(!Number.isFinite(yours))throw Error('This tax engine must supply each separate filer’s own tax');return {yourTax:yours,spouseTax:tax.tax-yours,yourNet:gross-yours,spouseNet:partner-(tax.tax-yours),method:joint?'proportional_gross':'own_return',filing:tax.filing};};
 const sourceAllocation=allocate(result.taxes,annual,sp),referenceAllocation=allocate(result.baselineTax,result.equivalent,bp);
 const approximate=curves.some(c=>c.approximate)||source.quality==='state-approximation'||baseline.quality==='state-approximation';
 const warnings=[...source.warnings,...baseline.warnings,'Budgets combine EPI costs in 2025 dollars with HUD FY2027 rents. Employer health benefits, retirement contributions and unusual deductions are not modeled.'];
 if(curves.some(c=>c.approximate))warnings.push('Tax-table estimate: joint taxes assume equally split earnings when the tables are built. Credits, deductions and filing choices may differ with actual spouse wages. The local PolicyEngine option uses actual earnings where jurisdiction coverage is verified.');
 for(const p of [source,baseline])if(p.needsTaxResearch)warnings.push(taxCoverageMessage(p));
 return {version:'0.2.1',currency:'USD',options:o,source,reference:baseline,annualSalary:annual,salaryInput:{amount:input.salary,period:input.period||'year',annualFactor:factor},normalizedBeforeTax:result.equivalent,normalizedAfterTax:result.baselineTax.net,afterTaxBasis:o.adults===2?'household':'individual',sourceAfterTax:result.householdNet,sourceTax:result.taxes.tax,referenceTax:result.baselineTax.tax,monthlyAfterRent:o.includeAfterRent?(result.householdNet-source.monthlyRent*12)/12:null,monthlyAfterBudget:result.surplus/12,sourcePartnerIncome:sp,referencePartnerIncome:bp,sourceAllocation,referenceAllocation,approximate,warnings,calculation:result};
}
