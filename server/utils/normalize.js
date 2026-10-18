/**
 * Data Normalization Utility
 * 
 * Ensures consistent output structure whether data comes from MongoDB Mongoose documents
 * or fallback JSON storage files. Maps '_id' and 'custom_id' to standard 'id'.
 * 
 * @param {Object} item - Mongoose document or plain JavaScript object
 * @returns {Object|null} Normalized plain JavaScript object with clean ID fields
 */
const normalizeItem = (item) => {
  if (!item) return null;

  // Convert Mongoose Document to plain object if toObject() method exists
  const obj = item.toObject ? item.toObject() : { ...item };

  // Standardize ID field for frontend compatibility
  obj.id = obj.custom_id || obj.id || (obj._id ? obj._id.toString() : null);

  // Normalize timestamps — Mongoose uses createdAt; frontend expects created_at
  if (obj.createdAt && !obj.created_at) obj.created_at = obj.createdAt.toISOString();

  // Strip sensitive / internal fields before sending to client
  delete obj.password;
  delete obj.__v;

  return obj;
};

module.exports = { normalizeItem };
