"""Tabulate 2026 federal/state income tax; payroll and local tax are added at runtime.
Married joint tables assume equally split earnings; published results are approximations.
The local PolicyEngine adapter calculates both actual wages when installed.
"""
import json, contextlib, sys
from pathlib import Path
from policyengine_us import Simulation
ROOT=Path(__file__).resolve().parents[1]
base=json.loads((ROOT/'data/base.json').read_text());cities=json.loads((ROOT/'data/cities.json').read_text())
gross=list(range(0,300001,1000))+list(range(305000,2000001,5000))
result={'year':2026,'engine':'PolicyEngine US 2.42.14','method':'Interpolated federal/state income tax. Joint tables use equally split wages; local tax and per-worker payroll added separately. No children, age 40, no pretax deductions.','gross':gross,'states':{}}
for state in sorted({c['state'] for c in base['counties'].values()}):
    city=max((c for c in cities.values() if c['state']==state),key=lambda c:c['population'])
    people={};units={};households={};families={};spms={};maritals={}
    for mode in ['SINGLE','JOINT','SEPARATE']:
        for i,g in enumerate(gross):
            key=f'{mode}_{i}';members=[key+'a',key+'b'] if mode=='JOINT' else [key+'a']
            for p in members:people[p]={'age':{2026:40},'employment_income':{2026:g/len(members)},'is_tax_unit_dependent':{2026:False}}
            units[key]={'members':members,'filing_status':{2026:mode},'tax_unit_married':{2026:mode=='JOINT'}}
            households[key]={'members':members,'state_code':{2026:state},'county_fips':{2026:city['fips']}}
            families[key]={'members':members};spms[key]={'members':members};maritals[key]={'members':members}
    with contextlib.redirect_stdout(sys.stderr):
        sim=Simulation(situation={'people':people,'tax_units':units,'households':households,'families':families,'spm_units':spms,'marital_units':maritals})
        federal=sim.calculate('income_tax',2026,map_to='household').tolist();stateTax=sim.calculate('state_income_tax',2026,map_to='household').tolist()
    n=len(gross);row={mode.lower():[round(federal[j]+stateTax[j],2) for j in range(k*n,(k+1)*n)] for k,mode in enumerate(['SINGLE','JOINT','SEPARATE'])}
    row['referenceCounty']=city['fips'];result['states'][state]=row
    print(state,flush=True)
    (ROOT/'data/tax-tables.json').write_text(json.dumps(result,separators=(',',':')))
