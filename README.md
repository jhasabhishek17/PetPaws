# PetPaws — Full-Stack Pet Care & Multi-Vendor Marketplace

PetPaws is a full-stack web application designed to unify pet adoption, multi-vendor pet supplies, and professional pet care services into a single platform with dedicated, role-based experiences.

---

## 1. Project Overview

Finding a verified pet to adopt, purchasing quality pet supplies from independent sellers, and scheduling veterinary visits or grooming appointments often forces pet owners to use fragmented tools. Pet sellers and independent shopkeepers frequently lack tools to showcase listings, manage inventory, track shipments, and coordinate appointments.

PetPaws solves this by providing a unified platform that connects six distinct user roles:
- **Pet Parents (Buyers):** Discover adoptable pets, purchase pet supplies via multi-item cart checkout, track shipments in real time, and schedule veterinary or grooming visits.
- **Breeders & Sellers:** List adoptable pets with health certifications, upload photos and videos, manage stock, and advance adoption delivery milestones.
- **Shopkeepers & Merchants:** Manage supply catalogs with multi-variant SKUs (size, flavor, weight), track inventory levels, review store revenue, and fulfill orders.
- **Veterinarians:** Manage clinic profiles, consultation fees, and patient appointment requests.
- **Groomers:** Publish care packages and manage salon reservations.
- **Platform Administrators:** Moderate product and business listings, handle customer support tickets, and monitor platform health telemetry.

---

## 2. Key Features by User Role

### Buyer / Pet Parent (`buyer`)
- **Pet Adoption Marketplace:** Search and filter pets (dogs, cats, birds, rabbits, fish) by breed, age, and health certification with an interactive pet matchmaker quiz.
- **Pet Supplies Marketplace:** Browse pet food, accessories, toys, and grooming gear with dynamic variant selection (size, weight, flavor) and real-time stock indicators.
- **Shopping Cart & COD Checkout:** Multi-item cart drawer with server-calculated subtotal, GST/tax, and shipping fees. Cash on Delivery (COD) checkout with atomic inventory decrements.
- **Order Tracking & Radar:** Track adoption milestones and physical product orders with live transport progress indicators. Cancel unshipped orders with automated inventory restocking.
- **Care Bookings:** Book verified veterinary consultations and grooming spa sessions.
- **Dashboard & Wishlists:** Centralized buyer portal displaying order history, scheduled appointments, and saved pet and product wishlists.

### Breeder & Pet Seller (`seller`)
- **Breeder Portal:** Dedicated dashboard to manage owned pet listings, track stock levels, and upload image and video galleries via Cloudinary.
- **Milestone Management:** Advance adoption transport status (`Order Placed` -> `Health Check Completed` -> `In Transit` -> `Out for Delivery` -> `Delivered`).
- **Payout Configuration:** Set up private UPI and bank account payout preferences.

### Shopkeeper & Merchant (`shopkeeper`)
- **Business & SaaS Workspace:** Manage vendor storefront, configure business profiles, and monitor revenue KPIs and low-stock alerts.
- **Catalog & Variant Management:** Create and update multi-variant product items with SKUs, safety warnings, and stock allocations.
- **Order Fulfillment:** View store-specific customer orders, update delivery status, and review customer return requests.

### Veterinarian (`vet`)
- **Clinical Profile:** Configure clinic address, medical qualifications, specialty, and consultation fee.
- **Appointment Scheduling:** Manage patient appointment requests with status actions (`Confirmed`, `Completed`, `Cancelled`).

### Grooming & Care Provider (`groomer`)
- **Service Catalog:** Publish grooming and spa treatment packages.
- **Booking Management:** Review upcoming salon reservations and update booking statuses.

### Platform Administrator (`admin`)
- **Administration Portal:** Overview of platform-wide activity, tenant listings, and registered businesses.
- **Customer Support Desk:** Filter, search, and respond to buyer support tickets with threaded admin responses.
- **Vendor & Product Moderation:** Verify or suspend business accounts and review flagged product listings.
- **System Health:** Real-time health check endpoint (`/api/health`) exposing database connectivity, process uptime, and memory usage.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6 | Component-based single-page application with fast HMR |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React | Utility-first styling, responsive layouts, and consistent iconography |
| **Backend Runtime** | Node.js (18+) | Server-side JavaScript runtime |
| **API Framework** | Express.js 4 | RESTful routing, middleware pipeline, and error handling |
| **Database** | MongoDB Atlas / Local MongoDB | Primary document database accessed via Mongoose 8 |
| **Persistence Fallback** | JSON Storage (`db.js`) | Local development fallback for running without a local MongoDB service |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs` | Stateless signed tokens with token versioning and password hashing |
| **Media Storage** | Multer, Cloudinary SDK | Memory-buffered multipart uploads streamed directly to Cloudinary |
| **Email Delivery** | Nodemailer, email59 / Resend APIs | OTP email verification and password reset dispatch |
| **Testing** | Node.js Native Test Runner (`node --test`) | Built-in test execution for unit, integration, and platform audit tests |
| **Deployment** | Render | Static Site for frontend and Web Service for backend |

---

## 4. Architecture Overview

PetPaws separates concerns across client, API, database, and cloud storage layers:

```text
               React 18 + Vite Frontend (SPA)
             [Hash Routing, Auth State, UI Portals]
                             |
                   HTTPS / JSON REST API
                 (Bearer JWT Authorization)
                             |
                             v
               Node.js + Express Backend Server
     [Helmet, CORS, Rate Limiters, Auth & Role Guards]
         |                   |                    |
         v                   v                    v
  MongoDB Database     Cloudinary CDN     Email Services
  (Mongoose Models)   (Images & Videos)  (OTPs & Alerts)
