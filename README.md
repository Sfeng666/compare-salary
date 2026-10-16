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

“Before tax” is the equivalent annual salary of the job holder. “After tax” is the take-home income at that equivalent salary. For a couple, after-tax figures are **household** income, including the spouse; joint tax cannot be uniquely assigned to one spouse. Monthly money after rent excludes rent only, so other expenses still have to be paid.

Default: Single filing, one adult, no children, one-bedroom rental, full-year US tax residence at the job location, tax year 2026. Single and Married filing separately are distinct choices. Fully remote work requires an explicit residence. Married users can choose joint, separate or the lower modeled tax, with fixed spouse pay or estimated local social-worker median pay. Bedrooms, paid hours and extra annual costs are configurable.

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
  --filing lowest_married_tax --adults 2 --bedrooms 2 --spouse local_social_worker
```

Use `--input request.json` for the full API input. Salary periods are year, month, week and hour. Hourly inputs use 2,080 paid hours by default. The package exports `compareSalary(input, database, {taxCurve})` and the lower-level `normalizeSalary` function for adapters with existing tax curves and budgets.

## Tax calculation

The browser and default CLI use interpolated federal/state tax tables generated with **PolicyEngine US 2.42.14**. Employee Social Security, Medicare, additional Medicare and state payroll contributions are calculated per worker. Joint income-tax tables assume equally split earnings; deductions and credits can differ for the actual earnings split. City/county taxes are added only when a researched entry provides complete local rules. The result explicitly warns when those taxes are omitted.

For detailed local calculations, install the pinned Python engine:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
compare-salary compare --location "Boston, MA" --salary 100000 --reference "Madison, WI" --python .venv/bin/python
```

The detailed engine uses both actual wages, federal and state income tax, employee payroll tax and supported local taxes. It compares married filing options, including community-property treatment where applicable. Unsupported municipal rules remain unresolved until researched. It models two 40-year-old adults or one 40-year-old adult, no children, wage income and no voluntary pretax deductions. PolicyEngine is a separate AGPL dependency.

To connect the website to your local engine:

```sh
npm run build
COMPARE_SALARY_PYTHON="$PWD/.venv/bin/python" compare-salary serve
```

The command prints a localhost URL and a temporary token. Enter the token under Research & data options and select “Calculate with my local tax engine.” Salary inputs are then sent only to that local companion. The companion listens on loopback, checks browser origins and requires the temporary token for API access.

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

- **No agent:** deterministic county data or state approximations.
- **Existing coding-agent subscription:** use the skill/MCP with the host agent's search tools. The optional local browser companion invokes Codex CLI with GPT-6 Luna for missing locations.
- **Free browser AI:** an optional WebLLM Qwen model extracts a structured entry from public source excerpts you provide. It downloads model weights and requires WebGPU. It cannot independently browse; unmatched quotes are rejected.
- **Your API agent:** enter an OpenAI Responses endpoint with web search, a Gemini endpoint with Google Search, or a browser-compatible chat endpoint with source excerpts you supply. Search capability and charges depend on your provider. API keys stay in tab memory and are sent only to the endpoint you enter. Known locations do not trigger agent requests.

Agent output must pass the schema validator. Source verification is still required: valid JSON does not prove that an excerpt is true or applies to the location. Agents should return unknown when official evidence is insufficient.

## Your own database

The complete public database lives in `data/`. Clone it for offline use. The CLI accepts `--data /path/to/database`; additions are stored in `~/.local/share/compare-salary/locations`, or the directory set by `COMPARE_SALARY_DATA`.

The website keeps your added entries in browser storage. You can import and export them as JSON. Clearing browser storage removes that local copy, so export entries you want to retain. The page never sends salary input to GitHub or an AI provider automatically.

```sh
compare-salary research-prompt "City, ST"
compare-salary add-location researched-entry.json
compare-salary contribute researched-entry.json
```

`contribute` uses your existing GitHub CLI authentication or `GITHUB_TOKEN`, creates a fork if needed, commits the one public location entry to a branch, and opens a pull request. The website offers the same flow with a token kept in memory, or a GitHub fork-and-edit link. Never include salary, employer, job history or credentials in a location entry.

## Review and publishing

Data PRs are checked with a validator from the trusted base commit. Contributor code is not executed with repository secrets. Reviewers must verify sources, geography, units, tax coverage and licensing; `AGENTS.md` contains the review instructions.

Enable Codex cloud review for this repository in your [Codex GitHub review settings](https://chatgpt.com/codex/settings/code-review). GitHub authorization and access to the new repository are account settings, not something the repository can grant itself. The optional merge workflow uses `LOCATION_AUTO_MERGE=true` and `LOCATION_REVIEWER=<exact reviewer login>`; it requires a formal APPROVED review on the current commit and successful checks. A thumbs-up reaction or an old review does not authorize merging. Code changes cannot use this data-only merge path.

The Pages workflow tests the package, validates data and publishes `dist/`. To run locally: `npm test`, `npm run validate:data`, `npm run build`, then `npm run serve`.

## Data and limitations

EPI nonhousing budgets are in 2025 dollars, HUD rents are FY2027 and BLS wages are May 2025. EPI health costs assume individual insurance, and transport budgets include commuting; actual benefits and remote-work expenses may differ. HUD fair-market rent is a regional benchmark, not a live apartment quote.

The pooled social-worker median is an estimate from available BLS occupational quartiles weighted by employment, with a state fallback when metro data are missing. It is not a weighted average of occupation medians.

Version 1 covers US resident wage earners with no children and one or two adults. It does not model cross-border work, nonresident taxation, self-employment, equity, bonuses, retirement deductions, unusual benefits or every local tax regime. Very low income can have no nonnegative equivalent gross salary under the chosen household budget; the tool reports that instead of inventing a result.

Code is MIT. The EPI-derived data collection is **CC BY-NC-SA 4.0**, so commercial redistribution needs separate permission or replacement data. GeoNames attribution and all source hashes are preserved. See [DATA_LICENSE.md](DATA_LICENSE.md).

Rebuild data with `python scripts/build-data.py /path/to/publisher-downloads` and tax tables with `python scripts/build-tax-tables.py` in the pinned Python environment. The original download URLs and SHA-256 hashes are recorded in `data/base.json`.
