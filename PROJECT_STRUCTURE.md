# 🐾 PetPaws - Modular Architecture & Project Documentation

## 🌟 Overview
**PetPaws** is an end-to-end, modularized, full-stack pet marketplace and veterinary care application. It provides both server-side rendered **EJS templated views** (Wanderlust MVC pattern) and **RESTful JSON API endpoints** for Single Page Applications (SPA React client).

---

## 📁 Modular Directory Structure

```
PetPaws/
├── README.md                           # Main project guide
├── PROJECT_STRUCTURE.md                # Comprehensive architecture and developer reference
├── package.json                        # Root npm scripts for dev server & client
│
├── server/                             # Express.js + Node.js Modular Backend (MVC Pattern)
│   ├── server.js                       # Entry point: Express setup, routes & error middleware wiring
│   ├── db.js                           # Fallback JSON storage engine (petpaws_data.json)
│   ├── petpaws_data.json               # Seed & fallback database data
│   ├── seed.js                         # Database seeder script
│   ├── package.json                    # Server dependencies (express, mongoose, ejs, cors, dotenv)
│   │
│   ├── config/                         # Configuration Files
│   │   └── db.js                       # MongoDB & MongoDB Atlas connection handler
│   │
│   ├── controllers/                    # Business Logic Controllers (MVC Pattern)
│   │   ├── authController.js           # Login, registration, seller payout management
│   │   ├── petController.js            # Pet marketplace listing CRUD & category filtering
│   │   ├── orderController.js          # Checkout simulation, stock decrement & package tracking
│   │   ├── vetController.js            # Veterinarian directory & consultation booking
│   │   ├── serviceController.js        # Grooming, spa & behavioral training service bookings
│   │   └── supportController.js        # Customer support ticketing system
│   │
│   ├── middleware/                     # Express Custom Middlewares
│   │   ├── asyncHandler.js             # wrapAsync higher-order function for async error catching
│   │   ├── errorHandler.js             # Global operational & system error handler
│   │   └── requestLogger.js            # Timestamped HTTP request logger
│   │
│   ├── models/                         # Mongoose Database Models (MongoDB / MongoDB Atlas)
│   │   ├── User.js                     # User accounts (Buyer, Seller/Breeder, Veterinarian)
│   │   ├── Pet.js                      # Marketplace pet listings & health verification status
│   │   ├── Order.js                    # Purchases, tracking codes & estimated delivery
│   │   ├── VetProfile.js               # Veterinarian qualifications & fee schedules
│   │   ├── VetAppointment.js           # Scheduled veterinary consultations
│   │   ├── GroomingService.js          # Care & grooming service packages
│   │   ├── GroomingBooking.js          # Grooming reservations
│   │   └── SupportTicket.js            # Customer help tickets
│   │
│   ├── routes/                         # Express Routers
│   │   ├── authRoutes.js               # /api/auth endpoints
│   │   ├── petRoutes.js                # /api/pets endpoints
│   │   ├── orderRoutes.js              # /api/orders endpoints
│   │   ├── vetRoutes.js                # /api/vets endpoints
│   │   ├── serviceRoutes.js            # /api/services endpoints
│   │   ├── supportRoutes.js            # /api/support endpoints
│   │   └── viewRoutes.js               # EJS Web View routes (/, /pets/new, /vets, etc.)
│   │
│   ├── utils/                          # Helper Utility Functions & Classes
│   │   ├── ExpressError.js             # Custom Operational Error class with status codes
│   │   └── normalize.js                # Data normalizer for Mongo documents & fallback JSON
│   │
│   ├── views/                          # Server-Side EJS View Templates (Wanderlust Style)
│   │   ├── layouts/
│   │   │   └── boilerplate.ejs         # Master HTML boilerplate layout
│   │   ├── partials/
│   │   │   ├── navbar.ejs              # Navigation bar partial
│   │   │   └── footer.ejs              # Footer partial
│   │   ├── pets/
│   │   │   ├── index.ejs               # Animated pet marketplace grid & filters
│   │   │   ├── show.ejs                # Detailed pet view page
│   │   │   └── new.ejs                 # Add pet listing form page
│   │   ├── orders/
│   │   │   └── index.ejs               # Live package transport tracking timeline
│   │   ├── vets/
│   │   │   └── index.ejs               # Veterinarian directory & consultation page
│   │   ├── grooming/
│   │   │   └── index.ejs               # Grooming & spa packages page
│   │   ├── support/
│   │   │   └── index.ejs               # 24/7 Support ticket form
│   │   └── auth/
│   │       ├── login.ejs               # Login view
│   │       └── register.ejs            # Registration view
│   │
│   └── public/                         # Public Static Assets
│       ├── css/
│       │   └── style.css               # Eye-catchy CSS3 keyframe animations, glassmorphism & cards
│       └── js/
│           └── main.js                 # Dynamic search filters & client-side scripts
│
└── client/                             # Vite + React + Tailwind CSS SPA Frontend
    ├── src/
    │   ├── App.jsx                     # Main React application component
    │   ├── index.css                   # Tailwind CSS + keyframe animations stylesheet
    │   └── components/                 # React UI Components
    │       ├── Navbar.jsx
    │       ├── Marketplace.jsx
    │       ├── PetDetailModal.jsx
    │       ├── CheckoutModal.jsx
    │       ├── OrdersTracking.jsx
    │       ├── SellerDashboard.jsx
    │       ├── VetSection.jsx
    │       ├── GroomingCareSection.jsx
    │       ├── CustomerSupport.jsx
    │       └── AuthModal.jsx
```

---

## 🛠️ Tech Stack & Key Technologies

| Category | Technology |
|---|---|
| **Backend Framework** | Node.js, Express.js |
| **Database & ODM** | MongoDB, Mongoose, MongoDB Atlas (with JSON fallback) |
| **View Engine (MVC)** | EJS (Embedded JavaScript), Bootstrap 5, FontAwesome 6, Animate.css |
| **Frontend SPA Client** | React 18, Vite, Tailwind CSS, Lucide React Icons |
| **Architecture** | Model-View-Controller (MVC) with Router separation |

---

## 💡 How to Add New Features in the Future

### Adding a New Model & Route (Step-by-Step Guide):

1. **Create Mongoose Model** in `server/models/NewFeature.js`:
   ```javascript
   const mongoose = require('mongoose');
   const schema = new mongoose.Schema({ ... }, { timestamps: true });
   module.exports = mongoose.model('NewFeature', schema);
   ```

2. **Create Controller** in `server/controllers/newFeatureController.js`:
   ```javascript
   const NewFeature = require('../models/NewFeature');
   const ExpressError = require('../utils/ExpressError');
   
   const getItems = async (req, res) => {
     // Business logic
   };
   module.exports = { getItems };
   ```

3. **Create Router** in `server/routes/newFeatureRoutes.js`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const controller = require('../controllers/newFeatureController');
   const asyncHandler = require('../middleware/asyncHandler');

   router.get('/', asyncHandler(controller.getItems));
   module.exports = router;
   ```

4. **Register Router in `server/server.js`**:
   ```javascript
   const newFeatureRoutes = require('./routes/newFeatureRoutes');
   app.use('/api/new-feature', newFeatureRoutes);
   ```

---

## 🚀 Running the Application

### 1. Run the Backend Express Server (EJS + REST API):
```bash
cd server
npm start
```
- Access EJS Web Views: `http://localhost:5001`
- Access REST API: `http://localhost:5001/api/pets`

### 2. Run the React SPA Client:
```bash
cd client
npm run dev
```
- Access React Client: `http://localhost:5173`
