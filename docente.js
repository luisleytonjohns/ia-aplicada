/* Metis · docente.js · Ambiente del docente: versiones del curso, links de registro y personas. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc, $ = M.$;
  const D = window.Docente = { versiones: [], versionId: null, pestana: 'versiones', personas: [] };

  D.montar = async function (c) {
    D.c = c;
    try { D.pestana = localStorage.getItem('metis_doc_tab') || 'versiones'; D.versionId = localStorage.getItem('metis_doc_version'); } catch (e) { /* sin almacenamiento */ }
    c.innerHTML = '<div class="cabecera"><div><h1>Ambiente del docente</h1><p>Versiones del curso, registro de estudiantes y personas.</p></div><div id="d-selector"></div></div>' +
      '<div id="d-contrato"></div><nav class="tabs" id="d-tabs">' +
      ['versiones:Versiones del curso', 'sesiones:Sesiones', 'registro:Links de registro', 'personas:Personas'].map(t => { const [k, n] = t.split(':'); return '<button type="button" data-tab="' + k + '">' + n + '</button>'; }).join('') +
      '</nav><section id="d-panel"><div class="vacio">Cargando…</div></section>';
    $('#d-tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) irA(b.dataset.tab); });
    revisarContrato();
    await cargarVersiones();
    await irA(D.pestana, true);
  };

  async function revisarContrato() {
    try {
      const est = await M.api('ping');
      const faltan = M.CONTRATO.filter(a => (est.acciones || []).indexOf(a) < 0);
      if (faltan.length) M.msg('#d-contrato', 'El servicio no tiene estas acciones que usa la página: ' + faltan.join(', ') + '. Actualiza los archivos de Apps Script y publica una nueva versión.', 'mal');
      else if (est.version !== M.version) M.msg('#d-contrato', 'La página es la versión ' + M.version + ' y el servicio la ' + est.version + '. Conviene que coincidan.', 'aviso');
    } catch (e) { M.msg('#d-contrato', 'No se pudo revisar el servicio: ' + e.message, 'mal'); }
  }

  async function cargarVersiones() {
    D.versiones = await M.api('listarVersiones');
    if (!D.versiones.find(v => v.id === D.versionId)) D.versionId = D.versiones.length ? D.versiones[0].id : null;
    pintarSelector();
  }

  function pintarSelector() {
    const el = $('#d-selector');
    if (!D.versiones.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="selector"><label class="etq" for="d-version">Versión</label><select id="d-version">' +
      D.versiones.map(v => '<option value="' + esc(v.id) + '"' + (v.id === D.versionId ? ' selected' : '') + '>' + esc(nombreVersion(v)) + '</option>').join('') + '</select></div>';
    $('#d-version').addEventListener('change', e => { D.versionId = e.target.value; recordar(); irA(D.pestana); });
  }

  function nombreVersion(v) { return v.asignatura + ' · ' + v.institucion + ' · ' + [v.periodo, v.anio].filter(Boolean).join(' '); }
  function recordar() { try { localStorage.setItem('metis_doc_tab', D.pestana); if (D.versionId) localStorage.setItem('metis_doc_version', D.versionId); } catch (e) { /* nada */ } }
  function versionActual() { return D.versiones.find(v => v.id === D.versionId); }

  /** Cambia de pestaña. Muestra el velo de carga salvo cuando ya hay uno activo (sinVelo). */
  function irA(tab, sinVelo) {
    if (!sinVelo) return M.conVelo(() => irA(tab, true));
    if (['versiones', 'sesiones', 'registro', 'personas'].indexOf(tab) < 0) tab = 'versiones';
    D.pestana = tab; recordar();
    document.querySelectorAll('#d-tabs button').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));
    const p = $('#d-panel');
    if (tab !== 'versiones' && !D.versionId) { p.innerHTML = '<div class="tarjeta"><h2 style="font-size:1.1rem">Primero crea una versión del curso</h2><p style="margin:0">Las sesiones, los links de registro y las personas pertenecen a una versión.</p><div><button class="btn p" type="button" id="d-ir-v">Ir a versiones</button></div></div>'; $('#d-ir-v').onclick = () => irA('versiones'); return; }
    return Promise.resolve(({ versiones: panelVersiones, sesiones: panelSesiones, registro: panelRegistro, personas: panelPersonas })[tab](p));
  }

  /* ---------- Versiones ---------- */
  function panelVersiones(p) {
    p.innerHTML = '<div style="display:flex;justify-content:flex-end;margin:16px 0"><button class="btn p" type="button" id="v-nueva">Nueva versión</button></div>' +
      (D.versiones.length ? '<div class="tarjetas">' + D.versiones.map(v =>
        '<article class="tarjeta"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><h3 style="font-size:1.05rem">' + esc(v.asignatura) + '</h3><small style="color:var(--pizarra)">' + esc([v.institucion, v.escuela].filter(Boolean).join(' · ')) + '</small></div>' +
        '<span class="chip ' + (v.estado === 'archivada' ? 'gris' : 'ok') + '">' + (v.estado === 'archivada' ? 'Archivada' : 'Activa') + '</span></div>' +
        '<div class="datos"><div class="dato"><span>Periodo</span><b>' + esc([v.periodo, v.anio].filter(Boolean).join(' ')) + '</b></div><div class="dato"><span>Sesiones</span><b>' + v.sesiones + ' × ' + v.minutos + ' min</b></div>' +
        '<div class="dato"><span>Estudiantes</span><b>' + v.estudiantes + '</b></div><div class="dato"><span>Observadores</span><b>' + v.observadores + '</b></div></div>' +
        '<div><button class="btn s peq" type="button" data-editar="' + esc(v.id) + '">Editar</button></div></article>').join('') + '</div>'
        : '<div class="tarjeta vacio">Aún no hay versiones. Crea la primera con el botón Nueva versión.</div>');
    $('#v-nueva').onclick = () => formVersion(null);
    p.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => formVersion(D.versiones.find(v => v.id === b.dataset.editar)); });
  }

  function formVersion(v) {
    v = v || { sesiones: 12, sesiones_semana: 3, minutos: 180, asistencia_min: 80, tolerancia_min: 15, defensas_sesion: 5, exigencia: 60, estado: 'activa', asignatura: 'Artes Digitales: IA Aplicada a la Administración y la Economía', anio: String(new Date().getFullYear() + 1) };
    const c = (id, t, tipo, ayuda) => '<div class="campo"><label for="v-' + id + '">' + t + '</label><input type="' + (tipo || 'text') + '" id="v-' + id + '" value="' + esc(v[id] == null ? '' : v[id]) + '">' + (ayuda ? '<span class="ayuda">' + ayuda + '</span>' : '') + '</div>';
    const m = M.modal(v.id ? 'Editar versión' : 'Nueva versión del curso',
      '<fieldset><legend>Institución</legend><div class="fila">' + c('institucion', 'Institución *') + c('escuela', 'Escuela o facultad') + '</div>' + c('logo_url', 'Logo de la institución', 'url', 'Dirección https de la imagen. Opcional.') + '</fieldset>' +
      '<fieldset><legend>Asignatura</legend>' + c('asignatura', 'Nombre de la asignatura *') + '<div class="fila">' + c('codigo', 'Código') + c('periodo', 'Periodo', 'text', 'Ejemplo: Verano') + c('anio', 'Año *', 'number') + c('fecha_inicio', 'Fecha de inicio', 'date') + '</div></fieldset>' +
      '<fieldset><legend>Estructura</legend><div class="fila">' + c('sesiones', 'Sesiones', 'number') + c('sesiones_semana', 'Sesiones por semana', 'number') + c('minutos', 'Minutos por sesión', 'number') + '</div></fieldset>' +
      '<fieldset><legend>Reglas</legend><div class="fila">' + c('asistencia_min', 'Asistencia mínima (%)', 'number') + c('tolerancia_min', 'Tolerancia de entrega (min)', 'number') + c('defensas_sesion', 'Defensas por sesión', 'number') + c('exigencia', 'Exigencia (%)', 'number') + '</div>' +
      c('whatsapp', 'Link del grupo de WhatsApp', 'url', 'Opcional.') +
      '<div class="campo"><label for="v-estado">Estado</label><select id="v-estado"><option value="activa"' + (v.estado !== 'archivada' ? ' selected' : '') + '>Activa</option><option value="archivada"' + (v.estado === 'archivada' ? ' selected' : '') + '>Archivada</option></select></div></fieldset><div id="v-msg"></div>',
      '<button class="btn p" type="button" id="v-guardar">Guardar versión</button>');
    $('#v-guardar', m.el).onclick = async ev => {
      const d = { id: v.id };
      ['institucion', 'escuela', 'logo_url', 'asignatura', 'codigo', 'periodo', 'anio', 'fecha_inicio', 'sesiones', 'sesiones_semana', 'minutos', 'asistencia_min', 'tolerancia_min', 'defensas_sesion', 'exigencia', 'whatsapp', 'estado']
        .forEach(k => { d[k] = $('#v-' + k, m.el).value; });
      await M.ocupado(ev.currentTarget, async () => {
        try { const g = await M.api('guardarVersion', d); D.versionId = g.id; recordar(); m.cerrar(); await M.conVelo(async () => { await cargarVersiones(); await irA('versiones', true); }); }
        catch (e) { M.msg($('#v-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  /* ---------- Sesiones ---------- */
  async function panelSesiones(p) {
    const v = versionActual();
    let r;
    try { r = await M.api('listarSesiones', { version_id: v.id }); }
    catch (e) { p.innerHTML = '<div class="msg mal" style="margin-top:16px">' + esc(e.message) + '</div>'; return; }
    D.sesiones = r.sesiones;
    if (!r.sesiones.length) {
      const base = Number(v.sesiones) === 12;
      p.innerHTML = '<div class="tarjeta" style="margin-top:16px"><h2>Esta versión aún no tiene sesiones</h2><p class="sub">Se crearán ' + v.sesiones + ' sesiones, ' + v.sesiones_semana + ' por semana, todas ocultas.' +
        (base ? ' Como son 12, se cargan con la planificación base del curso: título, unidad y objetivos de cada sesión, que luego puedes editar.' : '') + '</p>' +
        '<div><button class="btn p" type="button" id="s-generar">Generar ' + v.sesiones + ' sesiones</button></div><div id="s-msg"></div></div>';
      $('#s-generar').onclick = async ev => { await M.ocupado(ev.currentTarget, async () => { try { await M.api('generarSesiones', { version_id: v.id }); await irA('sesiones'); } catch (e) { M.msg('#s-msg', e.message, 'mal'); } }); };
      return;
    }
    const semanas = {};
    r.sesiones.forEach(s => { (semanas[s.semana] = semanas[s.semana] || []).push(s); });
    p.innerHTML = '<div class="msg info" style="margin-top:16px">Oculta: el estudiante no la ve. Visible: ve objetivos y ruta, sin trabajar. Abierta: puede trabajar si registró asistencia. Cerrada: solo lectura. Los materiales, el control y la entrega se abren por separado. El observador ve todo como visible.</div><div id="s-msg"></div>' +
      Object.keys(semanas).sort((a, b) => a - b).map(w => '<div class="semana-cab"><h3 class="semana-t" style="margin:0">Semana ' + w + '</h3><div class="acciones">' +
        ['oculta:Ocultar', 'visible:Hacer visible', 'abierta:Abrir', 'cerrada:Cerrar'].map(x => { const [e, t] = x.split(':'); return '<button class="btn s peq" type="button" data-semana="' + w + '" data-estado="' + e + '">' + t + ' semana</button>'; }).join('') + '</div></div>' +
        '<div class="tabla"><table><thead><tr><th>Nº</th><th>Sesión</th><th>Estado</th><th>Habilitado</th><th></th></tr></thead><tbody>' + semanas[w].map(filaSesion).join('') + '</tbody></table></div>').join('');
    p.querySelectorAll('[data-semana]').forEach(b => { b.onclick = async () => { const ids = D.sesiones.filter(s => String(s.semana) === b.dataset.semana).map(s => s.id); await cambiarEstado(ids, b.dataset.estado, b); }; });
    p.querySelectorAll('select.estado').forEach(sel => { sel.onchange = () => cambiarEstado([sel.dataset.id], sel.value, null); });
    p.querySelectorAll('[data-apertura]').forEach(ch => { ch.onchange = async () => {
      try { await M.api('cambiarAperturaSesion', { sesion_id: ch.dataset.id, campo: ch.dataset.apertura, valor: ch.checked }); }
      catch (e) { ch.checked = !ch.checked; M.msg('#s-msg', e.message, 'mal'); window.scrollTo(0, 0); }
    }; });
    p.querySelectorAll('[data-editar-sesion]').forEach(b => { b.onclick = () => M.conVelo(() => editarSesion(b.dataset.editarSesion)); });
    p.querySelectorAll('[data-previa]').forEach(b => { b.onclick = () => M.conVelo(() => previaSesion(b.dataset.previa)); });
  }

  function filaSesion(s) {
    const sw = (campo, txt) => '<label class="interruptor"><input type="checkbox" data-apertura="' + campo + '" data-id="' + esc(s.id) + '"' + (s[campo] ? ' checked' : '') + '>' + txt + '</label>';
    return '<tr><td><b>' + s.numero + '</b></td><td><b>' + esc(s.titulo) + '</b><br><small style="color:var(--pizarra)">' + esc([s.fecha ? M.fechaCorta(s.fecha) : 'Sin fecha', s.hora, s.unidad, s.n_objetivos + ' objetivos', s.n_materiales + ' materiales', s.defensa ? 'con defensa' : ''].filter(Boolean).join(' · ')) + '</small></td>' +
      '<td><select class="estado" data-id="' + esc(s.id) + '">' + ['oculta', 'visible', 'abierta', 'cerrada'].map(e => '<option value="' + e + '"' + (s.estado === e ? ' selected' : '') + '>' + window.Sesiones.ESTADOS[e][0] + '</option>').join('') + '</select></td>' +
      '<td><div style="display:grid;gap:4px">' + sw('materiales_visibles', 'Materiales') + sw('control_abierto', 'Control de lectura') + sw('entrega_abierta', 'Entrega') + '</div></td>' +
      '<td><div class="acciones"><button class="btn s peq" type="button" data-editar-sesion="' + esc(s.id) + '">Editar</button><button class="btn t peq" type="button" data-previa="' + esc(s.id) + '">Vista del estudiante</button></div></td></tr>';
  }

  async function cambiarEstado(ids, estado, btn) {
    const hacer = async () => {
      try { await M.api('cambiarEstadoSesiones', { ids: ids, estado: estado }); await irA('sesiones', true); }
      catch (e) { M.msg('#s-msg', e.message, 'mal'); }
    };
    if (btn) await M.ocupado(btn, () => M.conVelo(hacer)); else await M.conVelo(hacer);
  }

  async function previaSesion(id) {
    const v = versionActual();
    const s = await M.api('verSesionDocente', { sesion_id: id });
    const m = M.modal('Vista del estudiante', window.Sesiones.vista(Object.assign({}, s, { materiales_visibles: true }), v.minutos));
    m.el.querySelector('.modal').classList.add('ancho');
  }

  async function editarSesion(id) {
    const v = versionActual();
    const s = await M.api('verSesionDocente', { sesion_id: id });
    const base = window.Sesiones.calcularRuta(v.minutos, s.ruta);
    const minDe = k => (base.find(b => b.momento === k) || {}).minutos;
    const m = M.modal('Sesión ' + s.numero + ' · Editar',
      '<fieldset><legend>Datos</legend><div class="campo"><label for="e-titulo">Título *</label><input type="text" id="e-titulo" value="' + esc(s.titulo) + '"></div>' +
      '<div class="fila"><div class="campo"><label for="e-unidad">Unidad</label><input type="text" id="e-unidad" value="' + esc(s.unidad || '') + '"></div>' +
      '<div class="campo"><label for="e-fecha">Fecha</label><input type="date" id="e-fecha" value="' + esc(s.fecha || '') + '"></div>' +
      '<div class="campo"><label for="e-hora">Hora de inicio</label><input type="text" id="e-hora" placeholder="18:30" value="' + esc(s.hora || '') + '"></div></div>' +
      '<label class="check"><input type="checkbox" id="e-defensa"' + (s.defensa ? ' checked' : '') + '><span>Esta sesión tiene defensa relámpago (15 minutos antes del cierre)</span></label></fieldset>' +
      '<fieldset><legend>Objetivos</legend><div class="campo"><label for="e-obj">En esta sesión aprenderás a…</label><textarea id="e-obj" style="font-family:var(--sans);font-size:14px;min-height:110px">' + esc((s.objetivos || []).join('\n')) + '</textarea>' +
      '<span class="ayuda">Un objetivo por línea, comenzando con un verbo en infinitivo. Máximo seis. Reaparecen en el cierre para la autoevaluación.</span></div></fieldset>' +
      '<fieldset><legend>Ruta de la sesión · ' + v.minutos + ' minutos</legend><div id="e-ruta">' + s.ruta.map((b, i) =>
        '<div class="bloque-ed" data-momento="' + esc(b.momento) + '"><input type="text" data-titulo value="' + esc(b.titulo) + '"><textarea data-desc style="font-family:var(--sans);font-size:13px;min-height:56px">' + esc(b.descripcion || '') + '</textarea><span class="min">' + (minDe(b.momento) != null ? minDe(b.momento) + ' min' : '') + '</span></div>').join('') +
      '</div><span class="ayuda">Los minutos se calculan solos según la duración de la sesión. Se recalculan al guardar.</span></fieldset>' +
      '<fieldset><legend>Materiales</legend><div id="e-mats" style="display:grid;gap:8px"></div><div><button class="btn s peq" type="button" id="e-mat-mas">Agregar material</button></div>' +
      '<span class="ayuda">Cuaderno y podcast en Drive, compartidos como "Cualquier persona con el enlace". Video en YouTube como "No listado". Pega la dirección completa.</span></fieldset><div id="e-msg"></div>',
      '<button class="btn s" type="button" data-cerrar>Cancelar</button><button class="btn p" type="button" id="e-ok">Guardar sesión</button>');
    m.el.querySelector('.modal').classList.add('ancho');
    const cont = $('#e-mats', m.el);
    const filaMat = x => {
      x = x || { tipo: 'cuaderno', titulo: '', url: '' };
      const d = document.createElement('div'); d.className = 'mat-ed';
      d.innerHTML = '<select data-tipo>' + Object.keys(window.Sesiones.TIPOS).map(t => '<option value="' + t + '"' + (x.tipo === t ? ' selected' : '') + '>' + window.Sesiones.TIPOS[t] + '</option>').join('') + '</select>' +
        '<input type="text" data-tit placeholder="Título" value="' + esc(x.titulo) + '"><input type="url" data-url placeholder="https://" value="' + esc(x.url) + '"><button class="btn t peq" type="button" data-quitar>Quitar</button>';
      d.querySelector('[data-quitar]').onclick = () => d.remove();
      cont.appendChild(d);
    };
    (s.materiales || []).forEach(filaMat);
    $('#e-mat-mas', m.el).onclick = () => filaMat();
    $('#e-ok', m.el).onclick = async ev => {
      const d = {
        id: s.id, titulo: $('#e-titulo', m.el).value, unidad: $('#e-unidad', m.el).value, fecha: $('#e-fecha', m.el).value, hora: $('#e-hora', m.el).value.trim(),
        defensa: $('#e-defensa', m.el).checked,
        objetivos: $('#e-obj', m.el).value.split('\n').map(x => x.trim().replace(/^[-•\d.)\s]+/, '')).filter(Boolean),
        ruta: Array.from(m.el.querySelectorAll('.bloque-ed')).map(b => ({ momento: b.dataset.momento, titulo: b.querySelector('[data-titulo]').value, descripcion: b.querySelector('[data-desc]').value })),
        materiales: Array.from(cont.querySelectorAll('.mat-ed')).map(r => ({ tipo: r.querySelector('[data-tipo]').value, titulo: r.querySelector('[data-tit]').value, url: r.querySelector('[data-url]').value.trim() })).filter(x => x.url || x.titulo)
      };
      await M.ocupado(ev.currentTarget, async () => {
        try { await M.api('guardarSesion', d); m.cerrar(); await irA('sesiones'); }
        catch (e) { M.msg($('#e-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  /* ---------- Links de registro ---------- */
  async function panelRegistro(p) {
    const v = versionActual();
    p.innerHTML = '<div class="tarjeta" style="margin-top:16px"><h2 style="font-size:1.1rem">Nuevo link para ' + esc(v.asignatura) + '</h2>' +
      '<div class="fila"><div class="campo"><label for="k-dias">Vigencia (días)</label><input type="number" id="k-dias" value="14" min="1" max="120"></div>' +
      '<div class="campo"><label for="k-cupo">Cupo</label><input type="number" id="k-cupo" value="35" min="1" max="300"></div>' +
      '<div class="campo"><label for="k-dominio">Dominio del correo institucional</label><input type="text" id="k-dominio" placeholder="mail.udp.cl"><span class="ayuda">Opcional. Si lo indicas, solo se registran correos de ese dominio.</span></div></div>' +
      '<div><button class="btn p" type="button" id="k-crear">Generar link</button></div><div id="k-msg"></div></div>' +
      '<div class="tabla" style="margin-top:16px"><table><thead><tr><th>Link</th><th>Vence</th><th>Uso</th><th>Dominio</th><th>Estado</th><th></th></tr></thead><tbody id="k-lista"><tr><td colspan="6" class="vacio">Cargando…</td></tr></tbody></table></div>';
    $('#k-crear').onclick = async ev => {
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const l = await M.api('crearLink', { version_id: v.id, dias: $('#k-dias').value, cupo: $('#k-cupo').value, dominio: $('#k-dominio').value });
          M.msg('#k-msg', 'Link creado. Cópialo y envíalo al curso.', 'ok'); await listarLinks(v.id); M.copiar(l.url);
        } catch (e) { M.msg('#k-msg', e.message, 'mal'); }
      });
    };
    await listarLinks(v.id);
  }

  async function listarLinks(vid) {
    const tb = $('#k-lista');
    try {
      const ls = await M.api('listarLinks', { version_id: vid });
      const d0 = new Date(), z = n => String(n).padStart(2, '0'); const hoy = d0.getFullYear() + '-' + z(d0.getMonth() + 1) + '-' + z(d0.getDate()) + ' ' + z(d0.getHours()) + ':' + z(d0.getMinutes());
      tb.innerHTML = ls.length ? ls.map(l => {
        const vigente = l.activo && l.vence > hoy && l.usados < l.cupo;
        return '<tr><td><code style="font:12px var(--mono);word-break:break-all">' + esc(l.url) + '</code></td><td>' + esc(M.fecha(l.vence)) + '</td><td>' + l.usados + ' / ' + l.cupo + '</td><td>' + esc(l.dominio || 'Cualquiera') + '</td>' +
          '<td><span class="chip ' + (vigente ? 'ok' : 'gris') + '">' + (vigente ? 'Vigente' : (l.activo ? 'Vencido o completo' : 'Desactivado')) + '</span></td>' +
          '<td><div class="acciones"><button class="btn s peq" type="button" data-copiar="' + esc(l.url) + '">Copiar</button>' + (l.activo ? '<button class="btn t peq" type="button" data-desactivar="' + esc(l.token) + '">Desactivar</button>' : '') + '</div></td></tr>';
      }).join('') : '<tr><td colspan="6" class="vacio">Aún no hay links para esta versión.</td></tr>';
      tb.querySelectorAll('[data-copiar]').forEach(b => { b.onclick = () => M.copiar(b.dataset.copiar, b); });
      tb.querySelectorAll('[data-desactivar]').forEach(b => { b.onclick = async () => { await M.ocupado(b, async () => { try { await M.api('desactivarLink', { token: b.dataset.desactivar }); await listarLinks(vid); } catch (e) { M.msg('#k-msg', e.message, 'mal'); } }); }; });
    } catch (e) { tb.innerHTML = '<tr><td colspan="6"><div class="msg mal">' + esc(e.message) + '</div></td></tr>'; }
  }

  /* ---------- Personas ---------- */
  async function panelPersonas(p) {
    p.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0"><input type="text" id="p-buscar" placeholder="Buscar por nombre, correo o mención" style="max-width:360px">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn s" type="button" id="p-masiva">Carga masiva</button><button class="btn p" type="button" id="p-nueva">Agregar persona</button></div></div>' +
      '<div id="p-msg"></div><div id="p-resumen" style="color:var(--pizarra);font-size:.86rem;margin-bottom:8px"></div>' +
      '<div class="tabla"><table><thead><tr><th>Persona</th><th>Contacto</th><th>Rol</th><th>Ficha</th><th>Último ingreso</th><th></th></tr></thead><tbody id="p-lista"><tr><td colspan="6" class="vacio">Cargando…</td></tr></tbody></table></div>';
    $('#p-nueva').onclick = formPersona;
    $('#p-masiva').onclick = formMasiva;
    $('#p-buscar').oninput = pintarPersonas;
    await cargarPersonas();
  }

  async function cargarPersonas() {
    try { D.personas = await M.api('listarPersonas', { version_id: D.versionId }); pintarPersonas(); }
    catch (e) { $('#p-lista').innerHTML = '<tr><td colspan="6"><div class="msg mal">' + esc(e.message) + '</div></td></tr>'; }
  }

  function pintarPersonas() {
    const q = ($('#p-buscar').value || '').toLowerCase();
    const lista = D.personas.filter(x => !q || [x.nombre, x.correo_institucional, x.correo_personal, x.mencion, x.organizacion].join(' ').toLowerCase().indexOf(q) >= 0);
    const est = D.personas.filter(x => x.rol_curso === 'estudiante' && x.inscripcion_activa);
    $('#p-resumen').textContent = est.length + ' estudiantes activos · ' + est.filter(x => x.ficha_completa).length + ' con ficha completa · ' + D.personas.filter(x => x.rol_curso === 'observador').length + ' observadores';
    const tb = $('#p-lista');
    tb.innerHTML = lista.length ? lista.map(x =>
      '<tr' + (x.inscripcion_activa ? '' : ' style="opacity:.5"') + '><td><div class="persona">' + (x.foto_mini ? '<img class="foto" src="' + esc(x.foto_mini) + '" alt="" data-foto="' + esc(x.id) + '" style="cursor:zoom-in">' : '<span class="foto"></span>') +
      '<div><b>' + esc(x.nombre) + '</b><small>' + esc([x.mencion, x.organizacion].filter(Boolean).join(' · ')) + '</small></div></div></td>' +
      '<td><small>' + esc(x.correo_institucional) + (x.correo_personal ? '<br>' + esc(x.correo_personal) : '') + (x.celular ? '<br>' + esc(x.celular) : '') + '</small></td>' +
      '<td><span class="chip ' + (x.rol_curso === 'observador' ? 'info' : 'gris') + '">' + (x.rol_curso === 'observador' ? 'Observador' : 'Estudiante') + '</span><br><small style="color:var(--pizarra)">' + esc({ link: 'Por link', manual: 'Alta manual', masiva: 'Carga masiva' }[x.origen] || x.origen) + '</small></td>' +
      '<td>' + (x.rol_curso === 'observador' ? '<span class="chip gris">No aplica</span>' : (x.ficha_completa ? '<span class="chip ok">Completa</span>' : '<span class="chip aviso">Pendiente</span>')) + '</td>' +
      '<td><small>' + esc(M.fecha(x.ultimo_ingreso) || 'Nunca') + '</small></td>' +
      '<td><div class="acciones"><button class="btn s peq" type="button" data-editar="' + esc(x.id) + '">Editar</button><button class="btn t peq" type="button" data-acceso="' + esc(x.id) + '">Reenviar acceso</button>' +
      '<button class="btn t peq" type="button" data-estado="' + esc(x.inscripcion_id) + '" data-activo="' + (x.inscripcion_activa ? '0' : '1') + '">' + (x.inscripcion_activa ? 'Desactivar' : 'Activar') + '</button></div></td></tr>').join('')
      : '<tr><td colspan="6" class="vacio">' + (D.personas.length ? 'Nadie coincide con la búsqueda.' : 'Aún no hay personas en esta versión. Comparte un link de registro o agrégalas aquí.') + '</td></tr>';
    tb.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => formEditar(D.personas.find(x => x.id === b.dataset.editar)); });
    tb.querySelectorAll('[data-acceso]').forEach(b => { b.onclick = () => reenviar(D.personas.find(x => x.id === b.dataset.acceso)); });
    tb.querySelectorAll('[data-estado]').forEach(b => { b.onclick = async () => { await M.ocupado(b, async () => { try { await M.api('cambiarEstadoInscripcion', { inscripcion_id: b.dataset.estado, activo: b.dataset.activo === '1' }); await cargarPersonas(); } catch (e) { M.msg('#p-msg', e.message, 'mal'); } }); }; });
    tb.querySelectorAll('[data-foto]').forEach(img => { img.onclick = () => verFoto(img.dataset.foto); });
  }

  function camposBasicos(x) {
    x = x || {};
    const c = (id, t, tipo) => '<div class="campo"><label for="n-' + id + '">' + t + '</label><input type="' + (tipo || 'text') + '" id="n-' + id + '" value="' + esc(x[id] || '') + '"></div>';
    return '<div class="fila">' + c('primer_nombre', 'Primer nombre *') + c('segundo_nombre', 'Segundo nombre') + c('primer_apellido', 'Primer apellido *') + c('segundo_apellido', 'Segundo apellido') + '</div>' +
      '<div class="fila">' + c('correo_institucional', 'Correo institucional *', 'email') + c('correo_personal', 'Correo personal', 'email') + c('celular', 'Celular', 'tel') + '</div>';
  }
  function leerBasicos(el) {
    const d = {}; ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'correo_institucional', 'correo_personal', 'celular'].forEach(k => { d[k] = $('#n-' + k, el).value.trim(); });
    return d;
  }

  function formPersona() {
    const m = M.modal('Agregar persona',
      '<div class="campo"><span class="etq">Rol en esta versión</span><div class="opciones"><label><input type="radio" name="n-rol" value="estudiante" checked><span>Estudiante</span></label><label><input type="radio" name="n-rol" value="observador"><span>Observador</span></label></div>' +
      '<span class="ayuda">El observador ve el curso como un estudiante, con el caso guía, sin poder enviar. Úsalo para jefaturas y directivos.</span></div>' + camposBasicos() +
      '<label class="check"><input type="checkbox" id="n-enviar" checked><span>Enviar por correo el acceso con su clave temporal</span></label><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Agregar</button>');
    $('#n-ok', m.el).onclick = async ev => {
      const d = Object.assign(leerBasicos(m.el), { version_id: D.versionId, rol: $('input[name=n-rol]:checked', m.el).value, enviar: $('#n-enviar', m.el).checked });
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('crearPersona', d);
          $('.cuerpo', m.el).innerHTML = '<div class="msg ok">' + esc(r.usuario.nombre) + (r.inscripcion_nueva ? ' quedó inscrito en esta versión.' : ' ya estaba inscrito en esta versión.') + '</div>' +
            (r.clave_temporal ? '<p style="margin:0">Clave temporal' + (r.correo_enviado ? ' (también enviada por correo)' : ' (no se pudo enviar por correo; entrégala tú)') + ':</p><div class="clave-temp">' + esc(r.clave_temporal) + '</div><p style="margin:0;font-size:.85rem;color:var(--pizarra)">Ingresa con ' + esc(r.usuario.correo_institucional) + '. Al entrar se le pedirá cambiarla.</p>' : '<p style="margin:0">Ya tenía clave propia; puede ingresar como siempre.</p>');
          $('footer', m.el).innerHTML = '<button class="btn p" type="button" data-cerrar>Listo</button>';
          await cargarPersonas(); cargarVersiones();
        } catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  function formEditar(x) {
    const m = M.modal('Editar datos de ' + x.nombre, '<p style="margin:0;color:var(--pizarra);font-size:.88rem">Corrige errores de ingreso. Los cambios quedan registrados en la auditoría.</p>' + camposBasicos(x) +
      '<div class="fila"><div class="campo"><label for="n-mencion">Mención o área</label><input type="text" id="n-mencion" value="' + esc(x.mencion || '') + '"></div><div class="campo"><label for="n-organizacion">Organización</label><input type="text" id="n-organizacion" value="' + esc(x.organizacion || '') + '"></div></div><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Guardar cambios</button>');
    $('#n-ok', m.el).onclick = async ev => {
      const d = Object.assign(leerBasicos(m.el), { usuario_id: x.id, mencion: $('#n-mencion', m.el).value, organizacion: $('#n-organizacion', m.el).value });
      await M.ocupado(ev.currentTarget, async () => {
        try { await M.api('actualizarPersona', d); m.cerrar(); await cargarPersonas(); }
        catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  function reenviar(x) {
    const m = M.modal('Reenviar acceso', '<p style="margin:0">Se generará una <b>clave temporal nueva</b> para ' + esc(x.nombre) + ' y se enviará a ' + esc([x.correo_institucional, x.correo_personal].filter(Boolean).join(' y ')) + '. La clave anterior dejará de funcionar. El acceso con Google no cambia.</p><div id="n-msg"></div>',
      '<button class="btn s" type="button" data-cerrar>Cancelar</button><button class="btn p" type="button" id="n-ok">Generar y enviar</button>');
    $('#n-ok', m.el).onclick = async ev => {
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('reenviarAcceso', { usuario_id: x.id, version_id: D.versionId });
          $('.cuerpo', m.el).innerHTML = '<div class="msg ' + (r.correo_enviado ? 'ok' : 'aviso') + '">' + (r.correo_enviado ? 'Acceso enviado por correo.' : 'No se pudo enviar el correo; entrega tú la clave.') + '</div><div class="clave-temp">' + esc(r.clave_temporal) + '</div>';
          $('footer', m.el).innerHTML = '<button class="btn p" type="button" data-cerrar>Listo</button>';
        } catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  function formMasiva() {
    const m = M.modal('Carga masiva',
      '<p style="margin:0;font-size:.9rem">Copia las filas desde una planilla y pégalas aquí, con estas columnas en este orden:</p>' +
      '<div class="clave-temp" style="font-size:.78rem;user-select:text">primer_nombre · segundo_nombre · primer_apellido · segundo_apellido · correo_institucional · correo_personal · celular</div>' +
      '<p style="margin:0;font-size:.82rem;color:var(--pizarra)">La fila de encabezados es opcional. Las columnas vacías se dejan vacías, sin borrarlas. Máximo 200 filas. Gmail permite unos 100 correos al día.</p>' +
      '<div class="campo"><label for="n-texto">Filas</label><textarea id="n-texto" placeholder="Ana\t\tPérez\tSoto\tana.perez@mail.udp.cl\t\t+56912345678"></textarea></div>' +
      '<div class="opciones"><label><input type="radio" name="n-rol" value="estudiante" checked><span>Estudiantes</span></label><label><input type="radio" name="n-rol" value="observador"><span>Observadores</span></label></div>' +
      '<label class="check"><input type="checkbox" id="n-enviar" checked><span>Enviar por correo el acceso a cada persona</span></label><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Cargar</button>');
    $('#n-ok', m.el).onclick = async ev => {
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('cargaMasiva', { version_id: D.versionId, texto: $('#n-texto', m.el).value, rol: $('input[name=n-rol]:checked', m.el).value, enviar: $('#n-enviar', m.el).checked });
          let h = '<div class="msg ok">' + r.creados + ' personas nuevas · ' + r.ya_existian + ' ya existían y quedaron inscritas · ' + r.rechazados.length + ' filas rechazadas.</div>';
          if (r.rechazados.length) h += '<div class="tabla"><table><thead><tr><th>Fila</th><th>Contenido</th><th>Motivo</th></tr></thead><tbody>' + r.rechazados.map(x => '<tr><td>' + x.fila + '</td><td><small>' + esc(x.contenido) + '</small></td><td>' + esc(x.motivo) + '</td></tr>').join('') + '</tbody></table></div>';
          if (r.claves.length) h += '<div class="msg aviso">Estas claves no se pudieron enviar por correo. Cópialas ahora; no se volverán a mostrar.</div><div class="tabla"><table><thead><tr><th>Persona</th><th>Correo</th><th>Clave temporal</th></tr></thead><tbody>' + r.claves.map(x => '<tr><td>' + esc(x.nombre) + '</td><td>' + esc(x.correo) + '</td><td><code>' + esc(x.clave) + '</code></td></tr>').join('') + '</tbody></table></div>';
          h += '<p style="margin:0;font-size:.82rem;color:var(--pizarra)">Correos disponibles hoy: ' + r.correos_restantes_hoy + '</p>';
          $('.cuerpo', m.el).innerHTML = h;
          $('footer', m.el).innerHTML = '<button class="btn p" type="button" data-cerrar>Listo</button>';
          await cargarPersonas(); cargarVersiones();
        } catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  async function verFoto(id) {
    const x = D.personas.find(p => p.id === id);
    const m = M.modal(x ? x.nombre : 'Fotografía', '<div class="vacio">Cargando fotografía…</div>');
    try { const r = await M.api('verFoto', { usuario_id: id }); $('.cuerpo', m.el).innerHTML = r.foto ? '<img src="' + r.foto + '" alt="" style="width:100%;max-width:420px;border-radius:12px;justify-self:center">' : '<div class="vacio">Sin fotografía.</div>'; }
    catch (e) { $('.cuerpo', m.el).innerHTML = '<div class="msg mal">' + esc(e.message) + '</div>'; }
  }
})();
