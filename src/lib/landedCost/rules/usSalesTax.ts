// US state-level sales tax base rates, for the domestic-lane checkout tax
// estimate. DATA, not code.
//
// UNIT: DECI-BASIS-POINTS (tenths of a basis point): 6.875% = 6875. Chosen
// because several states levy fractional-bps rates (MN 6.875%, MO 4.225%,
// NJ 6.625%, NM 4.875%) that integer bps cannot represent without rounding,
// and a rounded rate is an invented one.
//
// WHAT THESE NUMBERS ARE: each state's STATE-LEVEL base rate as published
// by its Department of Revenue or statute, verified 2026-08-31 by a
// research pass (6 finder agents on primary sources + adversarial
// cross-check per state; MN and MO were corrected to their exact fractional
// rates during verification). They are NOT combined state+local rates:
// local surtaxes vary by address, a combined average would be an invented
// number, and the calculator states the gap as an assumption instead.
// Where a state has a mandatory statewide local component, the note says
// exactly what the figure includes (CA and NV include theirs because the
// state source quotes the combined figure as the statewide base; UT's 4.85%
// is the ST portion only, with the mandatory 1.25% local minimum noted).
//
// SCHEDULED CHANGES ON RECORD (re-verify on these dates, not just the
// 90-day clock): DC rises to 7.0% on 2026-10-01 (statute already enacted);
// SD's 4.2% reverts to 4.5% on 2027-07-01; LA's 5% runs through 2029.
//
// Zero-rate states (AK, DE, MT, NH, OR) are verified zeros, not gaps: the
// state levies no general sales tax (AK allows local ones, per its note).

import type { SourcedValue } from '../types';
import { verified } from './seed';

