// A missing rule is unknown, never evidence of a zero rate. All decisions are
// scoped to full-year resident employees living and working in the same city.
export const TAX_SCOPE = ['city', 'county', 'school_district', 'employee_local_payroll'];
const key = x => String(x || '').toLowerCase().replace(/^saint /, 'st. ').trim();

export function resolveTaxCoverage(catalog, place, entry, year = 2026) {
  const unknown = (status, reason, sources = []) => ({year, status, reason, sources, needsResearch: true});
  if (entry?.taxReview && entry.taxReview.year === year && entry.taxReview.status !== 'complete') {
    return unknown(entry.taxReview.status, entry.taxReview.reason, entry.sources.filter(s => s.fields.includes('taxReview')));
  }
  if (entry?.localTax?.verified && entry.localTax.year === year && entry.localTax.coverage === 'complete_resident_and_work_city') {
    return {year, status: 'verified', reason: 'Sourced local wage-tax rules for this city.', sources: entry.sources.filter(s => s.fields.includes('localTax')), localTax: entry.localTax, needsResearch: false};
  }
  if (!catalog || catalog.year !== year) return unknown('needs_research', `No local wage-tax coverage record for ${year}.`);
  let rule = catalog.cities.find(r => r.state === place.state && r.names.some(n => key(n) === key(place.city)));
  if (rule?.fips && !rule.fips.includes(place.fips)) rule = null;
  rule ||= catalog.counties[place.fips];
  rule ||= catalog.states[place.state];
  if (!rule) return unknown('needs_research', 'Local wage taxes have not been researched.');
  const sources = (rule.sources || []).map(id => catalog.sources[id]);
  if (rule.status !== 'verified') return unknown(rule.status, rule.reason, sources);
  if (rule.type === 'none') return {year, status: 'verified', reason: rule.reason, sources, needsResearch: false, localTax: {year, verified: true, coverage: 'complete_resident_and_work_city', income: [], occupational: []}};
  if (rule.type === 'simple') return {year, status: 'verified', reason: rule.reason, sources, needsResearch: false, localTax: {year, verified: true, coverage: 'complete_resident_and_work_city', ...rule.rules}};
  if (rule.type === 'policyengine') return {year, status: 'verified', reason: rule.reason, sources, needsResearch: false, tableId: rule.tableId, model: rule.model};
  return unknown('needs_research', 'The researched local tax cannot yet be calculated.', sources);
}

export function taxCoverageMessage(place) {
  const c = place.taxCoverage;
  if (!c || c.status !== 'verified') return `${place.label}: ${c?.reason || 'Local wage taxes are unverified.'} The estimate may omit local tax and overstate take-home pay.`;
  return `${place.label}: ${c.reason}`;
}

export function validateTaxReview(review, entry) {
  if (!review || review.year !== 2026 || !['complete', 'needs_research', 'address_required'].includes(review.status) ||
      typeof review.reason !== 'string' || !review.reason.trim() || review.reason.length > 1000 ||
      !Number.isFinite(Date.parse(review.checkedAt)) || Date.parse(review.checkedAt) > Date.now() + 86400000) throw Error('Invalid local tax review');
  if (Object.keys(review).some(k => !['year', 'status', 'reason', 'checkedAt', 'jurisdictions'].includes(k))) throw Error('Unexpected tax review field');
  if (review.status === 'complete') {
    if (!entry.localTax || !TAX_SCOPE.every(k => review.jurisdictions?.includes(k)) ||
        !entry.sources.some(s => s.fields.includes('taxReview'))) throw Error('Complete tax review needs rules and evidence for every local jurisdiction');
  } else if (entry.localTax) throw Error('Unresolved tax review cannot claim complete local tax rules');
}

export function validateTaxCatalog(catalog) {
  if (catalog.schemaVersion !== 1 || catalog.year !== 2026 || !Array.isArray(catalog.cities)) throw Error('Invalid local-tax catalog');
  for (const [id, s] of Object.entries(catalog.sources)) {
    if (!s.title || !s.summary || !s.retrievedAt || new URL(s.url).protocol !== 'https:') throw Error(`Invalid tax source ${id}`);
  }
  for (const rule of [...Object.values(catalog.states), ...Object.values(catalog.counties), ...catalog.cities]) {
    if (!['verified', 'needs_research', 'address_required'].includes(rule.status) || !rule.reason) throw Error('Invalid tax coverage status');
    if (rule.sources.some(id => !catalog.sources[id])) throw Error('Missing tax coverage source');
    if (rule.status === 'verified' && (!rule.sources.length || !['none', 'simple', 'policyengine'].includes(rule.type))) throw Error('Verified tax coverage needs sourced calculation rules');
    if (rule.type === 'policyengine' && (!rule.tableId || !rule.model)) throw Error('Missing local tax model');
    if (rule.type === 'simple') {
      const t = rule.rules;
      if (!Array.isArray(t?.income) || !Array.isArray(t?.occupational)) throw Error('Invalid local rules');
      for (const r of t.income) if (!(r.rate >= 0 && r.rate <= .15 && r.exemption_per_person >= 0)) throw Error('Invalid wage tax rate');
      for (const r of t.occupational) if (!(r.amount >= 0 && r.amount <= 10000 && ['year', 'month', 'week'].includes(r.period) && r.minimum_annual_wages >= 0)) throw Error('Invalid employee fee');
    }
  }
  return catalog;
}
