import { useState, useEffect } from 'react';
import { User } from '@/types/auth.types';
import { supabase } from '@/lib/supabase';

interface UseCreatorProfileResult {
  creator: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCreatorProfile(creatorId: string | null): UseCreatorProfileResult {
  const [creator, setCreator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreatorProfile = async () => {
    if (!creatorId) {
      setError('Creator ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch creator profile from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Creator not found');
        } else {
          console.error('Profile fetch error:', profileError);
          setError('Failed to load creator profile');
        }
        return;
      }

      if (!profile) {
        setError('Creator not found');
        return;
      }

      // Map database row to User type
      const creatorProfile: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar_url || undefined,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at)
      };

      setCreator(creatorProfile);
    } catch (err) {
      console.error('Error fetching creator profile:', err);
      setError('Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatorProfile();
  }, [creatorId]);

  const refetch = async () => {
    await fetchCreatorProfile();
  };

  return {
    creator,
    loading,
    error,
    refetch
  };
}

export default useCreatorProfile;