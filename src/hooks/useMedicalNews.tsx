import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MedicalNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
  external_url: string | null;
  category: string;
  image_url: string | null;
  published_at: string;
  is_active: boolean;
  created_at: string;
}

export function useLatestMedicalNews() {
  return useQuery({
    queryKey: ['medical_news', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_news')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data as unknown as MedicalNewsItem[])?.[0] as MedicalNewsItem | undefined;
    },
  });
}

export function useAllMedicalNews() {
  return useQuery({
    queryKey: ['medical_news', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_news')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as unknown as MedicalNewsItem[];
    },
  });
}

export function useMedicalNewsCount() {
  return useQuery({
    queryKey: ['medical_news', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('medical_news')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