export const US_STATE_SALES_TAX_DECIBPS: Record<string, SourcedValue<number>> = {
  AK: verified(
    0,
    'https://www.akleg.gov/basis/statutes.asp#29.45.650',
    '2026-08-31',
    'Alaska Statutes 2025, AS 29.45.650 (Alaska State Legislature). No state-level sales tax; AK DOR Tax Division administers no general sales tax program (verified at tax.alaska.gov). AS 29.45.650 authorizes boroughs/cities to levy LOCAL sales taxes; over 100 municipalities do, commonly 1-7%.'
  ),
  AL: verified(
    4000,
    'https://www.revenue.alabama.gov/sales-use/tax-rates/',
    '2026-08-31',
    'Alabama Department of Revenue - Sales and Use Tax Rates. General rate 4.000%; reduced state rates for autos (2%), farm machinery (1.5%), and food/grocery (2%). Local city/county sales taxes are additional and nearly universal.'
  ),
  AR: verified(
    6500,
    'https://www.dfa.arkansas.gov/office/taxes/excise-tax-administration/sales-use-tax/sales-use-tax-rates/state-sales-use-tax-rates/',
    '2026-08-31',
    'Arkansas Department of Finance and Administration - State Sales and Use Tax Rates. State rate 6.500%, effective July 1, 2013. Reduced state rate applies to groceries; local city and county sales taxes are additional and common.'
  ),
  AZ: verified(
    5600,
    'https://www.azleg.gov/ars/42/05010.htm',
    '2026-08-31',
    'Arizona Revised Statutes 42-5010 and 42-5010.01 (Arizona State Legislature). NOMINAL quirk: Arizona levies a transaction privilege tax (TPT) on the seller, not a true sales tax. Retail classification: 5% base (ARS 42-5010) plus 0.6% education increment (ARS 42-5010.01, in effect through June 30, 2041) = 5.6%. City/county TPT surtaxes common. Statute used because azdor.gov blocks automated fetches.'
  ),
  CA: verified(
    7250,
    'https://www.cdtfa.ca.gov/taxes-and-fees/sut-rates-description.htm',
    '2026-08-31',
    'California Department of Tax and Fee Administration - Detailed Description of the Sales and Use Tax Rate. NOMINAL: the 7.25% statewide base (customer-facing minimum everywhere in CA) includes a mandatory 1.25% local portion (1.00% city/county operations + 0.25% county transportation); the state-only portion is 6.00%. District taxes of roughly 0.10%-2.00%+ apply on top in many areas.'
  ),
  CO: verified(
    2900,
    'https://tax.colorado.gov/sales-tax-guide',
    '2026-08-31',
    'Colorado Department of Revenue - Sales Tax Guide. Guide states Colorado state sales tax is imposed at a rate of 2.9%. State-administered local sales taxes and self-collected home-rule city taxes are additional, so combined rates vary widely.'
  ),
  CT: verified(
    6350,
    'https://portal.ct.gov/DRS/Sales-Tax/Tax-Information',
    '2026-08-31',
    'Connecticut Department of Revenue Services - Sales and Use Tax Information. General rate 6.35%; no local sales taxes in CT. Special category rates include 7.35% meals, 7.75% luxury goods/vehicles over thresholds, 9.35% short-term car rentals, 1% computer/data processing services.'
  ),
  DC: verified(
    6000,
    'https://code.dccouncil.gov/us/dc/council/code/sections/47-2002',
    '2026-08-31',
    'DC Code 47-2002 (D.C. Law Library, Council of the District of Columbia). IMPORTANT: statute verbatim sets the general rate at 6.0% before October 1, 2026 and 7.0% beginning October 1, 2026 - so 600 bps is current only until 2026-10-01, then 700 bps. Higher category rates: 10.20% lodging, 9% prepared food, 18% parking, 10.25% off-premises alcohol. otr.cfo.dc.gov blocks automated fetches; statute used.'
  ),
  DE: verified(
    0,
    'https://revenue.delaware.gov/business-tax-forms/doing-business-in-delaware/step-4-gross-receipts-taxes/',
    '2026-08-31',
    'Delaware Division of Revenue - Gross Receipts Taxes. Page states Delaware does not impose a state or local sales tax, but does impose a gross receipts tax on the seller (0.0945%-1.9914%, petroleum up to 2.4218%). No sales tax at any level.'
  ),
  FL: verified(
    6000,
    'https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx',
    '2026-08-31',
    'Florida Department of Revenue - Sales and Use Tax. General state rate 6%; category exceptions exist (e.g. 4% amusement machines, 6.95% electricity). Many counties add a discretionary sales surtax, capped to the first $5,000 of certain single-item sales.'
  ),
  GA: verified(
    4000,
    'https://dor.georgia.gov/document/document/general-rate-chart-effective-january-1-2026-through-march-31-2026/download',
    '2026-08-31',
    'Georgia Department of Revenue - Sales and Use Tax Rate Chart. Chart states verbatim: \'The state sales and use tax rate is 4%.\' The 4% state portion is included in the jurisdiction rates listed (county totals mostly 6-9% with local LOST/ELOST/SPLOST/TSPLOST add-ons). State portion is stable across the quarterly chart updates.'
  ),
  HI: verified(
    4000,
    'https://tax.hawaii.gov/get/',
    '2026-08-31',
    'Hawaii Department of Taxation - General Excise Tax (GET) Information. NOMINAL quirk: Hawaii has no sales tax. The 4% General Excise Tax is levied on business gross receipts (retail/services); businesses may pass it to customers but are not required to. A 0.5% county surcharge applies in surcharge counties (DOTAX shows 4.5% for retail including surcharge). Wholesale rate is 0.5%.'
  ),
  IA: verified(
    6000,
    'https://revenue.iowa.gov/taxes/tax-guidance/sales-use-excise-tax/sales-use-tax-guide',
    '2026-08-31',
    'Iowa Department of Revenue - Sales & Use Tax Guide. State rate 6% (\'The rate is 6%\'); most jurisdictions impose an additional 1% Local Option Sales Tax, so 7% combined is common.'
  ),
  ID: verified(
    6000,
    'https://tax.idaho.gov/taxes/sales-use/online-guide/',
    '2026-08-31',
    'Idaho State Tax Commission - Sales and Use Taxes: Basics Guide. State rate 6% (use tax also 6%). Only a handful of resort cities and auditorium districts levy voter-approved local option sales taxes; no general county/city sales tax.'
  ),
  IL: verified(
    6250,
    'https://tax.illinois.gov/questionsandanswers/answer.139.html',
    '2026-08-31',
    'Illinois Department of Revenue - Retailers\' Occupation and Use Tax Rates FAQ. State rate 6.25% on general merchandise (1% on qualifying drugs/medical appliances). Local home rule, non-home rule, mass transit, and county taxes commonly raise the combined rate; technically structured as a retailers\' occupation tax plus use tax.'
  ),
  IN: verified(
    7000,
    'https://www.in.gov/dor/i-am-a/business-corp/sales-tax/',
    '2026-08-31',
    'Indiana Department of Revenue - Sales Tax. Statewide 7% (\'a seven percent sales tax\'); no local general sales taxes, though category-specific local taxes (county innkeeper\'s, food and beverage) exist.'
  ),
  KS: verified(
    6500,
    'https://www.ksrevenue.gov/bustaxtypessales.html',
    '2026-08-31',
    'Kansas Department of Revenue - Sales (Retailers) Tax. State rate 6.5% (effective July 1, 2015); cities and counties may levy additional local sales tax, collected and remitted together with the state tax. State rate on groceries differs (reduced under the Kansas food tax phase-out).'
  ),
  KY: verified(
    6000,
    'https://revenue.ky.gov/Business/Sales-Use-Tax/Pages/default.aspx',
    '2026-08-31',
    'Kentucky Department of Revenue - Sales & Use Tax. 6% of gross receipts or purchase price; DOR states there are no local sales and use taxes in Kentucky, so 6% is the uniform statewide total.'
  ),
  LA: verified(
    5000,
    'https://revenue.louisiana.gov/tax-education-and-faqs/faqs/sales-tax-reform/what-is-the-state-sales-tax-rate/',
    '2026-08-31',
    'Louisiana Department of Revenue. 5% state rate effective 1/1/2025 (up from 4.45%), scheduled through 12/31/2029 then set to drop to 4.75%. Substantial parish/local sales taxes are separate and administered locally.'
  ),
  MA: verified(
    6250,
    'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleIX/Chapter64H/Section2',
    '2026-08-31',
    'Massachusetts General Laws c. 64H sec. 2. 6.25% statutory rate (mass.gov DOR pages blocked automated fetch with 403, so cited the statute). No local general sales taxes; local-option taxes exist only for meals and lodging.'
  ),
  MD: verified(
    6000,
    'https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/Tax_rate_chart.pdf',
    '2026-08-31',
    'Comptroller of Maryland (6% Rate Chart). 6% general rate; statute (Tax-General sec. 11-104, mgaleg.maryland.gov) expresses it as bracketed 6 cents per dollar. No local general sales taxes. Higher special rates: alcohol 9%, cannabis 12% (FY2026+).'
  ),
  ME: verified(
    5500,
    'https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax/rates-due-dates',
    '2026-08-31',
    'Maine Revenue Services. 5.5% general rate on tangible personal property (confirmed current through 1/1/2026 rate table). No local sales taxes. Higher special rates: prepared food 8%, lodging 9%, short-term auto rental 10%.'
  ),
  MI: verified(
    6000,
    'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-205-52',
    '2026-08-31',
    'Michigan Compiled Laws 205.52 (General Sales Tax Act). Statute imposes tax equal to 6% of gross proceeds; rate is capped at 6% by Michigan Constitution art. IX sec. 8. No local sales taxes in Michigan.'
  ),
  MN: verified(
    6875,
    'https://www.revisor.mn.gov/statutes/cite/297A.62',
    '2026-08-31',
    'Minnesota Statutes 297A.62 (Office of the Revisor of Statutes). Exact rate is 6.875% (687.5 bps, rounded here to 688): 6.5% general rate (subd. 1) plus mandatory 0.375% constitutional legacy-amendment rate (subd. 1a) that expires 7/1/2034. Local sales taxes are added on top.'
  ),
  MO: verified(
    4225,
    'https://dor.mo.gov/taxation/business/tax-types/sales-use/',
    '2026-08-31',
    'Missouri Department of Revenue. Exact state rate is 4.225% (422.5 bps, rounded here to 423), composed of 3.0% general revenue + 1.0% education + 0.125% conservation + 0.10% parks/soils. Local surtaxes are common and often large.'
  ),
  MS: verified(
    7000,
    'https://www.dor.ms.gov/business/sales-tax-rates',
    '2026-08-31',
    'Mississippi Department of Revenue. 7% general retail rate on tangible personal property. Reduced category rates exist (e.g., groceries 5%, farm equipment 1.5%). Local sales taxes are rare (notably Jackson and Tupelo surcharges).'
  ),
  MT: verified(
    0,
    'https://revenue.mt.gov/taxes/general-sales-tax',
    '2026-08-31',
    'Montana Department of Revenue. No general statewide sales tax; DOR states Montana \'does not have a general-use sales tax.\' Selective state taxes apply to lodging and rental vehicles, and qualifying resort communities may levy local resort taxes.'
  ),
  NC: verified(
    4750,
    'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-rates/current-sales-and-use-tax-rates',
    '2026-08-31',
    'North Carolina Department of Revenue. Rate table effective July 1, 2026 states \'total (4.75% state rate plus applicable local and transit rates)\'. Local+transit adds 2-3.5% (Mecklenburg combined 8.25% as of 7/1/2026).'
  ),
  ND: verified(
    5000,
    'https://www.tax.nd.gov/business/sales-and-use-tax',
    '2026-08-31',
    'North Dakota Office of State Tax Commissioner. Page states \'The North Dakota sales tax rate is 5% for most retail sales\'; special rates apply to some categories (e.g., alcohol 7%, farm machinery 3%), and city/county local option taxes are common.'
  ),
  NE: verified(
    5500,
    'https://revenue.nebraska.gov/businesses/sales-and-use-tax',
    '2026-08-31',
    'Nebraska Department of Revenue. Page states \'The Nebraska state sales and use tax rate is 5.5% (.055)\'. Local option sales taxes (typically 0.5-2%) are common on top.'
  ),
  NH: verified(
    0,
    'https://www.revenue.nh.gov/faq/does-new-hampshire-have-sales-tax',
    '2026-08-31',
    'New Hampshire Department of Revenue Administration. No general sales tax: DRA FAQ answer reads \'No, there is no general sales tax on goods purchased in New Hampshire.\' (Separate meals & rooms tax exists but is not a general sales tax.)'
  ),
  NJ: verified(
    6625,
    'https://www.nj.gov/treasury/taxation/businesses/salestax/index.shtml',
    '2026-08-31',
    'New Jersey Division of Taxation. Exact rate is 6.625% = 662.5 bps, not integer-representable; rounded to 663. Page states \'New Jersey assesses a 6.625% Sales Tax on sales of most tangible personal property...\'. No general local sales taxes (Urban Enterprise Zones charge half rate).'
  ),
  NM: verified(
    4875,
    'https://www.tax.newmexico.gov/governments/municipal-county-governments/local-option-taxes/',
    '2026-08-31',
    'New Mexico Taxation and Revenue Department. Gross receipts tax, not a conventional sales tax (typically passed to buyers). Exact state base rate is 4.875% = 487.5 bps, not integer-representable; rounded to 488. Page states \'the state rate of 4.875% is the base\' with county and municipal layers added on top (combined 4.875-10.8125%).'
  ),
  NV: verified(
    6850,
    'https://tax.nv.gov/tax-types/sales-tax-use-tax/',
    '2026-08-31',
    'Nevada Department of Taxation. NOMINAL quirk like CA: the statutory state rate is only 2%, but mandatory statewide components (Local School Support Tax and Basic/Supplemental City-County Relief Taxes) make 6.85% the customer-facing statewide minimum; the Dept of Taxation states \'the base State Sales Tax rate in Nevada is 6.85%\'. County option taxes push combined rates to 7.10-8.375% (Clark Co.).'
  ),
  NY: verified(
    4000,
    'https://www.tax.ny.gov/bus/st/rates.htm',
    '2026-08-31',
    'New York State Department of Taxation and Finance. Page states \'the state rate (currently 4%) plus any local tax rate imposed by a city, county, or school district\'. Local rates plus the 0.375% MCTD surcharge make combined rates of ~7-8.875% typical.'
  ),
  OH: verified(
    5750,
    'https://tax.ohio.gov/business/ohio-business-taxes/sales-and-use',
    '2026-08-31',
    'Ohio Department of Taxation. Page states \'the state rate—which is 5.75 percent\'; counties and regional transit authorities add up to 3% in 0.05% increments, with the combined rate capped at 8.75%.'
  ),
  OK: verified(
    4500,
    'https://oklahoma.gov/tax/businesses/sales-use-tax.html',
    '2026-08-31',
    'Oklahoma Tax Commission. Page states sales tax is levied at 4.5% of gross receipts (state rate in effect since May 1, 1990). City and county local sales taxes are very common on top of the state rate.'
  ),
  OR: verified(
    0,
    'https://www.oregon.gov/dor/programs/businesses/pages/sales-tax.aspx',
    '2026-08-31',
    'Oregon Department of Revenue. No general sales or use/transaction tax. DOR notes a narrow vehicle use tax on new vehicles purchased out of state; no general local sales taxes either.'
  ),
  PA: verified(
    6000,
    'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/sales-use-and-hotel-occupancy-tax.html',
    '2026-08-31',
    'Pennsylvania Department of Revenue. 6% state rate. By law +1% local in Allegheny County (7% total) and +2% in Philadelphia (8% total); no other general local sales taxes.'
  ),
  RI: verified(
    7000,
    'https://tax.ri.gov/tax-sections/sales-excise/sales-use-tax',
    '2026-08-31',
    'Rhode Island Division of Taxation. 7% uniform statewide on sales and use; no general local sales taxes (separate 1% local meals-and-beverage tax and hotel taxes apply to those categories only).'
  ),
  SC: verified(
    6000,
    'https://dor.sc.gov/tax/sales',
    '2026-08-31',
    'South Carolina Department of Revenue. Statewide rate is 6%. Counties may impose an additional voter-approved local option sales tax (commonly 1%, other local levies also exist), so combined rates often reach 7-9%.'
  ),
  SD: verified(
    4200,
    'https://dor.sd.gov/businesses/taxes/sales-use-tax/',
    '2026-08-31',
    'South Dakota Department of Revenue. DOR states the state rate is 4.2%. This is the temporary rate from the 2023 cut; it is scheduled to revert to 4.5% on 2027-07-01 (sunset not shown on the DOR page itself). Municipal taxes (typically up to 2%) apply on top.'
  ),
  TN: verified(
    7000,
    'https://www.tn.gov/revenue/taxes/sales-and-use-tax.html',
    '2026-08-31',
    'Tennessee Department of Revenue. General state rate is 7%; local rate varies by county/city and applies on top. Food/groceries are taxed at a reduced state rate.'
  ),
  TX: verified(
    6250,
    'https://comptroller.texas.gov/taxes/sales/',
    '2026-08-31',
    'Texas Comptroller of Public Accounts. 6.25% state rate; local jurisdictions may add up to 2% for a maximum combined rate of 8.25%.'
  ),
  UT: verified(
    4850,
    'https://files.tax.utah.gov/tax/salestax/rate/26q3combined.pdf',
    '2026-08-31',
    'Utah State Tax Commission (combined rate chart effective 2026-07-01, linked from tax.utah.gov/sales/rates). NOMINAL quirk: 4.85% is the state (ST) portion, but a mandatory 1.00% local (LS) and 0.25% county option (CO) apply everywhere, so the customer-facing statewide minimum is 6.10% before other local add-ons. Grocery food is 3.0% statewide (1.75% state + 1.0% local + 0.25% county). Verified in the chart PDF text (389 rows show 4.85%; a stale cached HTML extraction claiming 4.70% was wrong).'
  ),
  VA: verified(
    5300,
    'https://www.tax.virginia.gov/retail-sales-and-use-tax',
    '2026-08-31',
    'Virginia Tax (Department of Taxation). NOMINAL quirk like CA: 5.3% is the customer-facing statewide base in most localities, composed of a 4.3% state levy (Va. Code 58.1-603, verified at law.lis.virginia.gov/vacode/title58.1/section58.1-603/) plus a mandatory 1% local tax. Regional rates are higher: 6% (Central VA, Hampton Roads, Northern VA), 6.3% (several counties), 7% (James City Co, Williamsburg, York Co). Food and personal hygiene items taxed at 1% statewide.'
  ),
  VT: verified(
    6000,
    'https://tax.vermont.gov/business/sales-and-use-tax',
    '2026-08-31',
    'Vermont Department of Taxes. State rate 6%. Municipal local option taxes exist on top in some localities (returns with local option sales must be e-filed).'
  ),
  WA: verified(
    6500,
    'https://dor.wa.gov/taxes-rates/retail-sales-tax',
    '2026-08-31',
    'Washington State Department of Revenue. State portion is 6.5%; local jurisdiction rates are added on top, so combined rates vary by city/county.'
  ),
  WI: verified(
    5000,
    'https://www.revenue.wi.gov/Pages/FAQS/pcs-taxrates.aspx',
    '2026-08-31',
    'Wisconsin Department of Revenue. State rate 5%. Local surtaxes common: 0.5% county tax in ~70 counties (Milwaukee County 0.9% since 1/1/2024), plus City of Milwaukee 2% city tax since 1/1/2024.'
  ),
  WV: verified(
    6000,
    'https://tax.wv.gov/business/salesandusetax/municipalsalesandusetax/pages/municipalsalesandusetax.aspx',
    '2026-08-31',
    'West Virginia Tax Division. State rate 6% (page states combined rate = state 6% + municipal rate). Municipalities that adopt a sales tax add 1% (7% combined). Reduced rates exist for some categories.'
  ),
  WY: verified(
    4000,
    'https://excise-tax-div.wyo.gov/general-administrative/excise-tax-faqs',
    '2026-08-31',
    'Wyoming Department of Revenue, Excise Tax Division. Statewide base 4%; voter-approved county local option taxes stack on top, so combined rates generally run 4-8% by county, based on where the customer takes possession.'
  ),
};

/** Two-letter codes of every state with a rate row (50 states + DC). */
export const US_STATE_CODES: string[] = Object.keys(US_STATE_SALES_TAX_DECIBPS).sort();
