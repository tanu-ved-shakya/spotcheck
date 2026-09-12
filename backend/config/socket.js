let io = null;

function setSocketIO(socketIO) {
    io = socketIO;
}

function getSocketIO() {
    if (!io) {
        throw new Error("Socket.IO has not been initialized");
    }

    return io;
}

module.exports = {
    setSocketIO,
    getSocketIO
};