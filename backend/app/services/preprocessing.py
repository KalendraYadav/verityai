"""VerityAI — Image Preprocessing and Quality Enhancement Module.

Provides modular, local, offline-first image preprocessing for scanned document pages and image uploads.
Principles:
1. Safe fallbacks: Preprocessing failures must never crash the extraction pipeline.
2. Lightweight CPU execution: Uses OpenCV and NumPy without heavy neural network overhead.
3. Transparency: Records exact transformations applied (rotation angle, skew correction, enhancement).
4. Non-destructive: Operates on numpy arrays and returns processed copy while logging parameters.
"""

import math
from typing import Dict, Any, Tuple, Optional
import cv2
import numpy as np


def estimate_skew_angle(image: np.ndarray) -> float:
    """Estimate skew angle in degrees using minAreaRect on foreground text contours.
    Returns angle in degrees (-45.0 to +45.0).
    Returns 0.0 if image is blank, has insufficient text, or skew is negligible (< 0.5 deg).
    """
    if image is None or image.size == 0:
        return 0.0

    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image

    # Otsu thresholding with inversion (text pixels become white foreground)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Count foreground pixels to avoid crashing on blank pages
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 100:
        return 0.0

    # Calculate minimum area bounding rectangle
    rect = cv2.minAreaRect(coords)
    angle = rect[-1]

    # OpenCV minAreaRect returns angle in [-90, 0)
    if angle < -45:
        skew = -(90 + angle)
    else:
        skew = -angle

    # Filter out noise / micro-angles < 0.5 degrees
    if abs(skew) < 0.5:
        return 0.0

    # Safety clamp: if estimated skew is extreme (> 45 deg), it's likely an orientation issue, not skew
    if abs(skew) > 45.0:
        return 0.0

    return round(float(skew), 2)


def rotate_image_exact(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image around center by exact float angle without clipping boundaries."""
    if abs(angle) < 0.2:
        return image

    (h, w) = image.shape[:2]
    (cX, cY) = (w // 2, h // 2)

    M = cv2.getRotationMatrix2D((cX, cY), angle, 1.0)
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])

    # Compute new bounding dimensions of the image
    nW = int((h * sin) + (w * cos))
    nH = int((h * cos) + (w * sin))

    # Adjust transformation matrix to account for translation
    M[0, 2] += (nW / 2) - cX
    M[1, 2] += (nH / 2) - cY

    # Perform affine warp with replication or white background
    return cv2.warpAffine(
        image,
        M,
        (nW, nH),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255) if len(image.shape) == 3 else 255,
    )


def rotate_orthogonal(image: np.ndarray, angle_deg: int) -> np.ndarray:
    """Rotate image orthogonally by 90, 180, or 270 degrees counter-clockwise."""
    norm_angle = angle_deg % 360
    if norm_angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    elif norm_angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif norm_angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    return image


def detect_orthogonal_orientation(image: np.ndarray) -> int:
    """Check whether a text page is likely landscape/sideways when aspect ratio or horizontal
    projection profiles suggest it.
    Returns rotation needed in degrees (0, 90, 180, 270).
    """
    if image is None or image.size == 0:
        return 0

    h, w = image.shape[:2]
    # If image is significantly wider than tall (landscape) for standard certificates
    # Most AICTE certificates are portrait (A4 ~ 1:1.414). If width > 1.3 * height, it may be sideways.
    if w > 1.35 * h:
        # Check projection profile variance between 0 and 90 degrees
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Variance of horizontal projections: text lines create high peaks and valleys
        h_proj = np.sum(thresh, axis=1)
        var_h = np.var(h_proj)

        # Rotate 90 and check variance
        rot_thresh = cv2.rotate(thresh, cv2.ROTATE_90_CLOCKWISE)
        rot_h_proj = np.sum(rot_thresh, axis=1)
        var_rot_h = np.var(rot_h_proj)

        # If rotated profile shows dramatically higher variance (distinct lines of text), 90 deg rotation is warranted
        if var_rot_h > 1.8 * var_h:
            return 90

    return 0


def enhance_contrast_clahe(image: np.ndarray) -> np.ndarray:
    """Enhance local contrast using Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Works on RGB images by operating on the L channel of LAB color space, avoiding color shifts.
    """
    if image is None or image.size == 0:
        return image

    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        if len(image.shape) == 3 and image.shape[2] == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            lab_planes = list(cv2.split(lab))
            lab_planes[0] = clahe.apply(lab_planes[0])
            lab = cv2.merge(lab_planes)
            return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        elif len(image.shape) == 2:
            return clahe.apply(image)
        return image
    except Exception:
        return image


def preprocess_scanned_image(
    image: np.ndarray,
    enable_deskew: bool = True,
    enable_orientation: bool = True,
    enable_clahe: bool = True,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Safe, modular entrypoint for preprocessing a scanned page or image before OCR.

    Returns:
        (processed_image_np, telemetry_dict)
    """
    telemetry: Dict[str, Any] = {
        "deskew_applied": False,
        "skew_angle": 0.0,
        "orientation_applied": 0,
        "clahe_applied": False,
        "original_shape": list(image.shape) if image is not None else [],
        "processed_shape": [],
        "preprocessing_status": "SKIPPED",
    }

    if image is None or image.size == 0:
        telemetry["preprocessing_status"] = "EMPTY_IMAGE"
        return image, telemetry

    current = image.copy()

    try:
        # 1. Orientation detection (orthogonal 90/180/270 deg)
        if enable_orientation:
            rot_needed = detect_orthogonal_orientation(current)
            if rot_needed != 0:
                current = rotate_orthogonal(current, rot_needed)
                telemetry["orientation_applied"] = rot_needed

        # 2. Skew detection and correction
        if enable_deskew:
            angle = estimate_skew_angle(current)
            if abs(angle) >= 0.5:
                # Correct skew: rotate by negative of detected angle
                current = rotate_image_exact(current, -angle)
                telemetry["deskew_applied"] = True
                telemetry["skew_angle"] = angle

        # 3. Contrast enhancement (CLAHE)
        if enable_clahe:
            # Check if contrast is poor (std deviation of grayscale intensities < 40)
            gray = cv2.cvtColor(current, cv2.COLOR_RGB2GRAY) if len(current.shape) == 3 else current
            std_dev = float(np.std(gray))
            if std_dev < 50.0:  # Low contrast document scan
                current = enhance_contrast_clahe(current)
                telemetry["clahe_applied"] = True

        telemetry["processed_shape"] = list(current.shape)
        telemetry["preprocessing_status"] = "SUCCESS"
        return current, telemetry

    except Exception as exc:
        # Graceful fallback: return original image on any preprocessing error
        telemetry["preprocessing_status"] = f"FAILED: {str(exc)[:100]}"
        return image, telemetry
