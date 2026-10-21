# 🐾 PetPaws — Full-Stack Pet Care & Adoption Marketplace

<p align="center">
  <strong>Discover. Adopt. Care.</strong>
  <br />
  A full-stack pet marketplace connecting pet parents, sellers, veterinarians, and pet care providers through a unified web platform.
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
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Core Features](#-core-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Running Locally](#-running-locally)
- [API Overview](#-api-overview)
- [Database Design](#-database-design)
- [Security](#-security)
- [Current Limitations](#-current-limitations)
- [Future Enhancements](#-future-enhancements)
- [Author](#-author)
- [License](#-license)

---

## 🌟 Overview

**PetPaws** is a full-stack pet care and adoption marketplace built to bring pet discovery, seller listings, veterinary consultations, grooming services, and order management into one application.

The platform provides role-specific experiences for buyers, sellers, and veterinarians. It combines a React-based single-page application with a Node.js and Express backend, persistent data storage through MongoDB Atlas, and cloud-based image storage through Cloudinary.

The project focuses on modular architecture, secure API access, responsive user interfaces, and end-to-end application workflows.

### Project Highlights

- Role-based experiences for buyers, sellers, and veterinarians.
- Pet discovery with search, category filters, and price filtering.
- JWT-based authentication and protected API endpoints.
- Pet listing management with seller ownership checks.
- Order management, simulated checkout, cancellation, and inventory updates.
- Veterinary consultation and grooming service workflows.
- Cloud deployment with separately hosted frontend and backend.
- MongoDB Atlas for database persistence and Cloudinary for image storage.

## 🌐 Live Demo

| Component | Link |
|---|---|
| **Live Website** | [https://petpaws-frontend.onrender.com](https://petpaws-frontend.onrender.com) |
| GitHub Repository | [jhasabhishek17/PetPaws](https://github.com/jhasabhishek17/PetPaws) |

The frontend communicates with the backend through REST APIs. MongoDB Atlas stores application data, while Cloudinary handles uploaded media.

> Note: Availability and response times may depend on the hosting plan and service status.

---

## ✨ Core Features

### 🐶 Buyer Experience

- **Pet Marketplace:** Browse dogs, cats, birds, fish, and rabbits.
- **Search and Filtering:** Find listings using keywords, categories, and price filters.
- **Pet Matchmaker Quiz:** Receive pet suggestions based on lifestyle, living environment, available time, and experience.
- **Pet Details:** Explore listing information, health details, seller information, and adoption fees.
- **Wishlist:** Save favourite listings and access them through the wishlist interface.
- **Checkout:** Complete the application's simulated checkout flow with UPI, card, and net-banking options.
- **Order Tracking:** Follow orders through a five-stage tracking timeline.
- **Order Cancellation:** Cancel eligible orders through the application workflow.
- **Veterinary Services:** Explore veterinarians and request consultations.
- **Grooming and Care:** Browse grooming packages and submit service bookings.

### 🏪 Seller Experience

- **Seller Dashboard:** Access seller-specific listing and order management features.
- **Listing Management:** Create, update, and remove pet listings.
- **Image Uploads:** Upload listing images through the configured media service.
- **Health Information:** Provide relevant pet health and vaccination details.
- **Inventory Management:** Track available stock and update listing availability.
- **Payout Settings:** Configure seller payout information through the relevant application workflow.
- **Ownership Validation:** Restrict listing modifications to the authenticated listing owner.

### 🩺 Veterinarian Experience

- **Veterinarian Directory:** Browse veterinary profiles, specialties, and consultation fees.
- **Consultation Requests:** Submit veterinary appointment requests.
- **Vet Dashboard:** Access veterinarian-specific appointment management features.
- **Schedule Management:** Review and manage consultation requests and eligible cancellations.

### 🛠️ Platform Capabilities

- Responsive React interface for desktop and mobile screens.
- Reusable components and modular backend routes.
- JWT authentication with password hashing.
- Centralized request validation and error handling.
- Rate limiting on authentication endpoints.
- Cloud-hosted frontend and backend services.
- Database-backed application records and cloud-hosted images.

---

## 🧰 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | Component-based user interface |
| Build Tool | Vite | Development server and production builds |
| Styling | Tailwind CSS 4 | Responsive styling and layout |
| Icons | Lucide React | Interface icons |
| Backend | Node.js | JavaScript runtime |
| API Framework | Express.js 4 | REST API and middleware |
| Database | MongoDB Atlas | Persistent application data |
| ODM | Mongoose | Database schemas, models, and queries |
| Authentication | JSON Web Tokens | Signed authentication tokens |
| Password Security | bcryptjs | Password hashing |
| Security Headers | Helmet | HTTP security headers |
| Rate Limiting | express-rate-limit | Request throttling |
| Media Storage | Cloudinary | Cloud-hosted images |
| Server Templates | EJS | Server-rendered views |
| Frontend Hosting | Render Static Site | Serves the production frontend |
| Backend Hosting | Render Web Service | Runs the Express application |

---

## 🏗️ System Architecture

PetPaws follows a layered architecture that separates the user interface, backend business logic, and data storage.

```text
                         USERS
                           |
                           v
              +--------------------------+
              |   React + Vite Frontend  |
              |   Render Static Site     |
              +--------------------------+
                           |
                     HTTPS / REST API
                           |
                           v
              +--------------------------+
              |   Node.js + Express      |
              |   Render Web Service     |
              |                          |
              | - Authentication        |
              | - Authorization          |
              | - Business Logic         |
              | - API Routes             |
              | - Validation & Errors    |
              +--------------------------+
                    |             |
                    v             v
          +----------------+  +----------------+
          | MongoDB Atlas  |  | Cloudinary     |
          | Application    |  | Uploaded Media |
          | Data           |  |                |
          +----------------+  +----------------+
```

### Request Flow

1. A user interacts with the React frontend.
2. The frontend sends HTTP requests to the Express backend.
3. Express middleware handles authentication, authorization, and request processing.
4. Controllers execute the relevant application logic.
5. Mongoose interacts with MongoDB Atlas to read or update records.
6. Cloudinary handles image storage and delivery.
7. The backend returns a response to the frontend, which updates the interface.

The frontend and backend are deployed independently, allowing each service to be configured and deployed separately.

---

## 📂 Project Structure

```text
PetPaws/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── PetDetailModal.jsx
│   │   │   ├── CheckoutModal.jsx
│   │   │   ├── OrdersTracking.jsx
│   │   │   ├── BuyerDashboard.jsx
│   │   │   ├── SellerDashboard.jsx
│   │   │   ├── VetSection.jsx
│   │   │   ├── VetDashboard.jsx
│   │   │   ├── GroomingCareSection.jsx
│   │   │   ├── CustomerSupport.jsx
│   │   │   ├── PetMatchmakerQuiz.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── PawLoader.jsx
│   │   ├── utils/
│   │   │   └── auth.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   ├── config/
│   │   ├── db.js
│   │   └── jwt.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── petController.js
│   │   ├── orderController.js
│   │   ├── vetController.js
│   │   ├── serviceController.js
│   │   └── supportController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── requestLogger.js
│   │   ├── errorHandler.js
│   │   └── asyncHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Pet.js
│   │   ├── Order.js
│   │   ├── VetProfile.js
│   │   ├── VetAppointment.js
│   │   ├── GroomingService.js
│   │   ├── GroomingBooking.js
│   │   └── SupportTicket.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── petRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── vetRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── supportRoutes.js
│   │   └── viewRoutes.js
│   ├── views/
│   ├── data/
│   │   └── db.json
│   ├── server.js
│   └── package.json
│
├── docs/
├── package.json
└── README.md
```

*The structure above summarizes the main application modules. Individual files and optional configuration files may vary by branch.*

---

## 🚀 Getting Started

Follow these instructions to run PetPaws locally on macOS or another supported development environment.

### Prerequisites

Install the following tools and create the necessary external service accounts:

- [Node.js](https://nodejs.org/) — version 18 or later.
- npm — included with Node.js.
- [Git](https://git-scm.com/) — for cloning the repository.
- [MongoDB Atlas](https://www.mongodb.com/atlas) or a local MongoDB instance.
- [Cloudinary](https://cloudinary.com/) — if image upload functionality is required.

### 1. Clone the Repository

```bash
git clone https://github.com/jhasabhishek17/PetPaws.git
cd PetPaws
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

Open a second terminal from the project root:

```bash
cd client
npm install
```

### 4. Configure Environment Variables

Create your local environment files using the project's example files where available.

**Backend:** `server/.env`

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_strong_random_secret
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5001
```

**Frontend:** `client/.env`

```env
VITE_API_URL=http://localhost:5001
```

Replace placeholder values with your own configuration. The exact variable names should match the code in your current branch.

> **Security:** Never commit `.env` files, database credentials, API secrets, or production JWT secrets to GitHub. Keep private credentials in local environment files and the hosting provider's environment settings.

---

## ▶️ Running Locally

Run the backend and frontend in separate terminals.

### Terminal 1 — Backend

```bash
cd server
npm start
```

The backend is configured to use port `5001` in the local setup.

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

Vite normally serves the development frontend at:

[http://localhost:5173](http://localhost:5173)

The Vite development proxy can forward API requests to the backend when configured in `client/vite.config.js`.

### Production Build

From the client directory:

```bash
npm run build
```

Vite generates the production build in `client/dist/`.

---

## 🔌 API Overview

The backend exposes REST API endpoints for authentication, pet listings, orders, veterinary services, grooming, and customer support.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Authenticate a user |
| PUT | `/api/auth/update-payout` | Update seller payout information |
| GET | `/api/pets` | Browse pet listings |
| POST | `/api/pets` | Create a listing |
| PUT | `/api/pets/:id` | Update an existing listing |
| DELETE | `/api/pets/:id` | Delete a listing |
| POST | `/api/orders/checkout` | Create an order through the checkout workflow |
| GET | `/api/orders` | Retrieve relevant orders |
| GET | `/api/orders/track/:code` | Retrieve order tracking information |
| PUT | `/api/orders/:id/cancel` | Request order cancellation |
| GET | `/api/vets` | Browse veterinarian profiles |
| POST | `/api/vets/appointments` | Request a consultation |
| PUT | `/api/vets/appointments/:id/cancel` | Cancel an eligible appointment |
| GET | `/api/services` | Browse grooming services |
| POST | `/api/services/bookings` | Create a grooming booking |
| PUT | `/api/services/bookings/:id/cancel` | Cancel an eligible booking |
| POST | `/api/support/tickets` | Submit a support ticket |
| GET | `/api/health` | Check backend health |

**Authentication note:** Protected endpoints require valid authentication and, where applicable, the correct user role or resource ownership. Refer to the route and middleware implementations for the exact requirements.

---

## 🗄️ Database Design

PetPaws uses MongoDB with Mongoose models to organize its application data.

| Model | Responsibility |
|---|---|
| `User` | User profiles, credentials, and roles |
| `Pet` | Pet listings, seller references, pricing, stock, and health details |
| `Order` | Order records, tracking information, and payment workflow status |
| `VetProfile` | Veterinarian profiles, specialties, and consultation fees |
| `VetAppointment` | Veterinary consultation requests |
| `GroomingService` | Available grooming and care services |
| `GroomingBooking` | Grooming booking records |
| `SupportTicket` | Customer support requests |

### Data and Media Storage

- **MongoDB Atlas:** Stores application records and structured data.
- **Cloudinary:** Stores uploaded images and provides media delivery.
- **Local JSON fallback:** The repository includes `server/data/db.json` for the application's configured local fallback mechanism, where supported.

The JSON fallback should not be treated as a replacement for durable production database storage without reviewing its implementation and deployment persistence characteristics.

---

## 🔐 Security

Security-sensitive operations are handled primarily by the backend rather than relying on frontend restrictions alone.

- **Password Hashing:** bcryptjs is used to hash passwords.
- **JWT Authentication:** Signed tokens are used to authenticate protected requests.
- **Role-Based Authorization:** Buyer, seller, and veterinarian operations are restricted according to application roles.
- **Ownership Checks:** Listing modification endpoints validate the authenticated user's relationship to the resource.
- **Input Validation:** Controllers restrict accepted listing fields to reduce unauthorized field updates.
- **Rate Limiting:** Authentication endpoints use request throttling to help mitigate repeated login attempts.
- **Security Headers:** Helmet configures HTTP security headers.
- **Environment Variables:** Secrets and connection strings are configured outside source code.
- **Error Handling:** Shared middleware helps keep API error responses consistent.

These measures are part of the application's security design; they do not by themselves guarantee that every production security risk has been eliminated.

---

## ⚠️ Current Limitations

PetPaws is a portfolio project with several workflows implemented for demonstration purposes.

- **Simulated Payments:** Checkout options demonstrate the payment flow; they do not replace a production payment gateway with verified transactions and payment webhooks.
- **Simulated Shipment Progress:** Tracking stages represent the application's order workflow rather than live carrier GPS data.
- **Wishlist Persistence:** Wishlist data is stored in browser `localStorage`, so it is not automatically synchronized across devices.
- **Production Readiness:** Real payment processing, automated refund reconciliation, comprehensive automated tests, and operational monitoring require further work.

Users should not enter real payment credentials into the simulated checkout.

---

## 🛣️ Future Enhancements

- [ ] Integrate a payment provider with secure server-side verification and webhooks.
- [ ] Add automated tests for authentication, authorization, and order workflows.
- [ ] Introduce real-time messaging between buyers, sellers, and veterinarians.
- [ ] Implement email, SMS, or push notifications.
- [ ] Synchronize wishlist data with authenticated user accounts.
- [ ] Add production monitoring, structured logging, and error reporting.
- [ ] Improve accessibility and expand cross-browser testing.
- [ ] Integrate verified veterinary credentials and more robust health-document workflows.

---

## 👨‍💻 Author

**Abhishek Jha**

Full-Stack Web Development Project — PetPaws

- **Live Application:** [petpaws-frontend.onrender.com](https://petpaws-frontend.onrender.com)
- **GitHub:** [github.com/jhasabhishek17/PetPaws](https://github.com/jhasabhishek17/PetPaws)

---


