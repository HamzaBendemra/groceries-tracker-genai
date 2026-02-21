export function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (part.length === 0) {
            return part;
          }

          return `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`;
        })
        .join("-"),
    )
    .join(" ");
}
