import time


class TemporalSmoother:

    def __init__(self, seats, occupy_time=5, release_time=3):

        self.occupy_time = occupy_time
        self.release_time = release_time

        self.states = {}

        for seat in seats:
            self.states[seat["id"]] = {
                "state": "AVAILABLE",
                "detected_since": None,
                "missing_since": None
            }

    def update(self, detected_seats):

        current_time = time.time()

        for seat_id in self.states:

            seat = self.states[seat_id]

            # Person detected at this seat
            if seat_id in detected_seats:

                seat["missing_since"] = None

                if seat["detected_since"] is None:
                    seat["detected_since"] = current_time

                # Confirm occupancy after continuous detection
                if (
                    seat["state"] == "AVAILABLE"
                    and current_time - seat["detected_since"]
                    >= self.occupy_time
                ):
                    seat["state"] = "OCCUPIED"

            # No person detected
            else:

                seat["detected_since"] = None

                if seat["missing_since"] is None:
                    seat["missing_since"] = current_time

                # Confirm vacancy after continuous absence
                if (
                    seat["state"] == "OCCUPIED"
                    and current_time - seat["missing_since"]
                    >= self.release_time
                ):
                    seat["state"] = "AVAILABLE"

        return {
            seat_id: seat["state"]
            for seat_id, seat in self.states.items()
        }