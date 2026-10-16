// Coverage checked against Michigan Treasury's city list and Eugene's payroll
// tax guidance on 2026-10-15. Other omitted municipal regimes stay explicit.
// https://www.michigan.gov/taxes/citytax/what-cities-impose-an-income-tax
// https://www.eugene-or.gov/4281/Community-Safety-Payroll-Tax
const michiganCities=new Set(['Albion','Battle Creek','Benton Harbor','Big Rapids','Detroit','East Lansing','Flint','Grand Rapids','Grayling','Hamtramck','Highland Park','Hudson','Ionia','Jackson','Lansing','Lapeer','Muskegon','Muskegon Heights','Pontiac','Port Huron','Portland','Saginaw','Springfield','Walker'].map(x=>x.toLowerCase()));
export function validateTaxPlace(place,year=2026) {
  if(place.taxCoverage?.status==='verified'&&place.taxCoverage.year===year)return;
  if(place.taxCoverage)throw new Error(`Local tax coverage requires further verification for ${place.label}: ${place.taxCoverage.reason}`);
  if(place.localTax?.verified===true && place.localTax.year===year && place.localTax.coverage==='complete_resident_and_work_city')return;
  if(place.taxCityNeedsVerification)throw new Error(`Local tax jurisdiction requires municipal confirmation for ${place.label}`);
  if(['OH','AL','WV'].includes(place.state) || (place.state==='MI' && michiganCities.has(place.city.toLowerCase())) ||
    (place.state==='PA' && place.city!=='Philadelphia') ||
    (place.state==='KY' && !['21111','21067'].includes(place.fips)) ||
    (place.state==='OR' && (place.city==='Eugene' || ['41005','41051','41067'].includes(place.fips))))throw new Error(`Local tax coverage requires further verification for ${place.label}`);
}
