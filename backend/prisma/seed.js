require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace("/", "")
});

const prisma = new PrismaClient({
    adapter
});

async function main() {
    const camera = await prisma.camera.upsert({
        where: {
            cameraId: "CAM_01"
        },
        update: {},
        create: {
            cameraId: "CAM_01",
            name: "Library Camera 01",
            status: "ONLINE"
        }
    });

    const seats = [
        {
            seatId: "A01",
            roi: [0, 1100, 260, 1439]
        },
        {
            seatId: "A02",
            roi: [260, 1100, 615, 1439]
        },
        {
            seatId: "A03",
            roi: [615, 1100, 975, 1439]
        },
        {
            seatId: "A04",
            roi: [975, 1100, 1215, 1439]
        },
        {
            seatId: "A05",
            roi: [1215, 1100, 1439, 1439]
        }
    ];

    for (const seat of seats) {
        await prisma.seat.upsert({
            where: {
                cameraId_seatId: {
                    cameraId: camera.id,
                    seatId: seat.seatId
                }
            },
            update: {
                roi: seat.roi
            },
            create: {
                seatId: seat.seatId,
                cameraId: camera.id,
                roi: seat.roi,
                state: "AVAILABLE"
            }
        });
    }

    console.log("Camera and seats seeded successfully.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });