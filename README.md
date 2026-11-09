# PetPaws

A modern, full-stack pet care ecosystem unifying pet adoption, a multi-vendor pet supplies marketplace, veterinary consultations, and grooming services into a single platform. Built with the MERN stack, featuring robust role-based access control, atomic inventory checkout, and automated customer support.

[![Live Demo](https://img.shields.io/badge/Live_Demo-petpaws--frontend.onrender.com-2563EB?style=for-the-badge&logo=render&logoColor=white)](https://petpaws-frontend.onrender.com/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-jhasabhishek17%2FPetPaws-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jhasabhishek17/PetPaws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[**Explore Live Website →**](https://petpaws-frontend.onrender.com/) &nbsp;|&nbsp; [**View GitHub Repository →**](https://github.com/jhasabhishek17/PetPaws)

---

![React 18](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js_4-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

---

## Table of Contents

- [About PetPaws](#about-petpaws)
- [Key Features](#key-features)
  - [Buyer Experience](#buyer-experience)
  - [Seller & Breeder Portal](#seller--breeder-portal)
  - [Shopkeeper Portal](#shopkeeper-portal)
  - [Veterinarian & Groomer Care](#veterinarian--groomer-care)
  - [Administrator Portal](#administrator-portal)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Live Demo & Interface](#live-demo--interface)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Seeding](#database-seeding)
  - [Running Locally](#running-locally)
- [Environment Configuration](#environment-configuration)
- [Available Scripts and Testing](#available-scripts-and-testing)
- [Deployment](#deployment)
- [Security Model](#security-model)
- [Contributing](#contributing)
- [License](#license)

---

## About PetPaws

Pet care is often fragmented across multiple disconnected platforms: adoption listings are isolated from pet supply stores, and clinic appointments require independent booking tools. 

**PetPaws** solves this fragmentation by providing an all-in-one web platform with tailored experiences for every participant in the pet care lifecycle:
- **Buyers & Pet Parents:** Discover pets for adoption, shop verified pet food and accessories with dynamic variant selection, book vet visits, schedule grooming packages, and manage support tickets.
- **Breeders & Sellers:** List available pets with health certifications, medical histories, and photo/video media galleries.
- **Shopkeepers:** Manage multi-vendor product catalogs, track stock counts across variants, and fulfill customer orders.
- **Service Providers (Vets & Groomers):** Maintain clinic profiles, set consultation fees, and manage client appointment calendars.
- **Administrators:** Review vendor onboarding, moderate listings, resolve support tickets, inspect platform audit logs, and monitor real-time server health.

---

## Key Features

### Buyer Experience
- **Pet Adoption Catalog:** Search and filter adoptable pets (dogs, cats, birds, rabbits, fish) by species, breed, age, and health certification.
- **Multi-Vendor Marketplace:** Browse products with multi-attribute filtering (category, pet type, price range, stock availability).
- **Product Variants:** Select specific flavors, sizes, or weight options with dynamic pricing and variant-specific inventory tracking.
- **Shopping Cart & Checkout:** Server-calculated tax, shipping, and promotional discounts with Cash on Delivery (COD) order placement.
- **Order Lifecycle Tracking:** Real-time status updates (`Placed`, `In Transit`, `Delivered`) with self-service cancellation and return workflows that automatically restore inventory.
- **Health & Wellness Bookings:** Schedule appointments with verified veterinarians and book pet grooming packages directly from the UI.
- **Support Desk:** Submit support tickets with priority levels and track threaded staff responses.
- **User Profile:** Manage saved wishlists, delivery addresses, and personal account security.

### Seller & Breeder Portal
- **Pet Listings Management:** Create and update listings with rich descriptions, health check details, vaccination histories, and location metadata.
- **Media Uploads:** Multi-image and video upload support powered by Cloudinary.
- **Adoption Applications:** Review incoming inquiries, update application stages, and record completion details.

### Shopkeeper Portal
- **Inventory & SKU Management:** Add products with multiple SKU variants, stock counters, and rich product specifications.
- **Order Fulfillment:** Filter incoming store orders, transition shipping states, and handle return approvals.
- **Stock Automation:** Automatic inventory decrements on order placement and restocking on cancellation.

### Veterinarian & Groomer Care
- **Provider Profiles:** Configure experience, clinic addresses, specializations, and consultation rates.
- **Appointment Calendar:** Manage consultation requests across standardized states (`Scheduled`, `Confirmed`, `Completed`, `Cancelled`).
- **Grooming Services:** Offer specialized spa and grooming packages with custom durations and pricing.

### Administrator Portal
- **Platform Telemetry:** Live system health monitoring via `/api/health` (memory utilization, server uptime, database mode).
- **User & Vendor Moderation:** Manage accounts, verify newly onboarded vendors, and assign user roles.
- **Listing & Product Oversight:** Inspect, edit, or remove marketplace items violating standards.
- **Help Desk Operations:** Centralized support ticket resolution queue with status filters and staff reply threads.
- **System Audit Logging:** Track administrative operations and security events via persistent audit log collections.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | High-performance Single Page Application (SPA) architecture |
| **Styling & UI** | Tailwind CSS, Lucide React | Responsive design, modern layouts, and lightweight iconography |
| **Backend Runtime** | Node.js (v18+), Express.js (v4) | RESTful API server with modular controllers and routers |
| **Database** | MongoDB & Mongoose (v8) | Document schema validation, indexing, and local JSON development fallback |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs` | Stateless signed tokens, password hashing, and token versioning |
| **Media Storage** | Cloudinary & Multer | Secure cloud-hosted image and video upload pipelines |
| **Email & OTP** | Nodemailer, email59 / Resend APIs | OTP email delivery, password resets, and customer support notifications |
| **Security** | Helmet, Express Rate Limit, CORS | HTTP security headers, anti-abuse rate limits, and origin whitelisting |
| **Deployment** | Render | Static site hosting for frontend, managed web service for backend |

---

## Application Architecture

PetPaws follows a decoupled client-server architecture with an Express MVC REST API communicating over JSON:

```text
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                  │
│       Tailwind CSS  •  Lucide Icons  •  Role UI        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST API
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Express.js Backend                   │
│   Rate Limiter • Helmet • JWT & RBAC • Audit Logger    │
│   Controllers: Auth, Pets, Products, Orders, Vets, etc.│
└────────────┬──────────────────┬─────────────────┬──────┘
             │                  │                 │
             ▼                  ▼                 ▼
     ┌──────────────┐   ┌───────────────┐  ┌─────────────┐
     │   MongoDB    │   │  Cloudinary   │  │ Transaction │
     │  (Atlas/Dev) │   │ Media Storage │  │  Email/OTP  │
     └──────────────┘   └───────────────┘  └─────────────┘
```

1. **Client Layer:** React SPA built with Vite renders responsive role-specific views. Requests to the backend pass authenticated JWT tokens in the `Authorization: Bearer <token>` header.
2. **Middleware Layer:** Incoming requests pass through security headers (`helmet`), CORS origin checks, IP rate limiters, token verification (`protect`), and role assertions (`requireRole`).
3. **Controller & Business Logic Layer:** Modular controllers process input validation, atomic inventory updates, and business workflows.
4. **Data & Storage Layer:** MongoDB stores application collections (Users, Pets, Products, Orders, Appointments, Tickets, Audit Logs). Media files stream directly to Cloudinary.

---

## Live Demo & Interface

The application is deployed and available for interactive testing:

👉 **[Explore the Live PetPaws Application →](https://petpaws-frontend.onrender.com/)**

Reviewers and recruiters can explore the complete user journey across all roles:
- Browse adoption listings and the multi-vendor marketplace.
- Test variant selection, cart calculations, and Cash on Delivery checkout.
- Schedule mock veterinary appointments and submit customer support tickets.
- Switch between Buyer, Seller, Shopkeeper, Vet, and Admin views using built-in credentials or new accounts.

---

## Project Structure

```text
PetPaws/
├── client/                             # Frontend React Single Page Application
│   ├── public/
│   │   ├── _redirects                  # SPA client-side routing rewrite for Render
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/                 # UI components and role-specific dashboards
│   │   │   ├── AdminPortal.jsx         # Administrative control desk and health monitor
│   │   │   ├── BuyerDashboard.jsx      # Order history, bookings, and wishlist
│   │   │   ├── CustomerSupportPortal.jsx # Support ticket creation and tracking
│   │   │   ├── ProductsMarketplace.jsx # Catalog with filters and variant modals
│   │   │   ├── SellerDashboard.jsx     # Breeder pet listing management
│   │   │   ├── ShopkeeperDashboard.jsx # Product inventory and order fulfillment
│   │   │   ├── VetDashboard.jsx        # Appointment calendar and clinic settings
│   │   │   └── ...
│   │   ├── utils/                      # API client, token handling, and role helpers
│   │   ├── App.jsx                     # Root application routing and layout
│   │   └── main.jsx                    # React entry point
│   ├── package.json
│   └── vite.config.js
├── server/                             # Backend RESTful API Server
│   ├── config/
│   │   └── db.js                       # MongoDB connection with offline fallback
│   ├── controllers/                    # Route handlers (auth, pets, products, orders, etc.)
│   ├── middleware/                     # Auth, RBAC, rate-limiting, and error handling
│   ├── models/                         # Mongoose schemas (15 validated models)
│   ├── routes/                         # Express route definitions (12 modular routers)
│   ├── scripts/                        # Database seeders
│   ├── tests/                          # Automated Node.js test suites (73 tests)
│   ├── utils/                          # Email dispatcher, discount engine, payment gateway
│   ├── server.js                       # Server entry point
│   └── package.json
├── PROJECT_STRUCTURE.md                # Comprehensive architectural and flow documentation
├── package.json                        # Root workspace scripts
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MongoDB** (local daemon running on `mongodb://127.0.0.1:27017` or a free MongoDB Atlas connection URI)
- Optional: Free **Cloudinary** account for live image/video uploads

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jhasabhishek17/PetPaws.git
   cd PetPaws
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```
   *Alternatively, install each workspace individually:*
   ```bash
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

### Database Seeding

Seed initial products, categories, sample pets, and demo accounts:

```bash
# Seed product catalog with variants
npm run seed:products --prefix server

# Seed full demo environment (users, pets, sample orders)
npm run seed:demo --prefix server
```

### Running Locally

Start the backend and frontend development servers concurrently:

```bash
# Start backend API (runs on http://localhost:5001 with auto-restart)
npm run dev:server

# In a separate terminal, start frontend client (runs on http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Configuration

### Server Environment (`server/.env`)

Copy `server/.env.example` to `server/.env` and update the values:

```env
# Server Core
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/petpaws
JWT_SECRET=your_secure_random_jwt_secret_key_at_least_32_characters
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY=1

# Cloudinary (Media Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=petpaws

# Transactional Email (Optional for local development)
EMAIL_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SUPPORT_TEAM_EMAIL=support@yourdomain.com
```

### Client Environment (`client/.env`)

Copy `client/.env.example` to `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

---

## Available Scripts and Testing

### Root Scripts
| Command | Action |
| :--- | :--- |
| `npm run install:all` | Installs dependencies across both `server` and `client` |
| `npm run dev:server` | Starts the Express server in development mode (`node --watch`) |
| `npm run dev:client` | Launches the Vite frontend development server |
| `npm run build` | Compiles the production frontend bundle into `client/dist` |
| `npm test` | Runs the backend platform audit test suite |

### Automated Testing

PetPaws includes **73 automated backend tests** built using Node.js's native test runner (`node --test`). Tests execute in an isolated environment against a dedicated test database (`petpaws_test`) with mocked email transport and DNS resolvers to prevent side effects:

```bash
# Run the platform audit suite (28 tests)
npm test --prefix server

# Run the customer support suite (25 tests)
node --test server/tests/customerSupport.test.js

# Run the role-based UX suite (11 tests)
node --test server/tests/roleBasedUX.test.js

# Run the offers and discounts suite (9 tests)
node --test server/tests/offersDiscounts.test.js
```

---

## Deployment

The application is architected for clean cloud deployment on platforms like Render:

### Frontend (Render Static Site)
- **Source Directory:** `client`
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Routing:** Supported via `client/public/_redirects` (`/* /index.html 200`) to guarantee correct Single Page Application routing on browser refreshes.
- **Environment Variables:** `VITE_API_URL` pointing to the live backend URL.

### Backend (Render Web Service)
- **Source Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start` (or `node server.js`)
- **Reverse Proxy Support:** Configured via `TRUST_PROXY=1` in `server/server.js` so that `express-rate-limit` accurately computes client IP addresses behind Render's reverse proxy.
- **Environment Variables:** `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, Cloudinary credentials, and transactional email keys.

---

## Security Model

- **Token Versioning:** Each user document maintains a `token_version` field. When a password reset occurs or credentials change, the version increments, automatically invalidating all previously issued tokens.
- **Role-Based Authorization:** Strict middleware (`protect` and `requireRole`) verifies the user's role against database state rather than trusting unverified client claims.
- **Rate Limiting:** Protects `/api/auth/login`, `/api/auth/register`, `/api/auth/verify-otp`, and `/api/auth/forgot-password` against brute-force attacks and OTP flooding.
- **NoSQL Injection Defense:** Uses Mongoose strict schema casting and parameterized object queries to block operator-injection vectors.
- **HTTP Hardening:** Helmet enables secure HTTP headers; CORS strictly restricts origins in production environments.
- **Audit Logging:** Administrative updates and critical events are logged into the `AuditLog` collection with timestamps, user IDs, and action metadata.

---

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "Add amazing feature"`).
4. Run the automated test suite to ensure clean status (`npm test --prefix server`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
