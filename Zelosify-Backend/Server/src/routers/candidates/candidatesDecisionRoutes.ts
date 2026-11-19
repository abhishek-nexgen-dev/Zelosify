import { Router } from "express";
import {
  shortlistCandidate,
  rejectCandidate,
  getCandidateApplicationScore,
} from "../../controllers/recruiter/recruiterController.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { validateRequest } from "../../middlewares/validation/validateRequest.js";
import { candidateDecisionSchema } from "../../validations/candidateValidation.js";
import { requirePermission } from "../../middlewares/auth/requirePermission.js";

const router = Router();

router.use(authenticateUser);
router.use(authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER"));

router.get("/:id/score", requirePermission("CANDIDATES_VIEW"), getCandidateApplicationScore);





router.post("/:id/shortlist", requirePermission("CANDIDATES_SHORTLIST"), validateRequest(candidateDecisionSchema), shortlistCandidate);






router.post("/:id/reject", requirePermission("CANDIDATES_REJECT"), validateRequest(candidateDecisionSchema), rejectCandidate);

export default router;
