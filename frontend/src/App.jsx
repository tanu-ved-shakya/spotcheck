import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        // 1. Fetch initial seat state from REST API
        async function fetchSeats() {
            try {
                const response = await axios.get(
                    "http://localhost:3000/api/seats"
                );

                setSeats(response.data);

            } catch (error) {
                console.error(
                    "Failed to fetch seats:",
                    error
                );

                setError("Failed to load seat data.");

            } finally {
                setLoading(false);
            }
        }


        fetchSeats();


        // 2. Listen for real-time seat updates
        socket.on("seat_update", (updatedSeat) => {

            console.log(
                "Real-time seat update:",
                updatedSeat
            );

            setSeats((currentSeats) =>
                currentSeats.map((seat) =>
                    seat.seatId === updatedSeat.seatId &&
                    seat.cameraId === updatedSeat.cameraId
                        ? {
                            ...seat,
                            state: updatedSeat.state
                        }
                        : seat
                )
            );
        });


        // 3. Remove listener when component unmounts
        return () => {
            socket.off("seat_update");
        };

    }, []);


    if (loading) {
        return <h1>Loading seats...</h1>;
    }


    if (error) {
        return <h1>{error}</h1>;
    }


    return (
        <div>
            <h1>SpotCheck</h1>

            <h2>Library Seats</h2>

            {seats.map((seat) => (
                <div key={`${seat.cameraId}-${seat.seatId}`}>
                    <h3>{seat.seatId}</h3>
                    <p>{seat.state}</p>
                </div>
            ))}
        </div>
    );
}

export default App;