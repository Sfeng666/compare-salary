"""Precompute county/city income and local tax together, including SALT effects.

Uses sourced rate overrides. Joint tables retain the equal-earner approximation.
"""
import contextlib
import gc
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
with contextlib.redirect_stdout(sys.stderr):
    from policyengine_us import Simulation
    from verified_tax_policy import verified_local_reform

catalog = json.loads((ROOT / 'data/local-tax-coverage.json').read_text())
taxes = json.loads((ROOT / 'data/tax-tables.json').read_text())
gross = taxes['gross']
targets = [(fips, fips[:2], fips, '') for fips, rule in catalog['counties'].items() if rule.get('model') in ['in_county', 'md_county']]
targets += [('nyc', '36', '36061', 'New York City'), ('yonkers', '36', '36119', 'Yonkers')]
states = {'18': 'IN', '24': 'MD', '36': 'NY'}
result = {'year': 2026, 'engine': 'PolicyEngine US 2.42.14 + sourced 2026 county rates',
          'checkedAt': catalog['checkedAt'], 'gross': gross, 'tables': {}}
reform = verified_local_reform()
tax_system = None
for number, (table_id, prefix, fips, city) in enumerate(targets):
    people, units, households, families, spms, maritals = {}, {}, {}, {}, {}, {}
    for mode in ['SINGLE', 'JOINT', 'SEPARATE']:
        for i, g in enumerate(gross):
            key = f'{mode}_{i}'
            members = [key + 'a', key + 'b'] if mode == 'JOINT' else [key + 'a']
            for p in members:
                people[p] = {'age': {2026: 40}, 'employment_income': {2026: g / len(members)}, 'is_tax_unit_dependent': {2026: False}}
            units[key] = {'members': members, 'filing_status': {2026: mode}, 'tax_unit_married': {2026: mode == 'JOINT'}}
            households[key] = {'members': members, 'state_code': {2026: states[prefix]}, 'county_fips': {2026: fips}}
            if prefix == '36':
                households[key]['in_yonkers'] = {2026: city == 'Yonkers'}
            families[key] = {'members': members}
            spms[key] = {'members': members}
            maritals[key] = {'members': members}
    with contextlib.redirect_stdout(sys.stderr):
        situation = {'people': people, 'tax_units': units, 'households': households, 'families': families, 'spm_units': spms, 'marital_units': maritals}
        sim = Simulation(situation=situation, tax_benefit_system=tax_system, **({'reform': reform} if tax_system is None else {}))
        tax_system = sim.tax_benefit_system
        federal = sim.calculate('income_tax', 2026, map_to='household').tolist()
        state = sim.calculate('state_income_tax', 2026, map_to='household').tolist()
        local = sim.calculate('local_tax', 2026, map_to='household').tolist()
    n = len(gross)
    result['tables'][table_id] = {
        mode.lower(): {'income': [round(federal[j] + state[j], 2) for j in range(k*n, (k+1)*n)],
                       'local': [round(local[j], 2) for j in range(k*n, (k+1)*n)]}
        for k, mode in enumerate(['SINGLE', 'JOINT', 'SEPARATE'])}
    del sim
    gc.collect()
    if number % 10 == 0:
        print(f'{number + 1}/{len(targets)} local tax tables', flush=True)
(ROOT / 'data/local-tax-tables.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(f'Wrote {len(targets)} local tax tables', flush=True)
