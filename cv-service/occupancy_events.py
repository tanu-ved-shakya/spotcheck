import time


class OccupancyEventGenerator:

    def __init__(self, camera_id):
        self.camera_id = camera_id

        # Keep the last state that was already published
        self.previous_states = {}

    def generate_events(self, current_states):

        events = []

        current_timestamp = time.time()

        for seat_id, current_state in current_states.items():

            previous_state = self.previous_states.get(
                seat_id
            )

            # First observation of this seat
            if previous_state is None:

                self.previous_states[seat_id] = current_state

                continue

            # State changed
            if current_state != previous_state:

                event = {
                    "camera_id": self.camera_id,
                    "seat_id": seat_id,
                    "state": current_state,
                    "timestamp": current_timestamp
                }

                events.append(event)

                # Update stored state
                self.previous_states[seat_id] = current_state

        return events