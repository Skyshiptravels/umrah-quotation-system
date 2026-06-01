import { isConfigAdminRole } from "@/lib/admin-access";

describe("admin-access", () => {
  it("allows SUPER_ADMIN and MANAGER for config admin", () => {
    expect(isConfigAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isConfigAdminRole("MANAGER")).toBe(true);
    expect(isConfigAdminRole("STAFF")).toBe(false);
  });
});
