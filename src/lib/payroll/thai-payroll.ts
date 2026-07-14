import type { EmployeeTaxProfile, SocialSecurityConfig } from "@/lib/types";

/**
 * Thai payroll calculation policy used for the 2026 demo and payroll preview.
 *
 * Primary references:
 * - Revenue Code section 42 bis (employment expense): https://www.rd.go.th/5937.html
 * - Revenue Department Order Por.96/2543 (section 40(1) withholding): https://www.rd.go.th/3558.html
 * - Revenue Department personal income tax brackets: https://www.rd.go.th/59670.html
 * - SSO wage ceiling effective 1 Jan 2026 is stored in social_security_config.
 *
 * This engine produces an auditable payroll estimate. Final filing still needs
 * the employee's signed Lor.Yor.01 declarations, actual year-to-date values,
 * and payroll/accounting review, especially for one-off income and termination.
 */

export const THAI_PAYROLL_CALCULATION_VERSION = "TH-2026.1";
export const EMPLOYMENT_EXPENSE_RATE = 0.5;
export const EMPLOYMENT_EXPENSE_CAP = 100_000;

export const DEFAULT_TAX_PROFILE: EmployeeTaxProfile = {
  personal_allowance: 60_000,
  spouse_allowance: 0,
  child_allowance: 0,
  parent_allowance: 0,
  insurance_deduction: 0,
  provident_fund_deduction: 0,
  other_deductions: 0,
};

export const THAI_PERSONAL_INCOME_TAX_BRACKETS = [
  { from: 0, to: 150_000, rate: 0 },
  { from: 150_000, to: 300_000, rate: 0.05 },
  { from: 300_000, to: 500_000, rate: 0.1 },
  { from: 500_000, to: 750_000, rate: 0.15 },
  { from: 750_000, to: 1_000_000, rate: 0.2 },
  { from: 1_000_000, to: 2_000_000, rate: 0.25 },
  { from: 2_000_000, to: 5_000_000, rate: 0.3 },
  { from: 5_000_000, to: Number.POSITIVE_INFINITY, rate: 0.35 },
] as const;

export interface TaxBracketCharge {
  from: number;
  to: number | null;
  ratePct: number;
  taxableAmount: number;
  tax: number;
}

export interface ProgressiveTaxResult {
  taxableIncome: number;
  tax: number;
  effectiveRatePct: number;
  marginalRatePct: number;
  brackets: TaxBracketCharge[];
}

