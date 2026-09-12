const { getSocketIO } = require("../config/socket");

const { createClient } = require("redis");
const prisma = require("../config/prisma");

const redisClient = createClient({
    url: "redis://localhost:6379"
});

let shuttingDown = false;

redisClient.on("error", (error) => {
    if (!shuttingDown) {
        console.error("Redis Client Error:", error);
    }
});

async function processEvent(event) {
    const camera = await prisma.camera.findUnique({
        where: {
            cameraId: event.camera_id
        }
    });

    if (!camera) {
        throw new Error(
            `Camera not found: ${event.camera_id}`
        );
    }

    const seat = await prisma.seat.findUnique({
        where: {
            cameraId_seatId: {
                cameraId: camera.id,
                seatId: event.seat_id
            }
        }
    });

    if (!seat) {
        throw new Error(
            `Seat not found: ${event.seat_id}`
        );
    }

    // Update current seat state and store history
    // as one atomic database transaction.
    await prisma.$transaction([
        prisma.seat.update({
            where: {
                id: seat.id
            },
            data: {
                state: event.state
            }
        }),

        prisma.seatEvent.create({
            data: {
                seatId: seat.id,
                cameraId: camera.id,
                state: event.state,
                timestamp: new Date(
                    Number(event.timestamp) * 1000
                )
            }
        })
    ]);

    console.log(
        `Database updated: ${event.camera_id} / ${event.seat_id} → ${event.state}`
    );


    // Get the shared Socket.IO instance.
    const io = getSocketIO();

    // Notify all connected frontend clients.
    io.emit("seat_update", {
        cameraId: event.camera_id,
        seatId: event.seat_id,
        state: event.state,
        timestamp: event.timestamp
    });

    console.log(
        `Socket.IO event emitted: ${event.seat_id} → ${event.state}`
    );
}

async function startRedisConsumer() {
    await redisClient.connect();

    console.log("Redis consumer connected");

    const streamName = "seat_occupancy_events";
    const groupName = "backend_consumers";
    const consumerName = "backend_01";

    try {
        await redisClient.xGroupCreate(
            streamName,
            groupName,
            "$",
            {
                MKSTREAM: true
            }
        );

        console.log("Consumer group created");

    } catch (error) {
        if (!error.message.includes("BUSYGROUP")) {
            throw error;
        }

        console.log("Consumer group already exists");
    }

    console.log("Waiting for occupancy events...");

    while (!shuttingDown) {
        try {
            const result =
                await redisClient.xReadGroup(
                    groupName,
                    consumerName,
                    {
                        key: streamName,
                        id: ">"
                    },
                    {
                        COUNT: 10,
                        BLOCK: 5000
                    }
                );

            if (!result || shuttingDown) {
                continue;
            }

            for (const stream of result) {
                for (const message of stream.messages) {

                    if (shuttingDown) {
                        break;
                    }

                    console.log(
                        "\n------------------------------"
                    );

                    console.log(
                        "Message ID:",
                        message.id
                    );

                    console.log(
                        "Event:",
                        message.message
                    );

                    try {
                        await processEvent(
                            message.message
                        );

                        await redisClient.xAck(
                            streamName,
                            groupName,
                            message.id
                        );

                        console.log(
                            "Event acknowledged."
                        );

                    } catch (error) {
                        console.error(
                            "Event processing failed:",
                            error.message
                        );

                        console.log(
                            "Message NOT acknowledged. It remains pending."
                        );
                    }
                }
            }

        } catch (error) {
            if (!shuttingDown) {
                console.error(
                    "Error while consuming:",
                    error
                );
            }
        }
    }
}

async function stopRedisConsumer() {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log("\nStopping Redis consumer...");

    if (redisClient.isOpen) {
        await redisClient.quit();
    }

    console.log("Redis consumer stopped.");
}

module.exports = {
    startRedisConsumer,
    stopRedisConsumer
};