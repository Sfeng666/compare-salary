# Data licenses and attribution

Code is MIT licensed. Data keep the licenses of their sources.

`data/base.json` contains an adaptation of **Economic Policy Institute. 2026. Family Budget Calculator**, in 2025 dollars. The nonhousing budgets are selected for one or two adults with no children; housing is replaced by HUD FY2027 rents. This adapted collection is distributed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Attribution, noncommercial use and share-alike terms apply. EPI does not endorse this tool. Commercial users need EPI's permission or a replacement budget dataset. See [EPI's use terms and methodology](https://www.epi.org/resources/budget/).

HUD rents, BLS occupational wages and Census crosswalks are US government public data. `data/cities.json` adapts the [GeoNames](https://www.geonames.org/) gazetteer under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes select populated places and reconcile Connecticut counties.

`data/tax-tables.json` and `data/local-tax-tables.json` contain numerical outputs from PolicyEngine US 2.42.14. Local tables apply the sourced 2026 county rate corrections in `src/verified_tax_policy.py`. PolicyEngine is a separate AGPL-3.0 dependency; its source is available at https://github.com/PolicyEngine/policyengine-us. The tax tables describe the documented hypothetical households, not official tax determinations.

`data/local-tax-coverage.json` records tax facts and short paraphrases of government publications, with source URLs and review dates. It does not reproduce those publications. The tax coverage audit and unresolved-location queue combine these records with the GeoNames-derived place index; GeoNames attribution and CC BY 4.0 terms apply to that place data.

Publisher URLs, snapshot hashes and vintages are included in `data/base.json`. Location contributions must identify their sources and license, contain no personal data, and permit redistribution under CC BY-NC-SA 4.0. Source excerpts must be brief. Contributors license their original database entries under CC BY-NC-SA 4.0.
