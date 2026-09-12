import { describe, it, expect } from "vitest";
import { dailyQuote, MOTIVATIONAL_QUOTES } from "./quotes";

describe("dailyQuote", () => {
  it("returns a quote from the list", () => {
    expect(MOTIVATIONAL_QUOTES).toContain(dailyQuote(new Date(2026, 5, 1)));
  });
  it("is stable within the same calendar day", () => {
    const morning = new Date(2026, 5, 1, 6, 0);
    const evening = new Date(2026, 5, 1, 23, 0);
    expect(dailyQuote(morning)).toBe(dailyQuote(evening));
  });
  it("can change on a different day", () => {
    const day1 = dailyQuote(new Date(2026, 0, 1));
    const day2 = dailyQuote(new Date(2026, 0, 2));
    // not guaranteed to differ (list could wrap), but both must be valid
    expect(MOTIVATIONAL_QUOTES).toContain(day1);
    expect(MOTIVATIONAL_QUOTES).toContain(day2);
  });
});
