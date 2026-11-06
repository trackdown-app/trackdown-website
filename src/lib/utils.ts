/**
 * Joins class names and drops the ones a later class overrides, like
 * tailwind-merge. Import `cn` from here, never from the `cn` package, so
 * theme-specific class groups can be added in one place later (`createCn`
 * from `cn/config`).
 */
export { cn } from "cn";
