import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// "1 response" / "3 responses" for nouns that pluralize with a plain "s".
export function plural(n, noun) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}
