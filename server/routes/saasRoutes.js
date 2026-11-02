/**
 * Multi-Tenant SaaS, Subscriptions & Admin Moderation Router (/api/saas)
 */

const express = require('express');
const router = express.Router();
const saasController = require('../controllers/saasController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Public SaaS subscription plan catalog
router.get('/plans', asyncHandler(saasController.getSubscriptionPlans));

// Authenticated Business Tenant Dashboard & Settings
router.get('/my-business', protect, asyncHandler(saasController.getMyBusinessDashboard));
router.put('/my-business', protect, asyncHandler(saasController.updateBusinessProfile));

// Business Team Memberships (RBAC)
router.post('/my-business/members', protect, asyncHandler(saasController.addBusinessMember));
router.delete('/my-business/members/:memberId', protect, asyncHandler(saasController.removeBusinessMember));

// Subscription Checkout & Cryptographic HMAC-SHA256 Verification
router.post('/subscriptions/checkout', protect, asyncHandler(saasController.createSubscriptionCheckout));
router.post('/subscriptions/verify', protect, asyncHandler(saasController.verifySubscriptionPayment));

// Grooming Business Service & Booking Operations
router.post('/grooming/services', protect, asyncHandler(saasController.createGroomingServicePackage));
router.put('/grooming/bookings/:id/status', protect, asyncHandler(saasController.updateGroomingBookingStatus));

// Platform Admin Moderation & Audit Trail
router.get('/admin/overview', protect, requireRole('admin'), asyncHandler(saasController.getAdminOverview));
router.put('/admin/businesses/:id/status', protect, requireRole('admin'), asyncHandler(saasController.moderateBusiness));
router.put('/admin/products/:id/moderate', protect, requireRole('admin'), asyncHandler(saasController.moderateProduct));

module.exports = router;
