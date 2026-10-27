/* Metis · docente.js (GitHub, interfaz) · Ambiente del docente: clase de hoy, versiones, sesiones, registro y personas. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc, $ = M.$;
  const D = window.Docente = { versiones: [], versionId: null, pestana: 'hoy', personas: [] };

  const PESTANAS = [['hoy', 'Inicio'], ['versiones', 'Cursos'], ['sesiones', 'Sesiones'], ['registro', 'Registros'], ['personas', 'Personas']];

  /** Punto de entrada desde el enrutador (#d/pestaña). Monta el ambiente la primera vez y luego solo cambia de pestaña. */
  D.ir = async function (c, tab) {
    if (D.c !== c || !$('#d-panel')) await montar(c);
    tab = PESTANAS.some(t => t[0] === tab) ? tab : (PESTANAS.some(t => t[0] === D.pestana) ? D.pestana : 'hoy');
    // La dirección siempre muestra la pestaña, para que Atrás y recargar funcionen bien.
    if (location.hash !== '#d/' + tab) history.replaceState(null, '', location.pathname + '#d/' + tab);
    await irA(tab, true);
  };

  async function montar(c) {
    D.c = c;
    try { D.pestana = localStorage.getItem('metis_doc_tab') || 'hoy'; D.versionId = localStorage.getItem('metis_doc_version'); } catch (e) { /* sin almacenamiento */ }
    c.innerHTML = '<div class="doc-cab"><h1>Ambiente del docente</h1><p>Gestiona cursos, sesiones, estudiantes y recursos en un solo lugar.</p></div>' +
      '<div id="d-selector"></div><div id="d-contrato"></div><div class="resumen" id="d-resumen"></div>' +
      '<h2 class="doc-sec" id="d-titulo"></h2><section id="d-panel"><div class="vacio">Cargando…</div></section>';
    revisarContrato();
    await cargarVersiones();
    pintarResumen();
  }

  async function revisarContrato() {
    try {
      const est = await M.api('ping');
      const faltan = M.CONTRATO.filter(a => (est.acciones || []).indexOf(a) < 0);
      if (faltan.length) M.msg('#d-contrato', 'El servicio no tiene estas acciones que usa la página: ' + faltan.join(', ') + '. Actualiza los archivos de Apps Script y publica una nueva versión.', 'mal');
      else if (String(est.version).split('.').slice(0, 2).join('.') !== String(M.version).split('.').slice(0, 2).join('.')) M.msg('#d-contrato', 'La página es la versión ' + M.version + ' y el servicio la ' + est.version + '. Conviene que coincidan.', 'aviso');
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
    el.innerHTML = '<label class="doc-version"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg><span class="sr">Curso</span><select id="d-version">' +
      D.versiones.map(v => '<option value="' + esc(v.id) + '"' + (v.id === D.versionId ? ' selected' : '') + '>' + esc(nombreVersion(v)) + '</option>').join('') + '</select></label>';
    $('#d-version').addEventListener('change', e => { D.versionId = e.target.value; recordar(); pintarResumen(); irA(D.pestana); });
  }

  /** Tres tarjetas de resumen: cursos activos, próxima sesión y estudiantes del curso elegido. */
  const ICO_RES = {
    cursos: '<path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13.5"/>',
    sesion: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    personas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 010 5.8M18 14.5c1.9.7 3 2.6 3 5.5"/>'
  };
  async function pintarResumen() {
    const el = $('#d-resumen'); if (!el) return;
    const v = versionActual();
    const tarjeta = (k, cls, rot, val, href) => '<a class="res ' + cls + '" href="' + href + '"><span class="ico"><svg viewBox="0 0 24 24">' + ICO_RES[k] + '</svg></span><span><small>' + rot + '</small><b>' + val + '</b></span><span class="fl" aria-hidden="true">→</span></a>';
    const activas = D.versiones.filter(x => x.estado !== 'archivada').length;
    const pintar = prox => {
      el.innerHTML = tarjeta('cursos', 'c1', 'Cursos activos', activas, '#d/versiones') + tarjeta('sesion', 'c2', 'Próxima sesión', prox, '#d/hoy') +
        tarjeta('personas', 'c3', 'Estudiantes', v ? v.estudiantes : 0, '#d/personas');
    };
    pintar('…');
    if (!v) { pintar('Sin curso'); return; }
    try {
      const r = await M.api('listarSesiones', { version_id: v.id });
      const hoy = window.Sesiones.hoy();
      const prox = r.sesiones.filter(x => x.fecha && x.fecha >= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero))[0];
      pintar(prox ? 'Sesión ' + prox.numero + ' · ' + (prox.fecha === hoy ? 'hoy' : M.fechaCorta(prox.fecha)) + (window.Sesiones.horaDe(prox, v) ? ' ' + esc(window.Sesiones.horaDe(prox, v)) : '') : 'Por programar');
    } catch (e) { pintar('Por programar'); }
  }

  function nombreVersion(v) { return v.asignatura + ' · ' + v.institucion + ' · ' + [v.periodo, v.anio].filter(Boolean).join(' '); }
  function recordar() { try { localStorage.setItem('metis_doc_tab', D.pestana); if (D.versionId) localStorage.setItem('metis_doc_version', D.versionId); } catch (e) { /* nada */ } }
  function versionActual() { return D.versiones.find(v => v.id === D.versionId); }

  /** Pinta una pestaña. Muestra el velo de carga salvo cuando ya hay uno activo (sinVelo). */
  function irA(tab, sinVelo) {
    if (!sinVelo) return M.conVelo(() => irA(tab, true));
    M.limpiarRelojes();
    if (!PESTANAS.some(t => t[0] === tab)) tab = 'hoy';
    D.pestana = tab; recordar();
    document.querySelectorAll('#d-tabs [data-tab]').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));
    const tit = $('#d-titulo'); if (tit) tit.textContent = { hoy: 'Clase de hoy', versiones: 'Cursos', sesiones: 'Sesiones', registro: 'Links de registro', personas: 'Personas' }[tab];
    const p = $('#d-panel');
    if (tab !== 'versiones' && !D.versionId) { p.innerHTML = '<div class="tarjeta" style="margin-top:16px"><h2 style="font-size:1.1rem">Primero crea una versión del curso</h2><p style="margin:0">Las sesiones, los links de registro y las personas pertenecen a una versión.</p><div><a class="btn p" href="#d/versiones">Ir a versiones</a></div></div>'; return; }
    return Promise.resolve(({ hoy: panelHoy, versiones: panelVersiones, sesiones: panelSesiones, registro: panelRegistro, personas: panelPersonas })[tab](p));
  }

  /* ---------- Clase de hoy: horario, reloj y alertas de lo que corresponde hacer ---------- */
  const CONTROLES_BASE = [2, 5, 8]; // sesiones con control de lectura en la planificación de 12

  async function panelHoy(p) {
    const v = versionActual();
    let r;
    try { r = await M.api('listarSesiones', { version_id: v.id }); }
    catch (e) { p.innerHTML = '<div class="msg mal" style="margin-top:16px">' + esc(e.message) + '</div>'; return; }
    D.sesiones = r.sesiones;
    const S = window.Sesiones, hoy = S.hoy();
    const conFecha = r.sesiones.filter(s => s.fecha).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero));
    const s = conFecha.find(x => x.fecha === hoy);
    if (!s) {
      const prox = conFecha.find(x => x.fecha > hoy);
      p.innerHTML = '<div class="tarjeta" style="margin-top:16px"><h2>Hoy no hay clase</h2>' +
        (!r.sesiones.length ? '<p class="sub">Esta versión aún no tiene sesiones. Créalas en la pestaña Sesiones.</p><div><a class="btn p" href="#d/sesiones">Ir a sesiones</a></div>'
          : prox ? '<p class="sub">La próxima es la <b>sesión ' + prox.numero + ' · ' + esc(prox.titulo) + '</b>, el ' + esc(M.fechaLarga(prox.fecha)) + (S.horaDe(prox, v) ? ' a las ' + esc(S.horaDe(prox, v)) : '') + '. Estado: ' + S.chipEstado(prox.estado) + '</p>' +
            '<p class="sub">' + (v.apertura_lunes && prox.abre_el ? 'Sus materiales se abren solos para los estudiantes el ' + esc(M.fechaLarga(prox.abre_el)) + ', junto con las demás sesiones de esa semana. Revisa antes que estén cargados.' : 'Antes de esa clase: publica los materiales y deja la sesión visible para que los estudiantes vean objetivos y ruta.') + '</p><div><a class="btn s" href="#d/sesiones">Ir a sesiones</a></div>'
          : '<p class="sub">Ninguna sesión tiene fecha cargada. Agrega las fechas en Sesiones, con el botón Editar de cada una, para que este panel te acompañe durante la clase.</p><div><a class="btn s" href="#d/sesiones">Ir a sesiones</a></div>') + '</div>';
      return;
    }
    const pintar = () => { if ($('#h-clase')) $('#h-clase').innerHTML = claseHoy(s, v); enlazarHoy(p, s); };
    p.innerHTML = '<div id="h-msg"></div><div id="h-clase" style="margin-top:16px"></div>';
    pintar();
    M.relojes.push(setInterval(() => { if (!$('#h-clase')) { M.limpiarRelojes(); return; } pintar(); }, 30000));
  }

  function claseHoy(s, v) {
    const S = window.Sesiones, e = S.estadoAhora(s, v), r = e.r;
    const fase = e.fase === 'en_curso' ? e.actual.clave : e.fase === 'antes' ? 'inicio' : e.fase === 'terminada' ? 'despues' : '';
    const orden = ['inicio', 'desarrollo', 'defensa', 'cierre', 'despues'];
    const des = r.lista.find(m => m.clave === 'desarrollo');
    const recreo = des && des.recreo && r.inicio != null ? S.aHora(r.inicio + des.desde + Math.round(des.min / 10) * 5) : '';
    const conControl = Number(v.sesiones) === 12 && CONTROLES_BASE.indexOf(s.numero) >= 0;
    const items = [
      { m: 'inicio', t: 'Abre la sesión para que los estudiantes puedan trabajar', hecho: s.estado === 'abierta' || s.estado === 'cerrada', accion: s.estado !== 'abierta' && s.estado !== 'cerrada' ? 'estado:abierta' : '', btn: 'Abrir sesión' },
      (v.apertura_lunes && s.abre_el && S.hoy() >= s.abre_el)
        ? { m: 'inicio', t: 'Los materiales se abrieron solos el lunes ' + M.fechaCorta(s.abre_el), hecho: true }
        : { m: 'inicio', t: 'Publica los materiales de la sesión', hecho: s.materiales_visibles, accion: !s.materiales_visibles ? 'apertura:materiales_visibles' : '', btn: 'Publicar materiales' },
      { m: 'inicio', t: 'Proyecta el código de asistencia', nota: 'Cambia cada minuto. Se puede registrar toda la clase; después de la tolerancia queda como atraso.', ver: 'codigo', btn: 'Mostrar código' },
      conControl ? { m: 'inicio', t: 'Abre el control de lectura', hecho: s.control_abierto, accion: !s.control_abierto ? 'apertura:control_abierto' : '', btn: 'Abrir control' } : null,
      { m: 'inicio', t: 'Presenta los objetivos: "En esta sesión aprenderás a…"' },
      { m: 'desarrollo', t: 'Abre la entrega del trabajo de la sesión', hecho: s.entrega_abierta, accion: !s.entrega_abierta ? 'apertura:entrega_abierta' : '', btn: 'Abrir entrega' },
      conControl ? { m: 'desarrollo', t: 'Cierra el control de lectura antes del primer taller', hecho: !s.control_abierto, accion: s.control_abierto ? 'cerrar:control_abierto' : '', btn: 'Cerrar control' } : null,
      des && des.recreo ? { m: 'desarrollo', t: 'Recreo de ' + des.recreo + ' minutos' + (recreo ? ', cerca de las ' + recreo : '') + ', entre los dos talleres' } : null,
      s.defensa ? { m: 'defensa', t: 'Sortea cinco proyectos para la defensa relámpago', nota: 'El sorteo automático llega en la etapa 4. Los comentarios críticos se hacen en voz alta, en la sala.' } : null,
      { m: 'desarrollo', t: 'Revisa quién no ha registrado asistencia y marca a mano los casos especiales', ver: 'lista', btn: 'Lista de asistencia' },
      { m: 'cierre', t: 'Pide la actividad de cierre: autoevaluación por objetivo, con evidencia de su proyecto', ver: 'entregas', btn: 'Ver entregas' },
      { m: 'cierre', t: 'Recuerda el plazo: hasta las 23:59 de hoy, solo para quienes asistieron' },
      { m: 'despues', t: 'Mañana, cuando venza el plazo, cierra la sesión', hecho: s.estado === 'cerrada', accion: s.estado !== 'cerrada' ? 'estado:cerrada' : '', btn: 'Marcar como cerrada' }
    ].filter(Boolean);
    const titulos = { inicio: 'Inicio', desarrollo: 'Desarrollo', defensa: 'Defensa relámpago', cierre: 'Cierre', despues: 'Después de la clase' };
    const horaDe = k => { const m = r.lista.find(x => x.clave === k); return m && m.horaDesde ? m.horaDesde : k === 'despues' && r.fin != null ? S.aHora(r.fin) : ''; };
    const grupos = orden.filter(k => items.some(i => i.m === k));
    const ahora = S.aHora(S.ahoraMin());
    const linea = e.fase === 'antes' ? 'La clase empieza a las <b>' + S.aHora(r.inicio) + '</b>, en <b>' + S.duracion(e.faltan) + '</b>.'
      : e.fase === 'en_curso' ? 'Ahora: <b>' + esc(e.actual.titulo) + '</b> · quedan <b>' + S.duracion(e.quedanMomento) + '</b> · término a las <b>' + S.aHora(r.fin) + '</b>.'
      : e.fase === 'terminada' ? 'La clase terminó. La entrega sigue abierta hasta las <b>23:59</b>.' : 'Esta sesión no tiene hora de inicio. Agrégala en la versión o en la sesión.';
    return '<div class="tarjeta"><div class="cabecera" style="margin:0"><div><span class="lema" style="color:var(--naranja-t)">Clase de hoy</span><h2>Sesión ' + s.numero + ' · ' + esc(s.titulo) + '</h2>' +
      '<p class="sub" style="margin:0">' + esc([M.fechaLarga(s.fecha), r.inicio != null ? S.aHora(r.inicio) + ' a ' + S.aHora(r.fin) : ''].filter(Boolean).join(' · ')) + '</p></div>' + S.chipEstado(s.estado) + '</div>' +
      '<div class="reloj ' + e.fase + '"><span class="hora-actual">' + ahora + '</span><span>' + linea + '</span></div>' +
      '<div class="alertas">' + grupos.map(k => {
        const idx = orden.indexOf(k), actual = orden.indexOf(fase);
        const cls = !fase ? '' : idx === actual ? 'ahora' : idx < actual ? 'pasado' : 'futuro';
        return '<section class="grupo ' + cls + '"><h3><span>' + titulos[k] + '</span>' + (horaDe(k) ? '<small>' + horaDe(k) + '</small>' : '') + (cls === 'ahora' ? '<em>Ahora</em>' : '') + '</h3><ul>' +
          items.filter(i => i.m === k).map(i => {
            const est = i.hecho ? 'hecho' : (i.accion && cls === 'pasado') ? 'atrasado' : i.accion ? 'pendiente' : 'info';
            return '<li class="' + est + '"><span class="marca-a" aria-hidden="true">' + (est === 'hecho' ? '✓' : est === 'atrasado' ? '!' : '•') + '</span><div><b>' + esc(i.t) + '</b>' + (i.nota ? '<small>' + esc(i.nota) + '</small>' : '') + '</div>' +
              (i.accion ? '<button class="btn ' + (est === 'atrasado' || cls === 'ahora' ? 'p' : 's') + ' peq" type="button" data-accion="' + i.accion + '">' + esc(i.btn) + '</button>' : '') +
              (i.ver ? '<button class="btn ' + (cls === 'ahora' ? 'p' : 's') + ' peq" type="button" data-ver="' + i.ver + '">' + esc(i.btn) + '</button>' : '') + '</li>';
          }).join('') + '</ul></section>';
      }).join('') + '</div>' +
      '<div class="acciones" style="margin-top:4px"><button class="btn t peq" type="button" data-previa-hoy>Ver como estudiante</button><a class="btn t peq" href="#d/sesiones">Todas las sesiones</a></div></div>';
  }

  function enlazarHoy(p, s) {
    p.querySelectorAll('[data-accion]').forEach(b => {
      b.onclick = async () => {
        const [tipo, campo] = b.dataset.accion.split(':');
        await M.ocupado(b, () => M.conVelo(async () => {
          try {
            if (tipo === 'estado') await M.api('cambiarEstadoSesiones', { ids: [s.id], estado: campo });
            else await M.api('cambiarAperturaSesion', { sesion_id: s.id, campo: campo, valor: tipo === 'apertura' });
            await irA('hoy', true);
          } catch (e) { M.msg('#h-msg', e.message, 'mal'); window.scrollTo(0, 0); }
        }));
      };
    });
    const pv = p.querySelector('[data-previa-hoy]'); if (pv) pv.onclick = () => M.conVelo(() => previaSesion(s.id));
    p.querySelectorAll('[data-ver]').forEach(b => { b.onclick = () => abrirVista(b.dataset.ver, s.id); });
  }

  function abrirVista(cual, id) {
    if (cual === 'codigo') return proyectarCodigo(id);
    if (cual === 'lista') return M.conVelo(() => listaAsistencia(id));
    if (cual === 'entregas') return M.conVelo(() => verEntregas(id));
    if (cual === 'tareas') return M.conVelo(() => window.Tareas.editar(id, () => irA(D.pestana)));
  }

  /* ---------- Código de asistencia para proyectar ---------- */
  async function proyectarCodigo(id) {
    let datos;
    try { datos = await M.conVelo(() => M.api('codigoAsistencia', { sesion_id: id })); }
    catch (e) { M.modal('Código de asistencia', '<div class="msg mal">' + esc(e.message) + '</div>'); return; }
    const m = M.modal('Código de asistencia', '<div class="proyector"><p>Ingresa a Metis, abre la sesión y escribe:</p><div class="codigo-grande" id="pc-codigo"></div>' +
      '<div class="pc-barra"><i id="pc-barra"></i></div><p id="pc-info"></p><button class="btn s peq" type="button" id="pc-pantalla">Pantalla completa</button></div>');
    m.el.querySelector('.modal').classList.add('ancho', 'proyectar');
    let vence = Date.now() + datos.segundos * 1000, ultimo = 0;
    const pintar = () => {
      $('#pc-codigo', m.el).textContent = datos.codigo.split('').join(' ');
      $('#pc-info', m.el).innerHTML = '<b>' + datos.registrados + '</b> de ' + datos.inscritos + ' estudiantes registrados';
    };
    pintar();
    const tic = async () => {
      if (!document.body.contains(m.el)) { clearInterval(intervalo); return; }
      const resta = Math.max(0, vence - Date.now());
      $('#pc-barra', m.el).style.width = (resta / 600) + '%';
      if ((resta === 0 || Date.now() - ultimo > 15000) && !tic.ocupado) {
        tic.ocupado = true; ultimo = Date.now();
        try { datos = await M.api('codigoAsistencia', { sesion_id: id }); vence = Date.now() + datos.segundos * 1000; pintar(); } catch (e) { /* se reintenta */ }
        tic.ocupado = false;
      }
    };
    const intervalo = setInterval(tic, 500); ultimo = Date.now(); tic();
    $('#pc-pantalla', m.el).onclick = () => { const x = m.el.querySelector('.modal'); if (x.requestFullscreen) x.requestFullscreen().catch(() => {}); };
  }

  /* ---------- Lista de asistencia con registro manual ---------- */
  async function listaAsistencia(id) {
    const d = await M.api('listarAsistencia', { sesion_id: id });
    const op = (a, v, t) => '<option value="' + v + '"' + ((a ? a.estado : '') === v ? ' selected' : '') + '>' + t + '</option>';
    const m = M.modal('Asistencia · Sesión ' + d.sesion.numero,
      (d.estudiantes.length ? '<div class="tabla"><table><thead><tr><th>Estudiante</th><th>Registro</th><th>Estado</th></tr></thead><tbody>' + d.estudiantes.map(x =>
        '<tr><td><div class="persona">' + (x.foto_mini ? '<img class="foto" src="' + esc(x.foto_mini) + '" alt="">' : '') + '<div><b>' + esc(x.nombre) + '</b><small>' + esc(x.correo) + '</small></div></div></td>' +
        '<td>' + (x.asistencia ? esc(x.asistencia.hora) + (x.asistencia.via === 'docente' ? ' · a mano' : ' · con código') : '<span class="sub">Sin registro</span>') + '</td>' +
        '<td><select data-u="' + esc(x.id) + '">' + op(x.asistencia, '', 'Sin registro') + op(x.asistencia, 'presente', 'Presente') + op(x.asistencia, 'atrasado', 'Atrasado') + op(x.asistencia, 'justificado', 'Justificado') + op(x.asistencia, 'ausente', 'Ausente') + '</select></td></tr>').join('') + '</tbody></table></div>'
        : '<div class="vacio">Aún no hay estudiantes inscritos.</div>') + '<div id="la-msg"></div>');
    m.el.querySelector('.modal').classList.add('ancho');
    m.el.querySelectorAll('select[data-u]').forEach(sel => {
      const previo = sel.value;
      sel.onchange = async () => {
        try { await M.api('marcarAsistencia', { sesion_id: id, usuario_id: sel.dataset.u, estado: sel.value }); M.msg($('#la-msg', m.el), 'Asistencia actualizada.', 'ok'); }
        catch (e) { sel.value = previo; M.msg($('#la-msg', m.el), e.message, 'mal'); }
      };
    });
  }

  /* ---------- Entregas de una sesión ---------- */
  async function verEntregas(id) {
    const d = await M.api('entregasSesion', { sesion_id: id });
    const celda = r => !r ? '<span class="ent vacia">—</span>' : r.estado === 'enviada'
      ? '<button type="button" class="ent ' + (r.momento === 'despues' ? 'despues' : 'clase') + '" data-r="' + esc(r.id) + '" title="' + (r.momento === 'despues' ? 'Completada después de clase' : 'Enviada en clase') + '">✓ ' + esc(r.actualizado) + '</button>'
      : '<button type="button" class="ent borrador" data-r="' + esc(r.id) + '" title="Borrador">… ' + esc(r.actualizado) + '</button>';
    const asis = a => a ? '<span class="chip ' + (a.estado === 'ausente' ? 'mal' : a.estado === 'atrasado' ? 'aviso' : 'ok') + '">' + esc(a.estado) + '</span>' : '<span class="chip gris">Sin registro</span>';
    const m = M.modal('Entregas · Sesión ' + d.sesion.numero + ' · ' + d.sesion.titulo,
      '<div class="opciones leyenda"><span class="ent clase">✓ en clase</span><span class="ent despues">✓ después de clase</span><span class="ent borrador">… borrador</span><span class="ent vacia">— sin empezar</span></div>' +
      (d.estudiantes.length ? '<div class="tabla"><table class="entregas"><thead><tr><th>Estudiante</th><th>Asistencia</th>' + d.tareas.map((t, i) => '<th title="' + esc(t.titulo) + '">' + (t.tipo === 'cierre' ? 'Cierre' : 'T' + (i + 1)) + '</th>').join('') + '</tr></thead><tbody>' +
        d.estudiantes.map(x => '<tr><td><b>' + esc(x.nombre) + '</b></td><td>' + asis(x.asistencia) + '</td>' + d.tareas.map(t => '<td>' + celda(x.respuestas[t.id]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'
        : '<div class="vacio">Aún no hay estudiantes inscritos.</div>') +
      '<p class="sub" style="font-size:.82rem">' + d.tareas.map((t, i) => (t.tipo === 'cierre' ? 'Cierre' : 'T' + (i + 1)) + ': ' + esc(t.titulo)).join(' · ') + '</p>');
    m.el.querySelector('.modal').classList.add('ancho');
    m.el.querySelectorAll('[data-r]').forEach(b => { b.onclick = () => M.conVelo(() => window.Tareas.verRespuesta(b.dataset.r)); });
  }

  /* ---------- Versiones ---------- */
  function panelVersiones(p) {
    p.innerHTML = '<div class="doc-acc"><button class="btn p" type="button" id="v-nueva">+ Nueva versión</button></div>' +
      (D.versiones.length ? D.versiones.map(v =>
        '<article class="curso"><div class="curso-img" aria-hidden="true"></div><div class="curso-info">' +
        '<div class="curso-tit"><h3>' + esc(v.asignatura) + '</h3><span class="chip ' + (v.estado === 'archivada' ? 'gris' : 'ok') + '">' + (v.estado === 'archivada' ? 'Archivada' : 'Activa') + '</span></div>' +
        '<p class="curso-inst">' + esc([v.institucion, v.escuela].filter(Boolean).join(' · ')) + '</p>' +
        '<p class="curso-meta"><span>' + esc([v.periodo, v.anio].filter(Boolean).join(' ')) + '</span><span>' + v.sesiones + ' sesiones · ' + v.minutos + ' min' + (v.hora_inicio ? ' · desde las ' + esc(v.hora_inicio) : '') + '</span></p>' +
        '<div class="curso-num"><div><small>Estudiantes</small><b>' + v.estudiantes + '</b></div><div><small>Observadores</small><b>' + v.observadores + '</b></div></div></div>' +
        '<div class="curso-acc"><button class="btn p" type="button" data-editar="' + esc(v.id) + '">Editar curso</button><button class="btn s" type="button" data-abrir="' + esc(v.id) + '">Abrir sesiones</button></div></article>').join('')
        : '<div class="tarjeta vacio">Aún no hay cursos. Crea el primero con el botón Nueva versión.</div>');
    $('#v-nueva').onclick = () => formVersion(null);
    p.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => formVersion(D.versiones.find(v => v.id === b.dataset.editar)); });
    p.querySelectorAll('[data-abrir]').forEach(b => { b.onclick = () => { D.versionId = b.dataset.abrir; recordar(); pintarSelector(); pintarResumen(); M.ir('#d/sesiones'); }; });
  }

  function formVersion(v) {
    v = v || { sesiones: 12, sesiones_semana: 3, minutos: 165, hora_inicio: '18:50', asistencia_min: 80, tolerancia_min: 15, defensas_sesion: 5, exigencia: 60, estado: 'activa', asignatura: 'Artes Digitales: IA Aplicada a la Administración y la Economía', anio: String(new Date().getFullYear() + 1) };
    const c = (id, t, tipo, ayuda) => '<div class="campo"><label for="v-' + id + '">' + t + '</label><input type="' + (tipo || 'text') + '" id="v-' + id + '" value="' + esc(v[id] == null ? '' : v[id]) + '">' + (ayuda ? '<span class="ayuda">' + ayuda + '</span>' : '') + '</div>';
    const m = M.modal(v.id ? 'Editar versión' : 'Nueva versión del curso',
      '<fieldset><legend>Institución</legend><div class="fila">' + c('institucion', 'Institución *') + c('escuela', 'Escuela o facultad') + '</div>' + c('logo_url', 'Logo de la institución', 'url', 'Dirección https de la imagen. Opcional.') + '</fieldset>' +
      '<fieldset><legend>Asignatura</legend>' + c('asignatura', 'Nombre de la asignatura *') + '<div class="fila">' + c('codigo', 'Código') + c('periodo', 'Periodo', 'text', 'Ejemplo: Verano') + c('anio', 'Año *', 'number') + c('fecha_inicio', 'Fecha de inicio', 'date') + '</div></fieldset>' +
      '<fieldset><legend>Estructura</legend><div class="fila">' + c('sesiones', 'Sesiones', 'number') + c('sesiones_semana', 'Sesiones por semana', 'number') + c('minutos', 'Minutos por sesión', 'number', 'Desde la apertura, incluido el recreo de 15 minutos.') + c('hora_inicio', 'Hora de inicio habitual', 'text', 'Formato 18:50. Cada sesión puede tener otra.') + '</div>' +
        '<label class="check"><input type="checkbox" id="v-apertura_lunes"' + (v.apertura_lunes !== false ? ' checked' : '') + '><span>Apertura semanal: el lunes de cada semana se abren solas las sesiones de esa semana y sus materiales, para la lectura previa. Las actividades se despliegan en clase, con la asistencia.</span></label></fieldset>' +
      '<fieldset><legend>Reglas</legend><div class="fila">' + c('asistencia_min', 'Asistencia mínima (%)', 'number') + c('tolerancia_min', 'Tolerancia de llegada (min)', 'number', 'Después de estos minutos, la asistencia queda como atraso.') + c('defensas_sesion', 'Defensas por sesión', 'number') + c('exigencia', 'Exigencia (%)', 'number') + '</div>' +
      c('whatsapp', 'Link del grupo de WhatsApp', 'url', 'Opcional.') + '</fieldset>' +
      '<fieldset><legend>Acceso de estudiantes a Metis</legend><div class="fila">' + c('acceso_desde', 'Desde', 'date', 'Día en que pueden empezar a ingresar.') + c('acceso_hasta', 'Hasta', 'date', 'Último día con acceso, hasta las 23:59.') + '</div>' +
      '<span class="ayuda">Vacío: sin límite. Fuera de este período el estudiante no puede ingresar, aunque esté inscrito. Sugerencia: desde una semana antes de la primera sesión hasta 30 días después de la última. A cada persona le puedes dar fechas propias desde Personas.</span></fieldset>' +
      '<fieldset><legend>Documentos del curso</legend><p class="sub" style="margin:0">El programa, el manual del estudiante y otros documentos generales. El estudiante los ve en Hoy, en Materiales y en la página de registro, y el manual va en el correo de bienvenida.</p><div id="v-docs" style="display:grid;gap:8px"></div><div><button class="btn s peq" type="button" id="v-doc-mas">Agregar documento</button></div>' +
      '<span class="ayuda">Súbelos a Drive, compártelos como "Cualquier persona con el enlace" y pega aquí la dirección completa.</span></fieldset>' +
      '<fieldset><legend>Estado</legend><div class="campo"><label for="v-estado">Estado de la versión</label><select id="v-estado"><option value="activa"' + (v.estado !== 'archivada' ? ' selected' : '') + '>Activa</option><option value="archivada"' + (v.estado === 'archivada' ? ' selected' : '') + '>Archivada</option></select></div></fieldset><div id="v-msg"></div>',
      '<button class="btn p" type="button" id="v-guardar">Guardar versión</button>');
    const docs = $('#v-docs', m.el);
    const TIPOS_DOC = { programa: 'Programa', manual: 'Manual del estudiante', otro: 'Otro' };
    const filaDoc = x => {
      x = x || { tipo: 'programa', titulo: '', url: '' };
      const r = document.createElement('div'); r.className = 'mat-ed';
      r.innerHTML = '<select data-tipo>' + Object.keys(TIPOS_DOC).map(t => '<option value="' + t + '"' + (x.tipo === t ? ' selected' : '') + '>' + TIPOS_DOC[t] + '</option>').join('') + '</select>' +
        '<input type="text" data-tit placeholder="Título" value="' + esc(x.titulo) + '"><input type="url" data-url placeholder="https://" value="' + esc(x.url) + '"><button class="btn t peq" type="button" data-quitar>Quitar</button>';
      r.querySelector('[data-quitar]').onclick = () => r.remove();
      docs.appendChild(r);
    };
    (v.documentos || []).forEach(filaDoc);
    if (!(v.documentos || []).length) { filaDoc({ tipo: 'programa', titulo: 'Programa del curso', url: '' }); filaDoc({ tipo: 'manual', titulo: 'Manual del estudiante', url: '' }); }
    $('#v-doc-mas', m.el).onclick = () => filaDoc({ tipo: 'otro', titulo: '', url: '' });
    $('#v-guardar', m.el).onclick = async ev => {
      const d = { id: v.id };
      d.documentos = Array.from(docs.querySelectorAll('.mat-ed')).map(r => ({ tipo: r.querySelector('[data-tipo]').value, titulo: r.querySelector('[data-tit]').value.trim(), url: r.querySelector('[data-url]').value.trim() })).filter(x => x.url);
      ['institucion', 'escuela', 'logo_url', 'asignatura', 'codigo', 'periodo', 'anio', 'fecha_inicio', 'sesiones', 'sesiones_semana', 'minutos', 'hora_inicio', 'asistencia_min', 'tolerancia_min', 'defensas_sesion', 'exigencia', 'whatsapp', 'estado', 'acceso_desde', 'acceso_hasta']
        .forEach(k => { d[k] = $('#v-' + k, m.el).value; });
      d.apertura_lunes = $('#v-apertura_lunes', m.el).checked;
      await M.ocupado(ev.currentTarget, async () => {
        try { const g = await M.api('guardarVersion', d); D.versionId = g.id; recordar(); m.cerrar(); await M.conVelo(async () => { await cargarVersiones(); pintarResumen(); await irA('versiones', true); }); }
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
    const doce = r.sesiones.length === 12;
    p.innerHTML = (doce ? '<div class="plan-base"><div><b>Planificación base del curso</b><p class="sub" style="margin:0">Carga las actividades de las doce sesiones con su consigna, minutos, criterio, explicación y ejemplo resuelto de Los Aromos. No toca las sesiones que ya tienen actividades. Cada sesión trae además su demostración del caso. Si cargaste las tareas o generaste las sesiones antes de que existieran los ejemplos y las demostraciones, usa «Completar guías y demostraciones»: solo llena lo que está vacío. También puedes actualizar títulos y objetivos sin perder fechas ni materiales.</p></div>' +
        '<div class="acciones"><button class="btn p peq" type="button" id="s-tareas-base">Cargar tareas base</button><button class="btn s peq" type="button" id="s-guias-base">Completar guías y demostraciones</button><button class="btn s peq" type="button" id="s-plan-base">Actualizar títulos y objetivos</button></div></div>' : '') +
      '<div class="msg info" style="margin-top:16px">Oculta: el estudiante no la ve. Visible: ve objetivos y ruta, sin trabajar. Abierta: puede trabajar si registró asistencia. Cerrada: solo lectura. Los materiales, el control y la entrega se abren por separado. El observador ve todo como visible.</div><div id="s-msg"></div>' +
      Object.keys(semanas).sort((a, b) => a - b).map(w => '<div class="semana-cab"><h3 class="semana-t" style="margin:0">Semana ' + w + '</h3><div class="acciones">' +
        ['oculta:Ocultar', 'visible:Hacer visible', 'abierta:Abrir', 'cerrada:Cerrar'].map(x => { const [e, t] = x.split(':'); return '<button class="btn s peq" type="button" data-semana="' + w + '" data-estado="' + e + '">' + t + ' semana</button>'; }).join('') + '</div></div>' +
        '<div class="tabla"><table><thead><tr><th>Nº</th><th>Sesión</th><th>Estado</th><th>Habilitado</th><th></th></tr></thead><tbody>' + semanas[w].map(filaSesion).join('') + '</tbody></table></div>').join('');
    const bt = $('#s-tareas-base'), bp = $('#s-plan-base'), bg = $('#s-guias-base');
    if (bg) bg.onclick = () => M.ocupado(bg, async () => {
      try { const x = await M.api('completarGuiasBase', { version_id: v.id }); await irA('sesiones', true); M.msg('#s-msg', (x.completadas === 1 ? 'Se completó 1 actividad' : 'Se completaron ' + x.completadas + ' actividades') + ' con su explicación y su ejemplo' + (x.demos ? (x.demos === 1 ? ', y 1 sesión con su demostración.' : ', y ' + x.demos + ' sesiones con su demostración.') : '.') + (x.sin_guia ? ' ' + x.sin_guia + (x.sin_guia === 1 ? ' actividad propia no tiene' : ' actividades propias no tienen') + ' guía base: puedes escribirla en «Tareas».' : ''), 'ok'); }
      catch (e) { M.msg('#s-msg', e.message, 'mal'); }
    });
    if (bt) bt.onclick = () => M.ocupado(bt, async () => {
      try { const x = await M.api('cargarTareasBase', { version_id: v.id }); await irA('sesiones', true); M.msg('#s-msg', 'Se cargaron ' + x.tareas + ' actividades en ' + x.sesiones + ' sesiones.' + (x.omitidas === 1 ? ' Se respetó 1 sesión que ya tenía actividades.' : x.omitidas ? ' Se respetaron ' + x.omitidas + ' sesiones que ya tenían actividades.' : ''), 'ok'); }
      catch (e) { M.msg('#s-msg', e.message, 'mal'); }
    });
    if (bp) bp.onclick = () => M.ocupado(bp, async () => {
      try { await M.api('actualizarPlanBase', { version_id: v.id }); await irA('sesiones', true); M.msg('#s-msg', 'Títulos, unidades y objetivos actualizados en las doce sesiones. Fechas, materiales y estados no cambiaron.', 'ok'); }
      catch (e) { M.msg('#s-msg', e.message, 'mal'); }
    });
    p.querySelectorAll('[data-semana]').forEach(b => { b.onclick = async () => { const ids = D.sesiones.filter(s => String(s.semana) === b.dataset.semana).map(s => s.id); await cambiarEstado(ids, b.dataset.estado, b); }; });
    p.querySelectorAll('select.estado').forEach(sel => { sel.onchange = () => cambiarEstado([sel.dataset.id], sel.value, null); });
    p.querySelectorAll('[data-apertura]').forEach(ch => { ch.onchange = async () => {
      try { await M.api('cambiarAperturaSesion', { sesion_id: ch.dataset.id, campo: ch.dataset.apertura, valor: ch.checked }); }
      catch (e) { ch.checked = !ch.checked; M.msg('#s-msg', e.message, 'mal'); window.scrollTo(0, 0); }
    }; });
    p.querySelectorAll('[data-editar-sesion]').forEach(b => { b.onclick = () => M.conVelo(() => editarSesion(b.dataset.editarSesion)); });
    p.querySelectorAll('[data-previa]').forEach(b => { b.onclick = () => M.conVelo(() => previaSesion(b.dataset.previa)); });
    p.querySelectorAll('[data-vista]').forEach(b => { b.onclick = () => abrirVista(b.dataset.vista, b.dataset.id); });
  }

  function filaSesion(s) {
    const sw = (campo, txt) => '<label class="interruptor"><input type="checkbox" data-apertura="' + campo + '" data-id="' + esc(s.id) + '"' + (s[campo] ? ' checked' : '') + '>' + txt + '</label>';
    const v = versionActual() || {};
    const auto = v.apertura_lunes && s.abre_el ? (window.Sesiones.hoy() >= s.abre_el ? 'abierta para estudiantes desde el ' + M.fechaCorta(s.abre_el) : 'se abre el ' + M.fechaCorta(s.abre_el)) : '';
    return '<tr><td><b>' + s.numero + '</b></td><td><b>' + esc(s.titulo) + '</b><br><small style="color:var(--pizarra)">' + esc([s.fecha ? M.fechaCorta(s.fecha) : 'Sin fecha', s.hora, s.unidad, s.n_objetivos + ' objetivos', s.n_materiales + ' materiales', s.tiene_demo ? 'con demostración' : '', s.defensa ? 'con defensa' : ''].filter(Boolean).join(' · ')) + '</small>' +
      (auto && s.estado === 'oculta' ? '<br><small style="color:var(--turquesa-t)">Apertura semanal: ' + esc(auto) + '</small>' : '') + '</td>' +
      '<td><select class="estado" data-id="' + esc(s.id) + '">' + ['oculta', 'visible', 'abierta', 'cerrada'].map(e => '<option value="' + e + '"' + (s.estado === e ? ' selected' : '') + '>' + window.Sesiones.ESTADOS[e][0] + '</option>').join('') + '</select></td>' +
      '<td><div style="display:grid;gap:4px">' + sw('materiales_visibles', 'Materiales') + sw('control_abierto', 'Control de lectura') + sw('entrega_abierta', 'Entrega') + '</div></td>' +
      '<td><div class="acciones"><button class="btn s peq" type="button" data-editar-sesion="' + esc(s.id) + '">Editar</button><button class="btn s peq" type="button" data-vista="tareas" data-id="' + esc(s.id) + '">Tareas</button>' +
      '<button class="btn t peq" type="button" data-vista="lista" data-id="' + esc(s.id) + '">Asistencia</button><button class="btn t peq" type="button" data-vista="entregas" data-id="' + esc(s.id) + '">Entregas</button><button class="btn t peq" type="button" data-previa="' + esc(s.id) + '">Vista del estudiante</button></div></td></tr>';
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
    const m = M.modal('Vista del estudiante', window.Sesiones.vista(Object.assign({}, s, { materiales_visibles: true }), v));
    m.el.querySelector('.modal').classList.add('ancho');
    const t = m.el.querySelector('#tareas-sesion');
    if (t && window.Tareas) window.Tareas.montar(t, Object.assign({}, s, { observador: true, respuestas: {}, permisos: { motivo: 'Vista previa: así verá el estudiante las tareas.' } }));
  }

  async function editarSesion(id) {
    const v = versionActual();
    const s = await M.api('verSesionDocente', { sesion_id: id });
    const m = M.modal('Sesión ' + s.numero + ' · Editar',
      '<fieldset><legend>Datos</legend><div class="campo"><label for="e-titulo">Título *</label><input type="text" id="e-titulo" value="' + esc(s.titulo) + '"></div>' +
      '<div class="fila"><div class="campo"><label for="e-unidad">Unidad</label><input type="text" id="e-unidad" value="' + esc(s.unidad || '') + '"></div>' +
      '<div class="campo"><label for="e-fecha">Fecha</label><input type="date" id="e-fecha" value="' + esc(s.fecha || '') + '"></div>' +
      '<div class="campo"><label for="e-hora">Hora de inicio</label><input type="text" id="e-hora" placeholder="' + esc(v.hora_inicio || '18:50') + '" value="' + esc(s.hora || '') + '"><span class="ayuda">Vacía: usa la hora de la versión' + (v.hora_inicio ? ' (' + esc(v.hora_inicio) + ')' : '') + '.</span></div></div>' +
      '<label class="check"><input type="checkbox" id="e-defensa"' + (s.defensa ? ' checked' : '') + '><span>Esta sesión tiene defensa relámpago (15 minutos antes del cierre)</span></label></fieldset>' +
      '<fieldset><legend>Objetivos</legend><div class="campo"><label for="e-obj">En esta sesión aprenderás a…</label><textarea id="e-obj" style="font-family:var(--sans);font-size:14px;min-height:110px">' + esc((s.objetivos || []).join('\n')) + '</textarea>' +
      '<span class="ayuda">Un objetivo por línea, comenzando con un verbo en infinitivo. Máximo seis. Reaparecen en el cierre para la autoevaluación.</span></div></fieldset>' +
      '<fieldset><legend>Ruta de la sesión · unos ' + v.minutos + ' minutos</legend><div id="e-ruta">' + s.ruta.map((b, i) =>
        '<div class="bloque-ed" data-momento="' + esc(b.momento) + '"><input type="text" data-titulo value="' + esc(b.titulo) + '"><textarea data-desc style="font-family:var(--sans);font-size:13px;min-height:56px">' + esc(b.descripcion || '') + '</textarea></div>').join('') +
      '</div><span class="ayuda">El estudiante ve cuatro momentos con hora de reloj: inicio, desarrollo con recreo de 15 minutos, defensa relámpago si corresponde, y cierre. Los horarios se calculan solos y son aproximados.</span></fieldset>' +
      '<fieldset><legend>Materiales</legend><div id="e-mats" style="display:grid;gap:8px"></div><div><button class="btn s peq" type="button" id="e-mat-mas">Agregar material</button></div>' +
      '<span class="ayuda">Cuaderno y podcast en Drive, compartidos como "Cualquier persona con el enlace". Video en YouTube como "No listado". Pega la dirección completa.</span></fieldset>' +
      '<fieldset><legend>Demostración del caso Los Aromos</legend><p class="sub" style="margin:0">La haces en clase y el estudiante la ve como material, junto con los materiales de la sesión, con los prompts listos para copiar.</p>' +
      '<div class="campo"><label for="e-dm-titulo">Título</label><input type="text" id="e-dm-titulo" value="' + esc((s.demo || {}).titulo || '') + '"></div>' +
      '<div class="campo"><label for="e-dm-obj">Qué se busca mostrar</label><textarea id="e-dm-obj" style="font-family:var(--sans);font-size:14px;min-height:56px">' + esc((s.demo || {}).objetivo || '') + '</textarea></div>' +
      '<div class="fila"><div class="campo"><label for="e-dm-herr">Herramientas</label><input type="text" id="e-dm-herr" value="' + esc((s.demo || {}).herramientas || '') + '"></div>' +
      '<div class="campo"><label for="e-dm-video">Video de la demostración</label><input type="url" id="e-dm-video" placeholder="https://" value="' + esc((s.demo || {}).video || '') + '"><span class="ayuda">Opcional. Si la grabas, pega aquí el enlace de YouTube (no listado).</span></div></div>' +
      '<div id="e-dm-pasos" style="display:grid;gap:10px"></div><div><button class="btn s peq" type="button" id="e-dm-mas">Agregar paso</button></div>' +
      '<div class="campo"><label for="e-dm-lec">La lección</label><input type="text" id="e-dm-lec" value="' + esc((s.demo || {}).leccion || '') + '"></div></fieldset><div id="e-msg"></div>',
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
    const pasos = $('#e-dm-pasos', m.el);
    const filaPaso = x => {
      x = x || {};
      const d = document.createElement('div'); d.className = 'paso-ed';
      const ta = (k, ph, mono) => '<textarea data-p="' + k + '" placeholder="' + ph + '" style="font-family:' + (mono ? 'var(--mono)' : 'var(--sans)') + ';font-size:13px;min-height:56px">' + esc(x[k] || '') + '</textarea>';
      d.innerHTML = '<div class="paso-cab"><input type="text" data-p="titulo" placeholder="Título del paso" value="' + esc(x.titulo || '') + '"><button class="btn t peq" type="button" data-sube>Subir</button><button class="btn t peq" type="button" data-quita>Quitar</button></div>' +
        ta('hace', 'Qué se hace en este paso') + ta('prompt', 'Prompt o fórmula exacta (opcional)', true) + ta('observa', 'Qué observar en el resultado');
      d.querySelector('[data-quita]').onclick = () => d.remove();
      d.querySelector('[data-sube]').onclick = () => { if (d.previousElementSibling) pasos.insertBefore(d, d.previousElementSibling); };
      pasos.appendChild(d);
    };
    ((s.demo && s.demo.pasos) || []).forEach(filaPaso);
    $('#e-dm-mas', m.el).onclick = () => filaPaso();
    $('#e-ok', m.el).onclick = async ev => {
      const d = {
        id: s.id, titulo: $('#e-titulo', m.el).value, unidad: $('#e-unidad', m.el).value, fecha: $('#e-fecha', m.el).value, hora: $('#e-hora', m.el).value.trim(),
        defensa: $('#e-defensa', m.el).checked,
        objetivos: $('#e-obj', m.el).value.split('\n').map(x => x.trim().replace(/^[-•\d.)\s]+/, '')).filter(Boolean),
        ruta: Array.from(m.el.querySelectorAll('.bloque-ed')).map(b => ({ momento: b.dataset.momento, titulo: b.querySelector('[data-titulo]').value, descripcion: b.querySelector('[data-desc]').value })),
        materiales: Array.from(cont.querySelectorAll('.mat-ed')).map(r => ({ tipo: r.querySelector('[data-tipo]').value, titulo: r.querySelector('[data-tit]').value, url: r.querySelector('[data-url]').value.trim() })).filter(x => x.url || x.titulo),
        demo: { titulo: $('#e-dm-titulo', m.el).value, objetivo: $('#e-dm-obj', m.el).value, herramientas: $('#e-dm-herr', m.el).value, video: $('#e-dm-video', m.el).value.trim(), leccion: $('#e-dm-lec', m.el).value,
          pasos: Array.from(pasos.querySelectorAll('.paso-ed')).map(r => { const o = {}; r.querySelectorAll('[data-p]').forEach(i => { o[i.dataset.p] = i.value; }); return o; }) }
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

  /* ---------- Fechas de acceso ---------- */
  const fAcc = f => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
  const INST_OBS = ['UDP', 'UOH', 'USEK'];
  function chipAcceso(a) {
    if (!a) return '';
    const origen = '<br><small style="color:var(--pizarra)">' + (a.propias ? 'Fechas propias' : (a.desde || a.hasta ? 'Fechas de la versión' : 'Sin fechas')) + '</small>';
    if (a.estado === 'por_comenzar') return '<span class="chip info">Desde el ' + fAcc(a.desde) + '</span>' + origen;
    if (a.estado === 'vencido') return '<span class="chip mal">Venció el ' + fAcc(a.hasta) + '</span>' + origen;
    if (!a.hasta) return '<span class="chip gris">Sin término</span>' + origen;
    const dias = Math.round((new Date(a.hasta + 'T12:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00')) / 86400000);
    return '<span class="chip ' + (dias <= 7 ? 'aviso' : 'ok') + '">' + (dias <= 7 ? (dias === 0 ? 'Vence hoy' : 'Vence en ' + dias + (dias === 1 ? ' día' : ' días')) : 'Hasta el ' + fAcc(a.hasta)) + '</span>' + origen;
  }
  /** Campos de institución (observador) y fechas propias de acceso. */
  function bloqueAcceso(x, rol) {
    x = x || {};
    const v = versionActual() || {};
    const inst = x.institucion_obs || '';
    const otra = inst && INST_OBS.indexOf(inst) < 0;
    const deVersion = v.acceso_desde || v.acceso_hasta ? 'del ' + (fAcc(v.acceso_desde) || 'inicio') + ' al ' + (fAcc(v.acceso_hasta) || 'sin término') : 'sin límite';
    return '<div class="acc-bloque"><div class="campo" data-solo-obs' + (rol === 'observador' ? '' : ' style="display:none"') + '><label for="n-inst">Institución del observador *</label><div class="fila">' +
      '<select id="n-inst"><option value="">Elige…</option>' + INST_OBS.map(i => '<option' + (inst === i ? ' selected' : '') + '>' + i + '</option>').join('') + '<option value="otra"' + (otra ? ' selected' : '') + '>Otra</option></select>' +
      '<input type="text" id="n-inst-otra" placeholder="Nombre de la institución" value="' + esc(otra ? inst : '') + '"' + (otra ? '' : ' style="display:none"') + '></div></div>' +
      '<div class="fila"><div class="campo"><label for="n-acc-desde">Acceso desde</label><input type="date" id="n-acc-desde" value="' + esc(x.acceso_desde || '') + '"></div>' +
      '<div class="campo"><label for="n-acc-hasta">Acceso hasta</label><input type="date" id="n-acc-hasta" value="' + esc(x.acceso_hasta || '') + '"></div></div>' +
      '<span class="ayuda" data-ayuda="est"' + (rol === 'observador' ? ' style="display:none"' : '') + '>Vacías: usa el período de acceso de los estudiantes de la versión (' + esc(deVersion) + '). El último día tiene acceso hasta las 23:59.</span>' +
      '<span class="ayuda" data-ayuda="obs"' + (rol === 'observador' ? '' : ' style="display:none"') + '>El observador no depende de las fechas del curso: siempre ve el curso completo. Estas fechas solo controlan su acceso a Metis. Vacías: acceso sin límite.</span></div>';
  }
  function activarBloqueAcceso(el) {
    const sel = $('#n-inst', el), otra = $('#n-inst-otra', el);
    if (sel) sel.onchange = () => { otra.style.display = sel.value === 'otra' ? '' : 'none'; if (sel.value === 'otra') otra.focus(); };
    el.querySelectorAll('input[name=n-rol]').forEach(r => { r.addEventListener('change', () => {
      const obs = $('input[name=n-rol]:checked', el).value === 'observador';
      el.querySelectorAll('[data-solo-obs]').forEach(x => { x.style.display = obs ? '' : 'none'; });
      el.querySelectorAll('[data-ayuda]').forEach(x => { x.style.display = (x.dataset.ayuda === 'obs') === obs ? '' : 'none'; });
    }); });
  }
  function leerAcceso(el) {
    const sel = $('#n-inst', el);
    const inst = sel ? (sel.value === 'otra' ? $('#n-inst-otra', el).value.trim() : sel.value) : '';
    return { acceso_desde: $('#n-acc-desde', el).value, acceso_hasta: $('#n-acc-hasta', el).value, institucion_obs: inst };
  }
  function formAcceso(x) {
    const obs = x.rol_curso === 'observador';
    const m = M.modal('Acceso de ' + x.nombre, '<p style="margin:0">' + chipAcceso(x.acceso) + '</p>' + bloqueAcceso(x, x.rol_curso) + '<div id="n-msg"></div>',
      '<button class="btn s" type="button" data-cerrar>Cancelar</button>' + (x.acceso_desde || x.acceso_hasta ? '<button class="btn t" type="button" id="n-limpiar">' + (obs ? 'Quitar fechas' : 'Usar fechas de la versión') + '</button>' : '') + '<button class="btn p" type="button" id="n-ok">Guardar</button>');
    activarBloqueAcceso(m.el);
    const guardar = async (btn, limpiar) => {
      const a = leerAcceso(m.el);
      if (obs && !a.institucion_obs) { M.msg($('#n-msg', m.el), 'Indica la institución del observador.', 'mal'); return; }
      const d = { inscripcion_id: x.inscripcion_id, acceso_desde: limpiar ? '' : a.acceso_desde, acceso_hasta: limpiar ? '' : a.acceso_hasta };
      if (obs) d.institucion_obs = a.institucion_obs;
      await M.ocupado(btn, async () => {
        try { await M.api('cambiarAccesoInscripcion', d); m.cerrar(); await cargarPersonas(); }
        catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
    $('#n-ok', m.el).onclick = ev => guardar(ev.currentTarget, false);
    const bl = $('#n-limpiar', m.el); if (bl) bl.onclick = ev => guardar(ev.currentTarget, true);
  }

  /* ---------- Personas ---------- */
  async function panelPersonas(p) {
    p.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0"><input type="text" id="p-buscar" placeholder="Buscar por nombre, correo o mención" style="max-width:360px">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn s" type="button" id="p-masiva">Carga masiva</button><button class="btn p" type="button" id="p-nueva">Agregar persona</button></div></div>' +
      '<div id="p-msg"></div><div id="p-resumen" style="color:var(--pizarra);font-size:.86rem;margin-bottom:8px"></div>' +
      '<div class="tabla"><table><thead><tr><th>Persona</th><th>Contacto</th><th>Rol</th><th>Ficha</th><th>Acceso</th><th>Último ingreso</th><th></th></tr></thead><tbody id="p-lista"><tr><td colspan="7" class="vacio">Cargando…</td></tr></tbody></table></div>';
    $('#p-nueva').onclick = formPersona;
    $('#p-masiva').onclick = formMasiva;
    $('#p-buscar').oninput = pintarPersonas;
    await cargarPersonas();
  }

  async function cargarPersonas() {
    try { D.personas = await M.api('listarPersonas', { version_id: D.versionId }); pintarPersonas(); }
    catch (e) { $('#p-lista').innerHTML = '<tr><td colspan="7"><div class="msg mal">' + esc(e.message) + '</div></td></tr>'; }
  }

  function pintarPersonas() {
    const q = ($('#p-buscar').value || '').toLowerCase();
    const lista = D.personas.filter(x => !q || [x.nombre, x.correo_institucional, x.correo_personal, x.mencion, x.organizacion, x.institucion_obs].join(' ').toLowerCase().indexOf(q) >= 0);
    const est = D.personas.filter(x => x.rol_curso === 'estudiante' && x.inscripcion_activa);
    $('#p-resumen').textContent = est.length + ' estudiantes activos · ' + est.filter(x => x.ficha_completa).length + ' con ficha completa · ' + D.personas.filter(x => x.rol_curso === 'observador').length + ' observadores' +
      (function () { const n = D.personas.filter(x => x.inscripcion_activa && x.acceso && x.acceso.estado === 'vencido').length; return n ? ' · ' + n + ' con acceso vencido' : ''; })();
    const tb = $('#p-lista');
    tb.innerHTML = lista.length ? lista.map(x =>
      '<tr' + (x.inscripcion_activa ? '' : ' style="opacity:.5"') + '><td><div class="persona">' + (x.foto_mini ? '<img class="foto" src="' + esc(x.foto_mini) + '" alt="" data-foto="' + esc(x.id) + '" style="cursor:zoom-in">' : '<span class="foto"></span>') +
      '<div><b>' + esc(x.nombre) + '</b><small>' + esc([x.mencion, x.organizacion].filter(Boolean).join(' · ')) + '</small></div></div></td>' +
      '<td><small>' + esc(x.correo_institucional) + (x.correo_personal ? '<br>' + esc(x.correo_personal) : '') + (x.celular ? '<br>' + esc(x.celular) : '') + '</small></td>' +
      '<td><span class="chip ' + (x.rol_curso === 'observador' ? 'info' : 'gris') + '">' + (x.rol_curso === 'observador' ? 'Observador' + (x.institucion_obs ? ' · ' + esc(x.institucion_obs) : '') : 'Estudiante') + '</span><br><small style="color:var(--pizarra)">' + esc({ link: 'Por link', manual: 'Alta manual', masiva: 'Carga masiva' }[x.origen] || x.origen) + '</small></td>' +
      '<td>' + (x.rol_curso === 'observador' ? '<span class="chip gris">No aplica</span>' : (x.ficha_completa ? '<span class="chip ok">Completa</span>' : '<span class="chip aviso">Pendiente</span>')) + '</td>' +
      '<td>' + chipAcceso(x.acceso) + '</td>' +
      '<td><small>' + esc(M.fecha(x.ultimo_ingreso) || 'Nunca') + '</small></td>' +
      '<td><div class="acciones"><button class="btn s peq" type="button" data-editar="' + esc(x.id) + '">Editar</button><button class="btn s peq" type="button" data-fechas="' + esc(x.id) + '">Fechas de acceso</button><button class="btn t peq" type="button" data-acceso="' + esc(x.id) + '">Reenviar acceso</button>' +
      '<button class="btn t peq" type="button" data-estado="' + esc(x.inscripcion_id) + '" data-activo="' + (x.inscripcion_activa ? '0' : '1') + '">' + (x.inscripcion_activa ? 'Desactivar' : 'Activar') + '</button></div></td></tr>').join('')
      : '<tr><td colspan="7" class="vacio">' + (D.personas.length ? 'Nadie coincide con la búsqueda.' : 'Aún no hay personas en esta versión. Comparte un link de registro o agrégalas aquí.') + '</td></tr>';
    tb.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => formEditar(D.personas.find(x => x.id === b.dataset.editar)); });
    tb.querySelectorAll('[data-fechas]').forEach(b => { b.onclick = () => formAcceso(D.personas.find(x => x.id === b.dataset.fechas)); });
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

  /* ---------- Cómo ingresará: solo Google o también clave temporal ---------- */
  const esGmail = c => /@(gmail|googlemail)\.com$/i.test(String(c || '').trim());
  function bloqueModo() {
    return '<div class="campo"><span class="etq">Cómo ingresará</span><div class="opciones">' +
      '<label><input type="radio" name="n-modo" value="google"><span>Solo con Google</span></label>' +
      '<label><input type="radio" name="n-modo" value="clave" checked><span>Google y clave temporal</span></label></div>' +
      '<span class="ayuda" data-modo-ayuda></span></div>';
  }
  /** Propone el modo según los correos (Gmail: solo Google) hasta que el docente lo elija a mano. */
  function activarModo(el) {
    let manual = false;
    const ayuda = $('[data-modo-ayuda]', el);
    const texto = () => {
      const g = $('input[name=n-modo]:checked', el).value === 'google';
      ayuda.textContent = g ? 'No se crea clave. Entra con el botón de Google, con uno de los correos registrados que sea cuenta de Google. Si después quiere una clave, la crea con «¿Olvidaste tu clave?».'
        : 'Se crea una clave temporal de respaldo. Igual puede entrar con Google si su correo es una cuenta de Google; en ese caso la clave temporal se anula sola y no se le pide cambiarla.';
    };
    const proponer = () => {
      if (manual) return;
      const g = esGmail($('#n-correo_institucional', el).value) || esGmail($('#n-correo_personal', el).value);
      $('input[name=n-modo][value=' + (g ? 'google' : 'clave') + ']', el).checked = true; texto();
    };
    el.querySelectorAll('input[name=n-modo]').forEach(r => r.addEventListener('change', () => { manual = true; texto(); }));
    ['#n-correo_institucional', '#n-correo_personal'].forEach(id => { const i = $(id, el); if (i) i.addEventListener('input', proponer); });
    proponer();
  }

  function formPersona() {
    const m = M.modal('Agregar persona',
      '<div class="campo"><span class="etq">Rol en esta versión</span><div class="opciones"><label><input type="radio" name="n-rol" value="estudiante" checked><span>Estudiante</span></label><label><input type="radio" name="n-rol" value="observador"><span>Observador</span></label></div>' +
      '<span class="ayuda">El observador ve el curso completo, con todas sus sesiones, materiales y actividades, sin depender de las fechas del curso, pero no puede enviar trabajos. Úsalo para jefaturas, directivos y académicos de otras instituciones.</span></div>' + camposBasicos() + bloqueAcceso({}, 'estudiante') +
      bloqueModo() + '<label class="check"><input type="checkbox" id="n-enviar" checked><span>Enviar por correo el acceso</span></label><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Agregar</button>');
    activarBloqueAcceso(m.el); activarModo(m.el);
    $('#n-ok', m.el).onclick = async ev => {
      const d = Object.assign(leerBasicos(m.el), leerAcceso(m.el), { version_id: D.versionId, rol: $('input[name=n-rol]:checked', m.el).value, modo_acceso: $('input[name=n-modo]:checked', m.el).value, enviar: $('#n-enviar', m.el).checked });
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('crearPersona', d);
          $('.cuerpo', m.el).innerHTML = '<div class="msg ok">' + esc(r.usuario.nombre) + (r.inscripcion_nueva ? ' quedó inscrito en esta versión.' : ' ya estaba inscrito en esta versión.') + '</div>' +
            (r.clave_temporal ? '<p style="margin:0">Clave temporal' + (r.correo_enviado ? ' (también enviada por correo)' : ' (no se pudo enviar por correo; entrégala tú)') + ':</p><div class="clave-temp">' + esc(r.clave_temporal) + '</div><p style="margin:0;font-size:.85rem;color:var(--pizarra)">Ingresa con ' + esc(r.usuario.correo_institucional) + '. Si entra con clave se le pedirá cambiarla; si entra con Google, la clave temporal se anula sola.</p>'
              : r.modo === 'google' ? '<p style="margin:0">Ingresa con el botón de Google, con ' + esc([r.usuario.correo_institucional, r.usuario.correo_personal].filter(Boolean).join(' o ')) + '. No se creó clave' + (r.correo_enviado ? '; el correo de bienvenida ya se envió.' : '.') + '</p>'
              : '<p style="margin:0">Ya tenía clave propia; puede ingresar como siempre.</p>');
          $('footer', m.el).innerHTML = '<button class="btn p" type="button" data-cerrar>Listo</button>';
          await cargarPersonas(); cargarVersiones();
        } catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  function formEditar(x) {
    const obs0 = x.rol_curso === 'observador';
    const inst = x.institucion_obs || '', otra = inst && INST_OBS.indexOf(inst) < 0;
    const rolHTML = '<div class="campo"><span class="etq">Rol en esta versión</span><div class="opciones">' +
      '<label><input type="radio" name="n-rol" value="estudiante"' + (obs0 ? '' : ' checked') + '><span>Estudiante</span></label>' +
      '<label><input type="radio" name="n-rol" value="observador"' + (obs0 ? ' checked' : '') + '><span>Observador</span></label></div>' +
      '<span class="ayuda" data-ayuda="est"' + (obs0 ? '' : ' style="display:none"') + '>Al pasar a estudiante deberá completar su ficha con foto la próxima vez que entre, registrará asistencia y enviará tareas. Su acceso seguirá las fechas de los estudiantes de la versión, salvo que tenga fechas propias.</span>' +
      '<span class="ayuda" data-ayuda="obs"' + (obs0 ? ' style="display:none"' : '') + '>Al pasar a observador verá el curso completo sin depender de las fechas del curso, pero no podrá enviar trabajos. Lo que ya envió queda guardado.</span></div>' +
      '<div class="campo" data-solo-obs' + (obs0 ? '' : ' style="display:none"') + '><label for="n-inst">Institución del observador *</label><div class="fila">' +
      '<select id="n-inst"><option value="">Elige…</option>' + INST_OBS.map(i => '<option' + (inst === i ? ' selected' : '') + '>' + i + '</option>').join('') + '<option value="otra"' + (otra ? ' selected' : '') + '>Otra</option></select>' +
      '<input type="text" id="n-inst-otra" placeholder="Nombre de la institución" value="' + esc(otra ? inst : '') + '"' + (otra ? '' : ' style="display:none"') + '></div></div>';
    const m = M.modal('Editar datos de ' + x.nombre, '<p style="margin:0;color:var(--pizarra);font-size:.88rem">Corrige errores de ingreso o cambia su rol en esta versión. Los cambios quedan registrados en la auditoría.</p>' + rolHTML + camposBasicos(x) +
      '<div class="fila"><div class="campo"><label for="n-mencion">Mención o área</label><input type="text" id="n-mencion" value="' + esc(x.mencion || '') + '"></div><div class="campo"><label for="n-organizacion">Organización</label><input type="text" id="n-organizacion" value="' + esc(x.organizacion || '') + '"></div></div><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Guardar cambios</button>');
    const sel = $('#n-inst', m.el), otraI = $('#n-inst-otra', m.el);
    sel.onchange = () => { otraI.style.display = sel.value === 'otra' ? '' : 'none'; };
    // Aviso del cambio: se muestra solo cuando el rol elegido es distinto del actual.
    const verRol = () => {
      const nuevo = $('input[name=n-rol]:checked', m.el).value;
      m.el.querySelector('[data-solo-obs]').style.display = nuevo === 'observador' ? '' : 'none';
      m.el.querySelectorAll('[data-ayuda]').forEach(a => { a.style.display = nuevo !== x.rol_curso && (a.dataset.ayuda === 'obs') === (nuevo === 'observador') ? '' : 'none'; });
    };
    m.el.querySelectorAll('input[name=n-rol]').forEach(r => r.addEventListener('change', verRol)); verRol();
    $('#n-ok', m.el).onclick = async ev => {
      const d = Object.assign(leerBasicos(m.el), { usuario_id: x.id, mencion: $('#n-mencion', m.el).value, organizacion: $('#n-organizacion', m.el).value });
      const rol = $('input[name=n-rol]:checked', m.el).value;
      const instN = sel.value === 'otra' ? otraI.value.trim() : sel.value;
      if (rol === 'observador' && !instN) { M.msg($('#n-msg', m.el), 'Indica la institución del observador.', 'mal'); return; }
      await M.ocupado(ev.currentTarget, async () => {
        try {
          if (rol !== x.rol_curso || (rol === 'observador' && instN !== (x.institucion_obs || ''))) await M.api('cambiarRolInscripcion', { inscripcion_id: x.inscripcion_id, rol: rol, institucion_obs: instN });
          await M.api('actualizarPersona', d); m.cerrar(); await cargarPersonas(); cargarVersiones();
        } catch (e) { M.msg($('#n-msg', m.el), e.message, 'mal'); }
      });
    };
  }

  function reenviar(x) {
    const correos = esc([x.correo_institucional, x.correo_personal].filter(Boolean).join(' y '));
    const g0 = esGmail(x.correo_institucional) || esGmail(x.correo_personal);
    const m = M.modal('Reenviar acceso', '<p style="margin:0">Se enviará un correo a ' + correos + ' con las instrucciones para ingresar.</p>' +
      '<div class="campo"><span class="etq">Qué enviar</span><div class="opciones">' +
      '<label><input type="radio" name="n-modo" value="google"' + (g0 ? ' checked' : '') + '><span>Solo el recordatorio para entrar con Google</span></label>' +
      '<label><input type="radio" name="n-modo" value="clave"' + (g0 ? '' : ' checked') + '><span>Una clave temporal nueva</span></label></div>' +
      '<span class="ayuda">La clave temporal nueva reemplaza a la anterior. El acceso con Google no cambia en ningún caso.</span></div><div id="n-msg"></div>',
      '<button class="btn s" type="button" data-cerrar>Cancelar</button><button class="btn p" type="button" id="n-ok">Enviar</button>');
    $('#n-ok', m.el).onclick = async ev => {
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('reenviarAcceso', { usuario_id: x.id, version_id: D.versionId, modo_acceso: $('input[name=n-modo]:checked', m.el).value });
          $('.cuerpo', m.el).innerHTML = '<div class="msg ' + (r.correo_enviado ? 'ok' : 'aviso') + '">' + (r.correo_enviado ? 'Acceso enviado por correo.' : (r.clave_temporal ? 'No se pudo enviar el correo; entrega tú la clave.' : 'No se pudo enviar el correo. Avísale que entre con el botón de Google.')) + '</div>' + (r.clave_temporal ? '<div class="clave-temp">' + esc(r.clave_temporal) + '</div>' : '');
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
      bloqueAcceso({}, 'estudiante') + '<span class="ayuda">La institución y las fechas se aplican a todas las filas de esta carga.</span>' +
      '<div class="campo"><span class="etq">Cómo ingresarán</span><div class="opciones">' +
      '<label><input type="radio" name="n-modo" value="auto" checked><span>Según el correo</span></label>' +
      '<label><input type="radio" name="n-modo" value="google"><span>Todos solo con Google</span></label>' +
      '<label><input type="radio" name="n-modo" value="clave"><span>Todos con Google y clave temporal</span></label></div>' +
      '<span class="ayuda">Según el correo: quien tiene un correo de Gmail entra solo con Google; los demás reciben además una clave temporal de respaldo, que se anula sola si entran con Google.</span></div>' +
      '<label class="check"><input type="checkbox" id="n-enviar" checked><span>Enviar por correo el acceso a cada persona</span></label><div id="n-msg"></div>',
      '<button class="btn p" type="button" id="n-ok">Cargar</button>');
    activarBloqueAcceso(m.el);
    $('#n-ok', m.el).onclick = async ev => {
      await M.ocupado(ev.currentTarget, async () => {
        try {
          const r = await M.api('cargaMasiva', Object.assign(leerAcceso(m.el), { version_id: D.versionId, texto: $('#n-texto', m.el).value, rol: $('input[name=n-rol]:checked', m.el).value, modo_acceso: $('input[name=n-modo]:checked', m.el).value, enviar: $('#n-enviar', m.el).checked }));
          let h = '<div class="msg ok">' + r.creados + ' personas nuevas · ' + r.ya_existian + ' ya existían y quedaron inscritas · ' + r.rechazados.length + ' filas rechazadas.' + (r.solo_google ? ' ' + r.solo_google + ' entrarán solo con Google.' : '') + '</div>';
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
