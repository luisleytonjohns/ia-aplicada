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

  /* ---------- Probar un prompt en una IA ----------
   * Cada botón copia el prompt y abre la IA en otra pestaña. ChatGPT, Claude y Perplexity reciben el
   * prompt ya escrito por la dirección (?q=); Gemini no lo permite, así que se abre y el estudiante pega.
   * Los logos son los íconos oficiales de cada sitio, servidos por el servicio de favicons de Google.
   * Ningún dato pasa por Metis: el prompt va del navegador del estudiante a la IA que elija. */
  const IAS = [
    { id: 'chatgpt', nombre: 'ChatGPT', dominio: 'chatgpt.com', url: q => 'https://chatgpt.com/?q=' + q },
    { id: 'claude', nombre: 'Claude', dominio: 'claude.ai', url: q => 'https://claude.ai/new?q=' + q },
    { id: 'perplexity', nombre: 'Perplexity', dominio: 'perplexity.ai', url: q => 'https://www.perplexity.ai/search?q=' + q },
    { id: 'gemini', nombre: 'Gemini', dominio: 'gemini.google.com', url: () => 'https://gemini.google.com/app', pegar: true }
  ];
  const LARGO_URL = 6000;
  M.botonesIA = function () {
    return '<div class="probar-ia"><span class="pi-t">Probar en</span>' + IAS.map(a =>
      '<button class="pi-btn" type="button" data-ia="' + a.id + '" title="Abrir en ' + a.nombre + (a.pegar ? ' (se copia el prompt para que lo pegues)' : ' con el prompt ya escrito') + '" aria-label="Probar en ' + a.nombre + '">' +
      '<img src="https://www.google.com/s2/favicons?domain=' + a.dominio + '&sz=64" alt="" width="20" height="20" loading="lazy" onerror="this.remove()"><span>' + a.nombre + '</span></button>').join('') +
      '<small class="pi-msg" aria-live="polite"></small></div>';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ia]'); if (!b) return;
    const a = IAS.find(x => x.id === b.dataset.ia); if (!a) return;
    const caja = b.closest('.prompt-caja, [data-prompt-ia]');
    const fuente = caja && (caja.querySelector('pre') || caja.querySelector('textarea[data-c=prompt]'));
    const texto = fuente ? (fuente.value !== undefined ? fuente.value : fuente.textContent).trim() : '';
    if (!texto) return;
    const q = encodeURIComponent(texto);
    const pegar = a.pegar || q.length > LARGO_URL;
    window.open(pegar ? (a.pegar ? a.url() : a.url('')) : a.url(q), '_blank', 'noopener');
    const msg = b.parentNode.querySelector('.pi-msg');
    const decir = t => { if (msg) { msg.textContent = t; clearTimeout(msg._t); msg._t = setTimeout(() => { msg.textContent = ''; }, 6000); } };
    const ok = pegar ? 'Prompt copiado. Pégalo en ' + a.nombre + ' (Ctrl+V).' : 'Se abrió ' + a.nombre + ' con el prompt. Revísalo antes de enviarlo.';
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(() => decir(ok)).catch(() => decir(pegar ? 'Copia el prompt con el botón Copiar y pégalo en ' + a.nombre + '.' : ok));
    else decir(ok);
  });

  /* ---------- Demostración del caso Los Aromos ---------- */
  S.demo = function (dm) {
    if (!dm || !dm.pasos || !dm.pasos.length) return '';
    return '<div class="tarjeta demo"><span class="lema">Demostración · Distribuidora Los Aromos</span><h2>' + esc(dm.titulo || 'Demostración del caso') + '</h2>' +
      (dm.objetivo ? '<p>' + esc(dm.objetivo) + '</p>' : '') +
      '<p class="sub demo-meta">' + (dm.herramientas ? 'Herramientas: ' + esc(dm.herramientas) + '. ' : '') + 'El docente la hace en clase; aquí la tienes para repetirla paso a paso con los mismos prompts.</p>' +
      (dm.video ? '<div><a class="btn s" href="' + esc(dm.video) + '" target="_blank" rel="noopener">Ver la demostración grabada</a></div>' : '') +
      '<ol class="demo-pasos">' + dm.pasos.map((p, i) => {
        const formula = /^=/.test(p.prompt || '');
        return '<li><details' + (i === 0 ? ' open' : '') + '><summary><span class="dn">' + (i + 1) + '</span><b>' + esc(p.titulo || 'Paso ' + (i + 1)) + '</b></summary><div class="dp-cuerpo">' +
          (p.hace ? '<p>' + esc(p.hace) + '</p>' : '') +
          (p.prompt ? '<div class="prompt-caja"><div class="pc-cab"><span>' + (formula ? 'Fórmula en Google Sheets' : 'Prompt') + '</span><button class="btn t peq" type="button" data-copiar>Copiar</button></div><pre>' + esc(p.prompt) + '</pre>' + (formula ? '' : M.botonesIA()) + '</div>' : '') +
          (p.observa ? '<p class="observa"><b>Qué observar:</b> ' + esc(p.observa) + '</p>' : '') + '</div></details></li>';
      }).join('') + '</ol>' +
      (dm.leccion ? '<p class="leccion"><b>La lección:</b> ' + esc(dm.leccion) + '</p>' : '') + '</div>';
  };
  // Copiar el prompt de una demostración.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copiar]'); if (!b) return;
    const pre = b.closest('.prompt-caja').querySelector('pre');
    const listo = () => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar'; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(listo).catch(() => { b.textContent = 'Selecciónalo y copia'; });
    else b.textContent = 'Selecciónalo y copia';
  });

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
      (opciones.volver ? '<div><a class="btn t" href="#sesiones" onclick="if (history.length > 1) { history.back(); return false; }">← Volver</a></div>' : '') +
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
      S.demo(s.demo) +
      '<div class="opciones">' + (s.control_abierto ? '<span class="chip ok">Control de lectura abierto</span>' : '') + (s.entrega_abierta ? '<span class="chip ok">Entrega abierta</span>' : '') + '</div>' +
      '<section class="tarjeta tareas" id="tareas-sesion"></section>';
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
