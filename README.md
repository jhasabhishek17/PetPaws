# 🐾 PetPaws — Full-Stack Pet Care & Adoption Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.22-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.9-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT Auth](https://img.shields.io/badge/Auth-JWT_%26_bcrypt-FF6F00)](https://jwt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Discover. Adopt. Care.**  
> A full-stack pet marketplace and wellness platform connecting ethical breeders, certified veterinarians, specialized pet care providers, and loving pet parents in a verified, secure environment.

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features by Role](#-key-features-by-role)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Local Setup & Installation](#-local-setup--installation-macos)
- [Running the Application](#-running-the-application)
- [Database Models & API Overview](#-database-models--api-overview)
- [Security & Authorization](#-security--authorization)
- [Testing & Quality Verification](#-testing--quality-verification)
- [Known Limitations & Roadmap](#-known-limitations--roadmap)
- [Project Documentation](#-project-documentation)
- [Author & Acknowledgments](#-author--acknowledgments)

---

## 🌟 Project Overview

**PetPaws** is an end-to-end full-stack web application designed to solve key challenges in modern pet adoption and pet healthcare:
1. **Health-Verified Listings:** Every pet listing features verified vaccination and veterinary health status checkmarks (`Vet Verified`) rather than unverified third-party claims.
2. **Dual-Client Architecture:** A high-performance **React 18 Single-Page Application (SPA)** with real-time state management, alongside server-rendered **EJS Web Views** for universal web accessibility.
3. **Role-Based Access Control (RBAC):** Distinct interfaces, permissions, and security policies for **Buyers**, **Sellers**, and **Veterinarians**.
4. **Resilient Dual-Persistence:** Primary storage in **MongoDB (Mongoose ODM)** with an automatic, zero-downtime fallback to an atomic **JSON flat-file store** when offline or during local testing without a database server.
5. **Full Transaction Lifecycle:** Instant checkout simulation, automated stock decrements, auto-delisting on zero stock, 5-stage live shipment tracking, and self-service order cancellation with automatic pet inventory restocking.

---

## 🎯 Key Features by Role

### 🐶 For Buyers
- **Live Search & Category Filtering:** Instant search by breed, title, or keywords across five pet categories: **Dogs**, **Cats**, **Fishes**, **Rabbits**, and **Birds**, coupled with dynamic price filtering.
- **Interactive Pet Matchmaker Quiz:** A multi-step lifestyle questionnaire evaluating living quarters, energy preferences, daily time availability, and pet experience to recommend ideal breeds.
- **Interactive Health Details Modal:** Inspect detailed vaccination badges, physical specs (age, gender, breed), seller profiles, and adoption fees before ordering.
- **Wishlist Management:** Save favorite pets with one-click heart toggles, real-time navbar counter badge, and a dedicated Saved Wishlist tab.
- **Multi-Method Simulated Checkout:** Complete adoptions via **UPI (QR code / UPI ID)**, **Credit/Debit Card**, or **NetBanking**, with automatic 8% tax calculation and printable receipts.
- **5-Stage Live Order Tracking:** Real-time visual timeline:  
  `Order Placed` &rarr; `Health Check` &rarr; `In Transit` &rarr; `Out for Delivery` &rarr; `Delivered`.
- **Self-Service Order Cancellation:** Buyers can cancel active orders prior to delivery; cancelling automatically initiates a refund and restocks the pet listing.
- **24/7 Vet Telehealth & Spa Grooming:** Book video consultations with certified veterinarians and reserve professional spa grooming and obedience training sessions.

### 🏪 For Sellers
- **Dedicated Seller Portal:** Gated on both frontend and backend; inaccessible to buyers and logged-out visitors.
- **Listing Lifecycle Management:** Create, update, and delist pet listings with custom images, health verifications, descriptions, and stock counts.
- **Strict Backend Ownership Enforcement:** Only the verified listing owner (matching `req.user.id` from JWT) can update or delete pet records.
- **Payout Configuration:** Securely configure bank accounts, IFSC codes, and UPI IDs for adoption payouts.
- **Order & Inventory Sync:** Pet stock automatically decrements upon purchase (switching to `sold` when stock reaches 0) and increments upon cancellation.

### 🩺 For Veterinarians
- **Veterinary Consultation Hub:** Public directory displaying certified specialties (Cardiology, Surgery, Dermatology, General Wellness), consultation fees, and availability.
- **Vet Portal & Schedule:** Role-gated portal where veterinarians can inspect scheduled patient appointments and review consultation requests.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Reactive user interface & component state management |
| **Frontend Build Tool** | Vite | `^6.4.3` | Fast bundling, HMR, and development API proxy |
| **CSS Framework** | Tailwind CSS | `^4.3.3` | Responsive Warm Amber & Coral eye-comfort palette |
| **Iconography** | Lucide React | `^0.469.0` | Accessible, clean vector icons |
| **Backend Runtime** | Node.js | `>=18` (Tested v24) | High-performance asynchronous JavaScript runtime |
| **Web Framework** | Express.js | `^4.22.2` | RESTful API routes, MVC pipeline, and middleware |
| **Primary Database** | MongoDB / Mongoose | `^8.9.5` | ODM schemas, validations, and auto-timestamps |
| **Fallback Database** | JSON Flat-File | Custom | Zero-downtime offline persistence (`server/data/db.json`) |
| **Authentication** | JSON Web Tokens | `^9.0.3` | Cryptographically signed stateless JWT authentication |
| **Password Security** | bcryptjs | `^3.0.3` | Salted credential hashing (10 rounds) |
| **Rate Limiting** | express-rate-limit | `^8.7.1` | Brute-force defense on auth endpoints (15 req/15 min) |
| **Security Headers** | helmet | `^8.3.0` | HTTP security headers & clickjacking mitigation |
| **Templating Engine** | EJS | `^6.0.1` | Server-rendered webpage views |

---

## 🏗️ System Architecture

```text
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  React 18 SPA (Vite + Tailwind CSS)           EJS Server-Rendered Views (Bootstrap 5) |
|  - Realtime Search & Category Filters          - Wanderlust-style Marketplace View    |
|  - Interactive Matchmaker Quiz & Cart         - Pet Detail & Auth Templates          |
|  - Role-gated Buyer, Seller & Vet Portals     - Server-side Flash Alerts             |
+-------------------------------------------+-------------------------------------------+
                                            | HTTP REST API / Proxy (Port 5173 -> 5001)
                                            v
+---------------------------------------------------------------------------------------+
|                                    BACKEND TIER                                       |
|  Node.js & Express.js Server (Port 5001)                                              |
|  - Security Middleware: Helmet (CSP), CORS Origin Whitelist, Rate Limiting (Login)   |
|  - Auth Middleware: JWT Verification (protect / optionalAuth), Role Gate Checkers     |
|  - Modular Routers: /api/auth, /api/pets, /api/orders, /api/vets, /api/services, etc. |
|  - Centralized Error Handler (ExpressError, AsyncHandler, Status Code Mapping)        |
+-------------------------------------------+-------------------------------------------+
                                            | Mongoose / JSON Dual-Persistence
                                            v
+---------------------------------------------------------------------------------------+
|                                   DATA TIER                                           |
|  Primary: MongoDB / MongoDB Atlas (Mongoose ODM with Schemas, Indexes, Timestamps)    |
|  Fallback: Local JSON Store (server/data/db.json) for zero-downtime offline execution|
+---------------------------------------------------------------------------------------+
```

---

## 📂 Project Structure

```text
PetPaws/
├── client/                               # Frontend React Application (Vite SPA)
│   ├── src/
│   │   ├── components/                   # UI Modules and Interactive Sections
│   │   │   ├── Navbar.jsx                # Responsive navbar, search, user dropdown & logout
│   │   │   ├── Hero.jsx                  # Hero section with verified badge & quick links
│   │   │   ├── Marketplace.jsx           # Pet grid, breed/category filters, price sorting
│   │   │   ├── PetDetailModal.jsx        # Health certificate, specs, seller info & adoption
│   │   │   ├── CheckoutModal.jsx         # Multi-method payment modal (UPI, Card, NetBanking)
│   │   │   ├── OrdersTracking.jsx        # Order timeline, carrier status & cancel option
│   │   │   ├── BuyerDashboard.jsx        # Buyer stats, order history, wishlist shortcuts
│   │   │   ├── SellerDashboard.jsx       # Inventory manager, listing uploader, payout settings
│   │   │   ├── VetSection.jsx            # 24/7 telehealth directory & appointment booking
│   │   │   ├── VetDashboard.jsx          # Veterinarian consultation manager & schedule
│   │   │   ├── GroomingCareSection.jsx   # Spa grooming packages, pricing & booking
│   │   │   ├── CustomerSupport.jsx       # FAQ accordion & collision-resistant support tickets
│   │   │   ├── PetMatchmakerQuiz.jsx     # Interactive multi-step pet compatibility quiz
│   │   │   ├── Toast.jsx                 # Decoupled accessible floating toast notifications
│   │   │   ├── PawLoader.jsx             # Animated paw-print loading indicator
│   │   │   └── AuthModal.jsx             # Role-based modal (Buyer, Seller, Vet) with demo logins
│   │   ├── utils/
│   │   │   └── auth.js                   # JWT token persistence & authenticated fetch wrappers
│   │   ├── App.jsx                       # Root React component, active tab routing, global state
│   │   ├── main.jsx                      # Vite entry point mounting React root
│   │   └── index.css                 # Tailwind directives, animations & custom styles
│   ├── vite.config.js                    # Vite configuration with Express /api proxy
│   └── package.json                      # Frontend dependencies & build scripts
├── server/                               # Backend REST API & Server-Rendered Views
│   ├── config/
│   │   ├── db.js                         # Mongoose MongoDB connection & failover handler
│   │   └── jwt.js                        # JWT signing & secret configuration
│   ├── controllers/                      # Business Logic & Endpoint Handlers
│   │   ├── authController.js             # User registration, bcrypt login, JWT signing
│   │   ├── petController.js              # Pet CRUD, stock decrement, owner authorization
│   │   ├── orderController.js            # Checkout, buyer order isolation, status & cancel
│   │   ├── vetController.js              # Vet directory, appointments, schedule cancellation
│   │   ├── serviceController.js          # Grooming packages, reservations & cancel logic
│   │   └── supportController.js          # Collision-resistant ticket generation & inquiry CRUD
│   ├── middleware/                       # Request Pipeline Interceptors
│   │   ├── authMiddleware.js             # protect (required JWT) & optionalAuth middleware
│   │   ├── requestLogger.js              # Morgan-style formatted HTTP request logging
│   │   ├── errorHandler.js               # Centralized Express error handler & status formatting
│   │   └── asyncHandler.js               # Promise wrapper eliminating try/catch boilerplate
│   ├── models/                           # Mongoose Schemas (MongoDB)
│   │   ├── User.js                       # User credentials, roles, phone, address, payout details
│   │   ├── Pet.js                        # Pet listing, seller ID, stock, health status, category
│   │   ├── Order.js                      # Transaction record, tracking code, shipping, tax
│   │   ├── VetProfile.js                 # Certified vet credentials, fee, specialty, schedule
│   │   ├── VetAppointment.js             # 1-on-1 consultation booking & cancellation state
│   │   ├── GroomingService.js            # Spa package offerings, pricing, durations
│   │   ├── GroomingBooking.js            # Grooming reservations & status
│   │   └── SupportTicket.js              # Customer ticket with timestamp-based unique ID
│   ├── routes/                           # Modular Express Router Declarations
│   │   ├── authRoutes.js                 # /api/auth routes with login rate limiting
│   │   ├── petRoutes.js                  # /api/pets routes (public GET, protected POST/PUT/DELETE)
│   │   ├── orderRoutes.js                # /api/orders routes (checkout, tracking, cancellation)
│   │   ├── vetRoutes.js                  # /api/vets routes (directory, appointments, cancel)
│   │   ├── serviceRoutes.js              # /api/services routes (grooming, booking, cancel)
│   │   ├── supportRoutes.js              # /api/support routes (tickets, status)
│   │   └── viewRoutes.js                 # Server-rendered EJS webpage routes (/)
│   ├── views/                            # EJS Templates for Server-Side Rendering
│   ├── data/
│   │   └── db.json                       # Flat-file database fallback for offline execution
│   ├── server.js                         # Express application entry point & listener
│   └── package.json                      # Backend dependencies & scripts
├── docs/                                 # Project Documentation
│   └── PetPaws_Project_Documentation.pdf # Comprehensive compiled manual
├── package.json                          # Monorepo root scripts (dev:server, dev:client)
└── README.md                             # GitHub-ready project README
```

---

## 💻 Local Setup & Installation (macOS)

### Prerequisites
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **MongoDB** *(Optional)*: Community edition on port `27017` or Atlas URI. If unavailable, the application automatically uses the local JSON fallback.

### 1. Clone the Repository
```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd PetPaws
```

### 2. Configure Environment Variables
Create `server/.env` based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```

Ensure `server/.env` contains:
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/petpaws
JWT_SECRET=petpaws-local-dev-jwt-secret-change-in-prod
JWT_EXPIRES_IN=7d
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5001
```

*(Optional)* Create `client/.env`:
```env
VITE_API_URL=http://localhost:5001
```

### 3. Install Dependencies
```bash
# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../client
npm install
cd ..
```

### 4. Seed Demo Data (Optional)
```bash
cd server
npm run seed:demo
cd ..
```

---

## 🚀 Running the Application

You can run the frontend and backend in separate terminal tabs:

**Terminal 1 — Backend API Server:**
```bash
cd server
npm start
```
*Backend runs on [http://localhost:5001](http://localhost:5001)*

**Terminal 2 — Frontend React Client:**
```bash
cd client
npm run dev
```
*Frontend runs on [http://localhost:5173](http://localhost:5173)*

### Pre-Configured Demo Accounts
| Role | Email | Password |
| :--- | :--- | :--- |
| **Buyer** | `demo-buyer@petpaws.demo` | `password123` |
| **Seller** | `demo-seller@petpaws.demo` | `password123` |
| **Veterinarian** | `demo-vet@petpaws.demo` | `password123` |

---

## 🗄️ Database Models & API Overview

### Database Collections
- **`User`**: Custom user IDs, bcrypt password hashes, normalized emails, user roles (`buyer`, `seller`, `vet`), phone, address, and seller payout details.
- **`Pet`**: Listing title, category, price, breed, age, gender, health/vaccination status, stock count, and active status.
- **`Order`**: Itemized pricing, 8% tax breakdown, tracking code, shipping address, payment status (`Completed`, `Refunded`), and tracking status (`Order Placed`, `Health Check`, `In Transit`, `Out for Delivery`, `Delivered`, `Cancelled`).
- **`VetProfile` & `VetAppointment`**: Certified veterinarian directory, fees, specialties, and 1-on-1 booking records.
- **`GroomingService` & `GroomingBooking`**: Spa grooming packages, durations, prices, and booking logs.
- **`SupportTicket`**: Inquiries with collision-resistant timestamp IDs (`TCK-<TIMESTAMP>-<RANDOM>`).

### REST API Endpoints
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | Register new account and receive JWT |
| `POST` | `/api/auth/login` | No *(Rate Limited)* | Authenticate user and receive JWT |
| `PUT` | `/api/auth/update-payout` | Yes *(Seller)* | Configure seller bank account & UPI |
| `GET` | `/api/pets` | Optional | Browse listings with search & category filters |
| `POST` | `/api/pets` | Yes *(Seller)* | Create a pet listing (binds seller from token) |
| `PUT` | `/api/pets/:id` | Yes *(Owner)* | Update pet details (enforces ownership) |
| `DELETE` | `/api/pets/:id` | Yes *(Owner)* | Delete pet listing (enforces ownership) |
| `POST` | `/api/orders/checkout` | Yes *(Buyer)* | Place order, decrement stock, issue tracking |
| `GET` | `/api/orders` | Yes | Get orders for authenticated buyer or seller |
| `GET` | `/api/orders/track/:code` | Optional | Track shipment by unique tracking code |
| `PUT` | `/api/orders/:id/cancel` | Yes *(Buyer/Seller)* | Cancel order, refund payment, and restock listing |
| `GET` | `/api/vets` | No | List certified veterinarians & specialties |
| `POST` | `/api/vets/appointments` | Yes *(Buyer)* | Schedule veterinary telehealth consultation |
| `PUT` | `/api/vets/appointments/:id/cancel` | Yes *(Owner)* | Cancel veterinary appointment |
| `GET` | `/api/services` | No | List pet spa grooming & training packages |
| `POST` | `/api/services/bookings` | Yes *(Buyer)* | Book pet grooming session |
| `PUT` | `/api/services/bookings/:id/cancel` | Yes *(Owner)* | Cancel pet grooming reservation |
| `POST` | `/api/support/tickets` | Optional | Submit support ticket with unique ID |
| `GET` | `/api/health` | No | Server health and uptime check |

---

## 🔒 Security & Authorization

1. **Password Hashing:** Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with 10 salt rounds.
2. **Stateless JWT Authorization:** Protected API routes verify signed JWT tokens via `server/middleware/authMiddleware.js`.
3. **Backend Ownership Verification:**
   - `createPet` automatically attaches `req.user.id` and verifies the seller role.
   - `updatePet` and `deletePet` check `pet.seller_id === req.user.id`, rejecting unauthorized calls with `403 Forbidden`.
   - `getOrders` prevents unauthorized buyers from querying other accounts' purchase histories.
   - `cancelOrder` verifies that the requester is the buyer who placed the order or the seller.
4. **Mass-Assignment Defense:** Pet listing update endpoints whitelist permitted attributes (`title`, `category`, `price`, `age`, `breed`, `gender`, `health_status`, `description`, `image_url`, `stock`, `status`), ignoring injected fields.
5. **Rate Limiting & Security Headers:** `express-rate-limit` mitigates brute-force attacks on `/api/auth/login` (15 requests per 15 minutes window), and `helmet` configures essential HTTP security headers.
6. **Data Sanitization:** Object normalization helpers strip sensitive attributes (`password`, `__v`) before API responses leave the server.

---

## 🧪 Testing & Quality Verification

- **Production Build:** `npm run build` in `client/` succeeds in under 4 seconds with 0 warnings/errors.
- **Responsive Multi-Viewport Testing:** Verified across viewports (1440px desktop, 1100px laptop, 768px tablet, 375px mobile):
  - No horizontal overflow (`hasHorizontalOverflow: false`).
  - Full username and dedicated Logout button visible and clickable on all layouts.
  - Interactive profile dropdown menu renders on desktop and mobile drawer.
- **Functional Logout Validation:** Verified token and user session removal from `localStorage` upon clicking Logout, cleanly transitioning the interface to the logged-out state.
- **Lifecycle Restocking Test:** Confirmed that cancelling an order updates the tracking status to `Cancelled`, payment status to `Refunded`, and increments pet listing stock back to active.

---

## ⚠️ Known Limitations & Roadmap

### Current Limitations
- **Simulated Payment Gateway:** Checkout uses realistic simulation (UPI QR, Card, NetBanking) rather than direct production webhooks (Stripe / Razorpay).
- **Simulated Carrier Logistics:** Carrier updates follow realistic logistics steps rather than querying live third-party GPS APIs.
- **Client-Side Wishlist Storage:** Saved wishlist items are persisted in client `localStorage` rather than synced across multiple devices via database record.

### Future Roadmap
- [ ] Connect production Stripe and Razorpay webhook integrations for card processing and automated refund dispatches.
- [ ] Implement Socket.io for real-time chat between Buyers, Sellers, and Vets.
- [ ] Add Web Push and SMS notifications for shipping status changes.
- [ ] Expand automated testing coverage with Jest and React Testing Library.

---

## 👨‍💻 Author & Acknowledgments

- **Developer:** Abhishek Jha
- **Project:** PetPaws Full-Stack Pet Care Platform

