/**
 * Auth Routes — Maps HTTP endpoints to AuthController methods
 *
 * @module auth-routes
 * @author Coder-A (Auth Service Lead)
 */

import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";

const router: Router = Router();
const controller = new AuthController();

// ── Public Auth Endpoints ────────────────────────────────────────────────────

router.post("/register",        (req, res) => controller.register(req, res));
router.post("/verify",          (req, res) => controller.verify(req, res));
router.post("/login",           (req, res) => controller.login(req, res));
router.post("/forgot-password", (req, res) => controller.forgotPassword(req, res));
router.post("/reset-password",  (req, res) => controller.resetPassword(req, res));
router.post("/google",          (req, res) => controller.googleAuth(req, res));

// ── Protected Endpoints ──────────────────────────────────────────────────────

router.get("/me", (req, res) => controller.me(req, res));
router.post("/request-detox-otp", (req, res) => controller.requestDetoxOtp(req, res));
router.post("/verify-detox-otp",  (req, res) => controller.verifyDetoxOtp(req, res));

export default router;
