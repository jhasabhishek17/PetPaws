/**
 * Global Error Handling Middleware
 * 
 * Intercepts all operational and system errors passed via next(err).
 * Differentiates between REST API requests (returning JSON responses)
 * and Web Browser HTML requests (rendering friendly error views or structured responses).
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`❌ [Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err);

  // If request expects JSON (API calls)
  if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // Fallback for traditional HTML rendering
  res.status(statusCode).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>PetPaws - Error ${statusCode}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light text-center py-5">
      <div class="container py-5">
        <div class="card shadow border-0 mx-auto" style="max-width: 500px; border-radius: 16px;">
          <div class="card-body p-5">
            <h1 class="display-4 text-danger mb-3">🐾 ${statusCode}</h1>
            <h4 class="fw-bold mb-3">${message}</h4>
            <p class="text-muted mb-4">Something went wrong while processing your request.</p>
            <a href="/" class="btn btn-primary rounded-pill px-4">Back to Home</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
};

module.exports = errorHandler;