```

1. **Client SPA:** Communicates with the backend using the centralized fetch wrapper in `client/src/utils/auth.js`. Role helpers in `client/src/utils/permissions.js` ensure role-restricted UI elements are gated client-side.
2. **API & Route Middleware:** Requests pass through security headers (Helmet), CORS whitelisting, request logging, and rate limiting. Protected endpoints use `protect` to authenticate JWTs against database records and `requireRole` to verify permissions.
3. **Dual Persistence Architecture:** The server connects to MongoDB via Mongoose. If MongoDB is unavailable during local development, the application falls back to `server/db.js` using local JSON storage. In test environments, connections are strictly isolated to `mongodb://127.0.0.1:27017/petpaws_test`.

---

## 5. Project Directory Structure

```text
PetPaws/
├── client/                                # React frontend SPA
│   ├── index.html                         # HTML entry shell
│   ├── vite.config.js                     # Vite build and proxy configuration
│   ├── package.json                       # Frontend dependencies and scripts
│   ├── .env.example                       # Client environment template
│   └── src/
│       ├── main.jsx                       # React DOM mount point
│       ├── App.jsx                        # Root state and view coordinator
│       ├── components/                    # UI components, dashboards, modals
│       │   ├── AdminPortal.jsx            # Platform administration console
│       │   ├── BuyerDashboard.jsx         # Buyer orders, wishlist, and care schedule
│       │   ├── CustomerSupport.jsx        # FAQ and support ticket submission
│       │   ├── Marketplace.jsx            # Pet adoption listings and search
│       │   ├── OrdersTracking.jsx         # Pet and product order tracking
│       │   ├── ProductsMarketplace.jsx    # Pet supply store and cart checkout
│       │   ├── SellerDashboard.jsx        # Breeder portal and inventory
│       │   └── VetDashboard.jsx           # Veterinarian clinic portal
│       └── utils/
│           ├── auth.js                    # Authenticated fetch client
│           └── permissions.js             # Role constants and permission checks
│
├── server/                                # Node.js + Express backend API
│   ├── server.js                          # Express bootstrap and middleware
│   ├── package.json                       # Backend dependencies and test scripts
│   ├── .env.example                       # Backend environment template
│   ├── config/                            # Database, JWT, and Cloudinary config
│   ├── controllers/                       # Route controllers (auth, pets, orders, etc.)
│   ├── middleware/                        # Auth, role check, upload, error handling
│   ├── models/                            # Mongoose data models
│   ├── routes/                            # Express API route modules
│   ├── tests/                             # Node.js automated test suites
│   └── utils/                             # Email, pricing, error, and database helpers
│
├── package.json                           # Root workspace helper scripts
├── PROJECT_STRUCTURE.md                   # Detailed architectural reference
└── README.md
```

---

## 6. Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** Local MongoDB instance or MongoDB Atlas cluster URI
- *(Optional)* **Cloudinary:** Account for image and video uploads

### 1. Installation

Clone the repository and install dependencies for both `server` and `client`:

```bash
git clone https://github.com/jhasabhishek17/PetPaws.git
cd PetPaws

# Install dependencies for both root, server, and client
npm run install-all
```

Alternatively, install dependencies manually:

```bash
cd server && npm install
cd ../client && npm install
cd ..
```

---

## 7. Environment Configuration

### Backend (`server/.env`)
Create a `.env` file in the `server/` directory based on [`server/.env.example`](server/.env.example):

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/petpaws
JWT_SECRET=your_secure_random_jwt_secret_key_at_least_32_characters
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173

# Reverse Proxy (Render / Production)
TRUST_PROXY=1

# Cloudinary Media Storage (Optional for local text testing)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Transactional Email (Optional for local testing; tests use mock resolvers)
EMAIL_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SUPPORT_TEAM_EMAIL=support@yourdomain.com
```

### Frontend (`client/.env`)
Create a `.env` file in the `client/` directory based on [`client/.env.example`](client/.env.example):

```env
VITE_API_URL=http://localhost:5001
```

---

## 8. Database Seeding

PetPaws provides seed scripts to populate initial catalog data and demo accounts:

```bash
# Seed 20 realistic INR (₹) pet supply products and core platform role accounts
cd server
npm run seed:products

# Seed base pet listings, veterinarians, and grooming packages
npm run seed

