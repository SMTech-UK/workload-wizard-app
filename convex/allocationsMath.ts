export type AllocationEntry = {
  type: "teaching" | "admin";
  hoursComputed?: number;
  hoursOverride?: number;
};

export function computeHoursFromCredits(credits?: number): number {
  if (!credits || !Number.isFinite(credits)) return 0;
  // Simple MVP heuristic: 1 credit = 1 hour (adjust later)
  return credits;
}

export function computeTotals(entries: AllocationEntry[]) {
  const sum = (filterType: AllocationEntry["type"]) =>
    entries
      .filter((e) => e.type === filterType)
      .reduce(
        (acc, e) =>
          acc +
          (typeof e.hoursOverride === "number"
            ? e.hoursOverride
            : e.hoursComputed || 0),
        0,
      );

  const allocatedTeaching = sum("teaching");
  const allocatedAdmin = sum("admin");
  return {
    allocatedTeaching,
    allocatedAdmin,
    allocatedTotal: allocatedTeaching + allocatedAdmin,
  };
}
