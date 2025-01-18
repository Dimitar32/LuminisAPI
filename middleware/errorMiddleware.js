// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.stack); // Log the error stack trace for debugging
  
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  };
  