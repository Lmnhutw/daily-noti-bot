export type DbRow = Record<string, unknown>;

export function requiredNumber(row: DbRow, key: string): number {
  const value = row[key];
  const numberValue = typeof value === "bigint" ? Number(value) : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Expected numeric column ${key}`);
  }

  return numberValue;
}

export function optionalNumber(row: DbRow, key: string): number | undefined {
  const value = row[key];

  if (value === null || value === undefined) {
    return undefined;
  }

  return requiredNumber(row, key);
}

export function requiredString(row: DbRow, key: string): string {
  const value = row[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected string column ${key}`);
  }

  return value;
}

export function optionalString(row: DbRow, key: string): string | undefined {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return requiredString(row, key);
}
