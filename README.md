# 🐾 PetPaws — Multi-Tenant SaaS Pet Care, Adoption & Products Marketplace

<p align="center">
  <strong>Discover. Adopt. Shop. Care. Scale.</strong>
  <br />
  A full-stack MERN & Multi-Tenant SaaS pet ecosystem connecting pet parents, independent shopkeepers, breeders/sellers, veterinarians, grooming professionals, and platform administrators through a unified web platform.
  <br /><br />
  <a href="https://petpaws-frontend.onrender.com"><strong>🌐 Live Website</strong></a>
  &nbsp; • &nbsp;
  <a href="https://github.com/jhasabhishek17/PetPaws"><strong>📂 GitHub Repository</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?logo=cloudinary&logoColor=white" alt="Cloudinary" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Tests-73_Passing-brightgreen?logo=node.js&logoColor=white" alt="Tests: 73 Passing" />
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Core Features by Role](#-core-features-by-role)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Database Seeding](#-database-seeding)
- [Running Locally](#-running-locally)
- [Automated Testing (73 Tests)](#-automated-testing-73-tests)
- [API Overview](#-api-overview)
- [Database Design (15 Mongoose Models)](#-database-design-15-mongoose-models)
- [Security & Production Hardening](#-security--production-hardening)
- [Current Limitations](#-current-limitations)
- [Future Enhancements](#-future-enhancements)
- [Author](#-author)

---

## 🌟 Overview

**PetPaws** is a full-stack **MERN + Multi-Tenant SaaS** pet marketplace and care platform that unifies:
1. **Pet Adoption & Breeder Marketplace** (dogs, cats, birds, fish, and rabbits)
2. **Multi-Vendor Pet Products Marketplace** (food, treats, collars, harnesses, toys, grooming supplies, beds, bowls, and travel carriers priced in INR `₹`)
3. **Multi-Tenant Business & SaaS Workspace** (tiered subscription plans, team RBAC memberships, vendor analytics, commission calculation, and billing ledger)
4. **Veterinary Clinic Directory & Appointment Scheduling**
5. **Grooming, Spa & Behavioral Care Bookings**
6. **Platform Administration, Help Desk & Audit Logging**

### Project Highlights

- **6 Role-Based Experiences:** Dedicated workflows for **Buyers**, **Shopkeepers**, **Pet Sellers/Breeders**, **Veterinarians**, **Groomers**, and **Platform Administrators**.
- **Multi-Vendor Pet Products Marketplace:** 20+ realistic INR (`₹`) pet products across 8 categories with multi-variant SKU pricing, real-time stock badges, cart drawer, server-calculated GST/commission checkout, order tracking, cancellation restocking, and post-delivery returns.
- **SaaS Subscription & Tenant Engine:** Tiered plans (**Free Starter**, **Starter Shop**, **Growth Business**, **Enterprise Pro**) enforcing backend catalog quotas (`max_products`, `max_pets`, `max_services`, `max_team_members`), commission rates (`12%` down to `3%`), and HMAC-SHA256 verified subscription checkout.
- **Email Verification & Account Security:** 6-digit email OTP verification on registration and password reset, backed by multi-provider transactional delivery (email59 HTTPS API, Resend, or SMTP), persistent sliding-window rate limiting (`OtpRateLimit`), and token versioning for global session revocation.
- **Full Platform Admin Portal (`AdminPortal.jsx`):** Dedicated administrative console with real-time server health and memory metrics (`/api/health`), vendor tenant governance, product moderation, customer support help desk with threaded replies, and security audit log inspection (`AuditLog`).
- **Offers & Dynamic Discounts Engine:** Active promo campaigns, coupon codes, and countdown timers with server-side validation and cart discount calculations.
- **Comprehensive Automated Test Coverage:** 73 automated tests across 4 dedicated suites validating platform audit, customer support workflows, role-based UX permissions, and discount calculations.
- **Cloud Media Pipeline:** Multer memory-buffered uploads streamed to **Cloudinary** (`petpaws/pets`, `petpaws/products`, `petpaws/profiles`) with role-based context guards and automatic orphan asset cleanup.
- **MongoDB Atlas + Dual Persistence:** Primary persistence on **MongoDB Atlas** via 15 Mongoose models, with an isolated development JSON fallback (`server/petpaws_data.json`) strictly disabled in production (`NODE_ENV=production`).

---

## 🌐 Live Demo

| Component | Link |
|---|---|
| **Live Website** | [https://petpaws-frontend.onrender.com](https://petpaws-frontend.onrender.com) |
| **GitHub Repository** | [jhasabhishek17/PetPaws](https://github.com/jhasabhishek17/PetPaws) |

---

## ✨ Core Features by Role

### 🛍️ 1. Buyer / Pet Parent (`buyer`)
- **Pet Adoption Marketplace:** Browse verified dogs, cats, birds, fish, and rabbits with search, category filters, and interactive **Pet Matchmaker Quiz**.
- **Pet Products Marketplace (`₹` INR):** Search and filter pet supplies by category, subcategory, pet type, brand, price range, and stock availability; select product variants (size/weight/color/flavor) and manage a persistent shopping cart.
- **Promotional Discounts & Offers:** Enter valid discount coupon codes during checkout with server-side discount calculations and view active promo banners (`OfferCountdownTimer.jsx`).
- **Unified Wishlists:** Save both favourite pets and pet products to database-backed wishlists (`/api/auth/wishlist` & `/api/auth/product-wishlist/:productId`).
- **Multi-Item Checkout & Order Tracking:** Complete pet adoption or multi-vendor product cart checkouts via Cash on Delivery (COD); monitor fulfillment progress with live radar visuals; cancel unshipped orders (with automatic inventory restoration) or request post-delivery returns.
- **Veterinary & Grooming Bookings:** Book vet clinic consultations and grooming/spa packages, and manage upcoming appointments from the Buyer Dashboard.
- **Account Verification & Recovery:** 6-digit OTP email verification upon registration (`VerifyEmailPage.jsx`) and self-service password reset (`ResetPasswordPage.jsx`).
- **Customer Support Desk:** Submit customer help tickets with priority levels and track threaded staff responses.

### 🏪 2. Shopkeeper / Product Vendor (`shopkeeper`)
- **Business & SaaS Portal:** Dedicated multi-tenant workspace (`BusinessSaaSPortal.jsx`) with INR (`₹`) revenue KPIs, net earnings after platform commission, catalog quota progress, and low-stock alerts (`<= 5` units).
- **Product & Variant Catalog Management:** Create, edit, and archive products with multiple variants, SKUs, ingredients/materials, safety notes, and Cloudinary product image/video uploads.
- **Multi-Vendor Order Fulfillment:** View only customer orders containing the shopkeeper's items, advance fulfillment statuses (`Order Placed -> Confirmed -> Packed -> Shipped -> Out for Delivery -> Delivered`), and approve/decline customer return requests with automatic variant restocking.
- **Team RBAC & Subscription Billing:** Invite staff/managers (`BusinessMembership`), configure UPI/bank payout settings, and upgrade SaaS subscription tiers (`Free`, `Starter`, `Growth`, `Pro`).

### 🐕 3. Pet Seller / Breeder (`seller`)
- **Seller Dashboard:** Create, update, and delete pet listings with multi-image/video Cloudinary galleries, vaccination/health status, and stock tracking.
- **Order & Payout Management:** Progress pet adoption orders through transport milestones, configure seller payout details, and access the SaaS Business Portal.

### 🩺 4. Veterinarian (`vet`)
- **Veterinarian Directory & Profile:** Manage clinic profile, specialization, qualifications, consultation fees, availability status, and Cloudinary profile photo.
- **Vet Dashboard:** Review incoming patient appointment requests, update appointment statuses, or cancel eligible consultations.

### ✂️ 5. Grooming & Care Provider (`groomer`)
- **Grooming & Spa Packages:** Publish grooming, spa, and care packages (enforced by SaaS plan `max_services` limits) and manage customer booking statuses (`Scheduled -> Confirmed -> In Progress -> Completed`) with strict tenant isolation.

### 🛡️ 6. Platform Administrator (`admin`)
- **Comprehensive Admin Portal (`AdminPortal.jsx`):** Dedicated governance dashboard with real-time server health and memory metrics (`/api/health`), vendor tenant approvals/suspensions, product moderation, customer support ticket desk with threaded staff replies, and immutable audit logs (`AuditLog`).
- **Protected Admin Provisioning:** Public registration as `admin` is blocked on both the UI and backend API (`HTTP 403`); administrator accounts are provisioned exclusively via idempotent database seeding (`server/seedProducts.js`).

---

## 🧰 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend SPA** | React 18.3 | Component-based single-page application |
| **Build Tool** | Vite 6 | Fast HMR dev server and optimized production bundler |
| **Styling** | Tailwind CSS 3.4 | Responsive utility-first styling and custom design tokens |
| **Icons** | Lucide React | Consistent interface iconography |
| **Backend Runtime** | Node.js (18+) | Server-side JavaScript runtime |
| **API Framework** | Express.js 4 | REST API routing, middleware pipeline, and EJS views |
| **Database** | MongoDB Atlas | Cloud NoSQL persistence across 15 collections |
| **ODM** | Mongoose 8 | Schema validation, indexing, and query builders |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | Stateless signed bearer tokens with token versioning for session revocation |
| **Password Security** | `bcryptjs` | Salted password hashing |
| **Email Delivery** | Nodemailer, email59 & Resend HTTPS APIs | Transactional OTP delivery and support notifications over port 443 |
| **Email Validation** | DNS MX Lookup (`emailValidator.js`) | Syntax, RFC compliance, and live domain MX record verification |
| **Media Upload & CDN** | Multer + Cloudinary (`streamifier`) | Memory-buffered multipart validation & cloud media storage |
| **Payment & Billing** | Cash on Delivery + HMAC-SHA256 | COD cart orders and server-signed SaaS subscription checkout |
| **Security Middleware** | `helmet`, `cors`, `express-rate-limit` | HTTP security headers, origin allowlist, and brute-force throttling |
| **Automated Testing** | Node.js Test Runner (`node --test`) | 73 automated tests covering platform audit, support, UX, and discounts |
| **Deployment** | Render | Static Site (`client`) + Web Service (`server`) |

---

## 🏗️ System Architecture

```text
                                 USERS
        (Buyer | Shopkeeper | Seller | Vet | Groomer | Platform Admin)
                                   |
                                   v
                +-------------------------------------+
                |      React 18 + Vite Frontend       |
                |         (Render Static Site)        |
                |  - Marketplace & Products Store     |
                |  - Multi-Tenant BusinessSaaSPortal  |
                |  - Admin Portal & Order Tracking    |
                |  - OTP Email Verification & Reset   |
                +-------------------------------------+
                                   |
                           HTTPS / REST JSON API
                         (Bearer JWT Authorization)
                                   |
                                   v
                +-------------------------------------+
                |      Node.js + Express Backend      |
                |         (Render Web Service)        |
                |  - Helmet, CORS, Rate Limiters      |
                |  - Auth & Role Guard Middleware     |
                |  - Token Versioning & Tenant RBAC   |
                |  - 11 Controllers & 12 Route Modules|
                +-------------------------------------+
                   |               |               |               |
                   v               v               v               v
        +----------------+ +---------------+ +-----------+ +---------------+
        | MongoDB Atlas  | |  Cloudinary   | |  email59  | | HMAC Billing  |
        | 15 Mongoose    | | Media Folders | | & Resend  | | Verification  |
        | Collections    | | pets/products | | HTTPS OTP | | & Webhooks    |
        +----------------+ +---------------+ +-----------+ +---------------+
```

---

## 📂 Project Structure

```text
PetPaws/
├── README.md                              # Project documentation & setup guide
├── PROJECT_STRUCTURE.md                   # Detailed module & file-by-file architecture reference
├── package.json                           # Root workspace scripts (install:all, dev:server, dev:client, test, build)
│
├── client/                                # React 18 + Vite + Tailwind CSS Frontend SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPortal.jsx            # Platform admin console (telemetry, users, moderation, support desk)
│   │   │   ├── AuthModal.jsx              # Role-aware login & registration modal
│   │   │   ├── BusinessSaaSPortal.jsx     # 7-tab SaaS workspace (Overview, Products, Orders, Grooming, Team, Plans, Admin)
│   │   │   ├── BuyerDashboard.jsx         # Buyer overview (orders, vet appointments, grooming, wishlists)
│   │   │   ├── CheckoutModal.jsx          # Pet adoption checkout modal
│   │   │   ├── CustomerSupport.jsx        # Customer support ticket submission
│   │   │   ├── FloatingQuickActions.jsx   # Floating quick navigation action menu
│   │   │   ├── GroomingCareSection.jsx    # Grooming & spa packages catalog & booking form
│   │   │   ├── Hero.jsx                   # Landing hero section with quick search & CTAs
│   │   │   ├── LiveTransportRadar.jsx     # Animated transport radar visual for active orders
│   │   │   ├── Marketplace.jsx            # Pet adoption/breeder listings & category filters
│   │   │   ├── Navbar.jsx                 # Responsive wrap-safe navigation bar & role switcher
│   │   │   ├── OfferCountdownTimer.jsx    # Promotional discount banner with countdown timer
│   │   │   ├── OrdersTracking.jsx         # Unified Pet & Product orders tracking, cancellation & returns
│   │   │   ├── PawBackdrop.jsx            # Decorative background accents
│   │   │   ├── PawLoader.jsx              # Custom loading spinner component
│   │   │   ├── PetDetailModal.jsx         # Pet detail modal with media gallery & health badges
│   │   │   ├── PetIllustration.jsx        # SVG pet illustrations
│   │   │   ├── PetMatchmakerQuiz.jsx      # Interactive lifestyle pet recommendation quiz
│   │   │   ├── ProductsMarketplace.jsx    # Multi-vendor INR (₹) pet products store & cart drawer
│   │   │   ├── ResetPasswordPage.jsx      # Password reset flow with 6-digit OTP challenge
│   │   │   ├── Reveal.jsx                 # Scroll reveal animation wrapper
│   │   │   ├── SellerDashboard.jsx        # Pet seller inventory, Cloudinary uploads & order progression
│   │   │   ├── Toast.jsx                  # Non-blocking toast notification system
│   │   │   ├── VerifyEmailPage.jsx        # Email verification page with OTP input and resend countdown
│   │   │   ├── VetDashboard.jsx           # Veterinarian clinic profile & schedule management
│   │   │   └── VetSection.jsx             # Veterinarian directory & appointment booking
│   │   ├── utils/
│   │   │   ├── auth.js                    # API client (apiGet, apiPost, apiPut, apiDelete, apiUploadMedia) & JWT helpers
│   │   │   └── permissions.js             # Client-side role checking and route capability matrix
│   │   ├── App.jsx                        # Root SPA state, hash routing, session verification & inactivity timer
│   │   ├── main.jsx                       # React DOM entry point
│   │   └── index.css                      # Tailwind directives & custom aesthetic styles
│   ├── public/
│   │   └── _redirects                     # Single-Page Application client routing rewrite for Render
│   ├── .env.example                       # Frontend environment template (VITE_API_URL)
│   ├── index.html                         # SPA HTML shell
│   ├── tailwind.config.js                 # Tailwind CSS theme configuration
│   ├── vite.config.js                     # Vite config with /api proxy
│   └── package.json                       # Frontend dependencies & build scripts
│
├── server/                                # Node.js + Express.js Backend & MVC Engine
│   ├── config/
│   │   ├── cloudinary.js                  # Cloudinary SDK config, stream uploader & asset deletion
│   │   ├── db.js                          # MongoDB / MongoDB Atlas connection manager with test isolation
│   │   └── jwt.js                         # Centralized JWT secret resolver with production guard
│   ├── controllers/
│   │   ├── authController.js              # Login, registration, OTP email verification, password reset, profile
│   │   ├── offerController.js             # Promotional campaigns, coupon codes, and discount calculations
│   │   ├── orderController.js             # Pet order checkout, status updates, tracking & cancellation
│   │   ├── petController.js               # Pet CRUD, regex-safe search/filter & Cloudinary media cleanup
│   │   ├── productController.js           # Multi-vendor product CRUD, variants, safety guard & reporting
│   │   ├── productOrderController.js      # Multi-item cart checkout, GST/commission calc, tracking & returns
│   │   ├── saasController.js              # Tenant dashboard, team RBAC, HMAC billing, webhooks & Admin moderation
│   │   ├── serviceController.js           # Grooming service catalog & customer booking lifecycle
│   │   ├── supportController.js           # Support ticket lifecycle, threaded staff replies, priority tracking
│   │   ├── uploadController.js            # Role-guarded Cloudinary media upload (pets, products, profiles)
│   │   └── vetController.js               # Vet directory, profile updates & appointment scheduling
│   ├── middleware/
│   │   ├── asyncHandler.js                # Async error wrapper for Express route handlers
│   │   ├── auditLogger.js                 # Administrative audit logging middleware
│   │   ├── authMiddleware.js              # JWT verification (protect, optionalAuth, requireRole)
│   │   ├── errorHandler.js                # Global JSON & XSS-safe HTML error response middleware
│   │   ├── otpRateLimiter.js              # Sliding-window rate limiter for OTP email dispatch
│   │   ├── requestLogger.js               # Timestamped HTTP request logger
│   │   ├── roleCheck.js                   # Secondary role verification utility
│   │   ├── tenantMiddleware.js            # Multi-tenant Business resolver, plan tiers, quotas & audit logger
│   │   └── uploadMiddleware.js            # Multer memoryStorage, MIME/size validator (images <=10MB, videos <=50MB)
│   ├── models/
│   │   ├── AuditLog.js                    # Immutable administrative & tenant security audit trail
│   │   ├── Business.js                    # SaaS Business tenant, plan tier, feature limits & verification status
│   │   ├── BusinessMembership.js          # Multi-user tenant RBAC (owner, manager, staff, vet, groomer)
│   │   ├── GroomingBooking.js             # Customer grooming session reservations
│   │   ├── GroomingService.js             # Grooming, spa, and training service packages
│   │   ├── Order.js                       # Pet adoption orders & transport tracking
│   │   ├── OtpRateLimit.js                # Persistent OTP dispatch rate limiting and cooldown records
│   │   ├── Pet.js                         # Pet adoption/breeder listings & media galleries
│   │   ├── Product.js                     # Marketplace pet products, variants, SKUs, INR pricing & moderation
│   │   ├── ProductOrder.js                # Multi-vendor product orders, line items, commission & returns
│   │   ├── SubscriptionTransaction.js     # SaaS subscription payment ledger & webhook event deduplication
│   │   ├── SupportTicket.js               # Customer support tickets with threaded staff responses
│   │   ├── User.js                        # Accounts, token versioning, hashed passwords & wishlists
│   │   ├── VetAppointment.js              # Veterinary consultation bookings
│   │   └── VetProfile.js                  # Veterinarian clinic profiles
│   ├── routes/
│   │   ├── authRoutes.js                  # /api/auth (registration, login, OTP verification, password reset)
│   │   ├── offerRoutes.js                 # /api/offers (active campaigns, coupon validation)
│   │   ├── orderRoutes.js                 # /api/orders
│   │   ├── petRoutes.js                   # /api/pets
│   │   ├── productOrderRoutes.js          # /api/product-orders
│   │   ├── productRoutes.js               # /api/products
│   │   ├── saasRoutes.js                  # /api/saas (plans, my-business, team, subscriptions, admin)
│   │   ├── serviceRoutes.js               # /api/services
│   │   ├── supportRoutes.js               # /api/support (ticket creation, listing, staff replies)
│   │   ├── uploadRoutes.js                # /api/upload
│   │   ├── vetRoutes.js                   # /api/vets
│   │   └── viewRoutes.js                  # Server-rendered EJS routes (/, /pets, /orders, /vets, /grooming)
│   ├── tests/                             # Node.js native test runner test suites
│   │   ├── customerSupport.test.js        # 25 tests — ticket submission, priority handling, admin replies
│   │   ├── offersDiscounts.test.js        # 9 tests — coupon validation, discount calculation, expiry checks
│   │   ├── platformAudit.test.js          # 28 tests — COD checkout, security guards, OTP dispatch, DB isolation
│   │   └── roleBasedUX.test.js            # 11 tests — RBAC enforcement, unauthorized route blocking
│   ├── utils/
│   │   ├── ExpressError.js                # Operational HTTP error class
│   │   ├── dbHelpers.js                   # findDocByAnyId & escapeRegex (ReDoS/regex injection prevention)
│   │   ├── discountEngine.js              # Server-side discount evaluation & coupon matching
│   │   ├── emailService.js                # Multi-provider email dispatcher (email59, Resend, SMTP)
│   │   ├── emailValidator.js              # Strict email validation & DNS MX domain lookup
│   │   ├── normalize.js                   # Mongoose-to-client ID normalizer
│   │   ├── otpRateLimiter.js              # OTP cooldown & daily dispatch limits helper
│   │   └── paymentGateway.js              # Cash on Delivery & payment provider abstraction
│   ├── .env.example                       # Backend environment variable template
│   ├── seed.js                            # Base pet/vet/service seeder
│   ├── seed-demo.js                       # Full-featured multi-role demo seeder
│   ├── seedProducts.js                    # Idempotent 20 INR products & core platform accounts seeder
│   ├── server.js                          # Express app bootstrap, trust proxy & middleware/route mounting
│   └── package.json                       # Backend dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `v18+` and **npm** `v9+`
- **Git**
- **MongoDB Atlas** cluster URI (or local MongoDB running on `mongodb://127.0.0.1:27017`)
- Optional: **Cloudinary** account (for media uploads)
- Optional: **email59** or **Resend** API key (for transactional OTP email delivery)

### 1. Clone the Repository & Install Dependencies

```bash
git clone https://github.com/jhasabhishek17/PetPaws.git
cd PetPaws

# Install dependencies across root, server, and client workspaces
npm run install:all
```

---

## ⚙️ Environment Configuration

Copy the example environment files and configure your local or production settings:

### Backend (`server/.env`)

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/petpaws
JWT_SECRET=replace_with_a_strong_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,https://petpaws-frontend.onrender.com

# Reverse Proxy (Set to 1 on Render to ensure accurate client IP rate limiting)
TRUST_PROXY=1

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=petpaws

# Transactional Email (Verification & Password Reset OTP)
# Option A (Recommended for Render): email59 HTTPS API over port 443
EMAIL59_API_KEY=your_email59_api_key
EMAIL_FROM="PetPaws <no-reply@yourdomain.com>"

# Option B: Resend HTTPS API
RESEND_API_KEY=your_resend_api_key

# Option C: Standard SMTP (for local development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SUPPORT_TEAM_EMAIL=support@yourdomain.com
```

### Frontend (`client/.env`)

```env
VITE_API_URL=http://localhost:5001
```

> **Security Note:** Never commit `.env` files or real credentials to version control.

---

## 🌱 Database Seeding

PetPaws includes an **idempotent** product and core platform account seeder (`server/seedProducts.js`) that uses `$setOnInsert` so it **never overwrites existing users, never resets passwords, and never deletes existing records**:

```bash
cd server
npm run seed:products
```

This ensures:
- **Core Platform Accounts** (`admin`, `buyer`, `seller`, `shopkeeper`, `vet`, `groomer`) and **3 Demo Shopkeeper Businesses** exist in MongoDB.
- **20 Realistic INR (`₹`) Pet Products** (`demo-prod-101` through `demo-prod-120`) across 8 categories (Dog/Cat Food, Treats, Collars & Harnesses, Toys, Grooming Supplies, Beds, Bowls & Feeders, and Carriers) are synchronized with MongoDB.

---

## ▶️ Running Locally

Run the backend and frontend in two separate terminals from the project root:

### Terminal 1 — Backend API (`http://localhost:5001`)

```bash
npm run dev:server
```

### Terminal 2 — React + Vite Frontend (`http://localhost:5173`)

```bash
npm run dev:client
```

### Production Build Verification

```bash
npm run build
```

---

## 🧪 Automated Testing (73 Tests)

The PetPaws backend includes **73 automated tests** written with Node.js's native test runner (`node --test`). Tests run in an isolated environment against a dedicated test database (`petpaws_test`) with mocked email delivery and DNS resolvers:

| Test Suite | File | Tests | Focus Area |
|---|---|---|---|
| **Platform Audit** | `server/tests/platformAudit.test.js` | **28** | COD checkout, stock locks, role guards, OTP email delivery, test DB isolation |
| **Customer Support** | `server/tests/customerSupport.test.js` | **25** | Ticket creation, priority filters, admin responses, status transitions |
| **Role-Based UX** | `server/tests/roleBasedUX.test.js` | **11** | Route permissions, unauthorized access prevention, vendor data isolation |
| **Offers & Discounts** | `server/tests/offersDiscounts.test.js` | **9** | Promo code validation, discount calculations, campaign expirations |

### Running the Test Suites

```bash
# Run the primary platform audit test suite
npm test --prefix server

# Run the customer support test suite
node --test server/tests/customerSupport.test.js

# Run the role-based UX test suite
node --test server/tests/roleBasedUX.test.js

# Run the offers and discounts test suite
node --test server/tests/offersDiscounts.test.js
```

---

## 🔌 API Overview

### Authentication & Account Security (`/api/auth`)
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-Limited) | Register account (`admin` blocked with `403`); sends 6-digit email OTP |
| `POST` | `/api/auth/verify-otp` | Public (Rate-Limited) | Verify registration email OTP and activate account |
| `POST` | `/api/auth/resend-otp` | Public (Rate-Limited) | Request new OTP with 60-second cooldown |
| `POST` | `/api/auth/forgot-password` | Public (Rate-Limited) | Request password reset OTP email |
| `POST` | `/api/auth/reset-password` | Public (Rate-Limited) | Reset password using verified OTP challenge |
| `POST` | `/api/auth/login` | Public (Rate-Limited) | Authenticate user and issue signed JWT |
| `GET` | `/api/auth/me` | Protected | Validate active JWT and return user profile |
| `PUT` | `/api/auth/profile` | Protected | Update user profile details |
| `PUT` | `/api/auth/update-payout` | `seller`, `shopkeeper`, `admin` | Update bank/UPI payout settings |
| `GET` | `/api/auth/wishlist` | Protected | Retrieve saved pet and product wishlists |
| `POST` | `/api/auth/wishlist/:petId` | `buyer` | Toggle pet in buyer wishlist |
| `POST` | `/api/auth/product-wishlist/:productId` | Protected | Toggle product in user's product wishlist |

### Multi-Vendor Pet Products Marketplace (`/api/products` & `/api/product-orders`)
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/products/categories` | Public | List product categories and subcategories |
| `GET` | `/api/products` | Public | Browse/search/filter products by category, pet_type, brand, price, stock, and sort |
| `GET` | `/api/products/my-inventory` | `seller`, `shopkeeper`, `admin` | List authenticated vendor's product inventory |
| `GET` | `/api/products/:id` | Public | Get product details and variants |
| `POST` | `/api/products` | `seller`, `shopkeeper`, `admin` | Create product (enforces SaaS plan quota & safety guardrails) |
| `PUT` | `/api/products/:id` | Vendor Owner / `admin` | Update product details, stock, or variants |
| `DELETE` | `/api/products/:id` | Vendor Owner / `admin` | Archive/remove product listing |
| `POST` | `/api/products/:id/report` | Protected | Report a suspicious product listing for admin review |
| `POST` | `/api/product-orders/checkout` | Protected | Multi-item cart checkout with atomic variant stock decrement |
| `GET` | `/api/product-orders` | Protected | Retrieve customer purchases or vendor-scoped incoming orders |
| `GET` | `/api/product-orders/track/:code` | Protected (Owner/Vendor/Admin) | Track a product order by tracking code |
| `PUT` | `/api/product-orders/:id/status` | `seller`, `shopkeeper`, `admin` | Advance fulfillment status (`Confirmed` -> `Packed` -> `Shipped` -> `Delivered`) |
| `PUT` | `/api/product-orders/:id/cancel` | Protected (Buyer/Vendor/Admin) | Cancel pre-delivery order and restock variants |
| `PUT` | `/api/product-orders/:id/return` | Protected (Buyer/Vendor/Admin) | Request or approve/reject post-delivery return with variant restocking |

### Offers & Discounts (`/api/offers`)
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/offers/active` | Public | List active promotional campaigns and discount banners |
| `POST` | `/api/offers/validate` | Protected | Validate promo coupon code and compute effective cart discount |
| `POST` | `/api/offers` | `admin` | Create new promotional discount campaign |

### Customer Support (`/api/support`)
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/support` | Optional Auth | Submit customer support ticket with priority level |
| `GET` | `/api/support` | `admin` | List all support tickets with filtering by status and priority |
| `PUT` | `/api/support/:id/reply` | `admin` | Post staff reply and update customer ticket resolution thread |
| `PUT` | `/api/support/:id/status` | `admin` | Update ticket status (`open`, `in_progress`, `resolved`, `closed`) |

### Multi-Tenant SaaS & Platform Admin (`/api/saas`)
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/saas/plans` | Public | Return SaaS subscription tiers, pricing, and limits |
| `GET` | `/api/saas/my-business` | Protected | Resolve tenant business, membership, usage quotas, and analytics |
| `PUT` | `/api/saas/my-business` | Business Owner/Manager | Update business profile, GST/tax ID, and payout settings |
| `POST` | `/api/saas/team` | Business Owner/Manager | Invite a team member (enforces `max_team_members` limit) |
| `DELETE` | `/api/saas/team/:memberId` | Business Owner/Manager | Remove a team member seat |
| `POST` | `/api/saas/subscriptions/checkout` | Business Owner | Initialize subscription upgrade order & cryptographic challenge |
| `POST` | `/api/saas/subscriptions/verify` | Business Owner | Verify HMAC-SHA256 payment signature and activate SaaS plan |
| `POST` | `/api/saas/webhooks/payment` | Public (HMAC-Verified) | Idempotent payment webhook receiver |
| `POST` | `/api/saas/grooming/services` | `groomer`, `seller`, `shopkeeper`, `admin` | Create grooming service package (enforces `max_services` limit) |
| `PUT` | `/api/saas/grooming/bookings/:id/status` | Tenant Owner / `admin` | Update grooming booking status |
| `GET` | `/api/saas/admin/overview` | `admin` | Platform Admin overview (businesses, products, transactions, audit logs) |
| `PUT` | `/api/saas/admin/businesses/:id/status` | `admin` | Approve, reject, or suspend a vendor business tenant |
| `PUT` | `/api/saas/admin/products/:id/moderate` | `admin` | Approve, flag, or suspend a product listing |

### Pet Adoption, Veterinary, Grooming & Uploads
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` / `POST` / `PUT` / `DELETE` | `/api/pets` & `/api/pets/:id` | Public GET / `seller` write | Pet adoption listings CRUD |
| `POST` / `GET` / `PUT` | `/api/orders/*` | Protected | Pet adoption checkout, tracking, status updates & cancellation |
| `GET` / `POST` / `PUT` | `/api/vets/*` | Public GET / Protected write | Veterinarian profiles & appointment scheduling |
| `GET` / `POST` / `PUT` | `/api/services/*` | Public GET / Protected write | Grooming services & customer booking management |
| `POST` / `DELETE` | `/api/upload` | Role-Guarded (`seller`, `shopkeeper`, `vet`, `admin`) | Upload or delete Cloudinary media (`pets`, `products`, `profiles`) |
| `GET` | `/api/health` | Public | Service health telemetry (uptime, memory, database mode) |

---

## 🗄️ Database Design (15 Mongoose Models)

| Model | Collection | Responsibility |
|---|---|---|
| [`User`](server/models/User.js) | `users` | Accounts (`buyer`, `seller`, `shopkeeper`, `vet`, `groomer`, `admin`), token versioning, hashed passwords, payout fields, wishlists |
| [`Business`](server/models/Business.js) | `businesses` | Multi-tenant vendor profile, verification status, SaaS subscription tier, billing cycle, and feature limits |
| [`BusinessMembership`](server/models/BusinessMembership.js) | `businessmemberships` | Tenant RBAC linking users to businesses (`owner`, `manager`, `staff`, `vet`, `groomer`) |
| [`Product`](server/models/Product.js) | `products` | Pet supplies, INR (`₹`) pricing, variants, SKUs, stock, media, safety notes, and moderation status |
| [`ProductOrder`](server/models/ProductOrder.js) | `productorders` | Multi-vendor cart orders, line items, GST, platform commission, tracking status, and return workflow |
| [`SubscriptionTransaction`](server/models/SubscriptionTransaction.js) | `subscriptiontransactions` | SaaS billing ledger, HMAC verification status, and webhook idempotency (`webhook_event_id`) |
| [`AuditLog`](server/models/AuditLog.js) | `auditlogs` | Immutable security & administrative audit trail |
| [`OtpRateLimit`](server/models/OtpRateLimit.js) | `otpratelimits` | Persistent sliding-window rate limiting for email OTP dispatch (cooldown, hourly, daily caps) |
| [`Pet`](server/models/Pet.js) | `pets` | Pet adoption/breeder listings, health status, stock, and Cloudinary media |
| [`Order`](server/models/Order.js) | `orders` | Pet adoption purchases and 5-stage transport tracking |
| [`VetProfile`](server/models/VetProfile.js) | `vetprofiles` | Veterinarian clinic profiles, qualifications, and fees |
| [`VetAppointment`](server/models/VetAppointment.js) | `vetappointments` | Scheduled veterinary consultations |
| [`GroomingService`](server/models/GroomingService.js) | `groomingservices` | Grooming, spa, and training service packages |
| [`GroomingBooking`](server/models/GroomingBooking.js) | `groomingbookings` | Customer grooming session reservations scoped by tenant/provider |
| [`SupportTicket`](server/models/SupportTicket.js) | `supporttickets` | Customer help requests with priority levels and threaded staff responses |

---

## 🔐 Security & Production Hardening

- **Token Versioning:** Each user document maintains a `token_version` field. When a password reset occurs or credentials change, the version increments, automatically invalidating all previously issued tokens across all sessions.
- **Server-Side Identity & Tenant Isolation:** Business tenant IDs and seller IDs are resolved from the verified JWT and `BusinessMembership` records (`ensureUserBusiness`), never trusted from client request bodies.
- **Protected Admin Provisioning:** `POST /api/auth/register` rejects `role: 'admin'` with `HTTP 403`; the registration modal also hides the Platform Admin option.
- **Order Tracking Privacy:** Both `/api/orders/track/:code` and `/api/product-orders/track/:code` require authentication (`protect`) and verify that the requester is the buyer, fulfilling vendor, or Platform Admin.
- **Regex Injection & ReDoS Protection:** User-supplied query parameters (`search`, `category`, `brand`, `:code`) are sanitized through `escapeRegex()` before constructing MongoDB `RegExp` queries.
- **Cryptographic Subscription Verification:** SaaS plan upgrades verify HMAC-SHA256 signatures via `crypto.timingSafeEqual` and deduplicate webhook replay events.
- **Rate Limiting & Reverse Proxy Support:** Authentication and OTP endpoints are protected by `express-rate-limit` and `otpRateLimiter.js`. With `TRUST_PROXY=1`, client IP addresses are accurately determined behind Render's reverse proxy.
- **Strict Email & DNS Validation:** Registration and OTP delivery validate email format and verify domain DNS MX records before queuing dispatch.
- **Test Database Isolation:** Automated test runner strictly connects to `mongodb://127.0.0.1:27017/petpaws_test` and denies any redirect to remote Atlas databases.

---

## ⚠️ Current Limitations

- **Sandbox Payment Mode by Default:** When `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not configured in `.env`, SaaS subscription checkout operates in `verified_sandbox` mode using server-signed HMAC-SHA256 verification. Do not enter real card or UPI credentials in sandbox mode.
- **Dual Currency Convention:** Legacy pet adoption listings and SaaS plan tiers are denominated in `USD` (`$`), while all Pet Products Marketplace listings, cart checkouts, and vendor product revenue KPIs are denominated in `INR` (`₹`).
- **Render Port Restrictions:** Render firewalls outbound direct TCP connections on SMTP ports 25, 465, and 587. For production deployment on Render, use HTTP-based APIs (email59 or Resend over port 443).

---

## 🛣️ Future Enhancements

- [ ] Connect live Razorpay production merchant keys for automated vendor split settlements.
- [ ] Add real-time WebSocket notifications for order status transitions and vet tele-consultations.
- [ ] Add automated CI/CD end-to-end Playwright browser tests across all 6 roles.
- [ ] Support downloadable GST tax invoices (PDF) for product orders and SaaS subscriptions.

---

## 👨‍💻 Author

**Abhishek Jha**  
Full-Stack Web Development Project — PetPaws  
- **Live Application:** [petpaws-frontend.onrender.com](https://petpaws-frontend.onrender.com)  
- **GitHub:** [github.com/jhasabhishek17/PetPaws](https://github.com/jhasabhishek17/PetPaws)
