import redis
import json


class RedisStreamProducer:

    def __init__(
        self,
        host="localhost",
        port=6379,
        stream_name="seat_occupancy_events"
    ):

        self.stream_name = stream_name

        self.redis = redis.Redis(
            host=host,
            port=port,
            decode_responses=True
        )

    def test_connection(self):

        return self.redis.ping()

    def publish_event(self, event):

        message = {
            "camera_id": event["camera_id"],
            "seat_id": event["seat_id"],
            "state": event["state"],
            "timestamp": str(event["timestamp"])
        }

        message_id = self.redis.xadd(
            self.stream_name,
            message
        )

        return message_id


if __name__ == "__main__":

    producer = RedisStreamProducer()

    print(
        "Redis connection:",
        producer.test_connection()
    )

    test_event = {
        "camera_id": "CAM_01",
        "seat_id": "A03",
        "state": "OCCUPIED",
        "timestamp": 1789037284.0
    }

    message_id = producer.publish_event(
        test_event
    )

    print(
        "Event published with ID:",
        message_id
    )