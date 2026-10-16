export const MODEL_VERSION = 'household-budget-surplus-v3';
const number = v => typeof v === 'number' && Number.isFinite(v);
export function interpolateTax(curve, gross) {
  const rows = curve.rows;
  if (!number(gross) || gross < rows[0].gross || gross > rows.at(-1).gross) throw new Error('Salary is outside the verified tax range');
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rows[mid].gross < gross) lo = mid; else hi = mid; }
  const a = rows[lo], b = rows[hi], t = (gross - a.gross) / (b.gross - a.gross || 1);
  return { net: a.net + t * (b.net - a.net), tax: a.tax + t * (b.tax - a.tax),
    filing: t < 0.5 ? a.filing : b.filing,
    jointTax: a.jointTax + t * (b.jointTax - a.jointTax), separateTax: a.separateTax + t * (b.separateTax - a.separateTax) };
}

export function normalizeSalary({ salary, source, baseline, sourceTax, baselineTax, extraLocalAnnual = 0 }) {
  const sourceCost = source.annualCost + extraLocalAnnual;
  const baselineCost = baseline.annualCost + extraLocalAnnual;
  const at = gross => {
    const taxes = interpolateTax(sourceTax, gross);
    const surplus = taxes.net - sourceCost;
    const target = surplus + baselineCost;
    // Tax-credit cliffs can make net income locally nonmonotone. Search the
    // ordered linear segments and choose the lowest gross equivalent.
    let equivalent=null;
    for(let i=1;i<baselineTax.rows.length;i++){
      const a=baselineTax.rows[i-1],b=baselineTax.rows[i];
      if(target<Math.min(a.net,b.net) || target>Math.max(a.net,b.net))continue;
      equivalent=a.gross+(b.gross-a.gross)*(b.net===a.net?0:(target-a.net)/(b.net-a.net));break;
    }
    if(equivalent===null)throw new Error('No nonnegative equivalent salary within the modeled range');
    return { gross, equivalent, taxes, householdNet: taxes.net, annualCost: sourceCost, surplus,
      baselineTax: interpolateTax(baselineTax,equivalent), baselineAnnualCost: baselineCost };
  };
  const mid=at(salary.median);
  const endpoint=gross=>{try{return Math.round(at(gross).equivalent);}catch(e){if(/No nonnegative/.test(e.message))return null;throw e;}};
  return { model: MODEL_VERSION, normalizedMedian: Math.round(mid.equivalent), normalizedMin:endpoint(salary.min),
    normalizedMax:endpoint(salary.max), ...mid,
    equation: 'net(job salary + local spouse pay) − local household budget = net(reference job salary + reference spouse pay) − reference household budget' };
}

export function socialWorkerPay(area) {
  // A weighted mean of occupational medians is not a pooled median. Estimate the
  // median of the mixture by interpolating each available occupation's CDF.
  const codes = ['21-1021','21-1022','21-1023','21-1029'];
  const groups = codes.map(code=>({ code, ...area?.occupations?.[code] })).filter(g=>g.median>0 && g.employment>0 && g.p25>0 && g.p75>g.p25);
  if (!groups.length) return null;
  const weight = groups.reduce((s,g)=>s+g.employment,0);
  const cdf = (g,x) => x <= g.p25 ? Math.max(0, .25*x/g.p25) : x <= g.median ? .25 + .25*(x-g.p25)/(g.median-g.p25 || 1) : x <= g.p75 ? .5 + .25*(x-g.median)/(g.p75-g.median || 1) : Math.min(1,.75 + .25*(x-g.p75)/(g.p75 || 1));
  let low = Math.min(...groups.map(g=>g.p25)), high = Math.max(...groups.map(g=>g.p75));
  for(let i=0;i<45;i++){const mid=(low+high)/2; if(groups.reduce((s,g)=>s+g.employment*cdf(g,mid),0)/weight < .5)low=mid;else high=mid;}
  return { median: Math.round((low+high)/2), method: 'Estimated median of the local social-work occupation mix; interpolated BLS quartiles weighted by employment',
    area: area.name, groups, missingCodes: codes.filter(code=>!groups.some(g=>g.code===code)), vintage:'May 2025' };
}
