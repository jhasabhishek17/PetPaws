# PetPaws — Architecture & Project Structure Reference

This document provides a comprehensive technical overview of the PetPaws codebase, its directory structure, architectural layers, data flows, and module responsibilities.

---

## 1. Complete Directory Tree

```text
PetPaws/
├── README.md                              # Main project documentation, setup & deployment guide
├── PROJECT_STRUCTURE.md                   # Complete architectural and file-by-file reference
├── package.json                           # Root workspace helper scripts
├── .gitignore                             # Ignored paths (node_modules, .env, dist, local DB)
│
├── client/                                # React 18 + Vite + Tailwind CSS Single-Page App
│   ├── index.html                         # HTML shell with viewport and font configurations
│   ├── vite.config.js                     # Vite build configuration with development API proxy
│   ├── tailwind.config.js                 # Tailwind CSS theme, typography, and color tokens
│   ├── postcss.config.js                  # PostCSS plugin pipeline
│   ├── package.json                       # Frontend dependencies and npm scripts
│   ├── .env.example                       # Client environment variable template
│   └── src/
│       ├── main.jsx                       # React DOM entry point (mounts App inside StrictMode)
│       ├── App.jsx                        # Root SPA state, URL hash routing, auth session verification
│       ├── index.css                      # Tailwind base directives and custom design tokens
│       │
│       ├── components/                    # UI Components and Role-Based Dashboards
│       │   ├── Navbar.jsx                 # Role-aware navigation header with badge counters
│       │   ├── Hero.jsx                   # Marketplace hero banner with category quick-jump
│       │   ├── Marketplace.jsx            # Pet adoption listings with search, filters, and cards
│       │   ├── PetDetailModal.jsx         # Pet inspection modal with image/video gallery and health data
│       │   ├── CheckoutModal.jsx          # Pet adoption checkout dialog with payment method selection
│       │   ├── ProductsMarketplace.jsx    # Pet supplies store with variant selector and cart drawer
│       │   ├── OrdersTracking.jsx         # Unified tracker for pet adoptions and physical supply orders
│       │   ├── LiveTransportRadar.jsx     # Visual order tracking radar for active shipments
│       │   ├── BuyerDashboard.jsx         # Buyer portal (pet & product orders, care schedule, wishlist)
│       │   ├── SellerDashboard.jsx        # Breeder portal (pet inventory, media upload, order tracking)
│       │   ├── BusinessSaaSPortal.jsx     # Multi-tenant vendor workspace (analytics, catalog, team, plans)
│       │   ├── VetSection.jsx             # Public veterinary directory and appointment booking modal
│       │   ├── VetDashboard.jsx           # Clinical portal for veterinarians (profile, schedule, visits)
│       │   ├── GroomingCareSection.jsx    # Grooming and spa package directory with booking dialog
│       │   ├── CustomerSupport.jsx        # FAQ accordion and customer support ticket submission
│       │   ├── AdminPortal.jsx            # Platform administration console (KPIs, support desk, moderation)
│       │   ├── AuthModal.jsx              # Role-aware login and registration dialog
│       │   ├── VerifyEmailPage.jsx        # Email OTP verification view
│       │   ├── ResetPasswordPage.jsx      # Password reset view with OTP challenge
│       │   ├── FloatingQuickActions.jsx   # Floating glassmorphism shortcut bar
│       │   ├── PetMatchmakerQuiz.jsx      # Interactive pet compatibility quiz
│       │   ├── OfferCountdownTimer.jsx    # Promotional countdown timer banner
│       │   ├── PawBackdrop.jsx            # Decorative background accent elements
│       │   ├── PawLoader.jsx              # Custom paw-print loading indicator and skeleton cards
│       │   ├── PetIllustration.jsx        # SVG pet illustrations
│       │   ├── Reveal.jsx                 # Scroll-triggered animation wrapper
│       │   └── Toast.jsx                  # Floating toast notification system and hook
│       │
│       └── utils/
│           ├── auth.js                    # Fetch wrappers (apiGet, apiPost, apiPut, apiDelete, apiUploadMedia)
│           └── permissions.js             # Client-side role constants and permission helper functions
│
└── server/                                # Node.js + Express.js Modular Backend API
    ├── server.js                          # Express bootstrap, security middleware, and route mounting
    ├── package.json                       # Backend dependencies, test scripts, and seed commands
    ├── .env.example                       # Backend environment variable template
    ├── db.js                              # Local development JSON persistence fallback engine
    ├── petpaws_data.json                  # Local development fallback dataset (gitignored)
    ├── seed.js                            # Base database seeder for pets, vets, and grooming services
    ├── seedProducts.js                    # Idempotent seeder for 20 INR pet products and platform users
    ├── seed-demo.js                       # Comprehensive multi-role demo data seeder
    │
    ├── config/                            # Infrastructure and Security Configuration
    │   ├── db.js                          # Mongoose connection manager with strict test isolation
    │   ├── cloudinary.js                  # Cloudinary SDK setup, stream upload, and asset cleanup
    │   └── jwt.js                         # JWT secret resolver with production environment guard
    │
    ├── controllers/                       # Request Handlers & Business Logic
    │   ├── authController.js              # Auth, OTP verification, password reset, profile, wishlists
    │   ├── petController.js               # Pet CRUD, regex-sanitized search, and media deletion
    │   ├── productController.js           # Multi-vendor supplies CRUD, variants, stock, safety guards
    │   ├── orderController.js             # Pet adoption checkout, status progression, tracking, cancel
    │   ├── productOrderController.js      # Cart checkout, pricing calculation, tracking, COD, returns
    │   ├── vetController.js               # Vet directory, clinic profile, and appointment scheduling
    │   ├── serviceController.js           # Grooming service catalog and appointment reservations
    │   ├── saasController.js              # Multi-tenant workspace, team RBAC, plan billing, moderation
    │   ├── supportController.js           # Support ticket creation, filtering, and admin responses
    │   ├── uploadController.js            # Role-guarded media uploads to Cloudinary
    │   └── offerController.js             # Promotional discounts and special offer management
    │
    ├── middleware/                        # Express Custom Middleware Pipeline
    │   ├── asyncHandler.js                # Async route exception wrapper
    │   ├── authMiddleware.js              # JWT verification (protect, optionalAuth, requireRole)
    │   ├── tenantMiddleware.js            # Business resolution, subscription limits, and audit logger
    │   ├── uploadMiddleware.js            # Multer memory storage and MIME/size validation
    │   ├── requestLogger.js               # Timestamped HTTP method and URL logger
    │   └── errorHandler.js                # Global operational error handler with sanitized responses
    │
    ├── models/                            # Mongoose Data Models (15 Collections)
    │   ├── User.js                        # Accounts, hashed passwords, token versioning, wishlists
    │   ├── Business.js                    # Multi-tenant vendor business entity, plan tier, quotas
    │   ├── BusinessMembership.js          # Tenant team RBAC linking users to business organizations
    │   ├── Product.js                     # Pet supply products, variants, SKUs, inventory, moderation
    │   ├── ProductOrder.js                # Multi-vendor supply orders, items, shipping, returns
    │   ├── Order.js                       # Pet adoption orders and live shipment milestones
    │   ├── Pet.js                         # Pet adoption listings, health certification, media
    │   ├── VetProfile.js                  # Veterinarian qualifications, clinic location, fees
    │   ├── VetAppointment.js              # Scheduled veterinary clinic consultations
    │   ├── GroomingService.js             # Grooming and spa care packages
    │   ├── GroomingBooking.js             # Customer grooming session appointments
    │   ├── SupportTicket.js               # Customer support inquiries and threaded admin responses
    │   ├── SubscriptionTransaction.js     # SaaS billing ledger and webhook event deduplication
    │   ├── AuditLog.js                    # Immutable platform security and administration log
    │   └── OtpRateLimit.js                # Persistent rate limiting for OTP verification emails
    │
    ├── routes/                            # Express Modular Routers
    │   ├── authRoutes.js                  # /api/auth (registration, login, OTP, profile, wishlists)
    │   ├── petRoutes.js                   # /api/pets (adoption listings, seller inventory)
    │   ├── productRoutes.js               # /api/products (supplies catalog, vendor inventory, reviews)
    │   ├── orderRoutes.js                 # /api/orders (adoption orders, tracking, cancellation)
    │   ├── productOrderRoutes.js          # /api/product-orders (cart checkout, order tracking, returns)
    │   ├── vetRoutes.js                   # /api/vets (directory, profiles, appointment bookings)
    │   ├── serviceRoutes.js               # /api/services (grooming packages and bookings)
    │   ├── saasRoutes.js                  # /api/saas (plans, team, subscriptions, admin moderation)
    │   ├── supportRoutes.js               # /api/support (support ticket creation and administration)
    │   ├── uploadRoutes.js                # /api/upload (Cloudinary media upload and deletion)
    │   ├── offerRoutes.js                 # /api/offers (promotional discount management)
    │   └── viewRoutes.js                  # Server-rendered EJS fallback routes
    │
    ├── utils/                             # Shared Backend Utilities
    │   ├── dbHelpers.js                   # Document lookup by any ID and ReDoS-safe regex escaping
    │   ├── discountEngine.js              # Promotional discount calculations and validation rules
    │   ├── emailService.js                # Transactional email delivery (email59, Resend, SMTP)
    │   ├── emailValidator.js              # Strict email syntax, MX DNS lookup, and test fallbacks
    │   ├── ExpressError.js                # Standard operational HTTP error class
    │   ├── normalize.js                   # Mongoose document and ID normalizer for JSON responses
    │   ├── otpRateLimiter.js              # Cooldown, hourly, and daily OTP dispatch throttler
    │   └── paymentGateway.js              # HMAC-SHA256 signature verification and price calculations
    │
    ├── tests/                             # Automated Test Suites (Node.js Native Runner)
    │   ├── platformAudit.test.js          # 28 tests: pricing, stock, COD checkout, isolation
    │   ├── customerSupport.test.js        # 25 tests: ticket isolation, admin desk, telemetry
    │   ├── roleBasedUX.test.js            # 11 tests: role guards, nonexistent JWTs, tampering
    │   └── offersDiscounts.test.js        # 9 tests: commercial discounts, free adoption rules
    │
    ├── views/                             # EJS Templates (Server-Rendered MVC Engine)
    │   ├── layouts/boilerplate.ejs        # Master HTML layout template
    │   ├── partials/                      # Reusable navbar, footer, and header partials
    │   └── pets/, orders/, vets/, etc.    # EJS view templates
    │
    └── public/                            # Static CSS and JS assets for EJS views
```

