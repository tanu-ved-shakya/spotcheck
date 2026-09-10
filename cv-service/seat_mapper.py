import math


class SeatMapper:

    def __init__(
        self,
        seats,
        max_dist=500,
        weight_distance=0.5,
        weight_overlap=0.3,
        weight_containment=0.2,
        min_score=0.35
    ):
        self.seats = seats
        self.max_dist = max_dist
        self.weight_distance = weight_distance
        self.weight_overlap = weight_overlap
        self.weight_containment = weight_containment
        self.min_score = min_score

    def calculate_overlap(self, person_bbox, chair_bbox):

        px1, py1, px2, py2 = person_bbox
        cx1, cy1, cx2, cy2 = chair_bbox

        ix1 = max(px1, cx1)
        iy1 = max(py1, cy1)
        ix2 = min(px2, cx2)
        iy2 = min(py2, cy2)

        if ix1 >= ix2 or iy1 >= iy2:
            return 0.0

        intersection_area = (
            (ix2 - ix1) *
            (iy2 - iy1)
        )

        chair_area = (
            (cx2 - cx1) *
            (cy2 - cy1)
        )

        if chair_area <= 0:
            return 0.0

        return intersection_area / chair_area

    def get_bottom_center(self, bbox):

        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            y2
        )

    def calculate_distance_score(
        self,
        point,
        anchor
    ):

        dx = point[0] - anchor[0]
        dy = point[1] - anchor[1]

        distance = math.sqrt(
            dx * dx + dy * dy
        )

        if distance >= self.max_dist:
            return 0.0

        return 1.0 - (
            distance / self.max_dist
        )

    def point_inside_roi(
        self,
        point,
        roi
    ):

        x, y = point

        x1, y1, x2, y2 = roi

        return (
            x1 <= x <= x2
            and
            y1 <= y <= y2
        )

    def find_seat(
        self,
        person_bbox,
        chair_detections
    ):

        person_point = self.get_bottom_center(
            person_bbox
        )

        best_seat = None
        best_score = 0.0

        debug_info = {}

        for seat in self.seats:

            seat_id = seat["id"]
            roi = seat["roi"]

            x1, y1, x2, y2 = roi

            # ------------------------------------------
            # Seat anchor
            # ------------------------------------------

            anchor_x = (x1 + x2) / 2
            anchor_y = (y1 + y2) / 2

            anchor = (
                anchor_x,
                anchor_y
            )

            # ------------------------------------------
            # Distance score
            # ------------------------------------------

            distance_score = (
                self.calculate_distance_score(
                    person_point,
                    anchor
                )
            )

            # ------------------------------------------
            # ROI containment
            # ------------------------------------------

            containment_score = 1.0 if (
                self.point_inside_roi(
                    person_point,
                    roi
                )
            ) else 0.0

            # ------------------------------------------
            # Chair overlap
            # Only chairs belonging to this seat
            # are considered.
            # ------------------------------------------

            best_overlap = 0.0

            for chair in chair_detections:

                chair_bbox = chair["bbox"]

                chair_x1, chair_y1, chair_x2, chair_y2 = chair_bbox

                chair_center_x = (
                    chair_x1 + chair_x2
                ) / 2

                chair_center_y = (
                    chair_y1 + chair_y2
                ) / 2

                chair_center = (
                    chair_center_x,
                    chair_center_y
                )

                if self.point_inside_roi(
                    chair_center,
                    roi
                ):

                    overlap = (
                        self.calculate_overlap(
                            person_bbox,
                            chair_bbox
                        )
                    )

                    best_overlap = max(
                        best_overlap,
                        overlap
                    )

            # ------------------------------------------
            # Fused score
            # ------------------------------------------

            score = (

                self.weight_distance
                * distance_score

                +

                self.weight_overlap
                * best_overlap

                +

                self.weight_containment
                * containment_score
            )

            # ------------------------------------------
            # Debug information
            # ------------------------------------------

            debug_info[seat_id] = {

                "distance_score": round(
                    distance_score,
                    3
                ),

                "overlap": round(
                    best_overlap,
                    3
                ),

                "containment": containment_score,

                "score": round(
                    score,
                    3
                )
            }

            # ------------------------------------------
            # Select best seat
            # ------------------------------------------

            if score > best_score:

                best_score = score
                best_seat = seat_id

        # ------------------------------------------
        # Soft minimum threshold
        # ------------------------------------------

        if best_score < self.min_score:

            return (
                None,
                best_score,
                debug_info
            )

        return (
            best_seat,
            best_score,
            debug_info
        )