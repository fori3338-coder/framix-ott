import { supabase } from './supabase';

export const BUCKET = {
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  POSTERS: 'posters',
  BANNERS: 'banners',
} as const;

export type UploadProgressCallback = (percent: number) => void;

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`이미지 업로드 실패: ${msg}`);
  }
}

export async function uploadVideo(
  dramaId: string,
  episodeId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {

  console.log('[UPLOAD] UPLOAD_FUNCTION_START');
  console.log('[UPLOAD] FILE_NAME', file?.name);
  console.log('[UPLOAD] FILE_SIZE', file?.size);
  console.log('[UPLOAD] FILE_TYPE', file?.type);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
  const path = `${dramaId}/${episodeId}.${ext}`;

  console.log('[UPLOAD] UPLOAD_PATH', path);

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // 1차 시도: SDK
  try {
    onProgress?.(5);

    const { data: sdkData, error: sdkError } = await supabase.storage
      .from(BUCKET.VIDEOS)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || 'video/mp4',
      });

    console.log('[UPLOAD] SDK_RESULT', sdkData);
    console.log('[UPLOAD] SDK_ERROR', sdkError);

    if (!sdkError) {
      onProgress?.(100);
      const { data: publicData } = supabase.storage.from(BUCKET.VIDEOS).getPublicUrl(path);
      console.log('[UPLOAD] PUBLIC_URL', publicData.publicUrl);
      return publicData.publicUrl;
    }

    console.warn('[UPLOAD] SDK failed, trying XHR fallback. Reason:', sdkError.message);
  } catch (sdkEx) {
    console.warn('[UPLOAD] SDK exception, trying XHR fallback:', sdkEx);
  }

  // 2차 시도: XHR raw binary
  return new Promise<string>((resolve, reject) => {
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET.VIDEOS}/${path}`;

    console.log('[UPLOAD] XHR_URL', uploadUrl);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
const {
  data: { session }
} = await supabase.auth.getSession()

if (!session?.access_token) {
  throw new Error('로그인 세션 없음')
}

xhr.setRequestHeader(
  'Authorization',
  `Bearer ${session.access_token}`
)
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 95) + 5;
        onProgress?.(Math.min(pct, 99));
      }
    };

    xhr.onload = () => {
      console.log('[UPLOAD] XHR_STATUS', xhr.status);
      console.log('[UPLOAD] XHR_RESPONSE', xhr.responseText);

      if (xhr.status === 200 || xhr.status === 201) {
        onProgress?.(100);
        const { data: publicData } = supabase.storage.from(BUCKET.VIDEOS).getPublicUrl(path);
        console.log('[UPLOAD] PUBLIC_URL', publicData.publicUrl);
        resolve(publicData.publicUrl);
      } else {
        let errMsg = `HTTP ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          errMsg = parsed.message ?? parsed.error ?? errMsg;
        } catch {
          // JSON 파싱 실패 시 status 코드만 사용
        }
        reject(new Error(`XHR 업로드 실패: ${errMsg}`));
      }
    };

    xhr.onerror = () => {
      console.error('[UPLOAD] XHR_NETWORK_ERROR');
      reject(new Error('XHR 네트워크 오류: CORS 또는 연결 문제'));
    };

    xhr.ontimeout = () => reject(new Error('XHR 타임아웃'));
    xhr.timeout = 0;

    xhr.send(file);
  });
}

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

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}
