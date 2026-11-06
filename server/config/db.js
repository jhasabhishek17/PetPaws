const mongoose = require('mongoose');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/petpaws_test';

/**
 * Determine if current process execution is in test mode.
 */
const isTestMode = (env = process.env, argv = process.argv) => {
  return (
    env.NODE_ENV === 'test' ||
    env.EMAIL_TRANSPORT === 'test' ||
    (Array.isArray(argv) && argv.some(a => typeof a === 'string' && a.includes('test')))
  );
};

/**
 * Resolve the MongoDB connection URI based on execution environment.
 * In test mode, always returns 'mongodb://127.0.0.1:27017/petpaws_test'.
 * MONGODB_URI and TEST_MONGODB_URI are never trusted in test mode.
 */
const resolveMongoURI = (env = process.env, argv = process.argv) => {
  if (isTestMode(env, argv)) {
    return TEST_DB_URI;
  }
  return env.MONGODB_URI || 'mongodb://127.0.0.1:27017/petpaws';
};

/**
 * Connect to MongoDB database with timeout fallback
 */
const connectDB = async () => {
  const inTest = isTestMode();
  const mongoURI = resolveMongoURI();

  // Strict enforcement: ensure test mode never connects to Atlas or remote hosts
  if (inTest && mongoURI !== TEST_DB_URI) {
    throw new Error(`Security Violation: Test mode connection attempted outside ${TEST_DB_URI}`);
  }

  const timeoutMS = inTest ? 2000 : 8000;

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: timeoutMS
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Warning: ${error.message}.`);
    return false;
  }
};

connectDB.resolveMongoURI = resolveMongoURI;
connectDB.isTestMode = isTestMode;
connectDB.TEST_DB_URI = TEST_DB_URI;

module.exports = connectDB;
