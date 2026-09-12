const prisma = require("../config/prisma");

async function getSeats(req, res) {
    try {
        const seats = await prisma.seat.findMany({
            select: {
                seatId: true,
                state: true,
                roi: true,
                camera: {
                    select: {
                        cameraId: true
                    }
                }
            },
            orderBy: {
                seatId: "asc"
            }
        });

        const response = seats.map((seat) => ({
            seatId: seat.seatId,
            state: seat.state,
            roi: seat.roi,
            cameraId: seat.camera.cameraId
        }));

        res.json(response);

    } catch (error) {
        console.error("Error fetching seats:", error);

        res.status(500).json({
            error: "Failed to fetch seats"
        });
    }
}

async function getSeatHistory(req, res) {
    try {
        const { seatId } = req.params;

        const seat = await prisma.seat.findFirst({
            where: {
                seatId: seatId
            }
        });

        if (!seat) {
            return res.status(404).json({
                error: "Seat not found"
            });
        }

        const events = await prisma.seatEvent.findMany({
            where: {
                seatId: seat.id
            },
            select: {
                id: true,
                state: true,
                timestamp: true
            },
            orderBy: {
                timestamp: "desc"
            }
        });

        const response = events.map((event) => ({
            id: event.id.toString(),
            state: event.state,
            timestamp: event.timestamp
        }));

        res.json({
            seatId: seat.seatId,
            history: response
        });

    } catch (error) {
        console.error(
            "Error fetching seat history:",
            error
        );

        res.status(500).json({
            error: "Failed to fetch seat history"
        });
    }
}

module.exports = {
    getSeats,
    getSeatHistory
};