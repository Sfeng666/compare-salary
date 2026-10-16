"""JSON-lines adapter to pinned PolicyEngine US. No network or personal tax data."""
import contextlib
import importlib.metadata
import json
import sys

with contextlib.redirect_stdout(sys.stderr):
    from policyengine_us import Simulation
    from verified_tax_policy import verified_local_reform

VERIFIED_LOCAL_REFORM = verified_local_reform()

COMMUNITY = {"AZ", "CA", "ID", "LA", "NV", "NM", "TX", "WA", "WI"}


def calculate(request):
    year = int(request["year"])
    state = request["state"]
    county = request["county"]
    city = request.get("city", "")
    partner = float(request.get("partnerIncome", 0))
    filing = request.get("filing", "lowest_married_tax")
    if filing not in ("single", "joint", "separate", "lowest_married_tax"):
        raise ValueError("Unsupported filing status")
    if filing == "single" and partner:
        raise ValueError("Single filing requires zero partner income")
    gross = request["gross"]
    partners = request.get("partnerIncomes", [partner] * len(gross))
    if len(partners) != len(gross) or any(p < 0 for p in partners):
        raise ValueError("Invalid spouse wage vector")
    if filing == "single" and any(partners):
        raise ValueError("Single filing requires zero partner income")
    local_rules = request.get("localTax")
    if local_rules and (not local_rules.get("verified") or local_rules.get("year") != year):
        raise ValueError("Unverified local tax rules")
    def local_inputs(wages):
        if not local_rules:
            return {}
        income_tax = sum(max(0, wage - rule["exemption_per_person"]) * rule["rate"]
                         for wage in wages for rule in local_rules["income"])
        fees = sum(rule["amount"] * {"year": 1, "month": 12, "week": 52}[rule["period"]]
                   for wage in wages for rule in local_rules["occupational"]
                   if wage > 0 and (wage >= rule["minimum_annual_wages"] if rule.get("threshold_inclusive", True) else wage > rule["minimum_annual_wages"]))
        # TaxUnit inputs also feed federal SALT deductions. This replaces only
        # local regimes whose complete coverage was independently researched.
        return {"local_income_tax_before_refundable_credits": {year: income_tax},
                "local_occupational_tax": {year: fees}}
    people, units, households, families, spms, maritals = {}, {}, {}, {}, {}, {}
    # Compare legal married filing statuses only. Community wages are split for
    # separate income-tax returns; payroll taxes remain on each person's wages.
    modes = ["SINGLE"] if filing == "single" else ["JOINT", "SEPARATE_STANDARD", "SEPARATE_ITEMIZED", "PAYROLL"]
    for mode in modes:
        for i, income in enumerate(gross):
            key = f"{mode}_{i}"
            a, b = f"a_{key}", f"b_{key}"
            members = [a] if mode == "SINGLE" else [a, b]
            earned = [float(income)] if mode == "SINGLE" else [float(income), partners[i]]
            if mode.startswith("SEPARATE") and state in COMMUNITY:
                earned = [sum(earned) / 2] * 2
            for name, wage in zip(members, earned):
                people[name] = {"age": {year: 40}, "employment_income": {year: wage},
                                "is_tax_unit_dependent": {year: False}}
                if state == "PA" and city == "Philadelphia":
                    people[name].update({"pa_philadelphia_wage_tax_taxable_wages": {year: wage}, "pa_philadelphia_wage_tax_resident": {year: True}})
                if state == "MO" and city in ("St. Louis", "Saint Louis", "Kansas City"):
                    prefix = "mo_kansas_city" if city == "Kansas City" else "mo_st_louis"
                    people[name][prefix + "_earnings_tax_taxable_earnings"] = {year: wage}
                if state == "CO" and city in ("Denver", "Glendale", "Greenwood Village", "Sheridan"):
                    slug = city.lower().replace(" ", "_")
                    threshold = {"Denver": 500, "Glendale": 750, "Greenwood Village": 250, "Sheridan": 500}[city]
                    people[name][f"co_{slug}_employee_occupational_privilege_tax_months"] = {year: 12 if wage/12 >= threshold else 0}
            if mode in ("JOINT", "SINGLE"):
                units[key] = {"members": members, "filing_status": {year: mode}, "tax_unit_married": {year: mode == "JOINT"}}
                units[key].update(local_inputs(earned))
            else:
                for name, wage in zip(members, earned):
                    units[name] = {"members": [name], "filing_status": {year: "SEPARATE"},
                                   "tax_unit_married": {year: False},
                                   "tax_unit_itemizes": {year: mode == "SEPARATE_ITEMIZED"},
                                   "separate_filer_itemizes": {year: mode == "SEPARATE_ITEMIZED"}}
                    units[name].update(local_inputs([wage]))
            households[key] = {"members": members, "state_code": {year: state}, "county_fips": {year: county}}
            if state == "NY":
                households[key]["in_yonkers"] = {year: city == "Yonkers"}
            if state == "DE":
                households[key]["in_wilmington"] = {year: city == "Wilmington"}
            families[key] = {"members": members}
            spms[key] = {"members": members}
            maritals[key] = {"members": members}
    situation = {"people": people, "tax_units": units, "households": households,
                 "families": families, "spm_units": spms, "marital_units": maritals}
    with contextlib.redirect_stdout(sys.stderr):
        sim = Simulation(situation=situation, reform=VERIFIED_LOCAL_REFORM)
        # Income + employee payroll + local income taxes. Sales/use taxes belong
        # in the consumption budget, so household_tax would double count them.
        values = {}
        for var in ("income_tax", "state_income_tax", "local_tax", "employee_payroll_tax"):
            values[var] = sim.calculate(var, year, map_to="household").tolist()
        unit_values = {v: dict(zip(units, sim.calculate(v, year, map_to="tax_unit").tolist()))
                       for v in ("income_tax", "state_income_tax", "local_tax")}
        person_payroll = dict(zip(people, sim.calculate("employee_payroll_tax", year, map_to="person").tolist()))
    n = len(gross)
    rows = []
    for i, income in enumerate(gross):
        partner = partners[i]
        options = []
        for mode, offset in ([("SINGLE", 0)] if filing == "single" else [("JOINT", 0), ("SEPARATE_STANDARD", n), ("SEPARATE_ITEMIZED", 2*n)]):
            parts = {v: values[v][offset+i] for v in values}
            if mode.startswith("SEPARATE"):
                parts["employee_payroll_tax"] = values["employee_payroll_tax"][3*n+i]
            total_tax = sum(parts.values())
            if mode.startswith("SEPARATE"):
                own = []
                own_parts = []
                for who in ("a", "b"):
                    unit = f"{who}_{mode}_{i}"
                    item = {k: v[unit] for k, v in unit_values.items()}
                    item["employee_payroll_tax"] = person_payroll[f"{who}_PAYROLL_{i}"]
                    own_parts.append(item)
                    own.append(sum(item.values()))
            else:
                share = income / (income + partner) if income + partner else 1
                own = [total_tax * share, total_tax * (1-share)]
                own_parts = [{k: v * share for k, v in parts.items()}, {k: v * (1-share) for k, v in parts.items()}]
            options.append({"filing": mode, "tax": total_tax, "parts": parts, "yourTax": own[0], "spouseTax": own[1], "yourParts": own_parts[0], "spouseParts": own_parts[1]})
        eligible = options if filing in ("single", "lowest_married_tax") else options[:1] if filing == "joint" else options[1:]
        best = min(eligible, key=lambda x: x["tax"])
        rows.append({"gross": income, "net": income + partner - best["tax"], **best,
                     "jointTax": options[0]["tax"], "separateTax": min((o["tax"] for o in options[1:]), default=options[0]["tax"])})
    return {"engine": "PolicyEngine US", "version": importlib.metadata.version("policyengine-us"),
            "year": year, "rows": rows}


for line in sys.stdin:
    try:
        request = json.loads(line)
        result = calculate(request)
        print(json.dumps({"id": request.get("id"), "result": result}), flush=True)
    except Exception as exc:
        print(json.dumps({"id": locals().get("request", {}).get("id"), "error": str(exc)}), flush=True)
