# compare salary

[Open the calculator](https://sfeng666.github.io/compare-salary/) · [Data licenses](DATA_LICENSE.md)

Compare a US salary with the gross salary in another city that leaves the same money after income taxes and a local household budget. The calculation is deterministic. Agents gather missing facts; they do not calculate the result.

The website works without an account, API key or agent. It contains budgets for 3,143 counties and a gazetteer of about 168,000 named places. Unknown cities with a valid US state use an explicitly labeled state approximation. The repository hosts the data and accepts sourced location contributions.

## What the result means

The calculator solves:

```
net(job salary + source spouse income) - source living costs
  = net(equivalent job salary + reference spouse income) - reference living costs
```

Costs include rent and basic utilities, food, transport, health care and other necessities. Dollars left over retain their face value for savings and purchases whose prices do not vary with local costs. This model preserves a specified household budget and nominal surplus; it does not claim that every lifestyle has one equivalent salary.

“Before tax” is the equivalent annual salary of the job holder. “After tax” is the take-home income at that equivalent salary. For a couple, the headline take-home figure includes both spouses. Detailed salary & costs also shows each person’s gross and after-tax salary. Joint tax is allocated in proportion to gross income; separate filing uses each person’s modeled income and payroll taxes. Hover, focus or tap any amount to see its formula and numeric inputs. Monthly money after rent excludes rent only, so other expenses still have to be paid.

Default: Single filing, one adult, no children, one-bedroom rental, full-year US tax residence at the job location, tax year 2026. Single and Married filing separately are distinct choices. Fully remote work requires an explicit residence. Married users can choose joint, separate or the lower modeled tax and enter only the spouse’s gross annual salary at the source location. The calculator solves both comparison-city salaries together, preserving their source gross-income ratio and the household’s remaining dollars after its budget. Studio, one-bedroom and two-bedroom rentals, paid hours and extra annual costs are configurable.

## Install and run

Requires Node.js 20 or later. Install from this GitHub repository; an npm registry release is not required.

```sh
git clone https://github.com/Sfeng666/compare-salary.git
cd compare-salary
npm ci
node bin/compare-salary.mjs compare --location "Boston, MA" --salary 100000 --reference "Madison, WI"
```

Or install the commands globally with `npm install -g github:Sfeng666/compare-salary`.

```sh
compare-salary compare --remote --residence "Madison, WI" --salary 100000 --reference "Boston, MA"
compare-salary compare --location "Berkeley, CA" --salary 79788 --reference "Madison, WI" \
  --filing lowest_married_tax --adults 2 --bedrooms 2 --partner-income 60000
```

Use `--input request.json` for the full API input. Salary periods are year, month, week and hour. Hourly inputs use 2,080 paid hours by default. The package exports `compareSalary(input, database, {taxCurve})` and the lower-level `normalizeSalary` function for adapters with existing tax curves and budgets.

## Tax calculation

The website, CLI and MCP use interpolated tax tables generated with **PolicyEngine US 2.42.14**. Employee Social Security, Medicare, additional Medicare and state payroll contributions are calculated per worker. Joint income-tax tables assume equally split earnings; deductions and credits can differ for the actual earnings split.

Local taxes have their own source-backed coverage records in `data/local-tax-coverage.json`. They include statewide evidence for zero local wage tax, all 92 Indiana county rates, all Maryland counties and Baltimore City, NYC and Yonkers, and supported city earnings taxes and employee fees. The 118 county/city curves in `data/local-tax-tables.json` include local taxes and their effect on federal deductions. These tables apply the verified 2026 Indiana and Maryland rate corrections. Simple city rules use employee liabilities only.

Each result shows a separate local-tax amount. Assumptions & sources contains a brief note about omitted unverified local taxes and links to research them. An unresolved jurisdiction stays labeled incomplete; zero included tax is not evidence of zero tax owed. The [database audit](data/tax-coverage-audit.json) accounts for every named place, and [research queue](data/tax-research-queue.json) lists the unresolved ones. This is partial verification, not nationwide certification. Postal names, city boundaries, counties and school districts can differ. Rules are scoped to full-year resident employees living and working in the same city, with level earnings over 12 months. Published curves interpolate income points and remain estimates, especially near tax-credit or whole-income rate thresholds.

The website calculates salaries in the browser. The local companion supports Codex location research and an optional API relay. To use it, run `compare-salary serve` and open the localhost link it prints. The link connects with a temporary token; the companion listens on loopback and checks browser origins.

## Agent installation

The MCP server uses standard local stdio transport. It was tested with the official MCP client SDK. Individual client releases may use different configuration screens.

Codex app/CLI:

```sh
codex mcp add compare-salary -- node /absolute/path/compare-salary/bin/mcp.mjs
```

Claude Code:

```sh
claude mcp add --transport stdio compare-salary -- node /absolute/path/compare-salary/bin/mcp.mjs
```

Cursor and Antigravity can use the same server definition in their MCP configuration:

```json
{
  "mcpServers": {
    "compare-salary": {
      "command": "node",
      "args": ["/absolute/path/compare-salary/bin/mcp.mjs"]
    }
  }
}
```

See the current [Cursor MCP instructions](https://cursor.com/docs/context/mcp), [Claude Code instructions](https://code.claude.com/docs/en/mcp), and [Antigravity MCP instructions](https://antigravity.google/docs/mcp). The host agent supplies its existing search/browser tools and subscription for research. The MCP server itself does not purchase API calls.

For a skill instead, copy `skills/compare-salary` into your agent's skills directory, or run:

```sh
compare-salary install-skill /path/to/your/agent/skills
```

The skill calls the installed calculator. MCP tools include `compare_salary`, `lookup_location`, `research_location_prompt`, `save_location` and `prepare_location_contribution`.

## Research options

Enter a location and choose a provider in Agent setup, then select Research location. Provider endpoints and models are prefilled. Review the returned sources and select Use this location to save the entry. Calculations reuse known data without an agent request. A known city can still need tax research; its result has a Research taxes for this city button.

- **Groq:** the default GPT-OSS model uses Groq’s built-in browser search. A Groq API key is required.
- **NVIDIA:** the page retrieves official Census geography itself, then asks the selected NVIDIA model to check that evidence. An NVIDIA API key is required. This mode improves county matching and reuses published county costs; it does not independently research new rent or tax rules.
- **Gemini or OpenAI:** uses the provider’s hosted web-search tool. Custom chat APIs use the same automatic Census evidence retrieval as NVIDIA.
- **Existing coding-agent subscription:** the skill/MCP uses the host agent’s search tools. My Codex subscription connects to a local companion and uses Codex CLI with GPT-6 Luna.
- **No AI:** Official location lookup retrieves Census geography without a key. State approximations remain available when the city cannot be resolved.

Groq and NVIDIA account quotas or trial credits may allow free use; availability and search charges depend on the provider. There is no model download or source-text pasting. API keys are held only in the current tab and sent to the selected provider. If a provider blocks browser requests, open the local companion link and use its relay; it forwards requests only to the selected provider’s official endpoint. The relay receives the key for that request and does not save it.

The Census lookup selects the county containing the place’s internal point. For places spanning counties, review whether that county matches the intended home or work address. AI search results still require source review before contribution.

Search-capable agents must return a `taxReview` covering city, county, school-district and employee local payroll taxes, with the tax year, review date and government citations. They must check the tax base, exemptions, credits, thresholds and effective dates. A complete review requires supported `localTax` rules; missing evidence or rules that the calculator cannot represent stay unresolved. The current contribution format supports wage rates with per-person exemptions and fixed employee fees. It rejects unsupported caps, brackets or tax bases instead of silently ignoring them. Complex rules can be added to the shared model and table builder through code review. Geography-only NVIDIA/custom API and Census lookups reuse existing verified tax coverage but cannot certify a new tax rule.

## Your own database

The complete public database lives in `data/`. Clone it for offline use. The CLI accepts `--data /path/to/database`; additions are stored in `~/.local/share/compare-salary/locations`, or the directory set by `COMPARE_SALARY_DATA`.

The website keeps your added entries in browser storage. You can import and export them as JSON. Clearing browser storage removes that local copy, so export entries you want to retain. Website salary calculations stay in the browser; location research sends only public location inputs to the selected provider.

```sh
compare-salary research-prompt "City, ST"
compare-salary add-location researched-entry.json
compare-salary contribute researched-entry.json
```

`contribute` uses your existing GitHub CLI authentication or `GITHUB_TOKEN`, creates a fork if needed, commits the one public location entry to a branch, and opens a pull request. The website offers the same flow with a token kept in memory, or a GitHub fork-and-edit link. Never include salary, employer, job history or credentials in a location entry.

## Review and publishing

Data PRs are checked with a validator from the trusted base commit. Contributor code is not executed with repository secrets. Reviewers must verify sources, geography, units, tax coverage and licensing; `AGENTS.md` contains the review instructions.

Enable Codex cloud review for this repository in your [Codex GitHub review settings](https://chatgpt.com/settings/code-review). GitHub authorization and access to the new repository are account settings, not something the repository can grant itself. The optional merge workflow uses `LOCATION_AUTO_MERGE=true` and `LOCATION_REVIEWER=<exact reviewer login>`; it requires a formal APPROVED review on the current commit and successful checks. The validator records its result on that same commit, and trusted base-branch code rechecks after validation or a review event, including for fork contributions. A thumbs-up reaction, a COMMENTED review or an old approval does not authorize merging. Confirm that the configured reviewer produces a formal approval before enabling this workflow. Code changes cannot use this data-only merge path.

The Pages workflow tests the package, validates data and publishes `dist/`. To run locally: `npm test`, `npm run validate:data`, `npm run build`, then `npm run serve`.

## Data and limitations

EPI nonhousing budgets are in 2025 dollars, HUD rents are FY2027 and BLS wages are May 2025. EPI health costs assume individual insurance, and transport budgets include commuting; actual benefits and remote-work expenses may differ. HUD fair-market rent is a regional benchmark, not a live apartment quote.

The optional Career Ops adapter can use the pooled social-worker median. It is an estimate from available BLS occupational quartiles weighted by employment, with a state fallback when metro data are missing. It is not a weighted average of occupation medians.

The calculator covers US resident wage earners with no children and one or two adults. It does not model cross-border work, nonresident taxation, self-employment, equity, bonuses, retirement deductions, unusual benefits or every local tax regime. Very low income can have no nonnegative equivalent gross salary under the chosen household budget; the tool reports that instead of inventing a result.

Code is MIT. The EPI-derived data collection is **CC BY-NC-SA 4.0**, so commercial redistribution needs separate permission or replacement data. GeoNames attribution and all source hashes are preserved. See [DATA_LICENSE.md](DATA_LICENSE.md).

Maintainers can install the pinned Python dependencies in `requirements.txt` to rebuild published tax tables. Rebuild data with `python scripts/build-data.py /path/to/publisher-downloads` and federal/state tax tables with `python scripts/build-tax-tables.py`. After reviewing government sources, update `scripts/build-local-tax-coverage.mjs`, run it, then run `python scripts/build-local-tax-tables.py` and `npm run audit:tax`. The audit uses only published entries, never personal additions. The original budget and rent download URLs and SHA-256 hashes are recorded in `data/base.json`.
