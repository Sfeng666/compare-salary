import {resolveLocation} from './locations.mjs';
import {normalizeSalary,interpolateTax} from './model.mjs';
import {tableCurve} from './tax-tables.mjs';
export {normalizeSalary,interpolateTax} from './model.mjs';
export const DEFAULTS=Object.freeze({filing:'single',adults:1,children:0,bedrooms:1,resident:true,taxYear:2026,spouse:'none',partnerIncome:0,referencePartnerIncome:0,annualHours:2080,extraLocalAnnual:0,includeAfterRent:true});
export function settings(input={}){
 const o={...DEFAULTS,...input};
 if(!['single','joint','separate','lowest_married_tax'].includes(o.filing))throw Error('Choose Single, Married filing jointly, Married filing separately, or lowest married tax.');
 if(o.adults!==1&&o.adults!==2)throw Error('Choose one or two adults');
 if(o.filing==='single'&&(o.adults!==1||o.spouse!=='none'||o.partnerIncome!==0||o.referencePartnerIncome!==0))throw Error('Single filing currently models one adult with no partner income');
 if(o.filing!=='single'&&o.adults!==2)throw Error('Married filing requires two adults');
 if(o.children!==0||![1,2].includes(o.bedrooms)||o.taxYear!==2026||o.resident!==true)throw Error('Version 1 supports US resident wage earners, no children, one or two bedrooms, and tax year 2026');
 if(!['none','fixed','local_social_worker'].includes(o.spouse))throw Error('Unknown spouse income option');
 for(const k of ['partnerIncome','referencePartnerIncome','extraLocalAnnual'])if(!Number.isFinite(o[k])||o[k]<0||o[k]>1000000)throw Error(`Invalid ${k}`);
 if(!Number.isFinite(o.annualHours)||o.annualHours<=0||o.annualHours>4160)throw Error('Invalid annual paid hours');
 return o;
}
export async function compareSalary(input,database,{taxCurve}={}){
 const o=settings(input.options),origin=input.remote?input.residence:input.location;
 if(input.remote&&!input.residence)throw Error('For fully remote work, specify where you will live');
 const factor={year:1,month:12,week:52,hour:o.annualHours}[input.period||'year'];
 if(!factor||!Number.isFinite(input.salary)||input.salary<=0||input.salary*factor>1500000)throw Error('Enter a positive salary up to $1.5 million annually');
 const annual=input.salary*factor,source=resolveLocation(database,origin,o),baseline=resolveLocation(database,input.reference||'Madison, WI',o);
 const partner=p=>o.spouse==='local_social_worker'?p.spouse?.median:o.spouse==='fixed'?(p===source?o.partnerIncome:o.referencePartnerIncome):0;
 const sp=partner(source),bp=partner(baseline);if(!Number.isFinite(sp)||!Number.isFinite(bp))throw Error('Social-worker wage data unavailable');
 source.partnerIncome=sp;baseline.partnerIncome=bp;
 const curves=await Promise.all([source,baseline].map(p=>taxCurve?taxCurve(p,o,p.partnerIncome):tableCurve(database.taxTables,p,o,p.partnerIncome)));
 const result=normalizeSalary({salary:{min:annual,max:annual,median:annual},source,baseline,sourceTax:curves[0],baselineTax:curves[1],extraLocalAnnual:o.extraLocalAnnual});
 const approximate=curves.some(c=>c.approximate)||source.quality==='state-approximation'||baseline.quality==='state-approximation';
 const warnings=[...source.warnings,...baseline.warnings,'Budgets combine EPI costs in 2025 dollars with HUD FY2027 rents. Employer health benefits, retirement contributions and unusual deductions are not modeled.'];
 if(curves.some(c=>c.approximate)){warnings.push('Tax-table estimate: joint taxes assume equally split earnings when the tables are built. Credits, deductions and filing choices may differ with actual spouse wages. Use the local PolicyEngine option for detailed calculations.');if(!source.localTax||!baseline.localTax)warnings.push('City and county income taxes are omitted unless a researched local tax entry exists. This can materially overstate take-home pay.');}
 return {version:'0.1.0',currency:'USD',options:o,source,reference:baseline,annualSalary:annual,normalizedBeforeTax:result.equivalent,normalizedAfterTax:result.baselineTax.net,afterTaxBasis:o.adults===2?'household':'individual',sourceAfterTax:result.householdNet,sourceTax:result.taxes.tax,referenceTax:result.baselineTax.tax,monthlyAfterRent:o.includeAfterRent?(result.householdNet-source.monthlyRent*12)/12:null,monthlyAfterBudget:result.surplus/12,sourcePartnerIncome:sp,referencePartnerIncome:bp,approximate,warnings,calculation:result};
}
