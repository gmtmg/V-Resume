import { createClient } from './client';
import { ProfileData } from '@/types';

// Types for database tables
export interface DBProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  desired_job_type: string;
  experience: string;
  created_at: string;
}

export interface DBInterview {
  id: string;
  profile_id: string;
  video_url: string;
  summary_text: string | null;
  status: 'pending' | 'approved' | 'private';
  created_at: string;
}

// Profile operations
export async function saveProfile(data: ProfileData): Promise<DBProfile | null> {
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      desired_job_type: data.desiredJobType,
      experience: data.experience,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving profile:', error);
    return null;
  }

  return profile;
}

export async function getProfile(id: string): Promise<DBProfile | null> {
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return profile;
}

// Interview operations
export async function createInterview(profileId: string): Promise<DBInterview | null> {
  const supabase = createClient();

  const { data: interview, error } = await supabase
    .from('interviews')
    .insert({
      profile_id: profileId,
      video_url: '',
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating interview:', error);
    return null;
  }

  return interview;
}

export async function updateInterview(
  id: string,
  updates: Partial<Pick<DBInterview, 'video_url' | 'summary_text' | 'status'>>
): Promise<DBInterview | null> {
  const supabase = createClient();

  const { data: interview, error } = await supabase
    .from('interviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating interview:', error);
    return null;
  }

  return interview;
}

// Storage operations
export async function uploadVideo(
  file: Blob,
  fileName: string
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('interview-videos')
    .upload(fileName, file, {
      contentType: 'video/webm',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading video:', error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('interview-videos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
