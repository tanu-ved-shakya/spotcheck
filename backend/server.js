const express = require("express");
const prisma = require("./config/prisma");

const seatRoutes = require("./routes/seatRoutes");

const app = express();

app.use(express.json());

app.use("/api/seats", seatRoutes);

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

const PORT = 3000;

const server = app.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT}`
    );
});

async function shutdown() {
    console.log("\nShutting down server...");

    await prisma.$disconnect();

    server.close(() => {
        console.log("Server shut down cleanly.");
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);