---

## 2. Architectural Layers & Responsibilities

### Frontend Layer (`client/`)
- **Entry Points:** `client/index.html` loads `client/src/main.jsx`, which renders `client/src/App.jsx`.
- **State & Routing:** `App.jsx` coordinates root user state (`currentUser`), active view tab (`activeTab`), and syncs with `window.location.hash` (`#marketplace`, `#products`, `#seller`, `#buyer-dashboard`, `#admin-portal`, etc.) to support browser history.
- **API Communication:** `client/src/utils/auth.js` provides centralized, token-authenticated fetch helpers (`apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUploadMedia`). Requests include `Authorization: Bearer <token>` automatically when a token is present in `localStorage`.
- **Role Guards:** `client/src/utils/permissions.js` exports role evaluation helpers (`isCustomer`, `isSeller`, `isShopkeeper`, `isVet`, `isGroomer`, `isAdmin`, `isProvider`, `canPurchaseProducts`). Components use these helpers to prevent unauthorized UI actions before network calls are made.

### Backend Routing & Controller Layer (`server/`)
- **Entry Point:** `server/server.js` sets up Express with Helmet security headers, CORS origin whitelisting, request logging, and mounts all API routers under `/api/*`.
- **Controllers:** Controllers in `server/controllers/` receive requests, validate inputs, interact with Mongoose models, and return structured JSON responses `{ success: true, ... }`. Async route errors are forwarded to `server/middleware/errorHandler.js` via `asyncHandler`.
- **Dual Persistence:** Primary data operations run through Mongoose against MongoDB. When running in offline development mode without an accessible MongoDB daemon, `server/db.js` provides resilient JSON read/write fallbacks (`server/petpaws_data.json`). In test execution, connections are strictly isolated to `mongodb://127.0.0.1:27017/petpaws_test`.

