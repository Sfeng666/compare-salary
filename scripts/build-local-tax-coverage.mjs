// Curated facts checked against the linked government publications on 2026-10-16.
// Regenerate the compact catalog, then build the local tax tables and audit.
import fs from 'node:fs';
import {STATES} from '../src/locations.mjs';
const checked='2026-10-16',year=2026;
const sources={};
const source=(id,title,url,summary)=>{sources[id]={title,url,retrievedAt:checked,summary};return id;};
const states=Object.fromEntries(Object.keys(STATES).map(s=>[s,{status:'needs_research',reason:'Local wage-tax coverage still needs source verification for this state.',sources:[]}]))
const none=(state,id,title,url,summary)=>{source(id,title,url,summary);states[state]={status:'verified',type:'none',reason:'No local wage income tax applies under the cited statewide rule.',sources:[id]};};
none('WI','wi-law','Wisconsin Statutes 66.0611','https://docs.legis.wisconsin.gov/statutes/statutes/66/vi/0611','Wisconsin prohibits political subdivisions from taxing income or using income as a tax measure.');
none('CA','ca-law','California Office of Tax Appeals: R&TC 17041.5, footnote 20','https://ota.ca.gov/wp-content/uploads/sites/54/2024/11/2024-OTA-377P-Mather-rev1-1.pdf','California prohibits local personal income taxes. Business gross-receipts taxes are employer liabilities, outside this employee wage model.');
none('AZ','az-law','Arizona Revised Statutes 43-201','https://www.azleg.gov/ars/43/00201.htm','Income taxation is reserved to the state while urban revenue sharing under 43-206 remains in effect.');
none('WA','wa-law','Washington RCW 1.90.100','https://app.leg.wa.gov/RCW/default.aspx?cite=1.90.100','For 2026, state law prohibits local personal income taxes. Employer payroll-expense taxes do not reduce employee wages in this model.');
none('FL','fl-law','Florida Constitution, Article VII, sections 5 and 9','https://www.flsenate.gov/Laws/Constitution/','Personal income taxation is constitutionally prohibited; local taxing authority does not create an exception for employee wages.');
none('NV','nv-law','Nevada Constitution, Article 10, section 1(9)','https://www.leg.state.nv.us/Const/NvConst.html','The constitution prohibits taxes on natural persons’ wages and personal income.');
none('LA','la-law','Louisiana Constitution, Article VII, section 4(C)','https://senate.la.gov/Documents/Constitution/Article7.html','Political subdivisions may not impose income taxes.');
none('TN','tn-law','Tennessee Constitution, Article II, section 28','https://sharetngov.tnsosfiles.com/sos/bluebook/15-16/15-16BBTNState.pdf','The 2014 constitutional amendment prohibits state and local taxes on payroll and earned personal income, subject to its pre-2011 exception.');
none('GA','ga-law','Georgia General Assembly: 2010 enactment of O.C.G.A. 48-7-140','https://www.legis.ga.gov/api/document/docs/default-source/general-statutes/2010sumdoc.pdf?sfvrsn=77cd7bf9_2','Section 48-7-140 prohibits political subdivisions from collecting local income taxes.');
none('NC','nc-law','North Carolina General Statutes 105-247','https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-247.html','The statute prohibits city, town, township and county taxes on income.');
none('WY','wy-law','Wyoming Statutes, Title 39: income-tax preemption','https://www.wyoleg.gov/statutes/compress/title39.pdf','Wyoming reserves income and earnings taxation to the state and prohibits political subdivisions from imposing wage-based taxes.');
none('MN','mn-law','Minnesota House Research: Background Briefing on Minnesota Taxes, 2025','https://www.house.mn.gov/comm/docs/UrsuC_apOkeM2XPwzLgA9Q.pdf','House Research confirms Minnesota has no local income taxes and that state law prohibits their imposition.');
none('SC','sc-commerce','South Carolina Department of Commerce: incentives and taxes','https://www.sccommerce.com/why-sc/incentives-taxes','The state Department of Commerce confirms there is no local income tax.');
none('IL','il-handbook','Illinois General Assembly: Tax Handbook for Legislators, 2025','https://beta.ilga.gov/commission/lru/TaxHandbook2025.pdf','The personal income tax chapter confirms no local income tax is authorized; the constitution requires statutory authorization even for home-rule units.');
none('VA','va-law','Code of Virginia 58.1-300','https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-300/','Current law reserves income taxation to the state and prohibits counties, cities, towns and other political subdivisions from taxing income.');
source('va-repeal','Code of Virginia: repeal of local income-tax authority','https://law.lis.virginia.gov/vacode/title58.1/chapter3/section58.1-540/','Sections 58.1-540 through 58.1-549, which previously authorized some local income taxes, were repealed in 2013.');
states.VA.sources.push('va-repeal');
none('NJ','nj-payroll','Rutgers University Finance: 2025 W-2 guidance, issued for 2026 filing','https://finance.rutgers.edu/news/important-2025-tax-information','The state university payroll office confirms New Jersey has no local wage-tax filing requirement; state disability and unemployment amounts in W-2 local boxes are not local income taxes.');
source('nj-newark','Newark Finance: 2026 payroll-tax booklet','https://www.newarknj.gov/DocumentCenter/View/3058/Payroll-Tax-Booklet--2026-PDF','The 2026 instructions make the employer responsible for the Newark payroll tax. It is not an employee wage tax.');
source('nj-jersey-city','Jersey City Finance: payroll-tax FAQ','https://www.jerseycitynj.gov/cityhall/finance/taxes','Jersey City expressly prohibits employers from deducting or withholding its payroll tax from employee wages.');
states.NJ.sources.push('nj-newark','nj-jersey-city');
states.NJ.reason='No employee local wage tax applies. Newark and Jersey City payroll taxes are employer liabilities; state payroll contributions remain included separately.';
none('AR','ar-act','Arkansas Legislature: Act 96 of 2023','https://www.arkleg.state.ar.us/Bills/RecentActivities?by=desc&date=2023-02-21&ddBienniumSession=2023%2F2023R&sort=Chamber','The legislature records enactment of HB1026 as Act 96, prohibiting local governments from imposing income taxes.');
source('ar-text','Arkansas Legislature: HB1026 enacted as Act 96','https://arkleg.state.ar.us/Bills/FTPDocument?path=%2FBills%2F2023R%2FPublic%2FHB1026.pdf','The enacted text repeals municipal income-tax authority and prohibits counties, municipalities and other local governments from taxing income.');
states.AR.sources.push('ar-text');
source('pa-lookup','Pennsylvania DCED: local income tax information','https://dced.pa.gov/local-government/local-income-tax-information/','Residence and work addresses determine municipal and school district earned-income taxes and local-services tax.');
source('oh-lookup','Ohio government: local tax information','https://ohio.gov/residents/resources/local-tax-information','The Finder resolves municipal and school-district income taxes using residence and workplace addresses.');
source('ia-lookup','Iowa Department of Revenue: school district surtax and EMS tax','https://revenue.iowa.gov/taxes/tax-guidance/individual-income-tax/1040-expanded-instructions/school-district-surtaxemergency','School-district surtax and EMS income tax depend on the resident jurisdiction and state income tax.');
source('mi-list','Michigan Treasury: cities imposing an income tax','https://www.michigan.gov/taxes/citytax/what-cities-impose-an-income-tax','Treasury lists 24 taxing cities. A named place or postal city alone does not establish municipal tax boundaries.');
source('or-local','Portland Revenue Division: personal income tax','https://www.portland.gov/revenue/personal-tax','Metro SHS and Multnomah PFA taxes have separate jurisdiction boundaries, thresholds and rates.');
source('or-eugene','Eugene: Community Safety Payroll Tax','https://www.eugene-or.gov/4281/Community-Safety-Payroll-Tax','Eugene has an employee payroll tax in addition to employer payroll tax.');
for(const [s,id,reason]of [
 ['PA','pa-lookup','Residence and workplace municipality, school district and local-services tax must be checked by address.'],
 ['OH','oh-lookup','Residence and workplace municipality and resident school district must be checked by address.'],
 ['IA','ia-lookup','The resident school district is needed to verify the income-tax surtax.'],
 ['MI','mi-list','Municipal boundaries, resident rates and personal exemptions need verification.'],
 ['OR','or-local','City, county and transit-district boundaries and employee payroll taxes need verification.']
])states[s]={status:'address_required',reason,sources:[id]};
states.OR.sources.push('or-eugene');
for(const s of ['AL','KY','WV'])states[s]={status:'address_required',reason:'City and county occupational taxes or employee service fees need residence and workplace verification.',sources:[]};

