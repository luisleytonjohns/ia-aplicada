/* Metis · vista-sesion.js (GitHub, interfaz) · Vista de sesión: lista por semana, ruta con hora de reloj, reloj en vivo y materiales. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc;
  const S = window.Sesiones = {};

  const DEFENSA_MIN = 15, RECREO_MIN = 15;
  const ESTADOS = { oculta: ['Oculta', 'gris'], visible: ['Visible', 'info'], abierta: ['Abierta', 'ok'], cerrada: ['Cerrada', 'gris'] };
  const TIPOS = { cuaderno: 'Cuaderno', podcast: 'Podcast', video: 'Video resumen', documento: 'Documento', enlace: 'Enlace' };
  S.TIPOS = TIPOS; S.ESTADOS = ESTADOS;

  S.chipEstado = e => { const x = ESTADOS[e] || ESTADOS.oculta; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>'; };

  /* ---------- Tiempo ---------- */
  const r5 = n => Math.max(5, Math.round(n / 5) * 5);
  const aMin = h => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const aHora = min => { const x = ((min % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  S.aHora = aHora;
  S.hoy = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  S.ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  S.duracion = function (min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min';
  };
  /** Hora de inicio efectiva: la de la sesión o, si no tiene, la habitual de la versión. */
  S.horaDe = (s, v) => s.hora || (v && v.hora_inicio) || '';

  /**
   * Cuatro momentos aproximados, redondeados a 5 minutos: inicio, desarrollo (con recreo),
   * defensa relámpago cuando corresponde, y cierre. El horario es una guía, no un cronómetro.
   */
  S.momentos = function (s, v) {
    const total = Number(v && v.minutos) || 165;
    const ruta = s.ruta || [];
    const desc = k => ((ruta.find(b => b.momento === k) || {}).descripcion || '');
    const defensa = s.defensa !== undefined ? !!s.defensa : ruta.some(b => b.momento === 'defensa');
    const inicio = r5(total * 0.06), cierre = Math.max(10, r5(total * 0.09)), def = defensa ? DEFENSA_MIN : 0;
    const desarrollo = Math.max(10, total - inicio - cierre - def);
    const recreo = total >= 120 ? RECREO_MIN : 0;
    const lista = [
      { clave: 'inicio', titulo: 'Inicio', min: inicio, texto: desc('inicio') },
      { clave: 'desarrollo', titulo: 'Desarrollo', min: desarrollo, recreo: recreo,
        texto: 'Fundamento y demostración, luego dos talleres aplicados a tu proyecto' + (recreo ? ', con un recreo de ' + recreo + ' minutos entre ambos' : '') + '.',
        detalle: ['fundamento', 'taller1', 'taller2'].map(k => { const b = ruta.find(x => x.momento === k); return b && b.descripcion ? { titulo: b.titulo, texto: b.descripcion } : null; }).filter(Boolean) },
      def ? { clave: 'defensa', titulo: 'Defensa relámpago', min: def, texto: desc('defensa') } : null,
      { clave: 'cierre', titulo: 'Cierre', min: cierre, texto: desc('cierre') }
    ].filter(Boolean);
    let t = 0;
    lista.forEach(m => { m.desde = t; t += m.min; m.hasta = t; });
    const h0 = aMin(S.horaDe(s, v));
    lista.forEach(m => { if (h0 != null) { m.horaDesde = aHora(h0 + m.desde); m.horaHasta = aHora(h0 + m.hasta); } });
    return { lista: lista, total: total, inicio: h0, fin: h0 != null ? h0 + total : null };
  };

  /** Estado de la sesión respecto de la hora actual: antes, en curso, terminada u otro día. */
  S.estadoAhora = function (s, v) {
    const r = S.momentos(s, v);
    if (!s.fecha || r.inicio == null) return { fase: 'sin_horario', r: r };
    const hoy = S.hoy();
    if (s.fecha > hoy) return { fase: 'futura', r: r };
    if (s.fecha < hoy) return { fase: 'pasada', r: r };
    const ahora = S.ahoraMin();
    if (ahora < r.inicio) return { fase: 'antes', r: r, faltan: r.inicio - ahora };
    if (ahora >= r.fin) return { fase: 'terminada', r: r };
    const t = ahora - r.inicio;
    const actual = r.lista.find(m => t >= m.desde && t < m.hasta) || r.lista[r.lista.length - 1];
    return { fase: 'en_curso', r: r, actual: actual, quedanMomento: actual.hasta - t, quedanSesion: r.fin - ahora };
  };

  /** Franja con reloj y cuenta regresiva. Se actualiza sola mientras la vista está abierta. */
  S.relojHTML = function (s, v) {
    const e = S.estadoAhora(s, v);
    const hora = aHora(S.ahoraMin());
    let txt = '';
    if (e.fase === 'antes') txt = 'La sesión empieza a las <b>' + aHora(e.r.inicio) + '</b>, en <b>' + S.duracion(e.faltan) + '</b>.';
    else if (e.fase === 'en_curso') txt = 'Ahora: <b>' + esc(e.actual.titulo) + '</b> · quedan <b>' + S.duracion(e.quedanMomento) + '</b> de este momento · la sesión termina a las <b>' + aHora(e.r.fin) + '</b>.';
    else if (e.fase === 'terminada') txt = 'La sesión terminó. Tienes plazo hasta las <b>23:59</b> para completar el trabajo.';
    else return '';
    return '<div class="reloj ' + e.fase + '"><span class="hora-actual">' + hora + '</span><span>' + txt + '</span></div>';
  };

  /* ---------- Materiales ---------- */
  function idYoutube(url) {
    const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
    return m ? m[1] : null;
  }
  function idDrive(url) {
    const m = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/.exec(url) || /docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([\w-]{20,})/.exec(url);
    return m ? m[1] : null;
  }
  S.material = function (m) {
    const yt = idYoutube(m.url), dv = idDrive(m.url);
    let cuerpo = '';
    if (m.tipo === 'video' && yt) cuerpo = '<div class="marco v"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '" title="' + esc(m.titulo) + '" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    else if (dv && /docs\.google\.com/.test(m.url)) cuerpo = '<div class="marco d"><iframe src="' + esc(m.url.replace(/\/(edit|view)[^/]*$/, '') + '/preview') + '" title="' + esc(m.titulo) + '" loading="lazy"></iframe></div>';
    else if (dv) cuerpo = '<div class="marco ' + (m.tipo === 'podcast' ? 'a' : 'd') + '"><iframe src="https://drive.google.com/file/d/' + dv + '/preview" title="' + esc(m.titulo) + '" allow="autoplay" loading="lazy"></iframe></div>';
    return '<article class="material ' + esc(m.tipo) + '"><div class="mat-cab"><span class="chip ' + ({ cuaderno: 'info', podcast: 'ok', video: 'aviso' }[m.tipo] || 'gris') + '">' + esc(TIPOS[m.tipo] || m.tipo) + '</span><b>' + esc(m.titulo) + '</b></div>' +
      cuerpo + '<a class="btn s peq" href="' + esc(m.url) + '" target="_blank" rel="noopener">Abrir en una pestaña nueva</a></article>';
  };

  /* ---------- Lista ---------- */
  S.lista = function (sesiones, v, conEstado) {
    if (!sesiones.length) return '<div class="vacio">Aún no hay sesiones disponibles. Aparecerán aquí cuando el docente las habilite.</div>';
    const semanas = {};
    sesiones.forEach(s => { (semanas[s.semana] = semanas[s.semana] || []).push(s); });
    return Object.keys(semanas).sort((a, b) => a - b).map(w =>
      '<section class="semana"><h3 class="semana-t">Semana ' + w + '</h3><div class="sesiones">' + semanas[w].map(s =>
        '<a class="sesion-card" href="#sesion/' + esc(s.id) + '"><span class="num">' + s.numero + '</span><span class="txt"><b>' + esc(s.titulo) + '</b><small>' +
        esc([s.fecha ? M.fechaCorta(s.fecha) : '', S.horaDe(s, v)].filter(Boolean).join(' · ')) + '</small></span>' + (conEstado !== false ? S.chipEstado(s.estado) : '') + '</a>').join('') +
      '</div></section>').join('');
  };

  /* ---------- Vista completa ---------- */
  S.vista = function (s, v, opciones) {
    opciones = opciones || {};
    const r = S.momentos(s, v);
    const col = { inicio: '#10213D', desarrollo: '#2457FF', defensa: '#FF6B35', cierre: '#00A896' };
    const e = S.estadoAhora(s, v);
    const conHora = r.inicio != null;
    return '' +
      (opciones.volver ? '<div><a class="btn t" href="#inicio">← Volver al inicio</a></div>' : '') +
      '<div id="reloj-sesion">' + S.relojHTML(s, v) + '</div>' +
      '<div class="cabecera"><div><span class="lema" style="color:var(--pizarra)">Sesión ' + s.numero + ' · Semana ' + s.semana + (s.unidad ? ' · ' + esc(s.unidad) : '') + '</span>' +
      '<h1>' + esc(s.titulo) + '</h1><p>' + esc([s.fecha ? M.fechaLarga(s.fecha) : 'Fecha por definir', conHora ? aHora(r.inicio) + ' a ' + aHora(r.fin) : ''].filter(Boolean).join(' · ')) + '</p></div>' + S.chipEstado(s.estado) + '</div>' +
      (s.observador ? '<div class="msg info">Vista de observador: ves la sesión completa como la verá un estudiante.</div>' : '') +
      '<div class="tarjeta objetivos"><h2>En esta sesión aprenderás a:</h2>' + (s.objetivos && s.objetivos.length ? '<ol>' + s.objetivos.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol>' : '<p class="sub">Los objetivos se publicarán pronto.</p>') + '</div>' +
      '<div class="tarjeta"><h2>Cómo se organiza la sesión</h2>' +
      '<div class="ruta-barra">' + r.lista.map(m => '<i style="flex:' + m.min + ';background:' + col[m.clave] + '" title="' + esc(m.titulo) + '"></i>').join('') + '</div>' +
      '<ol class="momentos">' + r.lista.map(m => '<li class="' + (e.fase === 'en_curso' && e.actual.clave === m.clave ? 'actual' : '') + '"><span class="punto" style="background:' + col[m.clave] + '"></span>' +
        '<div><div class="m-cab"><b>' + esc(m.titulo) + '</b><span class="m-hora">' + (conHora ? 'desde las ' + m.horaDesde : 'unos ' + m.min + ' min') + '</span></div>' +
        (m.texto ? '<p>' + esc(m.texto) + '</p>' : '') +
        (m.detalle && m.detalle.length ? '<details><summary>Ver el detalle</summary><ul>' + m.detalle.map(d => '<li><b>' + esc(d.titulo) + ':</b> ' + esc(d.texto) + '</li>').join('') + '</ul></details>' : '') +
        '</div></li>').join('') + '</ol>' +
      '<p class="sub" style="font-size:.82rem">Los horarios son aproximados. Plazo para completar el trabajo: hasta las 23:59 del día de la clase, si registraste asistencia.</p></div>' +
      '<div class="tarjeta"><h2>Materiales</h2>' + (s.materiales && s.materiales.length ? '<div class="materiales">' + s.materiales.map(S.material).join('') + '</div>' :
        '<p class="sub">' + (s.materiales_visibles === false ? 'Los materiales de esta sesión aún no están disponibles.' : 'Esta sesión no tiene materiales cargados.') + '</p>') + '</div>' +
      '<div class="tarjeta"><h2>Tareas, control y entrega</h2><p class="sub">Las tareas de la sesión aparecerán aquí durante la clase, con su consigna paso a paso, el tiempo sugerido y el criterio con que se revisan.</p>' +
      '<div class="opciones"><span class="chip ' + (s.control_abierto ? 'ok' : 'gris') + '">Control de lectura: ' + (s.control_abierto ? 'abierto' : 'cerrado') + '</span><span class="chip ' + (s.entrega_abierta ? 'ok' : 'gris') + '">Entrega: ' + (s.entrega_abierta ? 'abierta' : 'cerrada') + '</span></div></div>';
  };

  /** Mantiene el reloj al día cada 30 segundos mientras exista el contenedor. */
  S.activarReloj = function (s, v) {
    M.limpiarRelojes();
    M.relojes.push(setInterval(() => {
      const el = document.getElementById('reloj-sesion');
      if (!el) { M.limpiarRelojes(); return; }
      el.innerHTML = S.relojHTML(s, v);
    }, 30000));
  };
})();
