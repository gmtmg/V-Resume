'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProfileData } from '@/types';

const STORAGE_KEY = 'v-resume-profile';

interface UseProfileStorageReturn {
  profileData: Partial<ProfileData>;
  profileId: string | null;
  saveProfileData: (data: Partial<ProfileData>) => void;
  setProfileId: (id: string) => void;
  clearStorage: () => void;
  isLoaded: boolean;
}

export function useProfileStorage(): UseProfileStorageReturn {
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [profileId, setProfileIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfileData(parsed.data || {});
        setProfileIdState(parsed.id || null);
      }
    } catch (e) {
      console.error('Failed to load profile from storage:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((data: Partial<ProfileData>, id: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, id }));
    } catch (e) {
      console.error('Failed to save profile to storage:', e);
    }
  }, []);

  const saveProfileData = useCallback((data: Partial<ProfileData>) => {
    const newData = { ...profileData, ...data };
    setProfileData(newData);
    saveToStorage(newData, profileId);
  }, [profileData, profileId, saveToStorage]);

  const setProfileId = useCallback((id: string) => {
    setProfileIdState(id);
    saveToStorage(profileData, id);
  }, [profileData, saveToStorage]);

  const clearStorage = useCallback(() => {
    setProfileData({});
    setProfileIdState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    profileData,
    profileId,
    saveProfileData,
    setProfileId,
    clearStorage,
    isLoaded,
  };
}