const counties={};
source('in-2026','Indiana DOR Departmental Notice 1, January 2026','https://www.in.gov/dor/files/dn01.pdf','County residence on January 1 determines local tax. The notice publishes all 92 rates and a $1,000 personal exemption.');
// County codes 01..92 follow the same alphabetical order as odd-numbered FIPS.
const inRates=[.016,.0159,.0175,.0179,.025,.017,.025234,.024733,.0295,.02,.0235,.0265,.0165,.015,.014,.0245,.0213,.015,.012,.02,.0282,.0189,.021,.017,.0288,.013,.0275,.0235,.011,.0194,.01,.017,.0202,.0235,.0195,.021,.02864,.025,.0103,.025,.014,.017,.01,.0165,.015,.0145,.0175,.0225,.0202,.0125,.025,.0254,.0214,.0265,.0272,.01,.0175,.02,.0175,.025,.0265,.014,.012,.005,.0145,.0285,.023,.03,.0238,.0215,.0175,.0216,.017,.008,.0171,.0199,.017,.0145,.0128,.026,.0275,.0125,.015,.02,.029,.0212,.01,.02,.0125,.021,.0232,.016829];
if(inRates.length!==92)throw Error('Expected 92 Indiana rates');
const inRateByFips=Object.fromEntries(inRates.map((rate,i)=>['18'+String(2*i+1).padStart(3,'0'),rate]));
for(const fips of Object.keys(inRateByFips))counties[fips]={status:'verified',type:'policyengine',tableId:fips,model:'in_county',reason:'2026 county income-tax rate verified and included; deductions use the published tax model.',sources:['in-2026']};
states.IN={status:'needs_research',reason:'A verified county is needed to apply the Indiana local income-tax rate.',sources:['in-2026']};
source('md-2026','Maryland Comptroller: 2026 Withholding Tax Facts','https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/facts/withholding-tax-facts-2026.pdf','Publishes actual 2026 county rates, including Allegany and Kent changes, Anne Arundel marginal brackets, and Frederick whole-income rate bands.');
const mdRateByFips={'24001':.032,'24005':.032,'24009':.032,'24011':.032,'24013':.0303,'24015':.0274,'24017':.0303,'24019':.033,'24023':.0265,'24025':.0306,'24027':.032,'24029':.033,'24031':.032,'24033':.032,'24035':.032,'24037':.032,'24039':.032,'24041':.024,'24043':.0295,'24045':.032,'24047':.0225,'24510':.032};
for(const fips of [...Object.keys(mdRateByFips),'24003','24021'])counties[fips]={status:'verified',type:'policyengine',tableId:fips,model:'md_county',reason:'2026 county income-tax rules verified and included; deductions and credits use the published tax model.',sources:['md-2026']};
states.MD={status:'needs_research',reason:'A verified county or Baltimore City is needed to apply Maryland local income tax.',sources:['md-2026']};

