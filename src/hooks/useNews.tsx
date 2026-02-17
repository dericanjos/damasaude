import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  image_url: string | null;
  published_at: string;
}

export function useLatestNews() {
  return useQuery({
    queryKey: ['news', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('active', true)
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as NewsItem[];
    },
  });
}
