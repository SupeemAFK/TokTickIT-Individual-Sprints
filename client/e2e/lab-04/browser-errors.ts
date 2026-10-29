import type { Page } from "playwright/test";

export function watchForBrowserErrors(page: Page, expectedConsoleError?: (message: string) => boolean) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !expectedConsoleError?.(message.text())) errors.push(message.text());
  });
  return () => errors;
}
