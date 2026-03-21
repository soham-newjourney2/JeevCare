const express = require('express');
const router = express.Router();
const {
    getServiceProviders,
    bookService,
    submitComplaint,
    toggleAvailability,
    manageBooking,
    getMyBookings,
    getProviderSlots,
    getMySlots,
    addSlot,
    removeSlot,
    getCitizenBookings
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', getServiceProviders);
router.get('/:id/slots', getProviderSlots);

router.post('/book', protect, authorize('citizen'), bookService);
router.post('/complaints', protect, authorize('citizen'), submitComplaint);
router.get('/my-patient-bookings', protect, authorize('citizen'), getCitizenBookings); // changed path due to conflicts with above

// Provider Specific
router.patch('/availability', protect, authorize('service_provider'), toggleAvailability);
router.get('/slots', protect, authorize('service_provider'), getMySlots);
router.post('/slots', protect, authorize('service_provider'), addSlot);
router.delete('/slots/:slotId', protect, authorize('service_provider'), removeSlot);

router.get('/bookings', protect, authorize('service_provider'), getMyBookings);
router.patch('/bookings/:id', protect, authorize('service_provider'), manageBooking);

module.exports = router;
