/**
 * Custom Express Error Utility Class
 * 
 * Extends the native JavaScript Error class to allow attaching an HTTP status code
 * to error objects. Used for uniform, structured error handling throughout controllers.
 * 
 * @example
 * throw new ExpressError('Pet listing not found', 404);
 */
class ExpressError extends Error {
  /**
   * @param {string} message - Descriptive error message
   * @param {number} statusCode - HTTP Status Code (e.g. 400, 404, 500)
   */
  constructor(message, statusCode) {
    super();
    this.message = message;
    this.statusCode = statusCode;
  }
}

module.exports = ExpressError;
