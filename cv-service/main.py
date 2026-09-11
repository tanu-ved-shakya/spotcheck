import cv2

from detector import ObjectDetector
from seat_mapper import SeatMapper
from temporal_smoother import TemporalSmoother
from occupancy_events import OccupancyEventGenerator


# ==================================================
# YOLO DETECTOR
# ==================================================

detector = ObjectDetector(
    "yolov8n.pt"
)


# ==================================================
# SEAT CONFIGURATION
# ==================================================

seats = [

    {
        "id": "A01",
        "roi": [0, 1100, 260, 1439]
    },

    {
        "id": "A02",
        "roi": [260, 1100, 615, 1439]
    },

    {
        "id": "A03",
        "roi": [615, 1100, 975, 1439]
    },

    {
        "id": "A04",
        "roi": [975, 1100, 1215, 1439]
    },

    {
        "id": "A05",
        "roi": [1215, 1100, 1439, 1439]
    }
]


# ==================================================
# SEAT MAPPER
# ==================================================

seat_mapper = SeatMapper(

    seats,

    max_dist=500,

    weight_distance=0.5,

    weight_overlap=0.3,

    weight_containment=0.2,

    min_score=0.35
)


# ==================================================
# TEMPORAL SMOOTHER
# ==================================================

smoother = TemporalSmoother(

    seats,

    occupy_time=5,

    release_time=3
)

# ==================================================
# OCCUPANCY EVENT GENERATOR
# ==================================================

event_generator = OccupancyEventGenerator(
    camera_id="CAM_01"
)


# ==================================================
# VIDEO
# ==================================================

cap = cv2.VideoCapture(
    "test_video.mp4"
)


if not cap.isOpened():

    print(
        "Error: Could not open video."
    )

    exit()


# ==================================================
# FRAME SAMPLING
# ==================================================

# Process one frame every N seconds.
#
# 2 seconds is our starting point.
#
# YOLO is NOT executed on every camera frame.

SAMPLE_INTERVAL = 2.0

last_sample_time = -SAMPLE_INTERVAL


# ==================================================
# DISPLAY
# ==================================================

cv2.namedWindow(
    "SpotCheck",
    cv2.WINDOW_NORMAL
)


# ==================================================
# CURRENT DETECTIONS
# ==================================================

# We keep the most recent YOLO detections
# between sampled frames.

person_detections = []
chair_detections = []


# ==================================================
# MAIN LOOP
# ==================================================

while True:

    ret, frame = cap.read()


    if not ret:

        print(
            "Video ended."
        )

        break


    # --------------------------------------------------
    # Get video timestamp
    # --------------------------------------------------

    current_time = (
        cap.get(
            cv2.CAP_PROP_POS_MSEC
        ) / 1000.0
    )


    # --------------------------------------------------
    # Run YOLO only at sampling intervals
    # --------------------------------------------------

    if (
        current_time - last_sample_time
        >= SAMPLE_INTERVAL
    ):

        last_sample_time = current_time


        # ==============================================
        # YOLO DETECTION
        # ==============================================

        detections = detector.detect(
            frame
        )


        person_detections = []
        chair_detections = []


        # ==============================================
        # FILTER DETECTIONS
        # ==============================================

        for detection in detections:

            confidence = detection[
                "confidence"
            ]


            if confidence < 0.4:
                continue


            if detection["class"] == "person":

                person_detections.append(
                    detection
                )


            elif detection["class"] == "chair":

                chair_detections.append(
                    detection
                )


        # ==============================================
        # FIND SEATS
        # ==============================================

        detected_seats = set()


        for person in person_detections:

            person_bbox = person[
                "bbox"
            ]


            seat_id, score, debug_info = (
                seat_mapper.find_seat(
                    person_bbox,
                    chair_detections
                )
            )


            if seat_id is not None:

                detected_seats.add(
                    seat_id
                )


                print(
                    f"Time: {current_time:.1f}s | "
                    f"Person -> {seat_id} | "
                    f"Score: {score:.2f}"
                )


                # Uncomment when tuning:
                #
                # print(debug_info)


            else:

                print(
                    f"Time: {current_time:.1f}s | "
                    f"Person -> No Seat | "
                    f"Best Score: {score:.2f}"
                )


        # ==============================================
        # TEMPORAL SMOOTHING
        # ==============================================

        seat_states = smoother.update(
            detected_seats
        )

        # ==================================================
        # GENERATE OCCUPANCY EVENTS
        # ==================================================

        events = event_generator.generate_events(
            seat_states
        )

        for event in events:

            print(
                "OCCUPANCY EVENT:",
                event
            )


    else:

        # No YOLO inference on this frame.
        #
        # Keep existing seat states.

        seat_states = {
            seat["id"]:
            smoother.states[
                seat["id"]
            ]["state"]
            for seat in seats
        }


    # ==================================================
    # DRAW SEAT ROIs
    # ==================================================

    for seat in seats:

        x1, y1, x2, y2 = seat[
            "roi"
        ]


        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (255, 0, 0),

            2
        )


        # Seat ID

        cv2.putText(

            frame,

            seat["id"],

            (
                x1 + 5,
                y1 + 30
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.8,

            (255, 0, 0),

            2
        )


        # Seat state

        cv2.putText(

            frame,

            seat_states[
                seat["id"]
            ],

            (
                x1 + 5,
                y1 + 60
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.7,

            (0, 255, 255),

            2
        )


    # ==================================================
    # DRAW PERSONS
    # ==================================================

    for person in person_detections:

        x1, y1, x2, y2 = person[
            "bbox"
        ]


        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (0, 255, 0),

            2
        )


        cv2.putText(

            frame,

            "PERSON",

            (
                x1,
                max(y1 - 10, 20)
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.6,

            (0, 255, 0),

            2
        )


    # ==================================================
    # DRAW CHAIRS
    # ==================================================

    for chair in chair_detections:

        x1, y1, x2, y2 = chair[
            "bbox"
        ]


        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (0, 165, 255),

            2
        )


        cv2.putText(

            frame,

            f"CHAIR {chair['confidence']:.2f}",

            (
                x1,
                max(y1 - 10, 20)
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.5,

            (0, 165, 255),

            2
        )


    # ==================================================
    # RESIZE FRAME
    # ==================================================

    display_width = 1280
    display_height = 720


    h, w = frame.shape[:2]


    scale = min(

        display_width / w,

        display_height / h
    )


    new_width = int(
        w * scale
    )

    new_height = int(
        h * scale
    )


    display_frame = cv2.resize(

        frame,

        (
            new_width,
            new_height
        )
    )


    # ==================================================
    # DISPLAY
    # ==================================================

    cv2.imshow(

        "SpotCheck",

        display_frame
    )


    # Press Q to quit

    if cv2.waitKey(1) & 0xFF == ord("q"):

        break


# ==================================================
# CLEANUP
# ==================================================

cap.release()

cv2.destroyAllWindows()