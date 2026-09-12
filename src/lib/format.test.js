import { describe, it, expect } from "vitest";
import { formatRest, fmtRestMMSS, fmtDur, fmtTimer, fmtVolume } from "./format";

describe("formatRest", () => {
  it("returns an empty string for falsy input", () => {
    expect(formatRest(0)).toBe("");
    expect(formatRest(null)).toBe("");
  });
  it("formats sub-minute values in seconds", () => {
    expect(formatRest(45)).toBe("45s");
  });
  it("formats exact minutes without seconds", () => {
    expect(formatRest(120)).toBe("2 min");
  });
  it("formats minutes+seconds compactly", () => {
    expect(formatRest(90)).toBe("1min30");
  });
});

describe("fmtRestMMSS", () => {
  it("pads minutes and seconds to two digits", () => {
    expect(fmtRestMMSS(90)).toBe("01:30");
  });
  it("treats missing input as zero", () => {
    expect(fmtRestMMSS(undefined)).toBe("00:00");
  });
});

describe("fmtDur", () => {
  it("shows minutes only under an hour", () => {
    expect(fmtDur(59)).toBe("59 min");
  });
  it("switches to hours at the 60-minute boundary", () => {
    expect(fmtDur(60)).toBe("1 h");
  });
  it("shows both hours and minutes when there's a remainder", () => {
    expect(fmtDur(95)).toBe("1 h 35 min");
  });
});

describe("fmtTimer", () => {
  it("formats under an hour as MM:SS", () => {
    expect(fmtTimer(90 * 1000)).toBe("01:30");
  });
  it("switches to H:MM:SS past one hour", () => {
    expect(fmtTimer(3661 * 1000)).toBe("1:01:01");
  });
  it("clamps negative durations to zero", () => {
    expect(fmtTimer(-500)).toBe("00:00");
  });
});

describe("fmtVolume", () => {
  it("shows kg under one tonne", () => {
    expect(fmtVolume(500)).toBe("500 kg");
  });
  it("switches to tonnes at the 1000kg boundary", () => {
    expect(fmtVolume(1000)).toBe("1.00 T");
  });
  it("drops decimals past 100 tonnes", () => {
    expect(fmtVolume(150000)).toBe("150 T");
  });
});
