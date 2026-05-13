import {
  DEFAULTS,
  MARKET_CAP_MULT,
  type Company,
  type TurnDecision,
  type TurnSnapshot,
} from "@strat-sim/shared";

export interface TurnFinancials {
  unitsSold: number;
  revenue: number;
  recurringRevenue: number;
  cogs: number;
  marketingSpend: number;
  rdSpend: number;
  capacitySpend: number;
  ebitda: number;
}

export function computeTurnFinancials(
  company: Company,
  decision: TurnDecision,
  unitsSold: number,
  newSubscribers: number,
): TurnFinancials {
  const revenue = unitsSold * company.product.price;
  const recurringRevenue =
    (company.subscribers + newSubscribers) * company.product.subscriptionPrice;
  const cogs = unitsSold * DEFAULTS.baseUnitCost;
  const marketingSpend = decision.marketing.total;
  const rdSpend = sumRD(decision) * DEFAULTS.rdPointCost;
  const capacitySpend = decision.capacityInvestment * DEFAULTS.capacityCostPerUnit;
  const ebitda = revenue + recurringRevenue - cogs - marketingSpend - rdSpend - capacitySpend;
  return {
    unitsSold,
    revenue,
    recurringRevenue,
    cogs,
    marketingSpend,
    rdSpend,
    capacitySpend,
    ebitda,
  };
}

export function sumRD(d: TurnDecision): number {
  const r = d.rd;
  return r.privacy + r.capability + r.design + r.wellness;
}

export function computeMarketShare(company: Company, totalCustomers: number): number {
  if (totalCustomers <= 0) return 0;
  return company.customers / totalCustomers;
}

export function computeMarketCap(
  company: Company,
  ebitda: number,
  recurringRevenue: number,
): number {
  const recentEbitda = annualizedEbitda(company, ebitda);
  const growthBonus = computeGrowthBonus(company);
  const cap =
    MARKET_CAP_MULT.ebitda * Math.max(recentEbitda, 0) +
    MARKET_CAP_MULT.recurring * recurringRevenue +
    MARKET_CAP_MULT.brandPerCustomer * company.brandReputation * company.customers +
    growthBonus;
  return Math.max(0, cap);
}

function annualizedEbitda(company: Company, currentEbitda: number): number {
  const last3 = company.history.slice(-2).map((h) => h.ebitda);
  const all = [...last3, currentEbitda];
  return all.reduce((a, b) => a + b, 0) / all.length;
}

function computeGrowthBonus(company: Company): number {
  const h = company.history;
  if (h.length < 3) return 0;
  const past = h[h.length - 3]!.marketShare;
  const recent = h[h.length - 1]!.marketShare;
  if (past <= 0.001) return Math.min(MARKET_CAP_MULT.growthCap, recent * 8_000_000);
  const growth = (recent - past) / past;
  return Math.max(-MARKET_CAP_MULT.growthCap, Math.min(MARKET_CAP_MULT.growthCap, growth * 5_000_000));
}

export function recordSnapshot(
  company: Company,
  turn: number,
  fin: TurnFinancials,
  marketCap: number,
  marketShare: number,
): TurnSnapshot {
  const snap: TurnSnapshot = {
    turn,
    customers: company.customers,
    subscribers: company.subscribers,
    revenue: fin.revenue + fin.recurringRevenue,
    ebitda: fin.ebitda,
    marketCap,
    marketShare,
  };
  company.history.push(snap);
  return snap;
}
