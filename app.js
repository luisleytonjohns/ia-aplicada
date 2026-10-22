/* Metis · app.js · Núcleo de la interfaz: acceso, registro, recuperación y ambientes por rol. */
(function () {
  'use strict';
  const CFG = window.METIS_CONFIG || {};
  const VERSION_INTERFAZ = '0.3.0';

  // Acciones que esta interfaz usa. Se comparan con las del servicio para detectar desajustes.
  const CONTRATO = ['ping', 'loginGoogle', 'loginClave', 'infoRegistro', 'registrarConGoogle', 'registrarConClave',
    'solicitarRecuperacion', 'restablecerClave', 'miSesion', 'cerrarSesion', 'cambiarClave', 'guardarMiFicha',
    'listarVersiones', 'guardarVersion', 'listarLinks', 'crearLink', 'desactivarLink', 'listarPersonas', 'crearPersona',
    'actualizarPersona', 'reenviarAcceso', 'cambiarEstadoInscripcion', 'cargaMasiva', 'verFoto',
    'misSesiones', 'verSesion', 'listarSesiones', 'generarSesiones', 'verSesionDocente', 'guardarSesion', 'cambiarEstadoSesiones', 'cambiarAperturaSesion'];

  const M = window.M = { estado: { token: null, sesion: null, versionId: null }, CONTRATO: CONTRATO };
  const app = () => document.getElementById('app');

  /* ---------- Utilidades ---------- */
  const esc = M.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = M.$ = (sel, raiz) => (raiz || document).querySelector(sel);
  const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

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
    let r;
    try {
      r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: accion, token: M.estado.token, datos: datos || {} }) });
    } catch (e) { throw new Error('No hay conexión con el servicio. Revisa tu internet y vuelve a intentarlo.'); }
    const j = await r.json();
    if (!j.ok) {
      if (/sesión venció|Debes ingresar/.test(j.error || '') && accion !== 'miSesion') { M.salir(true); }
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
  function vistaLogin(aviso) {
    pantallaAcceso(
      '<div><h1>Ingresar</h1><p class="sub">Usa tu cuenta de Google o tu correo y clave.</p></div>' +
      '<div id="l-msg"></div><div id="l-google"></div><div class="sep">o con correo y clave</div>' +
      '<form id="l-form" class="caja" style="gap:12px" novalidate>' +
      '<div class="campo"><label for="l-usuario">Correo</label><input type="email" id="l-usuario" autocomplete="username"></div>' +
      '<div class="campo"><label for="l-clave">Clave</label><input type="password" id="l-clave" autocomplete="current-password"></div>' +
      '<button class="btn p ancho" type="submit">Ingresar</button></form>' +
      '<button class="btn t" id="l-olvido" type="button">¿Olvidaste tu clave o no tienes una?</button>' +
      '<form id="r-form" class="caja oculto" style="gap:12px" novalidate><div class="campo"><label for="r-correo">Tu correo registrado</label><input type="email" id="r-correo"></div>' +
      '<button class="btn s ancho" type="submit">Enviarme un enlace para crear clave</button></form>');
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
    catch (e) { M.salir(false); vistaLogin({ texto: e.message, tipo: 'aviso' }); return; }
    const u = M.estado.sesion.usuario;
    // El cambio de clave temporal se exige solo a quien ingresó con ella (tiene clave y debe cambiarla).
    if (u.tiene_clave && u.debe_cambiar && u.rol !== 'docente') { vistaCambioObligatorio(); return; }
    await ambiente();
  }

  M.salir = function (vencida) {
    const t = M.estado.token;
    M.estado = { token: null, sesion: null, versionId: null };
    guardar('metis_token', null);
    if (t && !vencida) fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'cerrarSesion', token: t }) }).catch(() => {});
    if (vencida) vistaLogin({ texto: 'Tu sesión venció. Vuelve a ingresar.', tipo: 'aviso' });
  };

  /* ---------- Ambiente ---------- */
  async function ambiente() {
    const s = M.estado.sesion; const u = s.usuario;
    const rotulo = { docente: 'Docente', estudiante: 'Estudiante', observador: 'Observador' }[u.rol] || '';
    app().innerHTML = '<header class="barra"><div class="in"><div class="marca">' + M.simbolo(30, true) + '<span class="word">METIS</span></div>' +
      '<div class="usuario">' + (u.foto_mini ? '<img class="foto" style="width:30px;height:30px" src="' + esc(u.foto_mini) + '" alt="">' : '') +
      '<span><b>' + esc(u.primer_nombre || u.nombre) + '</b> · ' + rotulo + '</span>' +
      '<button class="btn t" id="a-clave" type="button">Clave</button><button class="btn t" id="a-salir" type="button">Salir</button></div></div></header>' + M.franja +
      '<main class="ambiente"><div class="in" id="contenido"></div></main>' + M.pie();
    $('#a-salir').addEventListener('click', () => { M.salir(false); vistaLogin({ texto: 'Cerraste tu sesión.', tipo: 'ok' }); });
    $('#a-clave').addEventListener('click', modalClave);
    const c = $('#contenido');
    if (u.rol === 'docente') { if (window.Docente) await window.Docente.montar(c); else c.innerHTML = '<div class="msg mal">Falta docente.js.</div>'; return; }
    if (!s.inscripciones.length) { c.innerHTML = '<div class="tarjeta"><h2>No tienes cursos activos</h2><p>Escribe a tu docente para que revise tu inscripción.</p></div>'; return; }
    const guardada = leer('metis_version');
    M.estado.versionId = (s.inscripciones.find(i => i.version.id === guardada) || s.inscripciones[0]).version.id;
    if (u.rol === 'estudiante' && !u.ficha_completa) { vistaCompletarFicha(c); return; }
    await vistaInicio(c);
  }

  function selectorCurso() {
    const s = M.estado.sesion;
    if (s.inscripciones.length < 2) return '';
    return '<div class="selector"><label class="etq" for="a-curso">Curso</label><select id="a-curso">' + s.inscripciones.map(i => '<option value="' + esc(i.version.id) + '"' + (i.version.id === M.estado.versionId ? ' selected' : '') + '>' + esc(i.version.asignatura + ' · ' + i.version.institucion + ' · ' + i.version.periodo + ' ' + i.version.anio) + '</option>').join('') + '</select></div>';
  }

  async function vistaInicio(c) {
    const s = M.estado.sesion; const u = s.usuario;
    const ins = s.inscripciones.find(i => i.version.id === M.estado.versionId); const v = ins.version;
    const obs = ins.rol === 'observador';
    c.innerHTML = '<div class="cabecera"><div><h1>' + esc(v.asignatura) + '</h1><p>' + esc([v.institucion, v.escuela, [v.periodo, v.anio].filter(Boolean).join(' ')].filter(Boolean).join(' · ')) + '</p></div>' + selectorCurso() + '</div>' +
      (obs ? '<div class="msg info">Perfil observador: ves el curso tal como lo ve un estudiante, con un proyecto de ejemplo. No puedes enviar trabajos.</div>' : '') +
      '<div class="tarjeta"><div class="datos">' +
      dato('Sesiones', v.sesiones + ' de ' + v.minutos + ' min') + dato('Por semana', v.sesiones_semana) + dato('Inicio', fechaLarga(v.fecha_inicio) || 'Por definir') + dato('Asistencia mínima', v.asistencia_min + '%') +
      '</div>' + (v.whatsapp ? '<a class="btn s" href="' + esc(v.whatsapp) + '" target="_blank" rel="noopener">Grupo de WhatsApp del curso</a>' : '') + '</div>' +
      '<div class="tarjeta"><h2 style="font-size:1.1rem">Tus sesiones</h2><div id="i-sesiones"><div class="vacio">Cargando sesiones…</div></div></div>' +
      (obs ? '' : '<div class="tarjeta"><div class="persona">' + (u.foto_mini ? '<img class="foto g" src="' + esc(u.foto_mini) + '" alt="">' : '') + '<div><b style="font:600 1.1rem/1.3 var(--disp)">' + esc(u.nombre) + '</b><small>' + esc(u.correo_institucional) + (u.celular ? ' · ' + esc(u.celular) : '') + '</small><br><small>' + esc([u.mencion, u.modalidad].filter(Boolean).join(' · ')) + '</small></div></div><div><button class="btn s" id="i-ficha" type="button">Editar mi ficha</button></div></div>');
    const sel = $('#a-curso'); if (sel) sel.addEventListener('change', () => { M.estado.versionId = sel.value; guardar('metis_version', sel.value); M.conVelo(() => vistaInicio(c)); });
    const bf = $('#i-ficha'); if (bf) bf.addEventListener('click', () => vistaCompletarFicha(c, true));
    await cargarMisSesiones(c, v);
  }

  async function cargarMisSesiones(c, v) {
    const el = $('#i-sesiones'); if (!el) return;
    try {
      const r = await M.api('misSesiones', { version_id: v.id });
      el.innerHTML = window.Sesiones.lista(r.sesiones);
      el.querySelectorAll('[data-sesion]').forEach(b => { b.addEventListener('click', () => M.conVelo(() => abrirSesion(c, v, b.dataset.sesion))); });
    } catch (e) { el.innerHTML = '<div class="msg mal">' + esc(e.message) + '</div>'; }
  }

  async function abrirSesion(c, v, id) {
    c.innerHTML = '<div class="vacio">Cargando la sesión…</div>';
    try {
      const s = await M.api('verSesion', { sesion_id: id });
      c.innerHTML = window.Sesiones.vista(s, s.version.minutos, { volver: true });
      window.scrollTo(0, 0);
      c.querySelector('[data-volver]').addEventListener('click', () => M.conVelo(() => vistaInicio(c)));
    } catch (e) { c.innerHTML = '<div class="msg mal">' + esc(e.message) + '</div><div><button class="btn s" type="button" id="i-volver">Volver</button></div>'; $('#i-volver').onclick = () => M.conVelo(() => vistaInicio(c)); }
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

  function vistaCompletarFicha(c, edicion) {
    const u = M.estado.sesion.usuario;
    c.innerHTML = '<div class="cabecera"><div><h1>' + (edicion ? 'Mi ficha' : 'Completa tu ficha') + '</h1><p>' + (edicion ? 'Actualiza tus datos.' : 'Antes de entrar al curso necesitamos tus datos y tu fotografía.') + '</p></div></div>' +
      '<form id="m-form" class="caja" style="max-width:760px" novalidate>' + M.formFicha(u, { compromiso: !u.ficha_completa }) +
      '<div id="m-msg"></div><div style="display:flex;gap:8px"><button class="btn p" type="submit">Guardar</button>' + (edicion ? '<button class="btn s" type="button" id="m-volver">Volver</button>' : '') + '</div></form>';
    const foto = M.activarFoto(c);
    const vb = $('#m-volver'); if (vb) vb.addEventListener('click', () => M.conVelo(() => vistaInicio(c)));
    $('#m-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = M.leerFicha(c);
      const err = revisarFicha(f, foto.foto || u.foto_mini, true) || (!u.ficha_completa && !$('#f-acepta').checked ? 'Debes aceptar el compromiso de resguardo de datos.' : '');
      if (err) { M.msg('#m-msg', err, 'mal'); return; }
      const d = Object.assign({}, f, { foto: foto.foto, foto_mini: foto.mini, acepta_compromiso: !u.ficha_completa ? true : undefined });
      await M.ocupado(ev.submitter, async () => {
        try { M.estado.sesion.usuario = await M.api('guardarMiFicha', d); await M.conVelo(ambiente); }
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