# Seed complete multi-role demo environment
npm run seed:demo
```

---

## 9. Running Locally

Run backend and frontend services in separate terminals:

```bash
# Terminal 1 — Backend API (http://localhost:5001)
npm run dev:server

# Terminal 2 — Frontend Client (http://localhost:5173)
npm run dev:client
```

Or from their respective directories:

```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm run dev
```

---

## 10. API Overview

All API endpoints are prefixed with `/api` and return standardized JSON responses.

| Endpoint Prefix | Primary Methods | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth` | `GET`, `POST`, `PUT` | Public / Protected | User registration, login, email OTP verification, password reset, profile, wishlists |
| `/api/pets` | `GET`, `POST`, `PUT`, `DELETE` | Public / Seller | Browse adoptable pets, manage breeder inventory, upload galleries |
| `/api/products` | `GET`, `POST`, `PUT`, `DELETE` | Public / Vendor | Browse pet supply catalog, manage product variants and stock levels |
| `/api/orders` | `GET`, `POST`, `PUT` | Protected | Pet adoption checkout, shipment tracking, order cancellations |
| `/api/product-orders` | `GET`, `POST`, `PUT` | Protected | Cart checkout initiation, COD order creation, order tracking, returns |
| `/api/vets` | `GET`, `POST`, `PUT` | Public / Protected | Veterinarian directory, clinical profiles, appointment scheduling |
| `/api/services` | `GET`, `POST`, `PUT` | Public / Protected | Grooming care package directory and appointment reservations |
| `/api/support` | `GET`, `POST`, `PUT` | Protected | Customer support ticket submission and admin response management |
| `/api/upload` | `POST`, `DELETE` | Protected | Memory-buffered media upload to Cloudinary with context guards |
| `/api/saas` | `GET`, `POST`, `PUT` | Protected | Business tenant profiles, team RBAC seats, admin moderation |
| `/api/offers` | `GET`, `PUT`, `DELETE` | Public / Protected | Item-level promotional discounts and special offers |
| `/api/health` | `GET` | Public | Real-time service health check and database telemetry |

---

## 11. Testing & Build

PetPaws uses Node.js's native test runner (`node --test`). Tests run in an isolated environment against a dedicated test database (`petpaws_test`) with mocked email transport and DNS resolution:

```bash
# Run the platform audit test suite (28 tests)
npm test

# Run individual test suites
node --test server/tests/platformAudit.test.js
node --test server/tests/customerSupport.test.js
node --test server/tests/roleBasedUX.test.js
node --test server/tests/offersDiscounts.test.js
```

### Production Build
To verify the frontend production build:

```bash
npm run build
# Or: cd client && npm run build
```

---

## 12. Deployment (Render)

PetPaws is configured for deployment on Render using two services:

1. **Frontend (Static Site):**
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variables:** `VITE_API_URL=https://<your-backend-service>.onrender.com`

2. **Backend (Web Service):**
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `PORT=5001`
     - `TRUST_PROXY=1`
     - `MONGODB_URI=<your-production-mongodb-atlas-uri>`
     - `JWT_SECRET=<your-production-jwt-secret>`
     - `ALLOWED_ORIGINS=https://<your-frontend-service>.onrender.com`
     - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
     - `EMAIL59_API_KEY` (or SMTP credentials)

---

## 13. Security Considerations

- **Authoritative Database Roles:** User permissions are determined by the verified user record in MongoDB, never by client-supplied claims in request bodies or tampered JWT payloads.
- **Admin Registration Block:** Public registration as `admin` is rejected with `HTTP 403`. Administrative accounts are provisioned securely via seeding or direct database administration.
- **Order Tracking Isolation:** Order tracking endpoints (`/api/orders/track/:code` and `/api/product-orders/track/:code`) verify that the requesting user owns the order, is the fulfilling seller, or holds the `admin` role.
- **Rate Limiting:** Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/verify-otp`, `/api/auth/forgot-password`) enforce rate limits to protect against brute-force attacks and abuse.
- **Database Test Isolation:** When running tests (`NODE_ENV=test`), `server/config/db.js` strictly restricts connections to `mongodb://127.0.0.1:27017/petpaws_test` and aborts if remote or Atlas connection strings are provided.
- **Secret Safety:** Environment variables containing sensitive credentials (`.env`) are excluded from version control via `.gitignore`.

---

## 14. Known Disclosures

- **Payment Mode:** Live online payment gateways (e.g., Razorpay) are optional. Online payment is disabled by default, and physical product orders route through Cash on Delivery (COD).
- **Currencies:** Pet adoption listings and SaaS plan tiers display in USD (`$`), while pet supplies marketplace products, cart totals, and vendor revenue KPIs calculate in Indian Rupees (`₹`).

---

## 15. Future Roadmap

- Automated CI/CD test and build validation using GitHub Actions.
- Real-time WebSocket notifications for order status changes and chat.
- Downloadable PDF tax invoices for completed orders.

---

## 16. Contributing & License

Contributions are welcome. Please open an issue first to discuss substantial changes, and ensure all existing automated tests pass before submitting a pull request.

This project is licensed under the [MIT License](LICENSE).
