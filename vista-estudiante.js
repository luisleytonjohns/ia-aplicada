/* Metis · vista-estudiante.js (GitHub, interfaz) · Ambiente del estudiante y del observador con cinco menús:
   Hoy, Sesiones, Materiales, Tareas y Mi avance. Menú lateral en el computador y barra inferior en el celular. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc, $ = M.$;
  const E = window.Estudiante = {};

  const MENU = [
    ['inicio', 'Hoy', '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1z"/>'],
    ['sesiones', 'Sesiones', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>'],
    ['materiales', 'Materiales', '<path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13.5"/>'],
    ['tareas', 'Tareas', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8.5 11.5l1.5 1.5 3-3M8.5 16.5h7"/>'],
    ['avance', 'Mi avance', '<path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/>']
  ];
  const ASISTIO = a => !!(a && ['presente', 'atrasado', 'justificado'].indexOf(a.estado) >= 0);
  const hoy = () => window.Sesiones.hoy();
  const T = () => window.Tareas || { TIPOS: {} };

  /* ---------- Estructura ---------- */
  E.shell = function (u) {
    const rotulo = u.rol === 'observador' ? 'Observador' : 'Estudiante';
    const inicial = esc((u.primer_nombre || u.nombre || 'E').charAt(0).toUpperCase());
    const item = (m, cl) => '<a href="#' + m[0] + '" data-menu="' + m[0] + '" class="' + (cl || '') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + m[2] + '</svg><span>' + m[1] + '</span></a>';
    M.app().innerHTML = '<div class="doc est">' +
      '<aside class="doc-lado"><a class="marca" href="#inicio">' + M.simbolo(40, true) + '<span class="word">METIS</span></a>' +
      '<nav class="doc-menu">' + MENU.map(m => item(m)).join('') + '</nav>' +
      '<div class="doc-arte" aria-hidden="true"><i class="t1"></i><i class="t2"></i><i class="t3"></i><i class="t4"></i></div>' +
      '<p class="doc-lema">Analiza · Verifica ·<br>Decide · Construye</p></aside>' +
      '<div class="doc-main"><header class="doc-barra"><a class="marca" href="#inicio">' + M.simbolo(32, false) + '<span class="word">METIS</span></a>' +
      '<div class="doc-cuenta"><button type="button" id="e-cuenta" aria-haspopup="true"><span class="doc-avatar">' + (u.foto_mini ? '<img src="' + esc(u.foto_mini) + '" alt="">' : inicial) + '</span><span class="quien"><b>' + esc(u.primer_nombre || u.nombre) + '</b> · ' + rotulo + '</span><svg viewBox="0 0 24 24" class="flecha"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="doc-desp oculto" id="e-desp">' + (u.rol === 'estudiante' ? '<button type="button" id="e-ficha">Mi ficha</button>' : '') + '<button type="button" id="a-clave">Cambiar clave</button><button type="button" id="a-salir">Salir</button></div></div></header>' +
      '<main class="doc-cont" id="contenido"></main>' + M.pie() + '</div>' +
      '<nav class="est-tabs" aria-label="Menú">' + MENU.map(m => item(m)).join('') + '</nav></div>';
    const desp = $('#e-desp');
    $('#e-cuenta').onclick = e => { e.stopPropagation(); desp.classList.toggle('oculto'); };
    document.addEventListener('click', () => desp.classList.add('oculto'));
    const f = $('#e-ficha'); if (f) f.onclick = () => M.ir('#ficha');
    $('#a-clave').onclick = M.modalClave;
    $('#a-salir').onclick = M.cerrarSesion;
  };
  E.marcar = function (menu) {
    document.querySelectorAll('.est [data-menu]').forEach(a => a.classList.toggle('activo', a.dataset.menu === menu));
  };

  /* ---------- Datos ---------- */
  async function cargar(accion) {
    const v = M.inscripcionActual().version;
    const r = await M.api(accion || 'misSesiones', { version_id: v.id });
    return Object.assign({ v: v }, r, { sesiones: (r && Array.isArray(r.sesiones)) ? r.sesiones : [] });
  }
  /** Sesión de hoy, o la próxima con fecha, o la última abierta. */
  function sesionFoco(ses) {
    const h = hoy();
    const conFecha = ses.filter(x => x.fecha).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero));
    return conFecha.find(x => x.fecha === h) || conFecha.find(x => x.fecha > h) || ses.filter(x => x.estado === 'abierta').pop() || null;
  }
  function grupos(ses) {
    const h = hoy(), g = { curso: [], proximas: [], anteriores: [] };
    ses.forEach(s => {
      if (s.fecha === h || (!s.fecha && s.estado === 'abierta')) g.curso.push(s);
      else if (s.estado === 'cerrada' || (s.fecha && s.fecha < h)) g.anteriores.push(s);
      else g.proximas.push(s);
    });
    g.anteriores.reverse();
    return g;
  }
  const cab = (eti, titulo, bajada) => '<div class="est-cab"><span class="lema">' + esc(eti) + '</span><h1>' + esc(titulo) + '</h1>' + (bajada ? '<p>' + bajada + '</p>' : '') + '</div>';
  const error = (c, e) => { c.innerHTML = '<div class="msg mal">' + esc(e.message) + '</div><div><a class="btn s" href="#inicio">Volver a Hoy</a></div>'; };
  function chipTarea(t, bloqueada) {
    if (bloqueada) return '<span class="chip gris">Se abre en clase</span>';
    if (t.estado === 'enviada') return t.momento === 'despues' ? '<span class="chip aviso">Enviada después</span>' : '<span class="chip ok">Enviada</span>';
    if (t.estado === 'borrador') return '<span class="chip info">Borrador</span>';
    return '<span class="chip gris">Sin empezar</span>';
  }
  /* ---------- Documentos del curso ---------- */
  const ICO_DOC = { programa: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7', manual: 'M4 5c3-1.5 5-1.5 8 0v15c-3-1.5-5-1.5-8 0zM12 5c3-1.5 5-1.5 8 0v15c-3-1.5-5-1.5-8 0z', otro: 'M6 3h9l4 4v14H6zM14 3v5h5' };
  const icoDoc = t => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICO_DOC[t] || ICO_DOC.otro) + '"/></svg>';
  function franjaDocs(v) {
    const docs = v.documentos || [];
    if (!docs.length) return '';
    return '<div class="docs-franja">' + docs.map(x => '<a class="doc-btn" href="' + esc(x.url) + '" target="_blank" rel="noopener" data-doc="' + esc(x.tipo) + '">' + icoDoc(x.tipo) + '<span>' + esc(x.titulo) + '</span></a>').join('') + '</div>';
  }
  /** Aviso para leer el manual: hasta una semana después de la primera sesión, mientras no se haya abierto. */
  function avisoManual(v, ses) {
    const man = (v.documentos || []).find(x => x.tipo === 'manual');
    if (!man || M.leer('metis_manual_' + v.id) === '1') return '';
    const fechas = ses.map(s => s.fecha).filter(Boolean).sort();
    if (fechas.length) { const lim = new Date(fechas[0] + 'T12:00:00'); lim.setDate(lim.getDate() + 7); if (new Date() > lim) return ''; }
    return '<section class="tarjeta aviso-manual"><div class="am-ico">' + icoDoc('manual') + '</div><div><b>Antes de la primera clase, lee el ' + esc(man.titulo) + '</b><p>Explica cómo funciona el curso, qué tienes que hacer en cada sesión y cómo usar Metis. Así la primera clase parte directo con la inteligencia artificial.</p></div>' +
      '<div class="acciones"><a class="btn p" href="' + esc(man.url) + '" target="_blank" rel="noopener" data-manual-visto>Abrir el manual</a><button type="button" class="btn t" data-manual-visto>Ya lo leí</button></div></section>';
  }
  function activarDocs(c, v) {
    c.querySelectorAll('[data-manual-visto], [data-doc="manual"]').forEach(b => b.addEventListener('click', () => {
      M.guardar('metis_manual_' + v.id, '1');
      const k = c.querySelector('.aviso-manual'); if (k) setTimeout(() => k.remove(), 150);
    }));
  }

  const icoEstado = (t, bloq) => '<i class="ico-t ' + (bloq ? 'bloq' : t.estado) + '" aria-hidden="true"></i>';
  const pctSesion = s => s.n_tareas ? Math.round(100 * s.n_enviadas / s.n_tareas) : 0;

  /* ---------- Hoy ---------- */
  async function vistaHoy(c) {
    const u = M.estado.sesion.usuario, ins = M.inscripcionActual(), v = ins.version, obs = ins.rol === 'observador';
    c.innerHTML = '<div class="vacio">Cargando…</div>';
    let d; try { d = await cargar(); } catch (e) { return error(c, e); }
    if (!$('#contenido')) return;
    const S = window.Sesiones, ses = d.sesiones, s = sesionFoco(ses), h = hoy();
    const instalar = !M.instalada() && M.leer('metis_inst_no') !== '1'
      ? '<section class="tarjeta instalar-card"><img src="icono-192.png" alt=""><div><b>Instala Metis en tu celular</b><p>Ábrelo desde la pantalla de inicio, como una aplicación. Es útil para registrar la asistencia rápido en clase.</p></div><div class="acciones">' + M.botonInstalar('btn p', 'Instalar') + '<button type="button" class="btn t" id="inst-no">Ahora no</button></div></section>' : '';
    let foco = '';
    if (!s) foco = '<section class="tarjeta"><h2>Aún no hay sesiones con fecha</h2><p class="sub">Aparecerán aquí cuando el docente las publique.</p></section>';
    else {
      const esHoy = s.fecha === h, asistio = obs || ASISTIO(s.asistencia), r = S.momentos(s, v);
      const pct = esHoy && asistio ? pctSesion(s) : 0;
      const bloq = !obs && !asistio;
      const notaTareas = bloq ? (esHoy && s.estado === 'abierta' ? 'Se despliegan cuando registras tu asistencia con el código del docente.' : 'Se abren en clase, al registrar tu asistencia.') : '';
      foco = '<section class="tarjeta hoy-foco"><div class="hf-cab"><div><span class="lema">' + (esHoy ? 'Hoy' : 'Próxima sesión') + ' · Sesión ' + s.numero + '</span><h2>' + esc(s.titulo) + '</h2>' +
        '<p class="sub" style="margin:0">' + esc([M.fechaLarga(s.fecha), r.inicio != null ? S.aHora(r.inicio) + ' a ' + S.aHora(r.fin) : ''].filter(Boolean).join(' · ')) + '</p></div>' +
        '<div class="hf-pct" title="Avance de la sesión"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" class="fondo"/><circle cx="18" cy="18" r="15.9" class="valor" stroke-dasharray="' + pct + ' 100"/></svg><b>' + pct + '%</b><small>avance</small></div></div>' +
        (esHoy ? '<div id="reloj-sesion">' + S.relojHTML(s, v) + '</div>' : '') +
        '<div class="hf-cols"><div><h3>' + (esHoy ? 'Hoy aprenderás a' : 'En esta sesión aprenderás a') + '</h3>' +
        (s.objetivos && s.objetivos.length ? '<ol class="hf-obj">' + s.objetivos.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol>' : '<p class="sub">Los objetivos se publicarán pronto.</p>') + '</div>' +
        '<div><h3>' + (esHoy ? 'Hoy harás' : 'Harás') + '</h3><ul class="hf-tareas">' + (s.tareas || []).map(t => '<li>' + icoEstado(t, bloq) + '<span>' + esc(t.titulo) + '<small>' + esc(T().TIPOS[t.tipo] || t.tipo) + (t.minutos ? ' · unos ' + t.minutos + ' min' : '') + '</small></span>' + (bloq ? '' : chipTarea(t)) + '</li>').join('') + '</ul>' +
        (notaTareas ? '<p class="hf-nota">' + esc(notaTareas) + '</p>' : '') + '</div></div>' +
        '<div class="hf-acc"><a class="btn p" href="#sesion/' + esc(s.id) + '">' + (esHoy ? 'Entrar a la sesión' : 'Ver la sesión') + '</a></div></section>';
    }
    // Pendientes: solo lo urgente.
    const items = [];
    ses.forEach(x => {
      const ref = 'Sesión ' + x.numero + ' · ' + x.titulo, href = '#sesion/' + x.id;
      if (!obs && x.estado === 'abierta' && x.fecha === h && !ASISTIO(x.asistencia)) items.push({ c: 'naranja', t: 'Registra tu asistencia', r: ref, d: 'Con el código que el docente proyecta en la sala', href: href });
      if (!obs && x.estado === 'abierta' && ASISTIO(x.asistencia) && x.fecha === h && x.n_enviadas < x.n_tareas) items.push({ c: 'naranja', t: 'Te faltan ' + (x.n_tareas - x.n_enviadas) + ' de ' + x.n_tareas + ' tareas por enviar', r: ref, d: (x.cierre_enviado ? '' : 'Incluye la actividad de cierre · ') + 'Plazo: hoy hasta las 23:59', href: href });
      if (x.control_abierto) items.push({ c: 'cobalto', t: 'Control de lectura disponible', r: ref, d: 'Respóndelo durante la clase', href: href });
    });
    const prox = ses.filter(x => x.fecha && x.fecha > h && x.materiales_visibles && x.materiales && x.materiales.length).sort((a, b) => a.fecha < b.fecha ? -1 : 1)[0];
    if (prox) items.push({ c: 'turquesa', t: 'Lectura previa', r: 'Sesión ' + prox.numero + ' · ' + prox.titulo, d: prox.materiales.length + (prox.materiales.length === 1 ? ' material' : ' materiales') + ' · antes de la clase del ' + M.fechaCorta(prox.fecha), href: '#materiales' });
    const pend = '<section class="tarjeta"><h2>Pendientes</h2>' + (items.length
      ? '<ul class="pendientes">' + items.map(i => '<li class="' + i.c + '"><a href="' + esc(i.href) + '"><b>' + esc(i.t) + '</b><span>' + esc(i.r) + '</span><small>' + esc(i.d) + '</small></a></li>').join('') + '</ul>'
      : '<p class="al-dia"><span class="chip ok">Estás al día</span> No tienes nada pendiente por ahora.</p>') + '</section>';
    // Resumen del curso
    const total = Number(v.sesiones) || ses.length || 12;
    const hechas = ses.filter(x => x.estado === 'cerrada' || (x.fecha && x.fecha < h)).length;
    const pasadas = ses.filter(x => x.fecha && (x.fecha < h || (x.fecha === h && ASISTIO(x.asistencia))) && (x.estado === 'abierta' || x.estado === 'cerrada'));
    const asisPct = pasadas.length ? Math.round(100 * pasadas.filter(x => ASISTIO(x.asistencia)).length / pasadas.length) : null;
    const resumen = '<section class="tarjeta resumen-curso"><div><span class="lema">Tu curso</span><b>' + hechas + ' de ' + total + ' sesiones</b><div class="barra-p"><i style="width:' + Math.round(100 * hechas / total) + '%"></i></div></div>' +
      (obs ? '' : '<div><span class="lema">Asistencia</span><b>' + (asisPct == null ? 'Sin registros aún' : asisPct + '%') + '</b><small>Mínimo ' + (v.asistencia_min || 0) + '%</small></div>') +
      '<div><a class="btn s" href="#avance">Ver mi avance</a></div></section>';
    c.innerHTML = '<div class="est-cab"><span class="lema">Hola, ' + esc(u.primer_nombre || u.nombre) + '</span><h1>' + esc(v.asignatura) + '</h1><p>' + esc([v.institucion, v.escuela, [v.periodo, v.anio].filter(Boolean).join(' ')].filter(Boolean).join(' · ')) + '</p>' + franjaDocs(v) + M.selectorCurso() + '</div>' +
      (obs ? '<div class="msg info">Perfil observador: ves el curso tal como lo ve un estudiante, con el caso de ejemplo. No puedes enviar trabajos.</div>' : '') +
      (obs ? '' : avisoManual(v, ses)) + instalar + '<div class="hoy-grid">' + foco + '<div class="hoy-lado">' + pend + resumen + '</div></div>';
    M.activarInstalar(c); activarDocs(c, v);
    const ino = $('#inst-no'); if (ino) ino.onclick = () => { M.guardar('metis_inst_no', '1'); const k = c.querySelector('.instalar-card'); if (k) k.remove(); };
    const sel = $('#a-curso'); if (sel) sel.addEventListener('change', () => { M.estado.versionId = sel.value; M.guardar('metis_version', sel.value); M.conVelo(() => vistaHoy(c)); });
    if (s && s.fecha === h) S.activarReloj(s, v);
  }

  /* ---------- Sesiones ---------- */
  function filaSesion(s, tipo, obs) {
    const S = window.Sesiones, v = M.inscripcionActual().version;
    let extra = '';
    if (tipo === 'anteriores') extra = '<span class="sc-info">' + s.n_enviadas + ' de ' + s.n_tareas + ' tareas' + (obs ? '' : ' · ' + (ASISTIO(s.asistencia) ? 'asististe' : 'sin asistencia')) + '</span>';
    else if (tipo === 'proximas') extra = '<span class="sc-info">' + (s.materiales_visibles ? (s.materiales && s.materiales.length ? 'Materiales abiertos' : 'Sin materiales aún') : (s.abre_el ? 'Se abre el ' + M.fechaCorta(s.abre_el) : 'Se abrirá pronto')) + '</span>';
    else extra = '<span class="sc-info">' + pctSesion(s) + '% de avance</span>';
    return '<a class="sesion-card" href="#sesion/' + esc(s.id) + '"><span class="num">' + s.numero + '</span><span class="txt"><b>' + esc(s.titulo) + '</b><small>' +
      esc([s.fecha ? M.fechaCorta(s.fecha) : 'Fecha por definir', S.horaDe(s, v)].filter(Boolean).join(' · ')) + '</small>' + extra + '</span>' + S.chipEstado(s.estado) + '</a>';
  }
  async function vistaSesiones(c) {
    c.innerHTML = '<div class="vacio">Cargando sesiones…</div>';
    let d; try { d = await cargar(); } catch (e) { return error(c, e); }
    if (!$('#contenido')) return;
    const obs = d.rol === 'observador', g = grupos(d.sesiones);
    const bloque = (titulo, lista, tipo, vacio) => '<section class="tarjeta"><h2>' + titulo + '</h2>' + (lista.length ? '<div class="sesiones">' + lista.map(s => filaSesion(s, tipo, obs)).join('') + '</div>' : '<p class="sub">' + vacio + '</p>') + '</section>';
    c.innerHTML = cab('Sesiones', 'Tus sesiones', 'Separadas en la de hoy, las próximas y las anteriores. Toca una sesión para ver sus objetivos, su ruta, sus materiales y sus actividades.') +
      bloque('En curso', g.curso, 'curso', 'Hoy no tienes clase.') +
      bloque('Próximas', g.proximas, 'proximas', 'No hay más sesiones publicadas por ahora.') +
      (g.anteriores.length ? '<details class="tarjeta plegable"><summary><h2>Anteriores <small>(' + g.anteriores.length + ')</small></h2></summary><div class="sesiones">' + g.anteriores.map(s => filaSesion(s, 'anteriores', obs)).join('') + '</div></details>' : '');
  }

  /* ---------- Materiales ---------- */
  const ICO_MAT = { cuaderno: 'M6 3h10l3 3v15H6zM9 9h7M9 13h7M9 17h4', podcast: 'M12 3a4 4 0 014 4v5a4 4 0 01-8 0V7a4 4 0 014-4zM5 11a7 7 0 0014 0M12 18v3', video: 'M4 6h12v12H4zM16 10l4-2v8l-4-2', documento: 'M6 3h9l4 4v14H6zM14 3v5h5', enlace: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L12 6M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7L12 18' };
  async function vistaMateriales(c) {
    c.innerHTML = '<div class="vacio">Cargando materiales…</div>';
    let d; try { d = await cargar(); } catch (e) { return error(c, e); }
    if (!$('#contenido')) return;
    const g = grupos(d.sesiones), h = hoy();
    const con = s => (s.materiales && s.materiales.length) || s.demo;
    const tarjeta = s => '<section class="tarjeta mat-ses"><div class="mat-cab"><span class="num">' + s.numero + '</span><div><b>' + esc(s.titulo) + '</b><small>' + esc(s.fecha ? (s.fecha === h ? 'Hoy · ' : '') + M.fechaLarga(s.fecha) : 'Fecha por definir') + '</small></div></div>' +
      '<ul class="mat-lista">' + (s.materiales || []).map(m => '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICO_MAT[m.tipo] || ICO_MAT.enlace) + '"/></svg><span><b>' + esc(m.titulo) + '</b><small>' + esc(window.Sesiones.TIPOS[m.tipo] || m.tipo) + '</small></span><a class="btn s peq" href="' + esc(m.url) + '" target="_blank" rel="noopener">Abrir</a></li>').join('') +
      (s.demo ? '<li class="demo-l"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l14 8-14 8z"/></svg><span><b>Demostración: ' + esc(s.demo.titulo || 'caso Los Aromos') + '</b><small>Caso Distribuidora Los Aromos · ' + s.demo.n_pasos + ' pasos con sus prompts</small></span><a class="btn s peq" href="#sesion/' + esc(s.id) + '">Ver</a></li>' : '') + '</ul></section>';
    const actuales = g.curso.concat(g.proximas).filter(con), pasados = g.anteriores.filter(con);
    const docs = d.v.documentos || [];
    const docsHTML = docs.length ? '<section class="tarjeta mat-ses"><div class="mat-cab"><span class="num ndoc">' + icoDoc('programa') + '</span><div><b>Documentos del curso</b><small>Programa, manual y documentos generales</small></div></div><ul class="mat-lista">' +
      docs.map(x => '<li>' + icoDoc(x.tipo) + '<span><b>' + esc(x.titulo) + '</b><small>' + esc({ programa: 'Programa', manual: 'Manual del estudiante', otro: 'Documento' }[x.tipo] || 'Documento') + '</small></span><a class="btn s peq" href="' + esc(x.url) + '" target="_blank" rel="noopener" data-doc="' + esc(x.tipo) + '">Abrir</a></li>').join('') + '</ul></section>' : '';
    c.innerHTML = cab('Materiales', 'Biblioteca del curso', 'Los documentos del curso y, por sesión, lecturas, cuadernos, podcasts, videos y demostraciones. Los de cada sesión se abren el lunes de su semana: son la lectura previa obligatoria.') + docsHTML +
      (actuales.length || pasados.length || docs.length ? '' : '<section class="tarjeta"><p class="sub" style="margin:0">Aún no hay materiales abiertos. Se abren el lunes de cada semana del curso.</p></section>') +
      (actuales.length ? '<h2 class="est-sec">Esta semana y próximas</h2>' + actuales.map(tarjeta).join('') : '') +
      (pasados.length ? '<h2 class="est-sec">Sesiones anteriores</h2>' + pasados.map(tarjeta).join('') : '');
    activarDocs(c, d.v);
  }

  /* ---------- Tareas ---------- */
  async function vistaTareas(c) {
    c.innerHTML = '<div class="vacio">Cargando tareas…</div>';
    let d; try { d = await cargar(); } catch (e) { return error(c, e); }
    if (!$('#contenido')) return;
    const obs = d.rol === 'observador', g = grupos(d.sesiones), h = hoy();
    const conAsis = d.sesiones.filter(s => obs || ASISTIO(s.asistencia));
    const tot = conAsis.reduce((a, s) => a + s.n_tareas, 0), env = conAsis.reduce((a, s) => a + s.n_enviadas, 0);
    const bloque = s => {
      const asistio = obs || ASISTIO(s.asistencia), pasada = s.estado === 'cerrada' || (s.fecha && s.fecha < h);
      const nota = asistio ? (s.fecha === h ? 'Plazo: hoy hasta las 23:59' : (pasada ? 'Plazo vencido' : '')) : (pasada ? 'No registraste asistencia en esta sesión' : 'Se abren en clase, al registrar tu asistencia');
      return '<section class="tarjeta tar-ses"><a class="mat-cab" href="#sesion/' + esc(s.id) + '"><span class="num">' + s.numero + '</span><div><b>' + esc(s.titulo) + '</b><small>' + esc([s.fecha ? M.fechaCorta(s.fecha) : 'Fecha por definir', nota].filter(Boolean).join(' · ')) + '</small></div>' +
        (asistio ? '<span class="tar-pct">' + s.n_enviadas + '/' + s.n_tareas + '</span>' : '') + '</a>' +
        '<ul class="hf-tareas">' + (s.tareas || []).map(t => '<li>' + icoEstado(t, !asistio) + '<span>' + esc(t.titulo) + '<small>' + esc(T().TIPOS[t.tipo] || t.tipo) + (t.minutos ? ' · unos ' + t.minutos + ' min' : '') + '</small></span>' + (asistio ? chipTarea(t) : (pasada ? '<span class="chip gris">No disponible</span>' : chipTarea(t, true))) + '</li>').join('') + '</ul></section>';
    };
    c.innerHTML = cab('Tareas', 'Actividades y tareas', 'Todas las actividades del curso por sesión, con su estado. Se responden dentro de cada sesión: toca la sesión para abrirlas.') +
      (obs ? '' : '<section class="tarjeta resumen-curso"><div><span class="lema">Enviadas</span><b>' + env + ' de ' + tot + '</b><div class="barra-p"><i style="width:' + (tot ? Math.round(100 * env / tot) : 0) + '%"></i></div><small>En las sesiones en que registraste asistencia</small></div></section>') +
      (g.curso.length ? '<h2 class="est-sec">Hoy</h2>' + g.curso.map(bloque).join('') : '') +
      (g.anteriores.length ? '<h2 class="est-sec">Sesiones anteriores</h2>' + g.anteriores.map(bloque).join('') : '') +
      (g.proximas.length ? '<h2 class="est-sec">Próximas sesiones</h2>' + g.proximas.map(bloque).join('') : '');
  }

  /* ---------- Mi avance: asistencia, evaluaciones y calificaciones ---------- */
  const ESTADO_EV = { entregado: ['ok', 'Entregado'], al_dia: ['ok', 'Al día'], en_curso: ['info', 'En curso'], pendiente: ['aviso', 'Pendiente'], por_venir: ['gris', 'Por venir'], en_clase: ['gris', 'En clase'] };
  const ESTADO_AS = { presente: ['ok', 'Presente'], atrasado: ['aviso', 'Atrasado'], justificado: ['info', 'Justificado'], ausente: ['mal', 'Ausente'] };
  async function vistaAvance(c) {
    c.innerHTML = '<div class="vacio">Cargando tu avance…</div>';
    let d; try { d = await cargar('miAvance'); } catch (e) { return error(c, e); }
    if (!$('#contenido')) return;
    const obs = d.rol === 'observador', h = hoy();
    const pasadas = d.sesiones.filter(s => s.fecha && (s.fecha < h || (s.fecha === h && ASISTIO(s.asistencia))) && (s.estado === 'abierta' || s.estado === 'cerrada'));
    const con = pasadas.filter(s => ASISTIO(s.asistencia)).length, pct = pasadas.length ? Math.round(100 * con / pasadas.length) : null, min = d.asistencia_min || 0;
    const ac = d.asistencia_curso;
    const asisCurso = !obs || !ac ? '' : '<section class="tarjeta" id="av-asistencia"><h2>Asistencia del curso</h2>' +
      (ac.sesiones.length ? '<div class="asis-resumen' + (ac.promedio < min ? ' bajo' : '') + '"><b>Promedio: ' + ac.promedio + '% · ' + ac.estudiantes + (ac.estudiantes === 1 ? ' estudiante' : ' estudiantes') + '</b><small>Mínimo del curso: ' + min + '% por estudiante</small></div>' +
        '<ul class="av-lista">' + ac.sesiones.map(f => '<li><span><b>Sesión ' + f.numero + '</b> · ' + esc(f.titulo) + '<small>' + esc(M.fechaCorta(f.fecha)) + ' · ' + f.presentes + ' de ' + f.estudiantes + ' presentes</small></span><span class="av-barra"><i style="width:' + f.pct + '%"></i></span><b class="av-pct">' + f.pct + '%</b></li>').join('') + '</ul>' +
        '<p class="sub" style="font-size:.85rem;margin:0">Datos agregados del curso, sin nombres. Cuentan como presentes los registros a tiempo, con atraso y justificados.</p>'
        : '<p class="sub" style="margin:0">Aún no hay sesiones realizadas. La asistencia del curso aparecerá aquí desde la primera clase.</p>') + '</section>';
    const asis = obs ? asisCurso : '<section class="tarjeta" id="av-asistencia"><h2>Asistencia</h2>' +
      (pasadas.length ? '<div class="asis-resumen' + (pct < min ? ' bajo' : '') + '"><b>' + con + ' de ' + pasadas.length + ' sesiones (' + pct + '%)</b><small>Mínimo del curso: ' + min + '%</small></div>' +
        '<ul class="av-lista">' + pasadas.map(s => { const e = s.asistencia && ESTADO_AS[s.asistencia.estado] ? ESTADO_AS[s.asistencia.estado] : ['mal', 'Ausente']; return '<li><span><b>Sesión ' + s.numero + '</b> · ' + esc(s.titulo) + '<small>' + esc(M.fechaCorta(s.fecha)) + (s.asistencia && s.asistencia.hora ? ' · ' + esc(s.asistencia.hora) : '') + '</small></span><span class="chip ' + e[0] + '">' + e[1] + '</span></li>'; }).join('') + '</ul>'
        : '<p class="sub" style="margin:0">Aún no hay sesiones realizadas. Tu asistencia aparecerá aquí desde la primera clase.</p>') + '</section>';
    const ev = '<section class="tarjeta" id="av-evaluaciones"><h2>Evaluaciones</h2>' + (d.evaluacion && d.evaluacion.length
      ? '<ul class="av-lista ev">' + d.evaluacion.map(e => { const x = ESTADO_EV[e.estado] || ESTADO_EV.por_venir; return '<li><span class="peso">' + e.peso + '%</span><span><b>' + esc(e.componente) + '</b><small>' + esc(e.detalle) + '</small></span><span class="chip ' + x[0] + '">' + x[1] + '</span></li>'; }).join('') + '</ul>' +
        '<p class="sub" style="font-size:.85rem;margin:0">Cada componente se revisa con su pauta o rúbrica, que ves en cada tarea como "Cómo se revisa". La encuesta EACE-IA es obligatoria y no lleva nota.</p>'
      : '<p class="sub" style="margin:0">El docente publicará aquí el plan de evaluación del curso.</p>') + '</section>';
    const cal = d.calificaciones || { disponible: false, items: [] };
    const notas = '<section class="tarjeta" id="av-calificaciones"><h2>Calificaciones</h2>' + (cal.disponible && cal.items && cal.items.length
      ? '<ul class="av-lista ev">' + cal.items.map(n => '<li><span class="peso nota">' + esc(n.nota) + '</span><span><b>' + esc(n.componente) + '</b><small>' + esc([n.fecha, n.comentario].filter(Boolean).join(' · ')) + '</small></span></li>').join('') + '</ul>'
      : '<div class="vacio-cal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/></svg><b>Aún no tienes calificaciones que mostrar.</b><p class="sub" style="margin:0">Cuando el docente publique una nota, aparecerá aquí con su retroalimentación.</p></div>') + '</section>';
    c.innerHTML = cab('Mi avance', obs ? 'Avance del curso' : 'Tu avance en el curso', obs ? 'Asistencia del curso y plan de evaluación.' : 'Asistencia, evaluaciones y calificaciones.') +
      '<nav class="av-saltos"><a href="#avance" data-salto="av-asistencia">' + (obs ? 'Asistencia del curso' : 'Asistencia') + '</a><a href="#avance" data-salto="av-evaluaciones">Evaluaciones</a>' + (obs ? '' : '<a href="#avance" data-salto="av-calificaciones">Calificaciones</a>') + '</nav>' +
      asis + ev + (obs ? '' : notas);
    c.querySelectorAll('[data-salto]').forEach(a => { a.onclick = e => { e.preventDefault(); const el = document.getElementById(a.dataset.salto); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  }

  /** Enruta un menú del estudiante. Devuelve false si la ruta no es de estos menús. */
  E.ir = async function (c, base) {
    const vistas = { inicio: vistaHoy, sesiones: vistaSesiones, materiales: vistaMateriales, tareas: vistaTareas, avance: vistaAvance };
    if (!vistas[base]) return false;
    E.marcar(base);
    await vistas[base](c);
    return true;
  };
})();
