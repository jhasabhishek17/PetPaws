/**
 * Request Logger Middleware
 * 
 * Logs incoming HTTP requests with timestamps, HTTP method, and requested URL.
 * Facilitates debugging and operational monitoring.
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};

module.exports = requestLogger;
