import { createClient } from './client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a video blob to Supabase Storage
 * 【重要】アップロードされるのは加工済みのアバター動画のみ
 */
export async function uploadInterviewVideo(
  blob: Blob,
  profileId: string,
  questionId: number
): Promise<UploadResult> {
  const supabase = createClient();

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${profileId}/q${questionId}_${timestamp}.webm`;

  try {
    const { data, error } = await supabase.storage
      .from('interview-videos')
      .upload(filename, blob, {
        contentType: 'video/webm',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('interview-videos').getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload all interview recordings
 */
export async function uploadAllRecordings(
  recordings: Array<{ questionId: number; blob: Blob }>,
  profileId: string
): Promise<Array<UploadResult & { questionId: number }>> {
  const results = await Promise.all(
    recordings.map(async ({ questionId, blob }) => {
      const result = await uploadInterviewVideo(blob, profileId, questionId);
      return { ...result, questionId };
    })
  );

  return results;
}
