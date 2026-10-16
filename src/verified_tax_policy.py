"""Apply only source-checked 2026 county rates to the pinned tax model."""
import json
from pathlib import Path
from policyengine_core.reforms import Reform

ROOT = Path(__file__).resolve().parents[1]


def verified_local_reform():
    catalog = json.loads((ROOT / 'data/local-tax-coverage.json').read_text())
    counties = json.loads((ROOT / 'data/base.json').read_text())['counties']

    def modify(parameters):
        for group, state in [('inRateByFips', 'IN'), ('mdRateByFips', 'MD')]:
            node = getattr(parameters.gov.states, 'in').tax.income.county_rates if state == 'IN' else parameters.gov.local.md.flat_rate
            for fips, rate in catalog['parameterOverrides'][group].items():
                name = counties[fips]['name'].upper().replace('.', '').replace("'", '_').replace(' ', '_') + '_' + state
                node.children[name].update(period='2026', value=rate)
        return parameters

    class VerifiedLocalRates(Reform):
        def apply(self):
            self.modify_parameters(modify)

    return VerifiedLocalRates
