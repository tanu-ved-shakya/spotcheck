const { createClient } = require("redis");


const redisClient = createClient({
    url: "redis://localhost:6379"
});


redisClient.on("error", (error) => {

    console.error(
        "Redis Client Error:",
        error
    );

});


async function startConsumer() {

    await redisClient.connect();

    console.log(
        "Connected to Redis"
    );


    const streamName = "seat_occupancy_events";

    const groupName = "backend_consumers";

    const consumerName = "backend_01";


    // ==========================================
    // CREATE CONSUMER GROUP
    // ==========================================

    try {

        await redisClient.xGroupCreate(
            streamName,
            groupName,
            "$",
            {
                MKSTREAM: true
            }
        );

        console.log(
            "Consumer group created"
        );

    } catch (error) {

        // BUSYGROUP means the group already exists
        if (
            !error.message.includes(
                "BUSYGROUP"
            )
        ) {

            throw error;

        }

        console.log(
            "Consumer group already exists"
        );
    }


    // ==========================================
    // CONTINUOUS CONSUMPTION
    // ==========================================

    console.log(
        "Waiting for occupancy events..."
    );


    while (true) {

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


            // No event arrived during BLOCK period
            if (!result) {

                continue;
            }


            // ==================================
            // PROCESS EVENTS
            // ==================================

            for (const stream of result) {

                for (
                    const message
                    of stream.messages
                ) {

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


                    // ------------------------------
                    // BUSINESS LOGIC WILL COME HERE
                    // ------------------------------

                    console.log(
                        "Processing event..."
                    );


                    // ------------------------------
                    // ACKNOWLEDGE EVENT
                    // ------------------------------

                    await redisClient.xAck(
                        streamName,
                        groupName,
                        message.id
                    );


                    console.log(
                        "Event acknowledged."
                    );
                }
            }

        } catch (error) {

            console.error(
                "Error while consuming:",
                error
            );

        }
    }
}


startConsumer();