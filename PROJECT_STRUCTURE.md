# 🐾 PetPaws — Modular Architecture & Project Structure Reference

## 🌟 Overview
**PetPaws** is a full-stack **MERN + Multi-Tenant SaaS** pet care, adoption, and multi-vendor pet products marketplace. It supports both:
1. **React 18 + Vite Single-Page Application (`client/`)** for the complete multi-role SaaS & marketplace experience (`buyer`, `shopkeeper`, `seller`, `vet`, `groomer`, and `admin`).
2. **RESTful JSON API + Server-Side EJS Views (`server/`)** following a clean Model–View–Controller (MVC) + Middleware architecture backed by **MongoDB Atlas** and **Cloudinary**.

---

## 📁 Complete Directory Tree

```text
PetPaws/
├── README.md                              # Main project documentation, setup, API & security overview
├── PROJECT_STRUCTURE.md                   # Comprehensive module & file-by-file developer reference
├── package.json                           # Root helper scripts (install-all, seed, start)
│
├── docs/                                  # Technical Documentation & Learning Guides
│   ├── PetPaws_Complete_Project_Learning_Guide.pdf
│   ├── PetPaws_Frontend_and_Code_Walkthrough.pdf
│   ├── PetPaws_Project_Documentation.pdf
│   └── PetPaws_Step_by_Step_Full_Stack_Tutorial.pdf
│
├── server/                                # Node.js + Express.js Modular Backend
│   ├── server.js                          # Express app entry point: security headers, CORS, routes & error handling
│   ├── db.js                              # Dev-only JSON fallback storage engine (disabled in production)
│   ├── petpaws_data.json                  # Local development fallback dataset
│   ├── seed.js                            # Base database seeder (pets, vets, grooming services)
│   ├── seed-demo.js                       # Multi-role demo account & marketplace seeder
│   ├── seedProducts.js                    # Idempotent seeder for 20 INR (₹) products & core platform users
│   ├── .env.example                       # Backend environment configuration template
│   ├── package.json                       # Backend dependencies & npm scripts
│   │
│   ├── config/                            # Infrastructure & Security Configuration
│   │   ├── cloudinary.js                  # Cloudinary SDK setup, buffer stream upload & asset deletion
│   │   ├── db.js                          # MongoDB / MongoDB Atlas Mongoose connection handler
│   │   └── jwt.js                         # Centralized JWT secret resolver (enforces JWT_SECRET in production)
│   │
│   ├── controllers/                       # MVC Business Logic Controllers
│   │   ├── authController.js              # Registration (admin blocked), login, /me, profile, wishlists & payouts
│   │   ├── petController.js               # Pet listings CRUD, regex-escaped search/filters & Cloudinary cleanup
│   │   ├── productController.js           # Multi-vendor product CRUD, variants, safety guardrails & reporting
│   │   ├── orderController.js             # Pet adoption checkout, status progression, tracking & cancellation
│   │   ├── productOrderController.js      # Cart checkout, server GST/commission calc, tracking, cancel & returns
│   │   ├── saasController.js              # Multi-tenant dashboard, team RBAC, HMAC billing, webhooks & Admin console
│   │   ├── vetController.js               # Veterinarian directory, profile management & consultation scheduling
│   │   ├── serviceController.js           # Grooming service catalog & tenant-scoped booking lifecycle
│   │   ├── supportController.js           # Customer support ticket creation
│   │   └── uploadController.js            # Role-guarded Cloudinary media uploads (pets, products, profiles)
│   │
│   ├── middleware/                        # Express Custom Middleware Pipeline
│   │   ├── asyncHandler.js                # Higher-order async/await error wrapper
│   │   ├── authMiddleware.js              # JWT bearer verification (protect, optionalAuth, requireRole)
│   │   ├── errorHandler.js                # Global JSON & XSS-escaped HTML error handler
│   │   ├── requestLogger.js               # Timestamped HTTP method & path logger
│   │   ├── tenantMiddleware.js            # Multi-tenant Business resolver, SaaS plan limits & audit logger
│   │   └── uploadMiddleware.js            # Multer memoryStorage, MIME allowlist & file size validator
│   │
│   ├── models/                            # Mongoose Schemas & Models (14 Collections)
│   │   ├── User.js                        # User accounts (buyer, seller, shopkeeper, vet, groomer, admin)
│   │   ├── Business.js                    # Multi-tenant vendor business, SaaS plan tier & feature limits
│   │   ├── BusinessMembership.js          # Tenant team RBAC memberships (owner, manager, staff, vet, groomer)
│   │   ├── Product.js                     # Pet products, INR (₹) pricing, variants, SKUs, stock & moderation
│   │   ├── ProductOrder.js                # Multi-vendor product orders, line items, commission & return state
│   │   ├── SubscriptionTransaction.js     # SaaS billing ledger, HMAC signatures & webhook deduplication
│   │   ├── AuditLog.js                    # Immutable platform & tenant security audit log
│   │   ├── Pet.js                         # Pet adoption/breeder listings & media arrays
│   │   ├── Order.js                       # Pet adoption orders & 5-stage tracking
│   │   ├── VetProfile.js                  # Veterinarian qualifications, clinic info & consultation fees
│   │   ├── VetAppointment.js              # Scheduled veterinary consultations
│   │   ├── GroomingService.js             # Grooming, spa & behavioral training packages
│   │   ├── GroomingBooking.js             # Customer grooming bookings with business/provider references
│   │   └── SupportTicket.js               # Customer support inquiries
│   │
│   ├── routes/                            # Express Modular Routers
│   │   ├── authRoutes.js                  # /api/auth (rate-limited login & registration, profile, wishlists)
│   │   ├── petRoutes.js                   # /api/pets
│   │   ├── productRoutes.js               # /api/products
│   │   ├── orderRoutes.js                 # /api/orders
│   │   ├── productOrderRoutes.js          # /api/product-orders
│   │   ├── saasRoutes.js                  # /api/saas (plans, my-business, team, subscriptions, admin)
│   │   ├── vetRoutes.js                   # /api/vets
│   │   ├── serviceRoutes.js               # /api/services
│   │   ├── supportRoutes.js               # /api/support
│   │   ├── uploadRoutes.js                # /api/upload
│   │   └── viewRoutes.js                  # EJS server-rendered views (/, /pets, /orders, /vets, /grooming)
│   │
│   ├── utils/                             # Shared Backend Utilities
│   │   ├── dbHelpers.js                   # findDocByAnyId (custom_id/_id lookup) & escapeRegex sanitizer
│   │   ├── ExpressError.js                # Operational error class with HTTP statusCode
│   │   └── normalize.js                   # Normalizes Mongoose _id / custom_id for frontend consumption
│   │
│   ├── views/                             # Server-Side EJS Templates
│   │   ├── layouts/
│   │   │   └── boilerplate.ejs            # Master HTML layout
│   │   ├── partials/
│   │   │   ├── header.ejs                 # HTML head & stylesheets partial
│   │   │   ├── navbar.ejs                 # Top navigation partial
│   │   │   ├── footer.ejs                 # Footer partial
│   │   │   └── page-end.ejs               # Closing scripts partial
│   │   ├── pets/
│   │   │   ├── index.ejs                  # Pet marketplace view
│   │   │   ├── show.ejs                   # Pet detail view
│   │   │   └── new.ejs                    # New pet listing form view
│   │   ├── orders/
│   │   │   └── index.ejs                  # Order tracking timeline view
│   │   ├── vets/
│   │   │   └── index.ejs                  # Veterinarian directory view
│   │   ├── grooming/
│   │   │   └── index.ejs                  # Grooming services view
│   │   ├── support/
│   │   │   └── index.ejs                  # Customer support ticket view
│   │   └── auth/
│   │       ├── login.ejs                  # Login view
│   │       └── register.ejs               # Registration view
│   │
│   └── public/                            # Static Assets for EJS Views
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── main.js
│
└── client/                                # React 18 + Vite + Tailwind CSS SPA Frontend
    ├── index.html                         # Root HTML shell
    ├── vite.config.js                     # Vite build & dev proxy configuration
    ├── tailwind.config.js                 # Tailwind CSS theme & custom shadows/colors
    ├── postcss.config.js                  # PostCSS configuration
    ├── .env.example                       # Frontend environment variable template
    ├── package.json                       # Frontend dependencies & scripts
    └── src/
        ├── main.jsx                       # React application mount point
        ├── App.jsx                        # Root state, URL hash routing, session verification & wishlists
        ├── index.css                      # Global styles, typography & keyframe animations
        ├── utils/
        │   └── auth.js                    # Fetch wrappers (apiGet/Post/Put/Delete/UploadMedia) & token storage
        └── components/
            ├── Navbar.jsx                 # Responsive flex-wrap navigation bar for all 6 user roles
            ├── Hero.jsx                   # Marketplace hero banner & category quick-filters
            ├── Marketplace.jsx            # Pet adoption/breeder grid, search & price filtering
            ├── ProductsMarketplace.jsx    # Multi-vendor INR (₹) pet supplies store, variant selector & cart
            ├── BusinessSaaSPortal.jsx     # Multi-tenant SaaS portal (Overview, Catalog, Orders, Grooming, Team, Billing, Admin)
            ├── PetDetailModal.jsx         # Detailed pet modal with image/video switcher
            ├── CheckoutModal.jsx          # Pet adoption checkout modal
            ├── OrdersTracking.jsx         # Unified Pet & Product orders tracker, status timeline & returns
            ├── LiveTransportRadar.jsx     # Animated transport radar component
            ├── BuyerDashboard.jsx         # Buyer hub (orders, vet appointments, grooming bookings, wishlists)
            ├── SellerDashboard.jsx        # Pet breeder/seller inventory, media uploader & order manager
            ├── VetSection.jsx             # Veterinarian directory & appointment booking modal
            ├── VetDashboard.jsx           # Veterinarian profile editor & patient schedule manager
            ├── GroomingCareSection.jsx    # Grooming & care package browser & booking form
            ├── CustomerSupport.jsx        # Support ticket submission & FAQ view
            ├── PetMatchmakerQuiz.jsx      # Interactive pet compatibility quiz
            ├── AuthModal.jsx              # Role-aware Sign In / Register modal (Admin hidden on Register)
            ├── FloatingQuickActions.jsx   # Quick-access floating action widget
            ├── PawBackdrop.jsx            # Subtle background decorative elements
            ├── PawLoader.jsx              # Loading indicator component
            ├── PetIllustration.jsx        # Custom SVG illustrations
            ├── Reveal.jsx                 # Scroll-triggered reveal animation wrapper
            └── Toast.jsx                  # Toast notification container & hook
```

