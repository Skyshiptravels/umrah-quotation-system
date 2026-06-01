import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Umrah Quotation/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("link", { name: /Forgot password/i })).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /Reset Password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Reset Link/i })).toBeVisible();
  });
});

test.describe("Protected routes", () => {
  test("redirects unauthenticated user from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