const cities=[];
const simple=(state,names,fips,id,title,url,reason,rules)=>{source(id,title,url,reason);cities.push({state,names,fips,status:'verified',type:'simple',reason,sources:[id],rules});};
const wage=rate=>({income:[{rate,exemption_per_person:0}],occupational:[]});
simple('MO',['Kansas City'],['29037','29047','29095','29165'],'kc-tax','Kansas City: earnings tax','https://www.kcmo.gov/city-hall/departments/finance/earnings-tax','Kansas City resident wages are subject to a 1% earnings tax.',wage(.01));
simple('MO',['St. Louis','Saint Louis'],['29510'],'stl-tax','St. Louis: Earnings Tax Department','https://www.stlouis-mo.gov/government/departments/collector/earnings-tax/index.cfm','St. Louis resident wages are subject to a 1% earnings tax.',wage(.01));
simple('DE',['Wilmington'],['10003'],'wilmington-tax','Wilmington: wage and net-profits taxes','https://www.wilmingtonde.gov/residents/earned-income-tax-and-net-profits-tax','Wilmington resident wages are subject to a 1.25% earned-income tax.',wage(.0125));
const fee=(amount,monthlyWage,inclusive=true)=>({income:[],occupational:[{amount,period:'month',minimum_annual_wages:monthlyWage*12,threshold_inclusive:inclusive}]});
simple('CO',['Denver'],['08031'],'denver-tax','Denver: occupational privilege tax FAQ','https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Department-of-Finance/Our-Divisions/Treasury/Business-Tax-Information/Business-Tax-FAQ','Denver employee tax is $5.75 per qualifying month at $500 or more in monthly wages. Assumes level earnings across 12 months.',fee(5.75,500));
simple('CO',['Glendale'],['08005'],'glendale-tax','Glendale: occupational privilege tax','https://www.glendale.co.us/355/Occupational-Privilege-Tax','Glendale employee tax is $5 per qualifying month above $750 in monthly wages. Assumes level earnings across 12 months.',fee(5,750,false));
simple('CO',['Greenwood Village'],['08005'],'greenwood-tax','Greenwood Village: occupational privilege tax','https://www.greenwoodvillage.com/1220/Occupational-Privilege-Tax-OPT','Greenwood Village employee tax is $2 per qualifying month at $250 or more in monthly wages. Assumes level earnings across 12 months.',fee(2,250));
source('ny-local','New York: NYC, Yonkers and MCTMT','https://www.tax.ny.gov/pit/file/nyc_yonkers_residents.htm','NYC resident income tax and Yonkers resident surcharge apply to the respective city residents. MCTMT is an employer or self-employment tax, not an employee wage deduction.');
source('ny-rates','New York Tax Law 1304: city resident rates','https://www.nysenate.gov/legislation/laws/TAX/1304','Current law retains the resident city marginal tax schedule through 2029.');
source('ny-additional','New York Tax Law 1304-B: city additional tax','https://www.nysenate.gov/legislation/laws/TAX/1304-B','The additional 14% city tax combines with section 1304 rates; the model includes the combined schedule.');
source('ny-credits','New York Tax Department: city credits','https://www.tax.ny.gov/pit/credits/new_york_city_credits.htm','City household, earned-income and school credits are modeled where eligible. The income-tax elimination credit requires dependents, outside this no-children model.');
source('yonkers-rate','New York Tax Department: IT-201 instructions, Yonkers worksheet','https://www.tax.ny.gov/pdf/2025/inc/it201i_2025.pdf','The Yonkers resident surcharge is 16.75% of the specified state tax liability, after the listed credit adjustments.');
source('yonkers-law','New York Tax Law 1321: Yonkers resident surcharge','https://www.nysenate.gov/legislation/laws/TAX/1321','Current law authorizes the Yonkers resident surcharge for tax years beginning before 2028.');
for(const fips of ['36005','36047','36061','36081','36085'])counties[fips]={status:'verified',type:'policyengine',tableId:'nyc',model:'nyc',reason:'NYC resident income tax is included using published tax curves and modeled credits.',sources:['ny-local','ny-rates','ny-additional','ny-credits']};
cities.push({state:'NY',names:['Yonkers'],fips:['36119'],status:'verified',type:'policyengine',tableId:'yonkers',model:'yonkers',reason:'Yonkers resident income-tax surcharge is included using published tax curves.',sources:['ny-local','yonkers-rate','yonkers-law']});
states.NY={status:'needs_research',reason:'Local tax jurisdiction needs confirmation; NYC and Yonkers have separate resident taxes.',sources:['ny-local']};
const catalog={schemaVersion:1,year,checkedAt:checked,scope:'Full-year resident employees, no children, age 40, living and working in the same city. Rates checked; tax estimates still depend on model assumptions. Postal addresses and named places do not establish municipal or school boundaries.',sources,states,counties,cities,parameterOverrides:{inRateByFips,mdRateByFips}};
fs.writeFileSync('data/local-tax-coverage.json',JSON.stringify(catalog,null,2)+'\n');
console.log('Wrote local-tax coverage and sourced 2026 county rate overrides');
