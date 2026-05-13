import { describe, expect, it } from "vitest";
import {
  computeMarketCap,
  computeMarketShare,
  computeTurnFinancials,
  sumRD,
} from "../finance.js";
import { createCompany } from "../world.js";

const baseDecision = (id: string) => ({
  companyId: id,
  price: 300,
  subscriptionPrice: 0,
  rd: { privacy: 1, capability: 2, design: 3, wellness: 4 },
  marketing: { total: 10_000, segmentTarget: "broad" as const },
  capacityInvestment: 10,
});

describe("finance", () => {
  it("sumRD totals all axes", () => {
    expect(sumRD(baseDecision("x"))).toBe(10);
  });

  it("ebitda includes recurring revenue and subtracts spend", () => {
    const co = createCompany("a", "A");
    co.product.subscriptionPrice = 20;
    co.subscribers = 50;
    const fin = computeTurnFinancials(co, baseDecision("a"), 30, 0);
    expect(fin.revenue).toBe(30 * 300);
    expect(fin.recurringRevenue).toBe(50 * 20);
    expect(fin.cogs).toBe(30 * 80);
    expect(fin.marketingSpend).toBe(10_000);
    expect(fin.rdSpend).toBe(10 * 10_000);
    expect(fin.capacitySpend).toBe(10 * 200);
    expect(fin.ebitda).toBe(
      fin.revenue + fin.recurringRevenue - fin.cogs - fin.marketingSpend - fin.rdSpend - fin.capacitySpend,
    );
  });

  it("market cap is non-negative even for losses", () => {
    const co = createCompany("a", "A");
    const cap = computeMarketCap(co, -1_000_000, 0);
    expect(cap).toBeGreaterThanOrEqual(0);
  });

  it("market share sums to 1 across companies (when total > 0)", () => {
    const a = createCompany("a", "A");
    const b = createCompany("b", "B");
    a.customers = 30;
    b.customers = 70;
    const total = a.customers + b.customers;
    expect(computeMarketShare(a, total) + computeMarketShare(b, total)).toBeCloseTo(1, 5);
  });
});
