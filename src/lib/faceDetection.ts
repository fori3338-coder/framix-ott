// ─────────────────────────────────────────────────────────────────────────
// 업로드 시 자동 얼굴 검출 → focal point 생성
//
// 브라우저 네이티브 Shape Detection API(FaceDetector)를 사용한다.
// MediaPipe/OpenCV 같은 무거운 라이브러리를 새로 추가하지 않고도
// Chrome/Edge(Android 포함)에서는 동일한 효과(업로드 시 자동 얼굴 좌표 추출)를
// 낼 수 있기 때문이다. 미지원 브라우저(Safari 등)에서는 조용히 빈 배열을
// 반환하며, 이 경우 기존 동작(episodes.focal_x/focal_y 수동 입력 또는
// 코드 기본값 50/33)으로 자연스럽게 폴백된다.
// ─────────────────────────────────────────────────────────────────────────

export interface DetectedFocusPoint {
  startTime: number;
  endTime: number;
  focalX: number;
  focalY: number;
}

interface FaceDetectorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetectorResult {
  boundingBox: FaceDetectorBox;
}

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<FaceDetectorResult[]>;
}

type FaceDetectorCtor = new (options?: { maxDetectedFaces?: number; fastMode?: boolean }) => FaceDetectorLike;

function getFaceDetectorCtor(): FaceDetectorCtor | null {
  const w = window as unknown as { FaceDetector?: FaceDetectorCtor };
  return typeof w.FaceDetector === "function" ? w.FaceDetector : null;
}

export function isFaceDetectionSupported(): boolean {
  return getFaceDetectorCtor() !== null;
}

const SAMPLE_INTERVAL_SECONDS = 5; // 5초 구간마다 1프레임 샘플링

/**
 * 비디오 파일에서 일정 간격으로 프레임을 샘플링해 얼굴을 검출하고,
 * 시간 구간별 focal point(%) 배열을 생성한다.
 * 미지원 브라우저 / 검출 실패 시 빈 배열을 반환한다(비치명적).
 */
export async function detectEpisodeFocusPoints(videoFile: File): Promise<DetectedFocusPoint[]> {
  const FaceDetectorCtor = getFaceDetectorCtor();
  if (!FaceDetectorCtor) return [];

  const objectUrl = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error("video metadata load failed"));
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const duration = video.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return [];

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const detector = new FaceDetectorCtor({ maxDetectedFaces: 1, fastMode: true });
    const points: DetectedFocusPoint[] = [];

    for (let t = 0; t < duration; t += SAMPLE_INTERVAL_SECONDS) {
      const segmentEnd = Math.min(t + SAMPLE_INTERVAL_SECONDS, duration);
      try {
        await seekVideo(video, t);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const faces = await detector.detect(canvas);
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          const centerXPct = ((box.x + box.width / 2) / canvas.width) * 100;
          const centerYPct = ((box.y + box.height / 2) / canvas.height) * 100;
          points.push({
            startTime: t,
            endTime: segmentEnd,
            focalX: clampPercent(centerXPct),
            focalY: clampPercent(centerYPct),
          });
        }
      } catch (err) {
        console.warn("[faceDetection] 프레임 검출 실패:", t, err);
      }
    }

    return mergeAdjacentSegments(points);
  } catch (err) {
    console.warn("[faceDetection] 자동 얼굴 검출 실패 (비치명):", err);
    return [];
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => resolve();
    const onError = () => reject(new Error("seek failed"));
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

// 연속된 구간의 좌표가 거의 동일하면(차이 5% 미만) 하나로 합쳐 행 수를 줄인다.
function mergeAdjacentSegments(points: DetectedFocusPoint[]): DetectedFocusPoint[] {
  if (points.length === 0) return points;
  const merged: DetectedFocusPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = points[i];
    const closeEnough = Math.abs(prev.focalX - cur.focalX) < 5 && Math.abs(prev.focalY - cur.focalY) < 5;
    if (closeEnough && prev.endTime === cur.startTime) {
      prev.endTime = cur.endTime;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}
