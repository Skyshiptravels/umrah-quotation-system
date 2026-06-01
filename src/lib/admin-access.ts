import { Role } from "@/types";

const ADMIN_CONFIG_ROLES: Role[] = ["SUPER_ADMIN", "MANAGER"];

export function isConfigAdminRole(role: string): boolean {
  return ADMIN_CONFIG_ROLES.includes(role as Role);
}
