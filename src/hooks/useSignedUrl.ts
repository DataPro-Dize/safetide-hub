import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Parse storage reference: "bucket:path" or legacy URL
function parseStorageRef(ref: string): { bucket: string; path: string } | null {
  if (ref.includes(':') && !ref.startsWith('http')) {
    const [bucket, ...pathParts] = ref.split(':');
    return { bucket, path: pathParts.join(':') };
  }
  return null;
}

// Generate signed URL for a storage reference
export async function getSignedUrl(ref: string, expiresIn = 3600): Promise<string> {
  const parsed = parseStorageRef(ref);
  if (!parsed) {
    // Legacy URL or already a full URL - return as-is
    return ref;
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    return '';
  }

  return data.signedUrl;
}

// Generate signed URLs for multiple references
export async function getSignedUrls(refs: string[], expiresIn = 3600): Promise<string[]> {
  const results = await Promise.all(refs.map(ref => getSignedUrl(ref, expiresIn)));
  return results;
}

// Hook for a single signed URL
export function useSignedUrl(ref: string | null | undefined, expiresIn = 3600) {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setSignedUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    getSignedUrl(ref, expiresIn)
      .then(setSignedUrl)
      .finally(() => setLoading(false));
  }, [ref, expiresIn]);

  return { signedUrl, loading };
}

// Hook for multiple signed URLs
export function useSignedUrls(refs: string[] | undefined | null, expiresIn = 3600) {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!refs || !Array.isArray(refs) || refs.length === 0) {
      setSignedUrls([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSignedUrls(refs, expiresIn)
      .then(setSignedUrls)
      .finally(() => setLoading(false));
  }, [JSON.stringify(refs), expiresIn]);

  return { signedUrls, loading };
}