---

## 🧩 Architectural Responsibilities by Layer

### 1. Multi-Tenant & SaaS Layer (`server/middleware/tenantMiddleware.js` & `server/controllers/saasController.js`)
- **`SUBSCRIPTION_PLANS`**: Defines canonical tiers (`free`, `starter`, `growth`, `pro`) with limits (`max_products`, `max_pets`, `max_services`, `max_team_members`) and marketplace commission rates (`12%`, `8%`, `5%`, `3%`).
- **`ensureUserBusiness(user, requestedBusinessId)`**: Resolves the authenticated user's active `Business` and `BusinessMembership` from server-side identity, auto-provisioning a default tenant for existing vendor accounts without destructive migrations.
- **`checkSubscriptionLimit(business, resourceType)`**: Enforces active subscription status and plan capacity before creating new products (`product`), pet listings (`pet`), or grooming services (`service`).
- **`recordAuditLog(...)`**: Writes immutable audit records (`AuditLog`) for sensitive tenant and administrative actions.

### 2. Multi-Vendor Product & Order Engine (`productController.js` & `productOrderController.js`)
- **Catalog & Safety Validation**: Validates product categories, subcategories, variants, and blocks prohibited/unsafe items via regex safety guardrails.
- **Server-Calculated Checkout**: Computes line totals, 18% GST/tax, and vendor commission strictly from database prices, decrements variant and total stock atomically, and blocks vendors from purchasing their own listings.
- **Fulfillment, Cancellations & Returns**: Scopes incoming orders per vendor business, tracks 6 fulfillment stages, and restores exact variant + total stock on pre-delivery cancellation or post-delivery return approval.

