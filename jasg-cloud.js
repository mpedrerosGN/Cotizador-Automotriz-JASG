(function () {
    async function listar(modulo) {
        if (!window.jasgSupabase) return [];
        const { data, error } = await window.jasgSupabase
            .from('datos_compartidos')
            .select('registro_id, datos, creado_en, actualizado_en')
            .eq('modulo', modulo)
            .order('actualizado_en', { ascending: false });
        if (error) throw error;
        return (data || []).map((row) => ({ ...row.datos, id: row.registro_id }));
    }

    async function guardar(modulo, registroId, datos) {
        if (!window.jasgSupabase) return { data: null, error: null };
        const { data, error } = await window.jasgSupabase
            .from('datos_compartidos')
            .upsert({ modulo, registro_id: String(registroId), datos }, { onConflict: 'modulo,registro_id' })
            .select()
            .single();
        return { data, error };
    }

    async function eliminar(modulo, registroId) {
        if (!window.jasgSupabase) return { error: null };
        const { error } = await window.jasgSupabase
            .from('datos_compartidos')
            .delete()
            .eq('modulo', modulo)
            .eq('registro_id', String(registroId));
        return { error };
    }

    window.jasgCloud = { listar, guardar, eliminar };
}());
