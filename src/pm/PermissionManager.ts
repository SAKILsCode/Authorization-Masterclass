import {
  Permission,
  Role,
  RoleBasedPermissions,
  RoleHierarchy,
} from './config';

interface PermissionContext {
  roles: Role[];
  permissions: Permission[];
}

export class PermissionManager {
  private readonly cachedRoleHierarchy: Map<Role, Set<Role>> = new Map();
  private readonly cachedRolePermissions: Map<Role, Set<Permission>> =
    new Map();

  constructor(private readonly context: PermissionContext) {
    // Flatten the role hierarchy and cache it
    Object.keys(RoleHierarchy).forEach((role) => {
      this.cachedRoleHierarchy.set(
        role as Role,
        this.computeRoleHierarchy(role as Role)
      );
    });

    // Flatten the role permissions and cache it
    Object.keys(RoleBasedPermissions).forEach((role) => {
      this.cachedRolePermissions.set(
        role as Role,
        this.computeRolePermissions(role as Role)
      );
    });
  }

  hasPermission(requiredPermission: Permission) {
    if (this.context.permissions.includes(requiredPermission)) {
      return true;
    }

    return this.hasPermissionThroughRole(
      this.context.roles,
      requiredPermission
    );
  }

  hasPermissions(requiredPermissions: Permission[]) {
    return requiredPermissions.every((permission) =>
      this.hasPermission(permission)
    );
  }

  hasAnyPermission(requiredPermissions: Permission[]) {
    return requiredPermissions.some((permission) =>
      this.hasPermission(permission)
    );
  }

  hasRole(requiredRole: Role) {
    return this.context.roles.some((role) => {
      const hierarchySet = this.cachedRoleHierarchy.get(role);
      return hierarchySet?.has(requiredRole) || role === requiredRole;
    });
  }

  getMaxRole() {
    return this.context.roles.reduce((maxRole, currentRole) => {
      return this.cachedRoleHierarchy.get(maxRole)?.has(currentRole)
        ? maxRole
        : currentRole;
    }, this.context.roles[0]);
  }

  // Private Methods
  private computeRoleHierarchy(
    role: Role,
    visited: Set<Role> = new Set()
  ): Set<Role> {
    const result = new Set<Role>();

    if (visited.has(role)) return result;

    visited.add(role);

    const inheritedRoles = RoleHierarchy[role] || [];
    inheritedRoles.forEach((inheritedRole) => {
      result.add(inheritedRole);
      const inheritedHierarchy = this.computeRoleHierarchy(
        inheritedRole,
        visited
      );
      inheritedHierarchy.forEach((r) => result.add(r));
    });

    return result;
  }

  private computeRolePermissions(
    role: Role,
    visited: Set<Role> = new Set()
  ): Set<Permission> {
    const result = new Set<Permission>();

    if (visited.has(role)) return result;

    visited.add(role);

    RoleBasedPermissions[role]?.forEach((permission) => result.add(permission));

    const hierarchySet = this.cachedRoleHierarchy.get(role);
    hierarchySet?.forEach((inheritedRole) => {
      RoleBasedPermissions[inheritedRole]?.forEach((permission) =>
        result.add(permission)
      );
    });

    return result;
  }

  private hasPermissionThroughRole(roles: Role[], permission: Permission) {
    return roles.some((role) =>
      this.cachedRolePermissions.get(role)?.has(permission)
    );
  }
}

// Example usage
const userPermissions = new PermissionManager({
  roles: [Role.USER],
  permissions: [Permission.PRODUCT_READ],
});
console.log(userPermissions.hasPermission(Permission.PRODUCT_READ)); // true
console.log(userPermissions.getMaxRole());
