export const test = ["a", "b", "c"] as const;
export type Test = (typeof test)[number];
