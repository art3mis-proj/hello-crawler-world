import { describe, expect, it } from "vitest";

import {
  parseRewardPayload,
  parseVolunteerPayload,
  parseVotePayload,
  votePercentages,
} from "@/lib/experience";

describe("production submission validation", () => {
  it("normalizes a valid reward email and requires explicit notice consent", () => {
    expect(
      parseRewardPayload({
        email: " CRAWLER@EXAMPLE.COM ",
        launchNotice: false,
        website: "",
      }),
    ).toEqual({
      kind: "valid",
      data: { email: "crawler@example.com", launchNotice: false },
    });

    expect(parseRewardPayload({ email: "crawler@example.com" }).kind).toBe("invalid");
  });

  it("rejects malformed emails on both email-capturing forms", () => {
    expect(
      parseRewardPayload({ email: "not-an-email", launchNotice: false, website: "" }).kind,
    ).toBe("invalid");
    expect(
      parseVolunteerPayload({
        email: "also-wrong",
        roles: ["chromatic_bard"],
        website: "",
      }).kind,
    ).toBe("invalid");
  });

  it("accepts one to three unique approved volunteer roles", () => {
    expect(
      parseVolunteerPayload({
        email: "crawler@example.com",
        roles: ["caffeinated_technomancer", "chromatic_bard", "mischief_architect"],
        website: "",
      }).kind,
    ).toBe("valid");
    expect(
      parseVolunteerPayload({
        email: "crawler@example.com",
        roles: [
          "caffeinated_technomancer",
          "chromatic_bard",
          "mischief_architect",
          "chaos_custodian",
        ],
        website: "",
      }).kind,
    ).toBe("invalid");
    expect(
      parseVolunteerPayload({
        email: "crawler@example.com",
        roles: ["chromatic_bard", "chromatic_bard"],
        website: "",
      }).kind,
    ).toBe("invalid");
  });

  it("rejects invented vote choices and silently traps bots", () => {
    expect(parseVotePayload({ choice: "buy_the_site", website: "" }).kind).toBe("invalid");
    expect(parseVotePayload({ choice: "quest_board", website: "https://bot.invalid" }).kind).toBe(
      "bot",
    );
  });

  it("calculates complete, stable result percentages", () => {
    const results = votePercentages([
      { choice: "quest_board", vote_count: 3 },
      { choice: "trading_outpost", vote_count: 1 },
    ]);

    expect(results).toHaveLength(6);
    expect(results.find((result) => result.value === "quest_board")?.percentage).toBe(75);
    expect(results.find((result) => result.value === "trading_outpost")?.percentage).toBe(25);
  });
});
