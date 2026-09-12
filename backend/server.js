const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const prisma = require("./config/prisma");
const seatRoutes = require("./routes/seatRoutes");

const {
    startRedisConsumer,
    stopRedisConsumer
} = require("./services/redisConsumer");

const {
    setSocketIO
} = require("./config/socket");


const app = express();


// Allow requests from React frontend
app.use(cors({
    origin: "http://localhost:5173"
}));


// Create HTTP server
const httpServer = http.createServer(app);


// Create Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173"
    }
});


// Make Socket.IO instance available
// to other backend modules
setSocketIO(io);


// Middleware
app.use(express.json());


// REST API routes
app.use("/api/seats", seatRoutes);


// Health check
app.get("/api/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: "OK",
            database: "connected"
        });

    } catch (error) {
        console.error(
            "Database health check failed:",
            error
        );

        res.status(500).json({
            status: "ERROR",
            database: "disconnected"
        });
    }
});


// Socket.IO connection handling
io.on("connection", (socket) => {

    console.log(
        `Client connected: ${socket.id}`
    );

    socket.on("disconnect", () => {

        console.log(
            `Client disconnected: ${socket.id}`
        );

    });

});


const PORT = 3000;


// Start server
const server = httpServer.listen(PORT, async () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

    console.log(
        "Socket.IO server is ready."
    );

    try {

        await startRedisConsumer();

    } catch (error) {

        console.error(
            "Redis consumer failed to start:",
            error
        );

    }

});


// Graceful shutdown
async function shutdown() {

    console.log(
        "\nShutting down server..."
    );

    try {

        await stopRedisConsumer();

        await prisma.$disconnect();

        io.close();

        server.close(() => {

            console.log(
                "Server shut down cleanly."
            );

            process.exit(0);

        });

    } catch (error) {

        console.error(
            "Error during shutdown:",
            error
        );

        process.exit(1);

    }

}


process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);