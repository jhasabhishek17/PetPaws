# 🐾 PetPaws
Discover. Adopt. Care.

A full-stack pet marketplace and care platform to discover verified pets, post listings, schedule vet consultations, track live shipments, and access pet care services.

---

## 🌐 Live Demo
🔗 [Visit PetPaws Platform](http://localhost:5173/)

---

## ✨ Features

- 🔐 **Authentication & Multi-Role Demo** — Instant 1-click logins and account registration for Buyers, Sellers, and Veterinarians.
- 🐶 **Pet Marketplace** — Browse verified Cats, Dogs, Fishes, Rabbits, and Birds with category and price filters.
- 🩺 **Veterinary Consultation Hub** — Browse certified vet profiles and schedule direct 1-on-1 consultation meetings.
- 🛒 **Interactive Checkout & Payments** — Complete orders via UPI (QR / UPI ID), NetBanking, or Credit/Debit cards.
- 📦 **Stock Auto-Management** — Automatic stock updates on purchase and automatic unlisting when stock hits 0.
- 🚚 **Live Order Tracking** — 5-stage live shipment tracking timeline (*Order Placed → Health Check → In Transit → Out for Delivery → Delivered*).
- 🧾 **Itemized Tax Receipts** — Formatted billing invoices with 8% tax calculation, seller credentials, and 1-click printing (`window.print()`).
- 🏪 **Seller Management Portal** — Post pet listings, manage inventory stock, and configure payout bank details (UPI ID / NetBanking).
- ✂️ **Grooming & Training Hub** — Reserve pet spa grooming sessions, puppy obedience courses, and feline de-shedding.
- 💬 **Customer Support & Tickets** — Interactive FAQ accordions and support ticket tracker with priority responses.

---

## 📸 Screenshots

- 🐶 **Marketplace & Filters** (`public/screenshots/marketplace.png`)
- 🩺 **Veterinarian Scheduling** (`public/screenshots/vet_booking.png`)
- 🚚 **Order Tracking & Invoice** (`public/screenshots/tracking_invoice.png`)
- 🏪 **Seller Portal & Inventory** (`public/screenshots/seller_dashboard.png`)

---

## 🛠️ Tech Stack

- **Frontend**: React 18 · Vite · Tailwind CSS · Lucide React Icons
- **Backend**: Node.js · Express.js
- **Database**: Persistent File-Backed JSON Store · SQLite Architecture
- **Authentication**: Role-based Session State & Multi-Role Handler
- **Services & Tools**: REST API · PostCSS · Autoprefixer · Cors

---

## 📂 Project Structure

```text
PetPaws/
├── server/
│   ├── server.js          # REST API Endpoints (Auth, Pets, Orders, Vets, Support)
│   ├── db.js              # Database Handler & Initial Seed Data
│   └── package.json       # Backend Dependencies
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top Navigation & Role Switcher
│   │   │   ├── Marketplace.jsx       # Pet Listings Grid & Filters
│   │   │   ├── PetDetailModal.jsx    # Health Specs & Seller Info Modal
│   │   │   ├── CheckoutModal.jsx     # Payment Gateway & Order Confirmation
│   │   │   ├── OrdersTracking.jsx    # Live Tracking & Tax Invoice Receipt
│   │   │   ├── SellerDashboard.jsx   # Product Uploader & Stock Manager
│   │   │   ├── VetSection.jsx        # Vet Directory & Meeting Scheduling
│   │   │   ├── GroomingCareSection.jsx # Grooming Spa & Training Hub
│   │   │   ├── CustomerSupport.jsx   # FAQ & Ticket Tracker
│   │   │   └── AuthModal.jsx         # Multi-Role Auth & Demo Switcher
│   │   ├── App.jsx                   # Main Layout & Global State
│   │   ├── main.jsx                  # React Entry Point
│   │   └── index.css                 # Tailwind CSS Directives
│   ├── vite.config.js                # Vite Config & Express API Proxy
│   └── package.json                  # Frontend Dependencies
├── package.json                      # Root Workspace Manager
└── README.md                         # Project Documentation
```

---

## 🚀 Run Locally

### 1. Clone the repository
```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd PetPaws
```

### 2. Install dependencies

**For Backend:**
```bash
cd server
npm install
```

**For Frontend:**
```bash
cd ../client
npm install
```

### 3. Start the application

**Terminal 1 (Backend Server):**
```bash
cd server
npm start
```
*Server runs on [http://localhost:5001](http://localhost:5001).*

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎯 Project Highlights

```text
Authentication  ──>  Pet Marketplace  ──>  Checkout Payment
      │                    │                    │
      ▼                    ▼                    ▼
 Multi-Role           Stock Auto-         Live Order Tracking 
(Buyer/Seller/Vet)    Decrement           & Tax Receipt Invoice
      │                    │                    │
      ▼                    ▼                    ▼
 Vet Scheduling     Seller Payouts       Customer Support Tickets
```

Built to practice full-stack development, RESTful API design, multi-role access control, state management, automated stock lifecycle, and clean UI components.

---

## 🔮 Future Plans

- 💳 Stripe & Razorpay real payment gateway integration
- 💬 Real-time chat between Buyers, Sellers, and Vets
- 📅 Interactive calendar integration for Vet consultations
- 🔔 Live push notifications for shipping updates
- 📊 Seller sales analytics graphs & revenue charts

---

## 👨‍💻 Author

**Abhishek Jha**  
Full-Stack Developer

⭐ *If you like PetPaws, consider giving the repository a star!*
