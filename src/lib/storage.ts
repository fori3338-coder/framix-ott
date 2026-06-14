import { supabase } from './supabase';

// ─── Bucket 이름 ─────────────────────────────
export const BUCKET = {
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  POSTERS: 'posters',
  BANNERS: 'banners',
} as const;

// ─── Progress 타입 ───────────────────────────
export type UploadProgressCallback = (percent: number) => void;

// ─────────────────────────────────────────────
// 이미지 업로드
// ─────────────────────────────────────────────
export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  try {
    onProgress?.(10);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    onProgress?.(100);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    throw new Error(`이미지 업로드 실패: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// 영상 업로드
// ─────────────────────────────────────────────
export async function uploadVideo(
  dramaId: string,
  episodeId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {

  console.log("UPLOAD_FUNCTION_START");
  console.log("FILE_NAME", file?.name);
  console.log("FILE_SIZE", file?.size);

  try {
    onProgress?.(10);

    const ext = file.name.split('.').pop() ?? 'mp4';
    const path = `${dramaId}/${episodeId}.${ext}`;

    console.log("UPLOAD_PATH", path);

    const { data, error } = await supabase.storage
      .from(BUCKET.VIDEOS)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || 'video/mp4',
      });

    console.log("UPLOAD_RESULT", data);
    console.log("UPLOAD_ERROR", error);

    if (error) throw error;

    onProgress?.(100);

    const { data: publicData } =
      supabase.storage
        .from(BUCKET.VIDEOS)
        .getPublicUrl(path);

    console.log("PUBLIC_URL", publicData.publicUrl);

    return publicData.publicUrl;

  } catch (err: any) {

    console.error("VIDEO_UPLOAD_EXCEPTION", err);

    throw new Error(`영상 업로드 실패: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// Signed URL
// ─────────────────────────────────────────────
export async function getSignedVideoUrl(
  dramaId: string,
  episodeId: string,
  ext = 'mp4',
  expiresIn = 3600
): Promise<string> {

  const path = `${dramaId}/${episodeId}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET.VIDEOS)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(`서명 URL 생성 실패: ${error?.message}`);
  }

  return data.signedUrl;
}

// ─────────────────────────────────────────────
// Public URL
// ─────────────────────────────────────────────
export function getPublicUrl(
  bucket: string,
  path: string
): string {

  const { data } =
    supabase.storage
      .from(bucket)
      .getPublicUrl(path);

  return data.publicUrl;
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {

  const { error } =
    await supabase.storage
      .from(bucket)
      .remove([path]);

  if (error) {
    throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}
