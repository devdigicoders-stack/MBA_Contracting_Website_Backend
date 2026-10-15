/**
 * Centralized API Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[API Error] ${req.method} ${req.url}:`, err.message);

  const isProd = process.env.NODE_ENV === 'production';
  const responseMessage = (isProd && statusCode === 500)
    ? 'An unexpected error occurred while processing your request. Please try again later.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    status: 'error',
    message: responseMessage,
    ...(!isProd && { stack: err.stack }),
  });
}
