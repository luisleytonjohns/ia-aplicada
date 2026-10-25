/* Metis · app.js · Núcleo de la interfaz: acceso, registro, recuperación y ambientes por rol. */
(function () {
  'use strict';
  const CFG = window.METIS_CONFIG || {};
  const VERSION_INTERFAZ = '0.9.1';

  // Acciones que esta interfaz usa. Se comparan con las del servicio para detectar desajustes.
  const CONTRATO = ['ping', 'loginGoogle', 'loginClave', 'infoRegistro', 'registrarConGoogle', 'registrarConClave',
    'solicitarRecuperacion', 'restablecerClave', 'miSesion', 'cerrarSesion', 'cambiarClave', 'guardarMiFicha',
    'listarVersiones', 'guardarVersion', 'listarLinks', 'crearLink', 'desactivarLink', 'listarPersonas', 'crearPersona',
    'actualizarPersona', 'reenviarAcceso', 'cambiarEstadoInscripcion', 'cargaMasiva', 'verFoto',
    'misSesiones', 'verSesion', 'listarSesiones', 'generarSesiones', 'verSesionDocente', 'guardarSesion', 'cambiarEstadoSesiones', 'cambiarAperturaSesion',
    'registrarAsistencia', 'guardarRespuesta', 'subirArchivo', 'guardarTareas', 'codigoAsistencia', 'listarAsistencia', 'marcarAsistencia', 'entregasSesion', 'verRespuesta',
    'cargarTareasBase', 'actualizarPlanBase', 'completarGuiasBase', 'cambiarAccesoInscripcion', 'miAvance'];

  const M = window.M = { estado: { token: null, sesion: null, versionId: null }, CONTRATO: CONTRATO, ESPERA_MAX_MS: 40000 };
  const app = () => document.getElementById('app');
  M.app = app;

  /* ---------- Utilidades ---------- */
  const esc = M.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = M.$ = (sel, raiz) => (raiz || document).querySelector(sel);
  const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  M.leer = leer; M.guardar = guardar;

  M.msg = function (el, texto, tipo) {
    if (typeof el === 'string') el = $(el);
    if (!el) return;
    if (!texto) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="msg ' + (tipo || 'info') + '">' + esc(texto) + '</div>';
  };

  /* Velo de carga: se muestra al cargar cualquier página o vista. Admite llamadas anidadas. */
  M.velo = {
    n: 1, // el velo parte visible desde index.html
    mostrar: function () { M.velo.n++; const v = document.getElementById('velo-carga'); if (v) v.classList.remove('oculto'); },
    ocultar: function () { M.velo.n = Math.max(0, M.velo.n - 1); if (!M.velo.n) { const v = document.getElementById('velo-carga'); if (v) v.classList.add('oculto'); } }
  };
  M.conVelo = async function (fn) { M.velo.mostrar(); try { return await fn(); } finally { M.velo.ocultar(); } };

  M.ocupado = async function (btn, fn) {
    const txt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Procesando…'; }
    try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.innerHTML = txt; } }
  };

  M.api = async function (accion, datos) {
    if (!CFG.API_URL) throw new Error('Falta config.js con la dirección del servicio.');
    // Límite de espera: si el servicio no responde, se informa en vez de dejar el velo pegado.
    const control = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const reloj = control ? setTimeout(() => control.abort(), M.ESPERA_MAX_MS) : null;
    let r, j;
    try {
      r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: accion, token: M.estado.token, datos: datos || {} }), signal: control ? control.signal : undefined });
      j = await r.json();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('El servicio tardó demasiado en responder. Espera unos segundos y vuelve a intentarlo.');
      throw new Error('No hay conexión con el servicio. Revisa tu internet y vuelve a intentarlo.');
    } finally { if (reloj) clearTimeout(reloj); }
    if (!j.ok) {
      if (/sesión venció|Debes ingresar/.test(j.error || '') && accion !== 'miSesion') { M.salir(true); }
      else if (/^Tu acceso a Metis/.test(j.error || '') && M.estado.token) { M.salir(true, j.error); }
      throw new Error(j.error || 'Error desconocido.');
    }
    return j.data;
  };

  M.copiar = async function (texto, btn) {
    try { await navigator.clipboard.writeText(texto); if (btn) { const t = btn.textContent; btn.textContent = 'Copiado'; setTimeout(() => { btn.textContent = t; }, 1500); } }
    catch (e) { window.prompt('Copia este texto:', texto); }
  };

  M.fecha = s => s ? String(s).slice(0, 16).replace('T', ' ') : '';

  /* ---------- Marca ---------- */
  M.simbolo = function (tam, claro) {
    const a = claro ? '#F7F5EF' : '#10213D';
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 64 64" aria-hidden="true"><polygon points="4,12 14,12 33,27 33,34 17,22 17,56 4,56" fill="' + a + '"/><polygon points="17,24.5 33,36.5 33,56 17,56" fill="#2457FF"/><polygon points="37,31 52,21 52,56 37,56" fill="#00A896"/><polygon points="37,20 56,7 56,15.5 37,28.5" fill="#FF6B35"/></svg>';
  };
  M.franja = '<div class="franja"><i style="background:#2457FF"></i><i style="background:#00A896"></i><i style="background:#FF6B35"></i></div>';
  M.pie = function () {
    return '<footer class="pie"><div class="in"><span>Creado por <strong>Luis Ernest Leyton Johns</strong> · ORCID <a href="https://orcid.org/0000-0002-4462-403X" target="_blank" rel="noopener">0000-0002-4462-403X</a> · <a href="https://linkedin.com/in/luis-leyton-johns" target="_blank" rel="noopener">linkedin.com/in/luis-leyton-johns</a></span>' +
      '<span>© ' + new Date().getFullYear() + ' Metis. Todos los derechos reservados. · <a href="privacidad.html">Privacidad</a></span></div></footer>';
  };
  /* ---------- Instalar Metis como aplicación ---------- */
  const INST = { evento: null };
  const instalada = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INST.evento = e; });
  window.addEventListener('appinstalled', () => { INST.evento = null; document.querySelectorAll('[data-instalar], .instalar-card').forEach(x => x.remove()); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  const ICO_INST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  M.instalada = instalada;
  M.botonInstalar = (clase, texto) => instalada() ? '' : '<button type="button" class="' + clase + '" data-instalar>' + ICO_INST + '<span>' + texto + '</span></button>';
  M.activarInstalar = raiz => (raiz || document).querySelectorAll('[data-instalar]').forEach(b => { b.onclick = instalar; });
  async function instalar() {
    if (INST.evento) {
      const ev = INST.evento; INST.evento = null;
      ev.prompt();
      try { await ev.userChoice; } catch (e) { /* nada */ }
      return;
    }
    const paso = (n, t) => '<li><span class="n">' + n + '</span><span>' + t + '</span></li>';
    const cuerpo = esIOS()
      ? '<p style="margin:0">En iPhone y iPad, Metis se instala desde <b>Safari</b>:</p><ol class="inst-pasos">' +
        paso(1, 'Abre esta página en Safari. Otros navegadores del iPhone no permiten instalar.') +
        paso(2, 'Toca el botón <b>Compartir</b>, el cuadrado con una flecha hacia arriba.') +
        paso(3, 'Elige <b>Agregar a inicio</b> y luego <b>Agregar</b>.') + '</ol>'
      : '<p style="margin:0">Tu navegador no ofreció la instalación directa. Puedes hacerla desde su menú:</p><ol class="inst-pasos">' +
        paso(1, '<b>Android, en Chrome:</b> menú de tres puntos y luego <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.') +
        paso(2, '<b>Computador, en Chrome o Edge:</b> el ícono de instalar que aparece a la derecha de la barra de direcciones, o el menú del navegador y luego <b>Instalar Metis</b>.') +
        paso(3, 'Si no aparece la opción, recarga la página y vuelve a intentarlo en unos segundos.') + '</ol>';
    M.modal('Instalar Metis', cuerpo + '<p style="margin:0;color:var(--pizarra);font-size:.88rem">Metis queda en tu pantalla de inicio y se abre como una aplicación. Sigue necesitando internet para cargar tus sesiones y guardar tu trabajo.</p>',
      '<button class="btn p" type="button" data-cerrar>Entendido</button>');
  }

  function patron(semilla, cols, filas) {
    let x = semilla; const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    const C = ['#2457FF', '#00A896', '#FF6B35', '#1B3358', '#2457FF']; const s = 40; let h = '';
    for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) {
      if (rnd() < 0.28) continue;
      const X = c * s, Y = r * s, col = C[Math.floor(rnd() * C.length)], k = Math.floor(rnd() * 5);
      const p = [X + ',' + Y + ' ' + (X + s) + ',' + Y + ' ' + X + ',' + (Y + s), (X + s) + ',' + Y + ' ' + (X + s) + ',' + (Y + s) + ' ' + X + ',' + (Y + s),
        X + ',' + Y + ' ' + (X + s) + ',' + Y + ' ' + (X + s) + ',' + (Y + s), X + ',' + Y + ' ' + (X + s) + ',' + (Y + s) + ' ' + X + ',' + (Y + s),
        X + ',' + Y + ' ' + (X + s) + ',' + Y + ' ' + (X + s) + ',' + (Y + s) + ' ' + X + ',' + (Y + s)][k];
      h += '<polygon points="' + p + '" fill="' + col + '"/>';
    }
    return '<svg class="patron" viewBox="0 0 ' + cols * s + ' ' + filas * s + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + h + '</svg>';
  }
  function panelMarca(extra) {
    // Cuando hay un bloque de curso (registro), el descriptor general se omite para no repetir el nombre de la asignatura.
    return '<aside class="panel">' + patron(13, 12, 6) + '<div class="contenido"><div class="marca">' + M.simbolo(64, true) + '<span class="word">METIS</span></div>' +
      '<div class="lema">Analiza · Verifica · Decide · Construye</div>' +
      (extra ? '' : '<div class="descr"><b>Artes Digitales:</b> IA Aplicada a la Administración y la Economía</div>') + (extra || '') + '</div></aside>';
  }
  function pantallaAcceso(contenido, extraPanel) {
    app().innerHTML = '<div class="acceso">' + panelMarca(extraPanel) + '<section class="lado"><div class="caja">' + contenido + '</div></section></div>' + M.pie();
  }

  /* ---------- Google ---------- */
  let gsiOk = false; const esperaGsi = [];
  M.gsiListo = function () { gsiOk = true; esperaGsi.splice(0).forEach(f => f()); };
  M.botonGoogle = function (el, callback, texto) {
    const pintar = () => {
      if (!CFG.CLIENT_ID) { el.innerHTML = '<div class="msg mal">Falta el ID de cliente en config.js.</div>'; return; }
      if (!window.google || !google.accounts) { el.innerHTML = '<div class="msg aviso">No se pudo cargar el botón de Google. Ingresa con correo y clave o recarga la página.</div>'; return; }
      google.accounts.id.initialize({ client_id: CFG.CLIENT_ID, callback: r => callback(r.credential), ux_mode: 'popup', auto_select: false });
      google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: texto || 'signin_with', shape: 'rectangular', locale: 'es', width: Math.min(380, el.clientWidth || 380) });
    };
    if (gsiOk && window.google) pintar(); else esperaGsi.push(pintar);
  };

  /* ---------- Fotos ---------- */
  M.leerFoto = function (archivo) {
    return new Promise((ok, mal) => {
      if (!archivo) return ok(null);
      if (!/^image\//.test(archivo.type)) return mal(new Error('El archivo debe ser una imagen.'));
      const lector = new FileReader();
      lector.onerror = () => mal(new Error('No se pudo leer la imagen.'));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => mal(new Error('No se pudo abrir la imagen.'));
        img.onload = () => {
          const recorte = (lado, calidad) => {
            const c = document.createElement('canvas'); c.width = lado; c.height = lado;
            const m = Math.min(img.width, img.height);
            c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
            return c.toDataURL('image/jpeg', calidad);
          };
          ok({ foto: recorte(640, 0.85), mini: recorte(120, 0.7) });
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  };

  /* ---------- Formulario de ficha (registro y completar) ---------- */
  M.formFicha = function (u, opciones) {
    u = u || {}; opciones = opciones || {};
    const mod = u.modalidad || '';
    const r = (v, t) => '<label><input type="radio" name="modalidad" value="' + v + '"' + (mod === v ? ' checked' : '') + '><span>' + t + '</span></label>';
    return '' +
      '<fieldset><legend>Datos personales</legend><div class="fila">' +
      campo('primer_nombre', 'Primer nombre', u.primer_nombre, 'text', true) + campo('segundo_nombre', 'Segundo nombre', u.segundo_nombre, 'text') +
      campo('primer_apellido', 'Primer apellido', u.primer_apellido, 'text', true) + campo('segundo_apellido', 'Segundo apellido', u.segundo_apellido, 'text') +
      '</div></fieldset>' +
      '<fieldset><legend>Contacto</legend><div class="fila">' +
      campo('correo_institucional', 'Correo institucional', u.correo_institucional, 'email', true, opciones.dominio ? 'Debe terminar en @' + opciones.dominio : '') +
      campo('correo_personal', 'Correo personal', u.correo_personal, 'email') + campo('celular', 'Celular', u.celular, 'tel', true, 'Ejemplo: +56 9 1234 5678') +
      '</div></fieldset>' +
      '<fieldset><legend>Tu proyecto</legend><div class="fila">' +
      campo('mencion', 'Mención o área de trabajo', u.mencion, 'text', true, 'Ejemplo: finanzas, recursos humanos, operaciones') +
      campo('organizacion', 'Organización donde trabajas', u.organizacion, 'text', false, 'Opcional. Si no trabajas, déjalo vacío.') +
      '</div><div class="campo"><span class="etq">¿Cómo trabajarás?</span><div class="opciones">' + r('individual', 'Individual') + r('pareja', 'En pareja') + r('caso de referencia', 'Con caso de referencia') + '</div></div></fieldset>' +
      '<fieldset><legend>Fotografía</legend><div class="foto-campo"><img id="f-prev" alt="" src="' + esc(u.foto_mini || '') + '"' + (u.foto_mini ? '' : ' style="visibility:hidden"') + '>' +
      '<div class="campo"><label for="f-foto">Foto de rostro, de frente</label><input type="file" id="f-foto" accept="image/*"><span class="ayuda">Obligatoria. Permite que el docente te conozca. Se recorta en forma cuadrada.</span></div></div></fieldset>' +
      (opciones.compromiso ? '<label class="check"><input type="checkbox" id="f-acepta"><span>Acepto el compromiso de resguardo de datos: no subiré a herramientas de IA de plan gratuito datos identificables de personas, clientes ni de mi organización, y trabajaré con datos anonimizados o sintéticos. Leí la <a href="privacidad.html" target="_blank">política de privacidad</a> de Metis.</span></label>' : '');
  };
  function campo(id, label, valor, tipo, req, ayuda) {
    return '<div class="campo"><label for="f-' + id + '">' + label + (req ? ' *' : '') + '</label><input type="' + tipo + '" id="f-' + id + '" value="' + esc(valor || '') + '"' + (tipo === 'email' ? ' autocomplete="email"' : '') + '>' + (ayuda ? '<span class="ayuda">' + esc(ayuda) + '</span>' : '') + '</div>';
  }
  M.activarFoto = function (raiz) {
    const input = $('#f-foto', raiz); const prev = $('#f-prev', raiz); const st = { foto: null, mini: null };
    input.addEventListener('change', async () => {
      try { const f = await M.leerFoto(input.files[0]); if (f) { st.foto = f.foto; st.mini = f.mini; prev.src = f.mini; prev.style.visibility = 'visible'; } }
      catch (e) { alert(e.message); }
    });
    return st;
  };
  M.leerFicha = function (raiz) {
    const v = id => ($('#f-' + id, raiz) || {}).value || '';
    const m = $('input[name=modalidad]:checked', raiz);
    return { primer_nombre: v('primer_nombre'), segundo_nombre: v('segundo_nombre'), primer_apellido: v('primer_apellido'), segundo_apellido: v('segundo_apellido'),
      correo_institucional: v('correo_institucional').trim().toLowerCase(), correo_personal: v('correo_personal').trim().toLowerCase(), celular: v('celular'),
      mencion: v('mencion'), organizacion: v('organizacion'), modalidad: m ? m.value : '' };
  };
  function revisarFicha(f, foto, exigirFoto) {
    if (!f.primer_nombre || !f.primer_apellido) return 'Completa tu primer nombre y tu primer apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo_institucional)) return 'Revisa tu correo institucional.';
    if (f.celular.replace(/\D/g, '').length < 8) return 'Indica un celular válido.';
    if (!f.mencion) return 'Indica tu mención o área de trabajo.';
    if (!f.modalidad) return 'Elige cómo trabajarás.';
    if (exigirFoto && !foto) return 'La fotografía es obligatoria.';
    return '';
  }

  /* ---------- Vistas de acceso ---------- */
  /* Portada: presentación de Metis con el acceso a la derecha. */
  const ICONOS = {
    artes: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7c-9.4 0-17 7-17 15.6 0 6.6 5 9.9 9.6 9.9 2.5 0 3.4 1.6 3.4 3.3 0 2.8 2 5.2 5 5.2 9 0 15-8.3 15-17.5C40 14.2 32.8 7 24 7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="20" r="2.6" fill="#FF6B35"/><circle cx="23" cy="14.5" r="2.6" fill="#2457FF"/><circle cx="31" cy="17" r="2.6" fill="#00A896"/><path d="M27 33l14-14" stroke="#FF6B35" stroke-width="3" stroke-linecap="round"/></svg>',
    ia: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 9a6 6 0 00-6 6 6 6 0 00-4 10.5A6 6 0 0014 36a6 6 0 006 3V9zM28 9a6 6 0 016 6 6 6 0 014 10.5A6 6 0 0134 36a6 6 0 01-6 3V9z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M20 18h-4M20 28h-5M28 18h4M28 28h5M24 9v30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="18" r="1.8" fill="currentColor"/><circle cx="33" cy="28" r="1.8" fill="currentColor"/></svg>',
    adm: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40h32" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="11" y="26" width="6" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="21" y="18" width="6" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="31" y="10" width="6" height="26" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    eco: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="22" cy="13" rx="11" ry="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 13v8c0 2.5 4.9 4.5 11 4.5s11-2 11-4.5v-8M11 21v8c0 2.5 4.9 4.5 11 4.5M11 29v7c0 2.5 4.9 4.5 11 4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="33" cy="33" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M33 29.5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  function vistaLogin(aviso) {
    const pilar = (k, t, d) => '<div class="pilar ' + k + '"><span class="ico">' + ICONOS[k] + '</span><b>' + t + '</b><p>' + d + '</p></div>';
    app().innerHTML = '<div class="portada">' +
      '<header class="p-barra"><div class="p-in"><a class="marca" href="./" aria-label="Metis">' + M.simbolo(46, true) + '<span class="word">METIS</span></a>' +
      '<nav class="p-nav"><button type="button" data-ir="p-top" class="activo">Inicio</button><button type="button" data-ir="p-propuesta">¿Qué es Metis?</button><button type="button" data-ir="p-pilares">Características</button>' + M.botonInstalar('p-instalar-nav', 'Instalar app') + '<button type="button" data-ir="p-acceso" class="p-ingresar">Ingresar</button></nav></div></header>' +
      '<section class="p-hero" id="p-top"><div class="p-in"><div class="p-texto">' +
      '<span class="p-rotulo">Artes Digitales</span>' +
      '<h1>IA aplicada a la <em>Administración</em> y la <em>Economía</em></h1>' +
      '<p class="p-lema">Analiza · Verifica · Decide · Construye</p>' +
      '<p class="p-bajada">Metis es la plataforma del curso: cada sesión, sus materiales, el trabajo en clase y tu proyecto en un solo lugar. Usarás herramientas de inteligencia artificial para resolver un problema real de tu organización, con evidencia y criterio propio.</p>' +
      '<div class="p-botones"><button type="button" class="p-boton" data-ir="p-propuesta">Descubre más <span aria-hidden="true">→</span></button>' + M.botonInstalar('p-boton p-boton-inst', 'Instalar la app') + '</div></div>' +
      '<div class="p-arte" role="img" aria-label="Busto clásico intervenido con triángulos y gráficos de datos"></div></div></section>' +
      '<section class="p-propuesta" id="p-propuesta"><div class="p-in"><div class="p-izq">' +
      '<span class="p-rotulo oscuro">Nuestra propuesta</span>' +
      '<h2>Donde la creatividad y la inteligencia se encuentran</h2>' +
      '<p class="p-parrafo">Artes Digitales continúa la tradición de las artes liberales: aprender a pensar con precisión, argumentar con evidencia y comunicar con claridad, ahora con las herramientas de inteligencia artificial que ya cambiaron el trabajo en las organizaciones.</p>' +
      '<div class="pilares" id="p-pilares">' +
      pilar('artes', 'Artes digitales', 'Creatividad que transforma ideas en soluciones.') +
      pilar('ia', 'Inteligencia artificial', 'Herramientas que potencian tu pensamiento, sin reemplazarlo.') +
      pilar('adm', 'Administración', 'Procesos más eficientes, medidos contra una línea base.') +
      pilar('eco', 'Economía', 'Decisiones basadas en datos y en su contexto real.') +
      '</div></div>' +
      '<aside class="p-acceso" id="p-acceso"><div class="marca">' + M.simbolo(40, true) + '<span class="word">METIS</span></div>' +
      '<div><h2>Inicia sesión</h2><p class="p-sub">Accede a tu cuenta para continuar.</p></div>' +
      '<div id="l-msg"></div>' +
      '<form id="l-form" class="p-form" novalidate>' +
      '<label class="p-campo"><span class="sr">Correo</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><input type="email" id="l-usuario" autocomplete="username" placeholder="Correo electrónico"></label>' +
      '<label class="p-campo"><span class="sr">Clave</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><input type="password" id="l-clave" autocomplete="current-password" placeholder="Clave">' +
      '<button type="button" class="p-ojo" id="l-ver" aria-label="Mostrar u ocultar la clave"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></label>' +
      '<button class="p-entrar" type="submit">Ingresar</button></form>' +
      '<button class="p-link" id="l-olvido" type="button">¿Olvidaste tu clave o no tienes una?</button>' +
      '<form id="r-form" class="p-form oculto" novalidate><label class="p-campo"><span class="sr">Tu correo registrado</span><input type="email" id="r-correo" placeholder="Tu correo registrado"></label>' +
      '<button class="p-entrar sec" type="submit">Enviarme un enlace para crear clave</button></form>' +
      '<div class="p-sep">o ingresa con Google</div><div id="l-google" class="p-google"></div>' +
      '<p class="p-nota">¿No tienes cuenta? Pídele a tu docente el link de registro del curso.</p></aside></div></section>' +
      '<section class="p-cita"><div class="p-in"><blockquote><p>“La inteligencia no es solo lo que piensas, sino lo que haces con lo que sabes.”</p><cite>Metis</cite></blockquote></div></section>' +
      '<footer class="p-pie"><div class="p-in"><div class="marca">' + M.simbolo(34, true) + '<span class="word">METIS</span></div><span class="p-lema-pie">Analiza · Verifica · Decide · Construye</span>' +
      '<div class="p-redes"><a href="https://linkedin.com/in/luis-leyton-johns" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor"/><path d="M8 10v7M8 7.2v.1M11.5 17v-4.2c0-1.5 1-2.6 2.4-2.6s2.1 1 2.1 2.6V17M11.5 10v7" stroke="#10213D" stroke-width="1.8" stroke-linecap="round"/></svg></a>' +
      '<a href="https://orcid.org/0000-0002-4462-403X" target="_blank" rel="noopener" aria-label="ORCID"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M8.6 10v6.5M8.6 7.6v.1M11.4 10h2.2a3.2 3.2 0 010 6.5h-2.2V10z" stroke="#10213D" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></a></div></div></footer>' +
      M.pie() + '</div>';
    app().querySelectorAll('[data-ir]').forEach(b => { b.onclick = () => { const el = document.getElementById(b.dataset.ir); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    $('#l-ver').onclick = () => { const c = $('#l-clave'); c.type = c.type === 'password' ? 'text' : 'password'; };
    M.activarInstalar(app());
    if (aviso) M.msg('#l-msg', aviso.texto, aviso.tipo);
    M.botonGoogle($('#l-google'), async cred => {
      M.msg('#l-msg', 'Verificando…', 'info');
      try { entrar(await M.api('loginGoogle', { credential: cred })); } catch (e) { M.msg('#l-msg', e.message, 'mal'); }
    });
    $('#l-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const btn = ev.submitter || $('#l-form button');
      await M.ocupado(btn, async () => {
        try { const r = await M.api('loginClave', { usuario: $('#l-usuario').value, clave: $('#l-clave').value }); entrar(r); }
        catch (e) { M.msg('#l-msg', e.message, 'mal'); }
      });
    });
    $('#l-olvido').addEventListener('click', () => { $('#r-form').classList.toggle('oculto'); $('#r-correo').value = $('#l-usuario').value; });
    $('#r-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      await M.ocupado($('#r-form button'), async () => {
        try { const r = await M.api('solicitarRecuperacion', { correo: $('#r-correo').value }); M.msg('#l-msg', r.mensaje, 'ok'); $('#r-form').classList.add('oculto'); }
        catch (e) { M.msg('#l-msg', e.message, 'mal'); }
      });
    });
  }

  async function vistaRegistro(token) {
    let info;
    try { info = await M.api('infoRegistro', { r: token }); }
    catch (e) { pantallaAcceso('<h1>Registro</h1><div class="msg mal">' + esc(e.message) + '</div><a class="btn s" href="./">Ir a ingresar</a>'); return; }
    const v = info.version;
    const curso = '<div style="border-top:1px solid rgba(247,245,239,.25);padding-top:14px;display:grid;gap:4px"><span class="lema" style="opacity:.75">Registro en</span><b style="font:600 1.15rem/1.3 var(--disp)">' + esc(v.asignatura) + '</b><span>' + esc([v.institucion, v.escuela].filter(Boolean).join(' · ')) + '</span><span>' + esc([v.periodo, v.anio].filter(Boolean).join(' ')) + '</span></div>';
    app().innerHTML = '<div class="acceso">' + panelMarca(curso) + '<section class="lado" style="align-items:flex-start"><div class="caja" style="max-width:640px">' +
      '<div><h1>Crea tu cuenta</h1><p class="sub">Completa tu ficha. Toma unos tres minutos.</p></div>' +
      '<form id="g-form" class="caja" style="max-width:none" novalidate>' + M.formFicha({}, { compromiso: true, dominio: info.dominio }) +
      '<fieldset><legend>Cómo ingresarás</legend><p class="sub" style="font-size:.88rem">Con Google, la cuenta debe ser uno de los correos de tu ficha. Con clave, ingresarás con tu correo institucional.</p>' +
      '<div id="g-google"></div><div class="sep">o crea una clave</div><div class="fila">' +
      '<div class="campo"><label for="g-clave">Clave</label><input type="password" id="g-clave" autocomplete="new-password"><span class="ayuda">Mínimo 8 caracteres, con letras y números.</span></div>' +
      '<div class="campo"><label for="g-clave2">Repite la clave</label><input type="password" id="g-clave2" autocomplete="new-password"></div></div>' +
      '<button class="btn p" type="submit">Registrarme con correo y clave</button></fieldset><div id="g-msg"></div></form></div></section></div>' + M.pie();
    const foto = M.activarFoto(app());
    const preparar = () => {
      const f = M.leerFicha(app());
      const err = revisarFicha(f, foto.foto, true) || (!$('#f-acepta').checked ? 'Debes aceptar el compromiso de resguardo de datos.' : '') ||
        (info.dominio && !f.correo_institucional.endsWith('@' + info.dominio) ? 'Tu correo institucional debe terminar en @' + info.dominio + '.' : '');
      if (err) { M.msg('#g-msg', err, 'mal'); $('#g-msg').scrollIntoView({ block: 'center' }); return null; }
      return { r: token, ficha: f, foto: foto.foto, foto_mini: foto.mini, acepta_compromiso: true };
    };
    M.botonGoogle($('#g-google'), async cred => {
      const d = preparar(); if (!d) return;
      d.credential = cred; M.msg('#g-msg', 'Registrando…', 'info');
      try { entrar(await M.api('registrarConGoogle', d), true); } catch (e) { M.msg('#g-msg', e.message, 'mal'); }
    }, 'signup_with');
    $('#g-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const d = preparar(); if (!d) return;
      if ($('#g-clave').value !== $('#g-clave2').value) { M.msg('#g-msg', 'Las claves no coinciden.', 'mal'); return; }
      d.clave = $('#g-clave').value;
      await M.ocupado(ev.submitter, async () => {
        try { entrar(await M.api('registrarConClave', d), true); } catch (e) { M.msg('#g-msg', e.message, 'mal'); }
      });
    });
  }

  function vistaReset(token) {
    pantallaAcceso('<div><h1>Crea una clave nueva</h1><p class="sub">Mínimo 8 caracteres, con letras y números.</p></div><div id="x-msg"></div>' +
      '<form id="x-form" class="caja" style="gap:12px" novalidate><div class="campo"><label for="x-1">Clave nueva</label><input type="password" id="x-1" autocomplete="new-password"></div>' +
      '<div class="campo"><label for="x-2">Repite la clave</label><input type="password" id="x-2" autocomplete="new-password"></div><button class="btn p ancho" type="submit">Guardar clave</button></form>');
    $('#x-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      if ($('#x-1').value !== $('#x-2').value) { M.msg('#x-msg', 'Las claves no coinciden.', 'mal'); return; }
      await M.ocupado(ev.submitter, async () => {
        try { const r = await M.api('restablecerClave', { token: token, nueva: $('#x-1').value }); history.replaceState(null, '', location.pathname); vistaLogin({ texto: r.mensaje, tipo: 'ok' }); }
        catch (e) { M.msg('#x-msg', e.message, 'mal'); }
      });
    });
  }

  function vistaCambioObligatorio() {
    pantallaAcceso('<div><h1>Crea tu clave personal</h1><p class="sub">Ingresaste con una clave temporal. Elige una nueva para continuar.</p></div><div id="c-msg"></div>' +
      '<form id="c-form" class="caja" style="gap:12px" novalidate><div class="campo"><label for="c-1">Clave nueva</label><input type="password" id="c-1" autocomplete="new-password"><span class="ayuda">Mínimo 8 caracteres, con letras y números.</span></div>' +
      '<div class="campo"><label for="c-2">Repite la clave</label><input type="password" id="c-2" autocomplete="new-password"></div><button class="btn p ancho" type="submit">Guardar y continuar</button></form>');
    $('#c-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      if ($('#c-1').value !== $('#c-2').value) { M.msg('#c-msg', 'Las claves no coinciden.', 'mal'); return; }
      await M.ocupado(ev.submitter, async () => {
        try { await M.api('cambiarClave', { nueva: $('#c-1').value }); await M.conVelo(cargarSesion); }
        catch (e) { M.msg('#c-msg', e.message, 'mal'); }
      });
    });
  }

  /* ---------- Sesión ---------- */
  function entrar(r, limpiarUrl) {
    M.estado.token = r.token; guardar('metis_token', r.token);
    if (limpiarUrl) history.replaceState(null, '', location.pathname);
    M.conVelo(cargarSesion);
  }

  async function cargarSesion() {
    try { M.estado.sesion = await M.api('miSesion'); }
    catch (e) {
      if (/tardó demasiado|No hay conexión/.test(e.message)) { vistaReintentar(e.message); return; }
      M.salir(false); vistaLogin({ texto: e.message, tipo: 'aviso' }); return;
    }
    const u = M.estado.sesion.usuario;
    // El cambio de clave temporal se exige solo a quien ingresó con ella (tiene clave y debe cambiarla).
    if (u.tiene_clave && u.debe_cambiar && u.rol !== 'docente') { vistaCambioObligatorio(); return; }
    await ambiente();
  }

  /** Pantalla cuando el servicio no respondió: conserva la sesión y permite reintentar. */
  function vistaReintentar(mensaje) {
    pantallaAcceso('<div><h1>No pudimos cargar tu espacio</h1><p class="sub">' + esc(mensaje) + '</p></div>' +
      '<button class="btn p ancho" type="button" id="z-reintentar">Reintentar</button><button class="btn t" type="button" id="z-salir">Ingresar con otra cuenta</button>');
    $('#z-reintentar').addEventListener('click', () => M.conVelo(cargarSesion));
    $('#z-salir').addEventListener('click', () => { M.salir(false); vistaLogin(); });
  }

  M.salir = function (vencida, texto) {
    const t = M.estado.token;
    M.limpiarRelojes();
    M.estado = { token: null, sesion: null, versionId: null };
    guardar('metis_token', null);
    if (location.hash) history.replaceState(null, '', location.pathname);
    if (t && !vencida) fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'cerrarSesion', token: t }) }).catch(() => {});
    if (vencida) vistaLogin({ texto: texto || 'Tu sesión venció. Vuelve a ingresar.', tipo: 'aviso' });
  };

  /* ---------- Relojes: se limpian en cada cambio de vista ---------- */
  M.relojes = [];
  M.limpiarRelojes = function () { M.relojes.splice(0).forEach(clearInterval); };

  /* ---------- Navegación con rutas en la dirección (#inicio, #sesion/ID, #ficha, #d/pestaña) ----------
     Así el botón Atrás del navegador se mueve dentro de Metis y recargar la página conserva la vista. */
  M.ir = function (ruta) {
    if (location.hash === ruta) return M.conVelo(enrutar);
    location.hash = ruta;
  };
  window.addEventListener('hashchange', () => { if (M.estado.sesion && $('#contenido')) M.conVelo(enrutar); });

  async function enrutar() {
    M.limpiarRelojes();
    const c = $('#contenido'); if (!c) return;
    const s = M.estado.sesion, u = s.usuario;
    const partes = location.hash.replace(/^#\/?/, '').split('/');
    const base = partes[0] || 'inicio', arg = partes.slice(1).join('/');
    window.scrollTo(0, 0);
    if (u.rol === 'docente') {
      if (!window.Docente) { c.innerHTML = '<div class="msg mal">Falta docente.js.</div>'; return; }
      await window.Docente.ir(c, base === 'd' ? arg : '');
      return;
    }
    if (!s.inscripciones.length) { c.innerHTML = '<div class="tarjeta"><h2>No tienes cursos activos</h2><p>Escribe a tu docente para que revise tu inscripción.</p></div>'; return; }
    if (u.rol === 'estudiante' && !u.ficha_completa) { vistaCompletarFicha(c); return; }
    if (!location.hash) history.replaceState(null, '', location.pathname + '#inicio');
    const E = window.Estudiante;
    if (base === 'sesion' && arg) { E.marcar('sesiones'); await abrirSesion(c, arg); return; }
    if (base === 'ficha') { E.marcar(''); vistaCompletarFicha(c, true); return; }
    if (await E.ir(c, base)) return;
    history.replaceState(null, '', location.pathname + '#inicio');
    await E.ir(c, 'inicio');
  }

  /* ---------- Ambiente ---------- */
  async function ambiente() {
    const s = M.estado.sesion; const u = s.usuario;
    const rotulo = { docente: 'Docente', estudiante: 'Estudiante', observador: 'Observador' }[u.rol] || '';
    const inicio = u.rol === 'docente' ? '#d/hoy' : '#inicio';
    if (u.rol === 'docente') { ambienteDocente(u); await enrutar(); return; }
    if (window.Estudiante) {
      window.Estudiante.shell(u);
      if (s.inscripciones.length) {
        const guardada = leer('metis_version');
        M.estado.versionId = (s.inscripciones.find(i => i.version.id === guardada) || s.inscripciones[0]).version.id;
      }
      await enrutar(); return;
    }
    app().innerHTML = '<header class="barra"><div class="in"><a class="marca" href="' + inicio + '" aria-label="Ir al inicio">' + M.simbolo(30, true) + '<span class="word">METIS</span></a>' +
      '<nav class="usuario"><a class="btn t" href="' + inicio + '">Inicio</a>' +
      (u.foto_mini ? '<img class="foto" style="width:30px;height:30px" src="' + esc(u.foto_mini) + '" alt="">' : '') +
      '<span class="quien"><b>' + esc(u.primer_nombre || u.nombre) + '</b> · ' + rotulo + '</span>' +
      '<button class="btn t" id="a-clave" type="button">Clave</button><button class="btn t" id="a-salir" type="button">Salir</button></nav></div></header>' + M.franja +
      '<main class="ambiente"><div class="in" id="contenido"></div></main>' + M.pie();
    $('#a-salir').addEventListener('click', () => { M.salir(false); vistaLogin({ texto: 'Cerraste tu sesión.', tipo: 'ok' }); });
    $('#a-clave').addEventListener('click', modalClave);
    if (u.rol !== 'docente' && s.inscripciones.length) {
      const guardada = leer('metis_version');
      M.estado.versionId = (s.inscripciones.find(i => i.version.id === guardada) || s.inscripciones[0]).version.id;
    }
    await enrutar();
  }

  /* Estructura del docente: menú lateral, barra superior con su cuenta y el contenido a la derecha. */
  const ICO_MENU = {
    hoy: '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1z"/>',
    versiones: '<path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13.5"/>',
    sesiones: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M11 14l2 1.5-2 1.5z"/>',
    registro: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 15h7"/>',
    personas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 010 5.8M18 14.5c1.9.7 3 2.6 3 5.5"/>'
  };
  function ambienteDocente(u) {
    const item = (k, t) => '<a href="#d/' + k + '" data-tab="' + k + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICO_MENU[k] + '</svg><span>' + t + '</span></a>';
    const inicial = esc((u.primer_nombre || u.nombre || 'D').charAt(0).toUpperCase());
    app().innerHTML = '<div class="doc">' +
      '<aside class="doc-lado" id="doc-lado"><a class="marca" href="#d/hoy">' + M.simbolo(40, true) + '<span class="word">METIS</span></a>' +
      '<nav class="doc-menu" id="d-tabs">' + item('hoy', 'Inicio') + item('versiones', 'Cursos') + item('sesiones', 'Sesiones') + item('registro', 'Registros') + item('personas', 'Personas') + '</nav>' +
      '<div class="doc-arte" aria-hidden="true"><i class="t1"></i><i class="t2"></i><i class="t3"></i><i class="t4"></i></div>' +
      '<p class="doc-lema">Analiza · Verifica ·<br>Decide · Construye</p></aside>' +
      '<div class="doc-velo" id="doc-velo"></div>' +
      '<div class="doc-main"><header class="doc-barra"><button class="doc-hamb" id="doc-hamb" type="button" aria-label="Abrir el menú"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<a class="marca" href="#d/hoy">' + M.simbolo(36, false) + '<span class="word">METIS</span></a>' +
      '<div class="doc-cuenta"><button type="button" id="doc-cuenta" aria-haspopup="true"><span class="doc-avatar">' + (u.foto_mini ? '<img src="' + esc(u.foto_mini) + '" alt="">' : inicial) + '</span><span class="quien"><b>' + esc(u.primer_nombre || u.nombre) + '</b> · Docente</span><svg viewBox="0 0 24 24" class="flecha"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<div class="doc-desp oculto" id="doc-desp"><button type="button" id="a-clave">Cambiar clave</button><button type="button" id="a-salir">Salir</button></div></div></header>' +
      '<main class="doc-cont" id="contenido"></main>' +
      '<footer class="doc-pie"><span><b>METIS</b> · Artes Digitales: IA Aplicada a la Administración y la Economía</span>' +
      '<span>Creado por Luis Ernest Leyton Johns · ORCID <a href="https://orcid.org/0000-0002-4462-403X" target="_blank" rel="noopener">0000-0002-4462-403X</a> · <a href="https://linkedin.com/in/luis-leyton-johns" target="_blank" rel="noopener">LinkedIn</a> · © ' + new Date().getFullYear() + ' Todos los derechos reservados · <a href="privacidad.html">Privacidad</a></span></footer></div></div>';
    const desp = $('#doc-desp');
    $('#doc-cuenta').onclick = e => { e.stopPropagation(); desp.classList.toggle('oculto'); };
    document.addEventListener('click', () => desp.classList.add('oculto'));
    $('#a-salir').onclick = () => { M.salir(false); vistaLogin({ texto: 'Cerraste tu sesión.', tipo: 'ok' }); };
    $('#a-clave').onclick = modalClave;
    const lado = $('#doc-lado'), velo = $('#doc-velo');
    const cerrar = () => { lado.classList.remove('abierto'); velo.classList.remove('abierto'); };
    $('#doc-hamb').onclick = () => { lado.classList.add('abierto'); velo.classList.add('abierto'); };
    velo.onclick = cerrar;
    lado.querySelectorAll('a').forEach(a => a.addEventListener('click', cerrar));
  }

  function selectorCurso() {
    const s = M.estado.sesion;
    if (s.inscripciones.length < 2) return '';
    return '<div class="selector"><label class="etq" for="a-curso">Curso</label><select id="a-curso">' + s.inscripciones.map(i => '<option value="' + esc(i.version.id) + '"' + (i.version.id === M.estado.versionId ? ' selected' : '') + '>' + esc(i.version.asignatura + ' · ' + i.version.institucion + ' · ' + i.version.periodo + ' ' + i.version.anio) + '</option>').join('') + '</select></div>';
  }

  function inscripcionActual() {
    const s = M.estado.sesion;
    return s.inscripciones.find(i => i.version.id === M.estado.versionId) || s.inscripciones[0];
  }
  M.inscripcionActual = inscripcionActual; M.selectorCurso = selectorCurso;
  M.modalClave = () => modalClave();
  M.cerrarSesion = () => { M.salir(false); vistaLogin({ texto: 'Cerraste tu sesión.', tipo: 'ok' }); };

  /* El inicio y los menús del estudiante están en vista-estudiante.js. */

  async function abrirSesion(c, id) {
    c.innerHTML = '<div class="vacio">Cargando la sesión…</div>';
    try {
      const s = await M.api('verSesion', { sesion_id: id });
      if (!$('#contenido')) return;
      c.innerHTML = window.Sesiones.vista(s, s.version, { volver: true });
      if (window.Tareas) window.Tareas.montar($('#tareas-sesion'), s);
      if (s.fecha === window.Sesiones.hoy()) window.Sesiones.activarReloj(s, s.version);
    } catch (e) { c.innerHTML = '<div class="msg mal">' + esc(e.message) + '</div><div><a class="btn s" href="#inicio">Volver al inicio</a></div>'; }
  }
  M.fechaCorta = function (f) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f || ''));
    if (!m) return '';
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()] + ' ' + Number(m[3]) + ' ' + ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()];
  };
  M.fechaLarga = fechaLarga;
  function fechaLarga(f) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f || ''));
    if (!m) return '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return Number(m[3]) + ' de ' + meses[Number(m[2]) - 1] + ' de ' + m[1];
  }
  function dato(t, v) { return '<div class="dato"><span>' + esc(t) + '</span><b>' + esc(v) + '</b></div>'; }
  M.dato = dato;

  function vistaCompletarFicha(c, edicion) {
    const u = M.estado.sesion.usuario;
    c.innerHTML = '<div class="cabecera"><div><h1>' + (edicion ? 'Mi ficha' : 'Completa tu ficha') + '</h1><p>' + (edicion ? 'Actualiza tus datos.' : 'Antes de entrar al curso necesitamos tus datos y tu fotografía.') + '</p></div></div>' +
      '<form id="m-form" class="caja" style="max-width:760px" novalidate>' + M.formFicha(u, { compromiso: !u.ficha_completa }) +
      '<div id="m-msg"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" type="submit">Guardar</button>' + (edicion ? '<a class="btn s" href="#inicio">Volver</a>' : '') + '</div></form>';
    const foto = M.activarFoto(c);
    $('#m-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = M.leerFicha(c);
      const err = revisarFicha(f, foto.foto || u.foto_mini, true) || (!u.ficha_completa && !$('#f-acepta').checked ? 'Debes aceptar el compromiso de resguardo de datos.' : '');
      if (err) { M.msg('#m-msg', err, 'mal'); return; }
      const d = Object.assign({}, f, { foto: foto.foto, foto_mini: foto.mini, acepta_compromiso: !u.ficha_completa ? true : undefined });
      await M.ocupado(ev.submitter, async () => {
        try { M.estado.sesion.usuario = await M.api('guardarMiFicha', d); history.replaceState(null, '', location.pathname + '#inicio'); await M.conVelo(ambiente); }
        catch (e) { M.msg('#m-msg', e.message, 'mal'); }
      });
    });
  }


  /* ---------- Modal genérico ---------- */
  M.modal = function (titulo, cuerpo, botones) {
    const velo = document.createElement('div'); velo.className = 'velo';
    velo.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><header><h2>' + esc(titulo) + '</h2><button class="btn t" data-cerrar type="button">Cerrar</button></header><div class="cuerpo" style="display:grid;gap:12px">' + cuerpo + '</div><footer>' + (botones || '') + '</footer></div>';
    document.body.appendChild(velo);
    const cerrar = () => velo.remove();
    velo.addEventListener('click', e => { if (e.target === velo || e.target.hasAttribute('data-cerrar')) cerrar(); });
    document.addEventListener('keydown', function alEscape(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', alEscape); } });
    return { el: velo, cerrar: cerrar };
  };

  function modalClave() {
    const u = M.estado.sesion.usuario;
    const m = M.modal('Cambiar clave', (u.tiene_clave ? '<div class="campo"><label for="k-0">Clave actual</label><input type="password" id="k-0" autocomplete="current-password"></div>' : '<div class="msg info">Aún no tienes clave: ingresas con Google. Puedes crear una para ingresar también con correo y clave.</div>') +
      '<div class="campo"><label for="k-1">Clave nueva</label><input type="password" id="k-1" autocomplete="new-password"><span class="ayuda">Mínimo 8 caracteres, con letras y números.</span></div>' +
      '<div class="campo"><label for="k-2">Repite la clave</label><input type="password" id="k-2" autocomplete="new-password"></div><div id="k-msg"></div>',
      '<button class="btn p" id="k-ok" type="button">Guardar clave</button>');
    $('#k-ok', m.el).addEventListener('click', async ev => {
      if ($('#k-1', m.el).value !== $('#k-2', m.el).value) { M.msg($('#k-msg', m.el), 'Las claves no coinciden.', 'mal'); return; }
      await M.ocupado(ev.currentTarget, async () => {
        try { M.estado.sesion.usuario = await M.api('cambiarClave', { actual: ($('#k-0', m.el) || {}).value, nueva: $('#k-1', m.el).value }); M.msg($('#k-msg', m.el), 'Clave actualizada.', 'ok'); setTimeout(m.cerrar, 1200); }
        catch (e) { M.msg($('#k-msg', m.el), e.message, 'mal'); }
      });
    });
  }

  /* ---------- Tablas que se vuelven tarjetas en el celular: cada celda lleva el nombre de su columna ---------- */
  function etiquetarTablas() {
    document.querySelectorAll('.tabla table').forEach(t => {
      const ths = Array.from(t.querySelectorAll('thead th')).map(th => th.textContent.trim());
      t.querySelectorAll('tbody tr').forEach(tr => {
        Array.from(tr.children).forEach((td, i) => { if (!td.hasAttribute('data-label') && !td.hasAttribute('colspan')) td.setAttribute('data-label', ths[i] || ''); });
      });
    });
  }
  let pendienteEtiquetas = false;
  new MutationObserver(() => {
    if (pendienteEtiquetas) return;
    pendienteEtiquetas = true;
    requestAnimationFrame(() => { pendienteEtiquetas = false; etiquetarTablas(); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- Arranque ---------- */
  async function iniciar() {
    try {
      const p = new URLSearchParams(location.search);
      if (p.get('r')) { await vistaRegistro(p.get('r')); return; }
      if (p.get('reset')) { vistaReset(p.get('reset')); return; }
      M.estado.token = leer('metis_token');
      if (M.estado.token) await cargarSesion(); else vistaLogin();
    } finally { M.velo.ocultar(); }
  }
  M.version = VERSION_INTERFAZ;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
})();
