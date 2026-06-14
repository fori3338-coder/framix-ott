import { supabase } from './supabase';

// ─── Bucket 이름 상수 ─────────────────────────────────────────────────────────
// 실제 Supabase에 생성된 버킷: posters, thumbnails, videos, banners
export const BUCKET = {
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  POSTERS: 'posters',       // 포스터 전용 버킷 (포스터 이미지)
  BANNERS: 'banners',        // 히어로 배너 버킷
} as const;

// ─── 업로드 진행 콜백 타입 ────────────────────────────────────────────────────
export type UploadProgressCallback = (percent: number) => void;

// ─── 이미지 업로드 (포스터 / 배너 / 썸네일) ───────────────────────────────────
export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  onProgress?.(10);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`이미지 업로드 실패 [${bucket}/${path}]: ${error.message}`);

  onProgress?.(100);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── 영상 업로드 (XMLHttpRequest로 진행률 지원) ───────────────────────────────
export async function uploadVideo(
  dramaId: string,
  episodeId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'mp4';
  const path = `${dramaId}/${episodeId}.${ext}`;
  onProgress?.(10);

  const { error } = await supabase.storage
    .from(BUCKET.VIDEOS)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'video/mp4',
    });

  if (error) {
    throw new Error(`영상 업로드 실패: ${error.message}`);
  }

  onProgress?.(100);

  const { data } = supabase.storage
    .from(BUCKET.VIDEOS)
    .getPublicUrl(path);

  return data.publicUrl;
}
// ─── 서명 URL 생성 (유료 에피소드 재생용) ─────────────────────────────────────
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

  if (error || !data) throw new Error(`서명 URL 생성 실패: ${error?.message}`);
  return data.signedUrl;
}

// ─── Public URL 조회 ──────────────────────────────────────────────────────────
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── 파일 삭제 ───────────────────────────────────────────────────────────────
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`파일 삭제 실패: ${error.message}`);
}
