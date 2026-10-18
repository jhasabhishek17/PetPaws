/**
 * Higher-Order Async Handler Middleware (wrapAsync)
 * 
 * Wraps asynchronous controller route handlers to eliminate repetitive try-catch blocks.
 * Automatically catches any rejected promises and forwards errors to the global error middleware.
 * 
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware handler
 * 
 * @example
 * router.get('/pets', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = asyncHandler;
