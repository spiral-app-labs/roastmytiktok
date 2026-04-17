type RoastResultWithOptionalId = {
  id?: string;
};

export function ensureRoastResultId<T extends RoastResultWithOptionalId>(
  result: T,
  roastId: string,
): T & { id: string } {
  if (!roastId || result.id === roastId) {
    return result as T & { id: string };
  }

  return {
    ...result,
    id: roastId,
  };
}
