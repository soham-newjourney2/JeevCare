const express = require('express');
const router = express.Router();
const {
    getServiceProviders,
    bookService,
    manageBooking,
    getMyBookings,
    getProviderSlots,
    getMySlots,
    addSlot,
    removeSlot,
    getCitizenBookings
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getServiceProviders);
router.get('/:id/slots', getProviderSlots);

router.post('/book', protect, authorize('citizen'), bookService);
router.get('/my-patient-bookings', protect, authorize('citizen'), getCitizenBookings);

router.get('/slots', protect, authorize('service_provider'), getMySlots);
router.post('/slots', protect, authorize('service_provider'), addSlot);
router.delete('/slots/:slotId', protect, authorize('service_provider'), removeSlot);

router.get('/bookings', protect, authorize('service_provider'), getMyBookings);
router.patch('/bookings/:id', protect, authorize('service_provider'), manageBooking);

module.exports = router;
