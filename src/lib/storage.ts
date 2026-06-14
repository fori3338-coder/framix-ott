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
