import {
  DEFAULTS,
  MARKET_CAP_MULT,
  type Company,
  type TurnDecision,
  type TurnSnapshot,
} from "@strat-sim/shared";
import { unitCost } from "./production.js";

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
  // Per-unit build cost depends on the quality shipped and the company's capability.
  const perUnitCost = unitCost(company.product.features, company.capabilities);
  const cogs = unitsSold * perUnitCost;
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
  const brandFactor =
    (MARKET_CAP_MULT.brandFloor + company.brandReputation) / 100; // 0.5..1.5
  // Per-customer value scales with hardware gross margin: an installed base won
  // by selling near cost is worth far less than a high-margin one, so a
  // loss-leader land-grab no longer auto-wins.
  const unitMargin = company.product.price - unitCost(company.product.features, company.capabilities);
  const marginFactor = Math.max(0.5, Math.min(1.3, 0.45 + unitMargin / 650));
  const customerValue =
    company.customers * MARKET_CAP_MULT.customerLtv * brandFactor * marginFactor;
  const recurringValue =
    recurringRevenue * 12 * MARKET_CAP_MULT.recurringAnnual; // annualize then multiple
  const ebitdaValue = MARKET_CAP_MULT.ebitda * Math.max(recentEbitda, 0);
  const rdValue = MARKET_CAP_MULT.rdPipeline * company.rdPoints;
  const cap = customerValue + recurringValue + ebitdaValue + rdValue + growthBonus;
  return Math.max(0, cap);
}

function annualizedEbitda(company: Company, currentEbitda: number): number {
  const last3 = company.history.slice(-2).map((h) => h.ebitda);
  const all = [...last3, currentEbitda];
  return all.reduce((a, b) => a + b, 0) / all.length;
}

function computeGrowthBonus(company: Company): number {
  const h = company.history;
  if (h.length < 2) return 0;
  const window = Math.min(3, h.length);
  const past = h[h.length - window]!.marketShare;
  const recent = h[h.length - 1]!.marketShare;
  // Reward only meaningful growth, scaled by absolute share so flukes don't dominate.
  const absoluteGain = Math.max(0, recent - past);
  const bonus = absoluteGain * recent * MARKET_CAP_MULT.growthCap * 4;
  return Math.min(MARKET_CAP_MULT.growthCap, bonus);
}

export function recordSnapshot(
  company: Company,
  turn: number,
  fin: TurnFinancials,
  marketCap: number,
  marketShare: number,
  demand: number,
): TurnSnapshot {
  const snap: TurnSnapshot = {
    turn,
    customers: company.customers,
    subscribers: company.subscribers,
    revenue: fin.revenue + fin.recurringRevenue,
    ebitda: fin.ebitda,
    marketCap,
    marketShare,
    unitsSold: fin.unitsSold,
    demand,
  };
  company.history.push(snap);
  return snap;
}
