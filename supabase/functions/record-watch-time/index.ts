import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log('Record Watch Time function initializing');

interface WatchTimePayload {
  post_id: string;
  watch_time_ms: number;
  video_duration_ms: number; // We might use this later for direct retention calculation
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate input
    if (!req.body) {
      throw new Error('Request body is missing.');
    }
    const payload: WatchTimePayload = await req.json();
    if (!payload.post_id || typeof payload.post_id !== 'string') {
      throw new Error('Invalid or missing post_id.');
    }
    if (typeof payload.watch_time_ms !== 'number' || payload.watch_time_ms < 0) {
      throw new Error('Invalid or missing watch_time_ms.');
    }
     if (typeof payload.video_duration_ms !== 'number' || payload.video_duration_ms <= 0) {
      // Duration is important for calculating retention later
      console.warn(`Received watch time for post ${payload.post_id} with invalid duration: ${payload.video_duration_ms}`);
      // Decide if we still record the view/time even with bad duration. Let's proceed for now.
      // throw new Error('Invalid or missing video_duration_ms.');
    }

    // Create Supabase client with SERVICE_ROLE_KEY for backend operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Atomically update the post's watch time aggregates
    // We increment both total time and the count of views contributing to retention
    const { error: updateError } = await supabaseAdmin
      .rpc('increment_post_watch_stats', {
        post_id_to_update: payload.post_id,
        watch_time_increment: payload.watch_time_ms,
      });

    if (updateError) {
      console.error('Error updating post watch stats:', updateError);
      throw new Error(`Failed to update watch stats: ${updateError.message}`);
    }

    // Optionally: Trigger retention rate recalculation here later if needed
    // For now, we rely on the aggregates being updated.

    return new Response(JSON.stringify({ success: true, message: 'Watch time recorded.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client errors, 500 for server errors
    });
  }
});

/*
Supabase SQL Function needed for atomic increment:

CREATE OR REPLACE FUNCTION increment_post_watch_stats(post_id_to_update uuid, watch_time_increment bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.posts
  SET
    total_watch_time_ms = total_watch_time_ms + watch_time_increment,
    total_views_for_retention = total_views_for_retention + 1
    -- We will calculate average_retention_rate separately later, perhaps in a scheduled job or another function
  WHERE id = post_id_to_update;
END;
$$;

*/
