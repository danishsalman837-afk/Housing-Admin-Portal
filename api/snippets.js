const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  if (req.method === 'GET') {
    try {
        const { data: folders, error: fErr } = await supabase.from('snippet_folders').select('*').order('name');
        const { data: snippets, error: sErr } = await supabase.from('snippets').select('*').order('title');
        
        if (fErr || sErr) return res.status(500).json({ error: (fErr || sErr).message });
        
        return res.status(200).json({
            folders: folders.map(f => ({ id: f.id, name: f.name })),
            snippets: snippets.map(s => ({
                id: s.id,
                folder_id: s.folder_id,
                title: s.title,
                content: s.content
            }))
        });
    } catch (e) {
        console.error("Snippets GET error:", e);
        return res.status(500).json({ error: "Server error: " + e.message });
    }
  }

  if (req.method === 'POST') {
    const { action, payload } = req.body;
    try {
        if (action === 'folder_add') {
            await supabase.from('snippet_folders').insert([{ id: payload.id, name: payload.name }]);
        } else if (action === 'folder_edit') {
            await supabase.from('snippet_folders').update({ name: payload.name }).eq('id', payload.id);
        } else if (action === 'folder_delete') {
            await supabase.from('snippets').delete().eq('folder_id', payload);
            await supabase.from('snippet_folders').delete().eq('id', payload);
        } else if (action === 'snippet_add') {
            await supabase.from('snippets').insert([{
                id: payload.id,
                folder_id: payload.folder_id,
                title: payload.title,
                content: payload.content
            }]);
        } else if (action === 'snippet_edit') {
            await supabase.from('snippets').update({
                title: payload.title,
                content: payload.content
            }).eq('id', payload.id);
        } else if (action === 'snippet_delete') {
            await supabase.from('snippets').delete().eq('id', payload);
        } else {
            return res.status(400).json({ error: "Invalid action" });
        }
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error("Snippets POST error:", e);
        return res.status(500).json({ error: "Server error: " + e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
