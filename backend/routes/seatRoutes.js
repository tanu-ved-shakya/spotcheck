const express = require("express");

const {
    getSeats,
    getSeatHistory
} = require("../controllers/seatController");

const router = express.Router();

router.get("/", getSeats);

router.get("/:seatId/history", getSeatHistory);

module.exports = router;