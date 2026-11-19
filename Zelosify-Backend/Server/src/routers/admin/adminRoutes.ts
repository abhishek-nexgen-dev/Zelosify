import { Router } from "express";
import {
  addTeamMemberPermission,
  createTeamMember,
  deleteTeamMember,
  listPermissionTargets,
  listRecruiters,
  removeTeamMemberPermission,
  updateTeamMemberPermissions,
} from "../../controllers/admin/adminController.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { validateRequest } from "../../middlewares/validation/validateRequest.js";
import {
  addTeamPermissionSchema,
  createTeamMemberSchema,
  listPermissionTargetsQuerySchema,
  listRecruitersQuerySchema,
  removeTeamPermissionSchema,
  teamMemberParamsSchema,
  updateUserPermissionsSchema,
} from "../../validations/authValidation.js";
import { requirePermission } from "../../middlewares/auth/requirePermission.js";

const router = Router();


router.use(authenticateUser);






router.post(
  "/recruiters",
  authorizeRole("ADMIN"),
  requirePermission("RECRUITER_CREATE"),
  validateRequest(createTeamMemberSchema),
  createTeamMember,
);






router.get(
  "/recruiters",
  authorizeRole("ADMIN"),
  requirePermission("TEAM_VIEW"),
  validateRequest(listRecruitersQuerySchema),
  listRecruiters,
);

router.get(
  "/team/permission-targets",
  authorizeRole("ADMIN"),
  validateRequest(listPermissionTargetsQuerySchema),
  listPermissionTargets,
);

router.patch(
  "/recruiters/:id/permissions",
  authorizeRole("ADMIN"),
  validateRequest(updateUserPermissionsSchema),
  updateTeamMemberPermissions,
);

router.post(
  "/team/:id/permissions",
  authorizeRole("ADMIN"),
  validateRequest(addTeamPermissionSchema),
  addTeamMemberPermission,
);

router.delete(
  "/team/:id/permissions/:permission",
  authorizeRole("ADMIN"),
  validateRequest(removeTeamPermissionSchema),
  removeTeamMemberPermission,
);

router.delete(
  "/recruiters/:id",
  authorizeRole("ADMIN"),
  requirePermission("RECRUITER_MANAGE"),
  validateRequest(teamMemberParamsSchema),
  deleteTeamMember,
);

export default router;
