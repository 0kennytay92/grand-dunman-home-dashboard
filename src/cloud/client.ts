import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, cloudConfigured } from '../config';

/**
 * The page address as it was when the app opened – read before Supabase tidies it up,
 * so we can tell when someone has just arrived from an email link (…?code=… or …?error=…).
 */
export const arrivalParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
export const arrivedFromEmailLink = arrivalParams.has('code') || arrivalParams.has('error') || arrivalParams.has('error_description');

/** The connection to Supabase, or null when online sync isn't set up. */
export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: 'pkce', // email links come back as ?code=…, which doesn't clash with the app's #/page addresses
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'grand-dunman-home:auth',
      },
    })
  : null;

export const IMAGE_BUCKET = 'home-images';
/** Where a file lives in the private online storage. Resized pictures are .jpg; originals keep their own type. */
export const imagePath = (homeId: string, imageId: string, variant: 'full' | 'thumb' | 'original') =>
  variant === 'original' ? `${homeId}/${imageId}/original` : `${homeId}/${imageId}/${variant}.jpg`;
