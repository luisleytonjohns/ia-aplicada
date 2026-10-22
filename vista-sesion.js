/* Metis · vista-sesion.js (GitHub, interfaz) · Vista de sesión compartida: lista por semana, objetivos, ruta con minutos y materiales. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc;
  const S = window.Sesiones = {};

  const PCT = { inicio: 8, fundamento: 17, taller1: 28, pausa: 6, taller2: 30, cierre: 11 };
  const DEFENSA_MIN = 15;
  const ESTADOS = { oculta: ['Oculta', 'gris'], visible: ['Visible', 'info'], abierta: ['Abierta', 'ok'], cerrada: ['Cerrada', 'gris'] };
  const TIPOS = { cuaderno: 'Cuaderno', podcast: 'Podcast', video: 'Video resumen', documento: 'Documento', enlace: 'Enlace' };
  S.TIPOS = TIPOS; S.ESTADOS = ESTADOS;

  S.chipEstado = e => { const x = ESTADOS[e] || ESTADOS.oculta; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>'; };

  /** Calcula los minutos de cada bloque según la duración de la sesión. La defensa dura siempre 15 minutos. */
  S.calcularRuta = function (minutos, ruta) {
    minutos = Number(minutos) || 150;
    let bloques = ruta.slice();
    if (minutos < 120) bloques = bloques.filter(b => b.momento !== 'pausa');
    const fijo = bloques.some(b => b.momento === 'defensa') ? DEFENSA_MIN : 0;
    const resto = Math.max(0, minutos - fijo);
    const suma = bloques.reduce((a, b) => a + (PCT[b.momento] || 0), 0) || 1;
    let usado = 0;
    const r = bloques.map(b => {
      const min = b.momento === 'defensa' ? DEFENSA_MIN : Math.round(resto * (PCT[b.momento] || 0) / suma);
      usado += min; return Object.assign({}, b, { minutos: min });
    });
    const ajuste = minutos - usado;
    const t2 = r.find(b => b.momento === 'taller2') || r.find(b => b.momento !== 'defensa');
    if (t2) t2.minutos += ajuste;
    let t = 0;
    r.forEach(b => { b.desde = t; t += b.minutos; b.hasta = t; });
    return r;
  };
  const hm = m => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');

  function idYoutube(url) {
    const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
    return m ? m[1] : null;
  }
  function idDrive(url) {
    const m = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/.exec(url) || /docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([\w-]{20,})/.exec(url);
    return m ? m[1] : null;
  }

  /** Inserta el material: video de YouTube, archivo de Drive en vista previa, o enlace. */
  S.material = function (m) {
    const yt = idYoutube(m.url), dv = idDrive(m.url);
    let cuerpo = '';
    if (m.tipo === 'video' && yt) cuerpo = '<div class="marco v"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '" title="' + esc(m.titulo) + '" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
    else if (dv && /docs\.google\.com/.test(m.url)) cuerpo = '<div class="marco d"><iframe src="' + esc(m.url.replace(/\/(edit|view)[^/]*$/, '') + '/preview') + '" title="' + esc(m.titulo) + '" loading="lazy"></iframe></div>';
    else if (dv) cuerpo = '<div class="marco ' + (m.tipo === 'podcast' ? 'a' : 'd') + '"><iframe src="https://drive.google.com/file/d/' + dv + '/preview" title="' + esc(m.titulo) + '" allow="autoplay" loading="lazy"></iframe></div>';
    return '<article class="material ' + esc(m.tipo) + '"><div class="mat-cab"><span class="chip ' + ({ cuaderno: 'info', podcast: 'ok', video: 'aviso' }[m.tipo] || 'gris') + '">' + esc(TIPOS[m.tipo] || m.tipo) + '</span><b>' + esc(m.titulo) + '</b></div>' +
      cuerpo + '<a class="btn s peq" href="' + esc(m.url) + '" target="_blank" rel="noopener">Abrir en una pestaña nueva</a></article>';
  };

  /** Lista de sesiones agrupadas por semana. */
  S.lista = function (sesiones, conEstado) {
    if (!sesiones.length) return '<div class="tarjeta vacio">Aún no hay sesiones disponibles. Aparecerán aquí cuando el docente las habilite.</div>';
    const semanas = {};
    sesiones.forEach(s => { (semanas[s.semana] = semanas[s.semana] || []).push(s); });
    return Object.keys(semanas).sort((a, b) => a - b).map(w =>
      '<section class="semana"><h3 class="semana-t">Semana ' + w + '</h3><div class="sesiones">' + semanas[w].map(s =>
        '<button type="button" class="sesion-card" data-sesion="' + esc(s.id) + '"><span class="num">' + s.numero + '</span><span class="txt"><b>' + esc(s.titulo) + '</b><small>' +
        esc([s.fecha ? M.fechaCorta(s.fecha) : '', s.hora, s.unidad].filter(Boolean).join(' · ')) + '</small></span>' + (conEstado !== false ? S.chipEstado(s.estado) : '') + '</button>').join('') +
      '</div></section>').join('');
  };

  /** Vista completa de una sesión, tal como la ve el estudiante. */
  S.vista = function (s, minutos, opciones) {
    opciones = opciones || {};
    const ruta = S.calcularRuta(minutos, s.ruta || []);
    const total = ruta.reduce((a, b) => a + b.minutos, 0) || 1;
    const col = { inicio: '#10213D', fundamento: '#475569', taller1: '#2457FF', pausa: '#DEDBD2', taller2: '#00A896', defensa: '#FF6B35', cierre: '#10213D' };
    return '' +
      (opciones.volver ? '<div><button type="button" class="btn t" data-volver>← Volver a las sesiones</button></div>' : '') +
      '<div class="cabecera"><div><span class="lema" style="color:var(--pizarra)">Sesión ' + s.numero + ' · Semana ' + s.semana + (s.unidad ? ' · ' + esc(s.unidad) : '') + '</span>' +
      '<h1>' + esc(s.titulo) + '</h1><p>' + esc([s.fecha ? M.fechaLarga(s.fecha) : '', s.hora ? s.hora + ' h' : '', minutos + ' minutos'].filter(Boolean).join(' · ')) + '</p></div>' + S.chipEstado(s.estado) + '</div>' +
      (s.observador ? '<div class="msg info">Vista de observador: ves la sesión completa como la verá un estudiante.</div>' : '') +
      '<div class="tarjeta objetivos"><h2>En esta sesión aprenderás a:</h2>' + (s.objetivos && s.objetivos.length ? '<ol>' + s.objetivos.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol>' : '<p class="sub">Los objetivos se publicarán pronto.</p>') + '</div>' +
      '<div class="tarjeta"><h2>Ruta de la sesión</h2><div class="ruta-barra">' + ruta.map(b => '<i style="flex:' + b.minutos + ';background:' + (col[b.momento] || '#475569') + '" title="' + esc(b.titulo) + ' · ' + b.minutos + ' min"></i>').join('') + '</div>' +
      '<ol class="ruta">' + ruta.map(b => '<li class="m-' + b.momento + '"><span class="hora">' + hm(b.desde) + ' a ' + hm(b.hasta) + '</span><div><b>' + esc(b.titulo) + '</b> <small>' + b.minutos + ' min</small>' + (b.descripcion ? '<p>' + esc(b.descripcion) + '</p>' : '') + '</div></li>').join('') + '</ol>' +
      '<p class="sub" style="font-size:.82rem">Plazo para completar el trabajo de la sesión: hasta las 23:59 del mismo día, solo si registraste asistencia.</p></div>' +
      '<div class="tarjeta"><h2>Materiales</h2>' + (s.materiales && s.materiales.length ? '<div class="materiales">' + s.materiales.map(S.material).join('') + '</div>' :
        '<p class="sub">' + (s.materiales_visibles === false ? 'Los materiales de esta sesión aún no están disponibles.' : 'Esta sesión no tiene materiales cargados.') + '</p>') + '</div>' +
      '<div class="tarjeta"><h2>Tareas, control y entrega</h2><p class="sub">Las tareas de la sesión aparecerán aquí durante la clase, con su consigna paso a paso, el tiempo sugerido y el criterio con que se revisan.</p>' +
      '<div class="opciones"><span class="chip ' + (s.control_abierto ? 'ok' : 'gris') + '">Control de lectura: ' + (s.control_abierto ? 'abierto' : 'cerrado') + '</span><span class="chip ' + (s.entrega_abierta ? 'ok' : 'gris') + '">Entrega: ' + (s.entrega_abierta ? 'abierta' : 'cerrada') + '</span></div></div>';
  };
})();
