import { AppError } from "../utils/errorHandling";

class RoleService {
  async requestAdminCreation(adminUid, newAdminEmail) {
    // This would create a request for another admin to approve
    // Implementation depends on workflow requirements
    throw new AppError("Not implemented", "role/not-implemented");
  }
}

export const roleService = new RoleService();
