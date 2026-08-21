import { z } from "zod";

export const VOTE_CHOICES = [
  "quest_board",
  "artifact_trails",
  "crawler_identity",
  "loot_leveling",
  "race_class_trial",
  "trading_outpost",
] as const;

export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const VOTE_OPTIONS: ReadonlyArray<{
  value: VoteChoice;
  label: string;
  description: string;
}> = [
  { value: "quest_board", label: "Quest Board", description: "Creative real-world missions." },
  {
    value: "artifact_trails",
    label: "Artifact Trails",
    description: "Follow shared gifts—approximately, never live.",
  },
  {
    value: "crawler_identity",
    label: "Crawler Identity",
    description: "A number, original avatar, and personal record.",
  },
  {
    value: "loot_leveling",
    label: "Loot & Leveling",
    description: "Achievements, badges, and digital rewards.",
  },
  {
    value: "race_class_trial",
    label: "Race & Class Trial",
    description: "A personality trial unlocked at Level 3.",
  },
  {
    value: "trading_outpost",
    label: "Trading Outpost",
    description: "Post trinkets and outside links—no on-site sales.",
  },
];

export const VOLUNTEER_ROLES = [
  "caffeinated_technomancer",
  "chromatic_bard",
  "chaos_custodian",
  "diplomatic_barbarian",
  "mischief_architect",
] as const;

export type VolunteerRole = (typeof VOLUNTEER_ROLES)[number];

export const VOLUNTEER_OPTIONS: ReadonlyArray<{
  value: VolunteerRole;
  label: string;
  description: string;
}> = [
  {
    value: "caffeinated_technomancer",
    label: "Caffeinated Technomancer",
    description: "Builds code, hosting, automations, and AI/ML. Keeps the machinery from getting ideas.",
  },
  {
    value: "chromatic_bard",
    label: "Chromatic Bard",
    description: "Creates art, avatars, and interface design. Makes the outpost deliberately legendary.",
  },
  {
    value: "chaos_custodian",
    label: "Chaos Custodian",
    description: "Coordinates plans, people, and site operations. Turns community chaos into completed quests.",
  },
  {
    value: "diplomatic_barbarian",
    label: "Diplomatic Barbarian",
    description: "Moderates and protects fellow Crawlers. Resolves trouble before the table gets flipped.",
  },
  {
    value: "mischief_architect",
    label: "Mischief Architect",
    description: "Designs quests, quizzes, rewards, and progression. Makes one more level sound reasonable.",
  },
];

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Enter a shorter email address.")
  .email("Enter a valid email address.")
  .transform((email) => email.toLowerCase());

const honeypotSchema = z.string().max(500).optional().default("");

const rewardSchema = z
  .object({
    email: emailSchema,
    launchNotice: z.boolean(),
    website: honeypotSchema,
  })
  .strict();

const voteSchema = z
  .object({
    choice: z.enum(VOTE_CHOICES),
    website: honeypotSchema,
  })
  .strict();

const volunteerSchema = z
  .object({
    email: emailSchema,
    roles: z
      .array(z.enum(VOLUNTEER_ROLES))
      .min(1, "Choose at least one role.")
      .max(3, "Choose no more than three roles.")
      .refine((roles) => new Set(roles).size === roles.length, "Choose each role only once."),
    website: honeypotSchema,
  })
  .strict();

export type SubmissionParseResult<T> =
  | { kind: "valid"; data: T }
  | { kind: "bot" }
  | { kind: "invalid"; message: string };

function parseWithHoneypot<T>(schema: z.ZodType<T & { website: string }>, payload: unknown) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      kind: "invalid" as const,
      message: result.error.issues[0]?.message ?? "Check your submission and try again.",
    };
  }

  if (result.data.website) return { kind: "bot" as const };
  const { website: _website, ...data } = result.data;
  void _website;
  return { kind: "valid" as const, data: data as Omit<T, "website"> };
}

export function parseRewardPayload(payload: unknown) {
  return parseWithHoneypot(rewardSchema, payload);
}

export function parseVotePayload(payload: unknown) {
  return parseWithHoneypot(voteSchema, payload);
}

export function parseVolunteerPayload(payload: unknown) {
  return parseWithHoneypot(volunteerSchema, payload);
}

export function votePercentages(rows: Array<{ choice: string; vote_count: number }>) {
  const counts = Object.fromEntries(VOTE_CHOICES.map((choice) => [choice, 0])) as Record<
    VoteChoice,
    number
  >;

  for (const row of rows) {
    if (VOTE_CHOICES.includes(row.choice as VoteChoice)) {
      counts[row.choice as VoteChoice] = Math.max(0, Number(row.vote_count) || 0);
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return VOTE_OPTIONS.map((option) => ({
    ...option,
    count: counts[option.value],
    percentage: total === 0 ? 0 : Math.round((counts[option.value] / total) * 1_000) / 10,
  }));
}
