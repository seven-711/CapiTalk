import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://emfixxhpptxjstlcievy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_aV_Ww6MQD0ISNwgs_2KbHg_mGvYKy2o';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const POST_ID = 'higalaay_banner_post_1';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('midterm_reactions')
      .select('user_id, user_name, reaction_type, updated_at')
      .eq('post_id', POST_ID)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch reactions error:', error);
      return NextResponse.json({ success: false, count: 0, users: [] }, { status: 200 });
    }

    const users = (data || []).map((row: any) => ({
      id: row.user_id,
      username: row.user_name || 'Capitolian',
      department: 'CU Student',
      avatarUrl: '/avatars/coin-left.jpg',
      reactedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    }));

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err: any) {
    console.error('Error fetching reactions:', err);
    return NextResponse.json({ success: false, count: 0, users: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, username, department, avatarUrl, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'remove') {
      await supabase
        .from('midterm_reactions')
        .delete()
        .eq('post_id', POST_ID)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('midterm_reactions')
        .upsert({
          post_id: POST_ID,
          user_id: userId,
          user_name: username || 'Capitolian',
          reaction_type: 'heart',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'post_id,user_id' });
    }

    // Return updated tally
    const { data: updatedData } = await supabase
      .from('midterm_reactions')
      .select('user_id, user_name, reaction_type, updated_at')
      .eq('post_id', POST_ID)
      .order('updated_at', { ascending: false });

    const users = (updatedData || []).map((row: any) => ({
      id: row.user_id,
      username: row.user_name || 'Capitolian',
      department: 'CU Student',
      avatarUrl: '/avatars/coin-left.jpg',
      reactedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    }));

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err: any) {
    console.error('Error updating reaction:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
