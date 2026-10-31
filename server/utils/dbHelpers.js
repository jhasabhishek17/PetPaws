const mongoose = require('mongoose');

/**
 * Escapes special regular-expression characters in user-supplied query strings
 * to prevent regex injection and catastrophic backtracking (ReDoS).
 */
const escapeRegex = (value) => {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Finds a document by either its custom string id (e.g. 'pet-123', 'ORD-123')
 * or Mongoose ObjectId. Returns null if id is empty.
 */
const findDocByAnyId = async (Model, id) => {
  if (!id) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  return Model.findOne({
    $or: [
      { custom_id: id },
      { id: id },
      { _id: isObjectId ? id : null }
    ]
  });
};

module.exports = { findDocByAnyId, escapeRegex };
