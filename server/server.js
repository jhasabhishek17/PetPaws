/**
 * PetPaws Main Server Entry Point
 * 
 * Architecture Pattern: MVC (Model-View-Controller)
 * Stack: Node.js, Express.js, MongoDB (Mongoose), EJS Views, Bootstrap 5, Custom CSS Animations.
 * 
 * Features:
 * - Dual Rendering: EJS Templated Web Views + RESTful API endpoints for SPAs
 * - Modularized Routers: /api/auth, /api/pets, /api/orders, /api/vets, /api/services, /api/support
 * - Centralized Error Handling & Request Logging Middleware
 * - Database Support: MongoDB Local / MongoDB Atlas with fallback JSON persistence
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');

// Custom Utilities & Middlewares
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const ExpressError = require('./utils/ExpressError');

// Express Routers
const viewRoutes = require('./routes/viewRoutes');
const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vetRoutes = require('./routes/vetRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// 1. EXPRESS APP & VIEW ENGINE SETUP
// ==========================================

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static assets from public/ folder (CSS, client JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares: Enable CORS & Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
app.use(requestLogger);

// Initialize Database Connection (MongoDB / MongoDB Atlas)
connectDB();

// ==========================================
// 2. MOUNT MODULAR ROUTERS
// ==========================================

// EJS Web Page View Routes (Wanderlust-Style Frontend)
app.use('/', viewRoutes);

// REST API Endpoints (For React / Mobile / SPA Clients)
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/support', supportRoutes);

// ==========================================
// 3. 404 & GLOBAL ERROR HANDLING
// ==========================================

// Catch-all route for unhandled URL requests
app.all('*', (req, res, next) => {
  next(new ExpressError('Page or API endpoint not found', 404));
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// ==========================================
// 4. SERVER LISTENER
// ==========================================

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 PetPaws Server running on port http://localhost:${PORT}`);
  console.log(`📁 EJS Web Views: http://localhost:${PORT}`);
  console.log(`🔌 REST API Base: http://localhost:${PORT}/api/pets`);
  console.log(`==================================================`);
});