function money(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function nonNegative(value: number | null | undefined): number {
  return Math.max(0, Number(value ?? 0));
}

export function calculateThaiProgressiveTax(taxableIncome: number): ProgressiveTaxResult {
  const income = nonNegative(taxableIncome);
  const brackets: TaxBracketCharge[] = [];
  let tax = 0;
  let marginalRatePct = 0;

  for (const bracket of THAI_PERSONAL_INCOME_TAX_BRACKETS) {
    if (income <= bracket.from) break;
    const taxableAmount = Math.max(0, Math.min(income, bracket.to) - bracket.from);
    if (taxableAmount <= 0) continue;
    const charge = taxableAmount * bracket.rate;
    tax += charge;
    marginalRatePct = bracket.rate * 100;
    brackets.push({
      from: bracket.from,
      to: Number.isFinite(bracket.to) ? bracket.to : null,
      ratePct: bracket.rate * 100,
      taxableAmount: money(taxableAmount),
      tax: money(charge),
    });
  }

  return {
    taxableIncome: money(income),
    tax: money(tax),
    effectiveRatePct: income > 0 ? money((tax / income) * 100) : 0,
    marginalRatePct,
    brackets,
  };
}

export interface ThaiPayrollInput {
  basePay: number;
  allowancePay?: number;
  overtimePay?: number;
  bonusPay?: number;
  otherIncome?: number;
  otherDeductions?: number;
  /** Wage that is legally subject to SSO; defaults to base + fixed allowance. */
  ssoWage?: number;
  ssoConfig: Pick<
    SocialSecurityConfig,
    "id" | "rate_pct" | "wage_floor" | "wage_ceiling" | "max_contribution"
  >;
  taxProfile?: Partial<EmployeeTaxProfile> | null;
  payPeriodsPerYear?: number;
  payrollMonth?: number;
  ytdTaxWithheldBeforeThisPayroll?: number;
}

export interface ThaiPayrollResult {
  grossPay: number;
  ssoWageBase: number;
  employeeSso: number;
  employerSso: number;
  employmentExpense: number;
  annualSsoDeduction: number;
  annualAllowances: number;
  annualizedGrossIncome: number;
  annualizedTaxableIncome: number;
  annualTax: number;
  regularMonthlyWithholding: number;
  specialIncomeWithholding: number;
  monthlyWithholdingTax: number;
  otherDeductions: number;
  netPay: number;
  effectiveTaxRatePct: number;
  marginalTaxRatePct: number;
  calculationVersion: string;
  calculationDetails: Record<string, unknown>;
}

function normalizeTaxProfile(profile?: Partial<EmployeeTaxProfile> | null): EmployeeTaxProfile {
  return {
    personal_allowance: nonNegative(
      profile?.personal_allowance ?? DEFAULT_TAX_PROFILE.personal_allowance,
    ),
    spouse_allowance: nonNegative(profile?.spouse_allowance),
    child_allowance: nonNegative(profile?.child_allowance),
    parent_allowance: nonNegative(profile?.parent_allowance),
    insurance_deduction: nonNegative(profile?.insurance_deduction),
    provident_fund_deduction: nonNegative(profile?.provident_fund_deduction),
    other_deductions: nonNegative(profile?.other_deductions),
  };
}

function annualTaxForGross(
  annualGross: number,
  annualSso: number,
  profile: EmployeeTaxProfile,
): {
  expense: number;
  allowances: number;
  taxable: number;
  result: ProgressiveTaxResult;
} {
  const expense = Math.min(EMPLOYMENT_EXPENSE_CAP, annualGross * EMPLOYMENT_EXPENSE_RATE);
  const allowances =
    profile.personal_allowance +
    profile.spouse_allowance +
    profile.child_allowance +
    profile.parent_allowance +
    profile.insurance_deduction +
    profile.provident_fund_deduction +
    profile.other_deductions +
    annualSso;
  const taxable = Math.max(0, annualGross - expense - allowances);
  return {
    expense: money(expense),
    allowances: money(allowances),
    taxable: money(taxable),
    result: calculateThaiProgressiveTax(taxable),
  };
}

export function calculateThaiPayroll(input: ThaiPayrollInput): ThaiPayrollResult {
  const basePay = nonNegative(input.basePay);
  const allowancePay = nonNegative(input.allowancePay);
  const overtimePay = nonNegative(input.overtimePay);
  const bonusPay = nonNegative(input.bonusPay);
  const otherIncome = nonNegative(input.otherIncome);
  const otherDeductions = nonNegative(input.otherDeductions);
  const payPeriods = Math.max(1, Math.round(input.payPeriodsPerYear ?? 12));
  const grossPay = basePay + allowancePay + overtimePay + bonusPay + otherIncome;

  const ssoWage = nonNegative(input.ssoWage ?? basePay + allowancePay);
  const ssoWageBase =
    ssoWage > 0
      ? Math.min(Math.max(ssoWage, input.ssoConfig.wage_floor), input.ssoConfig.wage_ceiling)
      : 0;
  // SSO instruction: 50 satang or more rounds up to one baht; less is dropped.
  const rawSso = Math.min(
    (ssoWageBase * input.ssoConfig.rate_pct) / 100,
    input.ssoConfig.max_contribution,
  );
  const employeeSso = ssoWageBase > 0 ? Math.floor(rawSso + 0.5) : 0;
  const employerSso = employeeSso;
  const annualSso = employeeSso * payPeriods;
  const profile = normalizeTaxProfile(input.taxProfile);

  // Base and fixed allowance are annualized. OT, bonus and other variable
  // income default to one-off payments and use incremental annual tax under
  // Revenue Department Order Por.96/2543. A recurring component should be
  // supplied as allowancePay rather than special income.
  const regularMonthlyIncome = basePay + allowancePay;
  const specialIncome = overtimePay + bonusPay + otherIncome;
  const regularAnnualGross = regularMonthlyIncome * payPeriods;
  const annualizedGrossIncome = regularAnnualGross + specialIncome;
  const regular = annualTaxForGross(regularAnnualGross, annualSso, profile);
  const withBonus = annualTaxForGross(annualizedGrossIncome, annualSso, profile);
  const regularMonthlyWithholding = regular.result.tax / payPeriods;
  const specialIncomeWithholding = Math.max(0, withBonus.result.tax - regular.result.tax);

  let monthlyWithholdingTax = regularMonthlyWithholding + specialIncomeWithholding;
  if (input.payrollMonth === 12 && input.ytdTaxWithheldBeforeThisPayroll != null) {
    monthlyWithholdingTax = Math.max(
      0,
      withBonus.result.tax - nonNegative(input.ytdTaxWithheldBeforeThisPayroll),
    );
  }
  monthlyWithholdingTax = money(monthlyWithholdingTax);
  const netPay = money(grossPay - employeeSso - monthlyWithholdingTax - otherDeductions);

  return {
    grossPay: money(grossPay),
    ssoWageBase: money(ssoWageBase),
    employeeSso,
    employerSso,
    employmentExpense: withBonus.expense,
    annualSsoDeduction: money(annualSso),
    annualAllowances: withBonus.allowances,
    annualizedGrossIncome: money(annualizedGrossIncome),
    annualizedTaxableIncome: withBonus.taxable,
    annualTax: withBonus.result.tax,
    regularMonthlyWithholding: money(regularMonthlyWithholding),
    specialIncomeWithholding: money(specialIncomeWithholding),
    monthlyWithholdingTax,
    otherDeductions: money(otherDeductions),
    netPay,
    effectiveTaxRatePct: withBonus.result.effectiveRatePct,
    marginalTaxRatePct: withBonus.result.marginalRatePct,
    calculationVersion: THAI_PAYROLL_CALCULATION_VERSION,
    calculationDetails: {
      method: "thai_pit_annualized_por_96_2543",
      payPeriods,
      taxProfile: profile,
      ssoConfigId: input.ssoConfig.id,
      ssoRatePct: input.ssoConfig.rate_pct,
      ssoWageFloor: input.ssoConfig.wage_floor,
      ssoWageCeiling: input.ssoConfig.wage_ceiling,
      regularAnnualTax: regular.result.tax,
      specialIncome,
      specialIncomeIncrementalTax: money(specialIncomeWithholding),
      taxBrackets: withBonus.result.brackets,
      decemberReconciliation: input.payrollMonth === 12,
    },
  };
}
