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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, normalizedOrigin);
    }
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new ExpressError(`Origin ${origin} not allowed by CORS`, 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
app.use(requestLogger);

// Health check (used by uptime monitors and deploy platforms)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Initialize Database Connection (MongoDB / MongoDB Atlas)
connectDB();

// ==========================================
// 2. MOUNT MODULAR ROUTERS
// ==========================================

// EJS Server-Rendered Web Page Routes
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

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 PetPaws Server running on port http://localhost:${PORT}`);
  console.log(`📁 EJS Web Views: http://localhost:${PORT}`);
  console.log(`🔌 REST API Base: http://localhost:${PORT}/api/pets`);
  console.log(`==================================================`);
});

// Graceful shutdown so in-flight requests finish and the DB connection closes cleanly
const shutdown = () => server.close(() => require('mongoose').connection.close().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