### 3. Media Upload Pipeline (`uploadMiddleware.js`, `uploadController.js`, `config/cloudinary.js`)
- Validates MIME types (`jpeg`, `png`, `webp`, `gif`, `mp4`, `webm`, `quicktime`) and size caps (`8 MB` images, `40 MB` videos) in memory.
- Enforces role-based upload permissions by context:
  - `pets` -> `seller`, `admin`
  - `products` -> `seller`, `shopkeeper`, `admin`
  - `profiles` -> `vet`, `admin`
- Verifies ownership (`verifyPublicIdOwnership`) and checks cross-collection references (`Pet`, `Product`, `VetProfile`) before deleting assets from Cloudinary.

---

## 💡 How to Add a New Feature Module

1. **Create Mongoose Model** in `server/models/NewFeature.js`.
2. **Create Controller** in `server/controllers/newFeatureController.js` using `findDocByAnyId` and `escapeRegex` from `server/utils/dbHelpers.js` and `ExpressError` from `server/utils/ExpressError.js`.
3. **Create Router** in `server/routes/newFeatureRoutes.js` wrapping async handlers with `asyncHandler` and protecting private routes with `protect` / `requireRole(...)` from `server/middleware/authMiddleware.js`.
4. **Mount Router** in `server/server.js`.
5. **Connect Frontend** using `apiGet`, `apiPost`, `apiPut`, or `apiDelete` from `client/src/utils/auth.js`.
