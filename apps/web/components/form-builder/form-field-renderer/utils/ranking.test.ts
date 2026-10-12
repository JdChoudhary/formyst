import { describe, expect, it } from "vitest";
import { getRankedOrder, getRankOptions, moveRanked } from "./ranking";

describe("getRankOptions", () => {
  it("reads the canonical properties.choices list", () => {
    const options = getRankOptions([
      { ref: "approver_design", label: "Design" },
      { ref: "approver_eng", label: "Engineering" },
    ]);

    expect(options).toEqual([
      { id: "approver_design", label: "Design" },
      { id: "approver_eng", label: "Engineering" },
    ]);
  });

  it("falls back to the label when a choice has no ref", () => {
    expect(getRankOptions([{ label: "Legal" }])).toEqual([{ id: "Legal", label: "Legal" }]);
  });

  it("returns an empty list for missing choices", () => {
    expect(getRankOptions(undefined)).toEqual([]);
  });
});

describe("getRankedOrder", () => {
  const options = getRankOptions([
    { ref: "a", label: "A" },
    { ref: "b", label: "B" },
    { ref: "c", label: "C" },
  ]);

  it("shows every option in source order before any ranking exists", () => {
    expect(getRankedOrder(options, undefined)).toEqual(["a", "b", "c"]);
    expect(getRankedOrder(options, [])).toEqual(["a", "b", "c"]);
  });

  it("keeps the saved ranking first and appends the rest", () => {
    expect(getRankedOrder(options, ["c", "a"])).toEqual(["c", "a", "b"]);
  });

  it("ignores stale ids and never duplicates an option", () => {
    expect(getRankedOrder(options, ["b", "gone", "b"])).toEqual(["b", "a", "c"]);
  });
});

describe("moveRanked", () => {
  it("swaps with the neighbour", () => {
    expect(moveRanked(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveRanked(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
  });

  it("refuses to move past either end", () => {
    expect(moveRanked(["a", "b", "c"], "a", -1)).toBeNull();
    expect(moveRanked(["a", "b", "c"], "c", 1)).toBeNull();
  });

  it("refuses an unknown id", () => {
    expect(moveRanked(["a", "b"], "zzz", 1)).toBeNull();
  });
});
