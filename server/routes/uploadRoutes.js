const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { handleSingleMediaUpload } = require('../middleware/uploadMiddleware');

router.post('/', protect, handleSingleMediaUpload, asyncHandler(uploadController.uploadMedia));
router.delete('/', protect, asyncHandler(uploadController.deleteMedia));

module.exports = router;