### Authentication & Authorization Pipeline
1. **Registration:** `POST /api/auth/register` creates a user record with `email_verified: false` and sends a 6-digit verification OTP. The `admin` role is strictly rejected on public registration.
2. **Verification:** `POST /api/auth/verify-otp` validates the OTP, updates `email_verified: true`, and returns an initial JWT.
3. **Login:** `POST /api/auth/login` checks credentials via `bcryptjs.compare`, verifies `email_verified === true`, and generates a signed JWT containing `{ id, role, tv }` (where `tv` is the user's `token_version`).
4. **Middleware Protection (`authMiddleware.js`):**
   - `protect`: Extracts the Bearer token, verifies its signature with `JWT_SECRET`, retrieves the user record from the database, confirms `token_version` matches, and attaches the authoritative database user to `req.user`.
   - `requireRole(...roles)`: Normalizes roles (mapping legacy `'customer'` to `'buyer'`) and checks whether `req.user.role` is in the allowed list; otherwise, returns HTTP 403.

---

## 3. Major Application Data Flows

### A. Multi-Vendor Product Cart & COD Checkout
```text
[Buyer: ProductsMarketplace]
         |
         | 1. POST /api/product-orders/initiate { items: [...] }
         v
[productOrderController.initiateProductCheckout]
         | - Validates product existence and stock
         | - Computes verified subtotal, discounts, GST/tax, and shipping fee
         | - Blocks vendor self-purchases
         v
[Buyer receives verified summary]
         |
         | 2. POST /api/product-orders/checkout { payment_method: 'COD', items: [...], shipping_address }
         v
[productOrderController.checkoutCart]
         | - Re-verifies catalog pricing from database (never trusts client totals)
         | - Atomically decrements product variant stock and total stock
         | - Creates ProductOrder with order_status: 'Order Placed', payment_status: 'Pending'
         v
[Response 201 Created] -> [Buyer navigated to #orders tracking view]
```

### B. Pet Adoption & Live Transport Tracking
```text
[Buyer: Marketplace / PetDetailModal]
         |
         | POST /api/orders/checkout { pet_id, buyer_phone, shipping_address, payment_method }
         v
[orderController.createCheckoutOrder]
         | - Verifies pet is available (stock > 0, status: 'available')
         | - Decrements pet stock; if stock reaches 0, updates status to 'sold'
         | - Creates Order record with tracking_code: TRACK-PET-XXXXXX
         v
[Tracking View: OrdersTracking.jsx]
         | - Displays 5-stage shipment progression:
         |   Order Placed -> Health Check Completed -> In Transit -> Out for Delivery -> Delivered
         | - Seller can advance transport stages via PUT /api/orders/:id/status
         | - Buyer can cancel unshipped order via PUT /api/orders/:id/cancel (auto-restocks pet)
```

### C. Veterinary Consultation Scheduling
```text
[Buyer: VetSection.jsx]
         |
         | POST /api/vets/appointments { vet_id, pet_name, appointment_date, time_slot, type }
         v
[vetController.createAppointment]
         | - Enforces buyer-only role check (service providers blocked with 403)
         | - Validates vet availability and creates VetAppointment record
         v
[Vet Dashboard: VetDashboard.jsx]
         | - Veterinarian reviews incoming patient appointments
         | - Updates status via PUT /api/vets/appointments/:id/status (Confirmed, Completed, Cancelled)
```

### D. Customer Support Ticket Lifecycle
```text
[Buyer: CustomerSupport.jsx]
         |
         | POST /api/support/tickets { subject, message, priority }
         v
[supportController.createTicket]
         | - Validates inputs and stores SupportTicket with custom_id TCK-XXXXXX
         | - Optional: sends notification email to SUPPORT_TEAM_EMAIL
         v
[Admin: AdminPortal.jsx (Support Desk)]
         | - Admin reviews all platform tickets with status and priority filters
         | - PUT /api/support/tickets/:id appends admin response and updates status to Resolved
         | - Buyer sees updated ticket response in real time
```

### E. Media Upload Pipeline
```text
[Client: SellerDashboard / ProductsMarketplace / VetDashboard]
         |
         | Multipart Form Data (POST /api/upload with context: pets | products | profiles)
         v
[uploadMiddleware.js]
         | - Multer buffers upload into memory (no temp files on disk)
         | - Validates MIME types (JPEG, PNG, WebP, GIF, MP4, WebM)
         | - Enforces file size limits (images <= 10MB, videos <= 50MB)
         v
[uploadController.js]
         | - Enforces role-based context permission
         | - Streams buffer directly into Cloudinary folder (petpaws/<context>)
         | - Returns { url, public_id, resource_type }
```

---

## 4. Test Architecture & Execution

Automated tests are located in `server/tests/` and use Node.js's built-in test runner (`node --test`). Tests run in an isolated environment that redirects database connections to `mongodb://127.0.0.1:27017/petpaws_test` and installs deterministic DNS and email service mocks.

| Test Suite | File | Tests | Key Coverage |
| :--- | :--- | :---: | :--- |
| **Platform Audit** | `server/tests/platformAudit.test.js` | 28 | Effective pricing, variant stock decrement, COD orders, idempotency, email failure recovery, rate limits, DB isolation |
| **Customer Support** | `server/tests/customerSupport.test.js` | 25 | Support ticket creation, tenant isolation, admin search/filtering, threaded replies, system health telemetry |
| **Role-Based UX** | `server/tests/roleBasedUX.test.js` | 11 | Guest/provider checkout guards, appointment role validation, nonexistent user JWT rejection, DB-authoritative roles |
| **Offers & Discounts** | `server/tests/offersDiscounts.test.js` | 9 | Commercial discount engine, free adoption listing rules, tenant-isolated offer updates, date-based expiration |

### Running Tests
```bash
# Execute primary test suite from root
npm test

# Execute individual suites directly with Node.js
node --test server/tests/platformAudit.test.js
node --test server/tests/customerSupport.test.js
node --test server/tests/roleBasedUX.test.js
node --test server/tests/offersDiscounts.test.js
```

---

## 5. Environment Configuration Reference

Environment variables must be configured in `server/.env` and `client/.env` based on their respective `.env.example` templates.

### Backend (`server/.env`)
- `PORT`: HTTP port number for the API server (default: `5001`).
- `NODE_ENV`: Runtime mode (`development` or `production`).
- `MONGODB_URI`: MongoDB connection string (e.g., `mongodb://127.0.0.1:27017/petpaws` or MongoDB Atlas URI).
- `JWT_SECRET`: Cryptographic secret key used to sign and verify JSON Web Tokens.
- `JWT_EXPIRES_IN`: JWT expiration interval (default: `7d`).
- `ALLOWED_ORIGINS`: Comma-separated CORS whitelist (e.g., `http://localhost:5173`).
- `TRUST_PROXY`: Reverse proxy hop count (set to `1` on Render or AWS).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary API credentials.
- `EMAIL_SERVICE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP email delivery configuration.
- `EMAIL59_API_KEY` / `RESEND_API_KEY`: Alternative HTTPS email API keys.
- `SUPPORT_TEAM_EMAIL`: Destination mailbox for customer support notifications.

### Frontend (`client/.env`)
- `VITE_API_URL`: Base URL for the backend API (default: `http://localhost:5001`).
