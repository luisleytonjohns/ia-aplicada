/* Metis · vista-tareas.js (GitHub, interfaz) · Tareas de la sesión: asistencia, editores por tipo, guardado automático, envío y editor del docente. */
(function () {
  'use strict';
  const M = window.M, esc = M.esc, $ = M.$;
  const T = window.Tareas = {};

  const TIPOS = {
    texto: 'Texto', prompt: 'Prompt y respuesta de IA', tabla: 'Tabla', toulmin: 'Argumento de Toulmin', enlace: 'Enlace',
    archivo: 'Archivo', benchmarking: 'Benchmarking', mermaid: 'Diagrama Mermaid', cierre: 'Actividad de cierre'
  };
  T.TIPOS = TIPOS;
  const HERRAMIENTAS = ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'NotebookLM', 'Perplexity', 'DeepSeek', 'Mistral Le Chat'];
  const TOULMIN = [
    ['afirmacion', 'Afirmación', 'Qué sostienes, en una oración.'],
    ['evidencia', 'Evidencia', 'Datos o hechos que la apoyan.'],
    ['garantia', 'Garantía', 'Por qué esa evidencia apoya la afirmación.'],
    ['respaldo', 'Respaldo', 'Qué sostiene a la garantía: norma, teoría, estudio. Opcional.'],
    ['calificador', 'Calificador', 'Con qué grado de certeza lo afirmas. Opcional.'],
    ['refutacion', 'Refutación', 'La mejor objeción y en qué casos tu afirmación no se cumple.']
  ];
  const ESCALA = [[1, 'Aún no'], [2, 'En proceso'], [3, 'Logrado'], [4, 'Lo puedo enseñar']];
  const BENCH = [['nombre', 'Solución'], ['enlace', 'Enlace'], ['que_resuelve', 'Qué resuelve'], ['costo', 'Costo o plan gratuito'], ['limitaciones', 'Limitaciones']];
  // Cómo se responde cada tipo de tarea en Metis. Se muestra sobre el editor.
  const COMO = {
    texto: 'Escribe directo en el recuadro. El contador de abajo indica si alcanzas el mínimo de palabras.',
    prompt: 'Indica la herramienta, pega tu prompt completo y la respuesta de la IA, y explica cómo verificaste lo que dijo. La verificación es la parte que más pesa.',
    tabla: 'Escribe en cada celda. Usa «Agregar fila» si necesitas más. La tarea pide un mínimo de filas completas.',
    toulmin: 'Completa cada parte del argumento. Respaldo y calificador son opcionales; las otras cuatro son obligatorias.',
    enlace: 'Pega el enlace y ábrelo en una ventana de incógnito: si a ti te pide permiso, al docente también se lo pedirá.',
    archivo: 'Sube un archivo de hasta 5 MB. Si pesa más, súbelo a tu Drive, compártelo y deja el enlace en el comentario.',
    benchmarking: 'Completa una ficha por solución y agrega las que falten. Al final marca tu decisión y escribe la declaración de diferenciación.',
    mermaid: 'Pega el código que te dio la IA y presiona «Ver diagrama». Si aparece un error, cópialo y pídele a la IA que lo corrija.',
    cierre: 'Marca una opción por objetivo y responde las tres preguntas. Es obligatoria para dar por completada la sesión.'
  };
  T.COMO = COMO;

  /* ---------- Editores por tipo: HTML y lectura ---------- */
  const area = (c, valor, filas, ph, dis, mono) => '<textarea data-c="' + c + '" rows="' + (filas || 4) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (dis ? ' disabled' : '') + (mono ? ' class="mono"' : '') + '>' + esc(valor || '') + '</textarea>';
  const linea = (c, valor, ph, dis, tipo) => '<input type="' + (tipo || 'text') + '" data-c="' + c + '" value="' + esc(valor || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (dis ? ' disabled' : '') + '>';
  const campo = (etq, ayuda, control) => '<div class="campo"><label>' + esc(etq) + '</label>' + control + (ayuda ? '<span class="ayuda">' + esc(ayuda) + '</span>' : '') + '</div>';

  function filaTabla(cols, f, dis) {
    // En modo lectura las celdas son texto, para que se lea completo.
    if (dis) return '<tr>' + cols.map((c, j) => '<td class="ro" data-celda-ro="' + j + '">' + esc((f || [])[j] || '') + '</td>').join('') + '</tr>';
    return '<tr>' + cols.map((c, j) => '<td><input type="text" data-celda="' + j + '" value="' + esc((f || [])[j] || '') + '"' + (dis ? ' disabled' : '') + '></td>').join('') +
      (dis ? '' : '<td class="quitar"><button class="btn t peq" type="button" data-quitar-fila title="Quitar fila">✕</button></td>') + '</tr>';
  }
  function filaBench(x, dis) {
    x = x || {};
    if (dis) return '<div class="bench-sol ro">' + BENCH.map(b => '<div><span>' + b[1] + '</span><p>' + (esc(x[b[0]] || '') || '·') + '</p></div>').join('') + '</div>';
    return '<div class="bench-sol">' + BENCH.map(b => '<label><span>' + b[1] + '</span><input type="text" data-b="' + b[0] + '" value="' + esc(x[b[0]] || '') + '"' + (dis ? ' disabled' : '') + '></label>').join('') +
      (dis ? '' : '<button class="btn t peq" type="button" data-quitar-sol>Quitar</button>') + '</div>';
  }

  T.editorHTML = function (t, c, dis) {
    c = c || {};
    switch (t.tipo) {
      case 'texto': return area('texto', c.texto, 7, 'Escribe aquí tu respuesta.', dis) + '<span class="ayuda" data-palabras></span>';
      case 'prompt':
        return campo('Herramienta', '', '<input type="text" data-c="herramienta" list="lista-ia" value="' + esc(c.herramienta || '') + '"' + (dis ? ' disabled' : '') + '><datalist id="lista-ia">' + HERRAMIENTAS.map(h => '<option value="' + h + '">').join('') + '</datalist>') +
          campo('Prompt que usaste', 'Cópialo completo, tal como lo escribiste.', area('prompt', c.prompt, 5, '', dis, true)) +
          campo('Respuesta de la IA', 'Pega la respuesta o la parte pertinente.', area('respuesta', c.respuesta, 6, '', dis)) +
          campo('Tu verificación', 'Qué afirmaciones revisaste, con qué fuente, qué encontraste y qué corregiste.', area('verificacion', c.verificacion, 4, '', dis));
      case 'tabla': {
        const cols = (t.config && t.config.columnas) || ['Columna'];
        const filas = (c.filas && c.filas.length) ? c.filas : [[]];
        return '<div class="tabla-ed"><table><thead><tr>' + cols.map(x => '<th>' + esc(x) + '</th>').join('') + (dis ? '' : '<th></th>') + '</tr></thead><tbody>' +
          filas.map(f => filaTabla(cols, f, dis)).join('') + '</tbody></table></div>' + (dis ? '' : '<div><button class="btn s peq" type="button" data-mas-fila>Agregar fila</button></div>');
      }
      case 'toulmin': return '<div class="toulmin">' + TOULMIN.map(x => campo(x[1], x[2], area(x[0], c[x[0]], x[0] === 'afirmacion' || x[0] === 'calificador' ? 2 : 3, '', dis))).join('') + '</div>';
      case 'enlace': return campo('Enlace', 'Debe abrirse para cualquier persona con el enlace.', linea('url', c.url, 'https://', dis, 'url')) + campo('Descripción', 'Qué contiene y qué debe mirar el docente.', area('descripcion', c.descripcion, 3, '', dis));
      case 'archivo':
        return '<div class="archivo-ed" data-archivo-id="' + esc(c.archivo_id || '') + '" data-archivo-nombre="' + esc(c.nombre || '') + '">' +
          '<p class="sub" data-archivo-estado>' + (c.archivo_id ? 'Archivo entregado: <b>' + esc(c.nombre || 'archivo') + '</b>' : 'Aún no subes un archivo.') + '</p>' +
          (dis ? '' : '<input type="file" data-archivo><span class="ayuda">Máximo 5 MB. Si es más grande, súbelo a tu Drive y entrega el enlace.</span>') +
          '</div>' + campo('Comentario', 'Opcional.', area('nota', c.nota, 2, '', dis));
      case 'benchmarking': {
        const sol = (c.soluciones && c.soluciones.length) ? c.soluciones : [{}, {}];
        const dec = c.decision || '';
        const r = (v, txt) => '<label><input type="radio" name="dec-' + esc(t.id) + '" data-decision value="' + v + '"' + (dec === v ? ' checked' : '') + (dis ? ' disabled' : '') + '><span>' + txt + '</span></label>';
        return '<p class="sub">¿Ya existe una solución para tu problema? Compara las que encuentres. Adoptar una solución existente es un resultado válido.</p>' +
          '<div class="bench" data-bench>' + sol.map(x => filaBench(x, dis)).join('') + '</div>' + (dis ? '' : '<div><button class="btn s peq" type="button" data-mas-sol>Agregar solución</button></div>') +
          '<div class="campo"><span class="etq">Tu decisión</span><div class="opciones">' + r('adoptar', 'Adoptar una existente') + r('adaptar', 'Adaptar una existente') + r('construir', 'Construir una propia') + '</div></div>' +
          campo('Declaración de diferenciación', 'Qué hará distinto tu propuesta, o por qué conviene adoptar la que existe.', area('diferenciacion', c.diferenciacion, 4, '', dis));
      }
      case 'mermaid':
        return campo('Código Mermaid', 'Ejemplo: flowchart LR; A[Pedido] --> B{¿Stock?}', area('codigo', c.codigo, 8, 'flowchart TD\n  A[Inicio] --> B[Paso]', dis, true)) +
          '<div><button class="btn s peq" type="button" data-ver-diagrama>Ver diagrama</button></div><div class="diagrama" data-diagrama></div>';
      case 'cierre': {
        const obj = (t.config && t.config.objetivos) || [];
        const ae = c.autoevaluacion || [];
        return (obj.length ? '<div class="autoeval"><span class="etq">¿Cuánto lograste cada objetivo?</span>' + obj.map((o, i) =>
          '<div class="ae-fila"><p>' + (i + 1) + '. ' + esc(o) + '</p><div class="opciones">' + ESCALA.map(e => '<label><input type="radio" name="ae-' + esc(t.id) + '-' + i + '" data-ae="' + i + '" value="' + e[0] + '"' + (Number(ae[i]) === e[0] ? ' checked' : '') + (dis ? ' disabled' : '') + '><span>' + e[1] + '</span></label>').join('') + '</div></div>').join('') + '</div>' : '') +
          campo('Qué aprendí hoy', 'Con un ejemplo concreto de tu proyecto.', area('aprendi', c.aprendi, 3, '', dis)) +
          campo('Cómo lo aplicaré en mi organización', '', area('aplicare', c.aplicare, 3, '', dis)) +
          campo('Declaración de uso de IA', 'Qué herramientas usaste, para qué y qué verificaste.', area('uso_ia', c.uso_ia, 2, '', dis));
      }
    }
    return '';
  };

  T.leer = function (t, el) {
    const c = {};
    el.querySelectorAll('[data-c]').forEach(x => { c[x.dataset.c] = x.value; });
    if (t.tipo === 'tabla') c.filas = Array.from(el.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('[data-celda]')).map(i => i.value));
    if (t.tipo === 'benchmarking') {
      c.soluciones = Array.from(el.querySelectorAll('.bench-sol')).map(s => { const o = {}; s.querySelectorAll('[data-b]').forEach(i => { o[i.dataset.b] = i.value; }); return o; });
      const d = el.querySelector('[data-decision]:checked'); c.decision = d ? d.value : '';
    }
    if (t.tipo === 'archivo') { const a = el.querySelector('.archivo-ed'); c.archivo_id = a.dataset.archivoId || ''; c.nombre = a.dataset.archivoNombre || ''; }
    if (t.tipo === 'cierre') {
      const n = ((t.config && t.config.objetivos) || []).length; c.autoevaluacion = [];
      for (let i = 0; i < n; i++) { const r = el.querySelector('[data-ae="' + i + '"]:checked'); c.autoevaluacion.push(r ? Number(r.value) : null); }
    }
    return c;
  };

  /* ---------- Diagramas Mermaid (se carga solo cuando se usa) ---------- */
  let mermaidCarga = null;
  function cargarMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (!mermaidCarga) mermaidCarga = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
      s.onload = () => { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' }); ok(window.mermaid); };
      s.onerror = () => { mermaidCarga = null; mal(new Error('No se pudo cargar el visor de diagramas.')); };
      document.head.appendChild(s);
    });
    return mermaidCarga;
  }
  let nDiag = 0;
  T.dibujar = async function (codigo, destino) {
    if (!codigo.trim()) { destino.innerHTML = '<p class="sub">Escribe el código del diagrama.</p>'; return; }
    destino.innerHTML = '<p class="sub">Dibujando…</p>';
    let mm;
    try { mm = await cargarMermaid(); }
    catch (e) { destino.innerHTML = '<div class="msg aviso">' + esc(e.message) + ' Revisa tu conexión y vuelve a intentarlo; tu código queda guardado igual.</div>'; return; }
    try {
      const r = await mm.render('diag-' + (++nDiag), codigo);
      destino.innerHTML = r.svg;
    } catch (e) { destino.innerHTML = '<div class="msg mal">El diagrama tiene un error: ' + esc(String(e.message || e).split('\n')[0]) + '</div>'; }
  };

  /* ---------- Comportamiento de un editor (filas, archivos, diagrama, contador) ---------- */
  function activarEditor(t, el, alCambiar, dis) {
    const cambio = () => alCambiar && alCambiar();
    el.addEventListener('input', cambio);
    el.addEventListener('change', e => { if (!e.target.matches('[data-archivo]')) cambio(); });
    const pal = el.querySelector('[data-palabras]');
    const contar = () => {
      if (!pal) return;
      const n = (el.querySelector('[data-c="texto"]').value.trim().match(/\S+/g) || []).length;
      const min = Number((t.config || {}).min_palabras) || 0;
      pal.textContent = n + (n === 1 ? ' palabra' : ' palabras') + (min ? ' · mínimo ' + min : '');
    };
    if (pal) { contar(); el.addEventListener('input', contar); }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-mas-fila')) { el.querySelector('tbody').insertAdjacentHTML('beforeend', filaTabla(t.config.columnas, [], false)); cambio(); }
      if (b.hasAttribute('data-quitar-fila')) { const tb = el.querySelector('tbody'); if (tb.children.length > 1) { b.closest('tr').remove(); cambio(); } }
      if (b.hasAttribute('data-mas-sol')) { el.querySelector('[data-bench]').insertAdjacentHTML('beforeend', filaBench({}, false)); cambio(); }
      if (b.hasAttribute('data-quitar-sol')) { const bx = el.querySelector('[data-bench]'); if (bx.children.length > 1) { b.closest('.bench-sol').remove(); cambio(); } }
      if (b.hasAttribute('data-ver-diagrama')) T.dibujar(el.querySelector('[data-c="codigo"]').value, el.querySelector('[data-diagrama]'));
    });
    const fa = el.querySelector('[data-archivo]');
    if (fa && !dis) fa.addEventListener('change', async () => {
      const f = fa.files[0]; if (!f) return;
      const caja = el.querySelector('.archivo-ed'), est = el.querySelector('[data-archivo-estado]');
      if (f.size > 5 * 1024 * 1024) { est.innerHTML = '<span style="color:var(--mal)">El archivo supera los 5 MB. Súbelo a tu Drive y entrega el enlace.</span>'; return; }
      est.textContent = 'Subiendo ' + f.name + '…'; fa.disabled = true;
      try {
        const b64 = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => mal(new Error('No se pudo leer el archivo.')); r.readAsDataURL(f); });
        const r = await M.api('subirArchivo', { tarea_id: t.id, nombre: f.name, tipo: f.type, base64: b64 });
        caja.dataset.archivoId = r.archivo_id; caja.dataset.archivoNombre = r.nombre;
        est.innerHTML = 'Archivo entregado: <b>' + esc(r.nombre) + '</b>';
        cambio();
      } catch (e) { est.innerHTML = '<span style="color:var(--mal)">' + esc(e.message) + '</span>'; }
      finally { fa.disabled = false; fa.value = ''; }
    });
    // En modo lectura los textos se muestran completos, sin barra de desplazamiento.
    if (dis) el.querySelectorAll('textarea').forEach(a => { a.style.height = '0px'; a.style.height = (a.scrollHeight + 4) + 'px'; });
    if (t.tipo === 'mermaid' && dis) { const cod = el.querySelector('[data-c="codigo"]'); if (cod && cod.value.trim()) T.dibujar(cod.value, el.querySelector('[data-diagrama]')); }
  }
  T.activarLectura = (t, el) => activarEditor(t, el, null, true);

  /* ---------- Estado de cada respuesta ---------- */
  function chipEstado(r) {
    if (!r) return '<span class="chip gris">Sin empezar</span>';
    const h = (r.actualizado || '').slice(11, 16);
    if (r.estado === 'enviada') return r.momento === 'despues' ? '<span class="chip aviso">Completada después de clase · ' + esc(h) + '</span>' : '<span class="chip ok">Enviada en clase · ' + esc(h) + '</span>';
    return '<span class="chip info">Borrador guardado · ' + esc(h) + '</span>';
  }
  T.chipEstado = chipEstado;

  /* ---------- Vista del estudiante ---------- */
  const pendientes = new Set();
  window.addEventListener('beforeunload', e => { if (pendientes.size) { e.preventDefault(); e.returnValue = ''; } });

  T.montar = function (cont, s) {
    const p = s.permisos || {};
    const obs = s.observador;
    const tareas = s.tareas || [];
    const resp = s.respuestas || {};
    let cab = '';
    if (!obs) {
      if (p.asistencia && ['presente', 'atrasado', 'justificado'].indexOf(p.asistencia.estado) >= 0)
        cab = '<div class="asis-ok"><span class="chip ok">Asistencia: ' + esc(p.asistencia.estado) + (p.asistencia.hora ? ' · ' + esc(p.asistencia.hora) : '') + '</span><small>Plazo para completar: hoy hasta las 23:59.</small></div>';
      else if (p.registrar)
        cab = '<form class="asis-form" id="asis-form" novalidate><div><b>Registra tu asistencia</b><p class="sub" style="margin:0">Escribe el código de 4 dígitos que el docente proyecta en la sala. Cambia cada minuto.</p>' +
          '<details class="guia-mini"><summary>¿Cómo funciona?</summary><p>Ejemplo: en la pantalla aparece <b>4821</b>. Lo escribes aquí y presionas Registrar. Si el número cambia mientras escribes, no importa: el código anterior sigue sirviendo un minuto más. Al registrarte se despliegan las actividades de la sesión. Si llegas después de la tolerancia quedas como atrasado, pero puedes trabajar igual.</p></details></div>' +
          '<div class="asis-campos"><input id="asis-codigo" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="0000" aria-label="Código de asistencia"><button class="btn p" type="submit">Registrar</button></div><div id="asis-msg"></div></form>';
    }
    const aviso = p.motivo && !(cab && p.registrar) ? '<div class="msg ' + (p.editar ? 'info' : 'aviso') + '">' + esc(p.motivo) + '</div>' : '';
    // Antes de la asistencia las actividades no se despliegan: solo cuántas son y cuánto toman.
    if (tareas.some(t => t.bloqueada)) {
      const min = tareas.reduce((a, t) => a + (Number(t.minutos) || 0), 0);
      cont.innerHTML = '<h2>Actividades de la sesión</h2>' + cab + aviso +
        '<div class="bloqueadas"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg><div><b>' + tareas.length + (tareas.length === 1 ? ' actividad' : ' actividades') + (min ? ', unos ' + min + ' minutos de trabajo' : '') + '</b>' +
        '<p class="sub" style="margin:0">Se despliegan en clase, cuando registras tu asistencia. Antes de la sesión, revisa los materiales de arriba: son la lectura previa.</p></div></div>';
      const fb = $('#asis-form', cont);
      if (fb) fb.addEventListener('submit', async ev => {
        ev.preventDefault();
        await M.ocupado(fb.querySelector('button'), async () => {
          try { await M.api('registrarAsistencia', { sesion_id: s.id, codigo: $('#asis-codigo', cont).value }); M.ir(location.hash); }
          catch (e) { M.msg($('#asis-msg', cont), e.message, 'mal'); }
        });
      });
      return;
    }
    cont.innerHTML = '<h2>Actividades de la sesión</h2>' + cab + aviso +
      (tareas.length ? tareas.map((t, i) => tarjeta(t, i, resp[t.id], !p.editar, p.enviar)).join('') : '<p class="sub">Las actividades aparecerán aquí.</p>');
    T.activarEjemplos(cont, tareas);

    const fa = $('#asis-form', cont);
    if (fa) fa.addEventListener('submit', async ev => {
      ev.preventDefault();
      await M.ocupado(fa.querySelector('button'), async () => {
        try { await M.api('registrarAsistencia', { sesion_id: s.id, codigo: $('#asis-codigo', cont).value }); M.ir(location.hash); }
        catch (e) { M.msg($('#asis-msg', cont), e.message, 'mal'); }
      });
    });

    tareas.forEach(t => {
      const tj = cont.querySelector('[data-tarea="' + t.id + '"]'); if (!tj) return;
      const ed = tj.querySelector('.editor');
      const est = tj.querySelector('[data-estado]'), guard = tj.querySelector('[data-guardado]'), msg = tj.querySelector('[data-msg]');
      let reloj = null, guardando = null, sucio = false;
      const guardar = async (enviar) => {
        if (reloj) { clearTimeout(reloj); reloj = null; }
        if (guardando) { await guardando; if (!sucio && !enviar) return; }
        sucio = false;
        guard.textContent = enviar ? 'Enviando…' : 'Guardando…';
        guardando = M.api('guardarRespuesta', { tarea_id: t.id, contenido: T.leer(t, ed), enviar: !!enviar })
          .then(r => { resp[t.id] = r; est.innerHTML = chipEstado(r); guard.textContent = 'Guardado ' + (r.actualizado || '').slice(11, 16); if (!sucio) pendientes.delete(t.id); if (enviar) M.msg(msg, 'Enviada. Puedes seguir mejorándola hasta las 23:59 y volver a enviarla.', 'ok'); else if (msg.querySelector('.mal')) M.msg(msg, ''); const b = tj.querySelector('[data-enviar]'); if (b && r.estado === 'enviada') b.textContent = 'Volver a enviar'; })
          .catch(e => { guard.textContent = 'Sin guardar'; M.msg(msg, e.message, 'mal'); if (enviar) throw e; })
          .finally(() => { guardando = null; });
        return guardando;
      };
      activarEditor(t, ed, p.editar ? () => { sucio = true; pendientes.add(t.id); guard.textContent = 'Cambios sin guardar'; if (reloj) clearTimeout(reloj); reloj = setTimeout(() => guardar(false), 2500); } : null, !p.editar);
      const be = tj.querySelector('[data-enviar]');
      if (be) be.addEventListener('click', () => M.ocupado(be, () => guardar(true).catch(() => {})));
    });
  };

  function tarjeta(t, i, r, dis, puedeEnviar) {
    return '<article class="tarea" data-tarea="' + esc(t.id) + '"><header><div><span class="lema">' + (t.tipo === 'cierre' ? 'Cierre' : 'Tarea ' + (i + 1)) + ' · ' + esc(TIPOS[t.tipo] || t.tipo) + (t.minutos ? ' · unos ' + t.minutos + ' min' : '') + '</span>' +
      '<h3>' + esc(t.titulo) + '</h3></div><span data-estado>' + chipEstado(r) + '</span></header>' +
      (t.explicacion ? '<div class="explica"><span class="etq">Qué es y para qué sirve</span><p>' + esc(t.explicacion) + '</p></div>' : '') +
      (t.consigna ? '<div class="consigna">' + esc(t.consigna) + '</div>' : '') +
      (t.criterio ? '<p class="criterio"><b>Cómo se revisa:</b> ' + esc(t.criterio) + '</p>' : '') +
      ejemploHTML(t) +
      (COMO[t.tipo] && !dis ? '<p class="como"><b>Cómo responder aquí:</b> ' + esc(COMO[t.tipo]) + ' Se guarda solo mientras escribes' + (puedeEnviar ? '; cuando termines, presiona Enviar. Puedes mejorarla y volver a enviarla hasta las 23:59.' : '.') + '</p>' : '') +
      '<div class="editor">' + T.editorHTML(t, r ? r.contenido : {}, dis) + '</div>' +
      (dis ? '' : '<footer><small data-guardado>' + (r ? 'Guardado ' + esc((r.actualizado || '').slice(11, 16)) : 'Se guarda solo mientras escribes') + '</small>' +
        (puedeEnviar ? '<button class="btn p" type="button" data-enviar>' + (r && r.estado === 'enviada' ? 'Volver a enviar' : 'Enviar') + '</button>' : '') + '</footer><div data-msg></div>') +
      '</article>';
  }

  /* ---------- Ejemplo resuelto: mismo editor, en modo lectura ---------- */
  // Se dibuja con un id distinto para que sus opciones no se mezclen con las del editor real.
  const tareaEj = t => Object.assign({}, t, { id: t.id + '-ej' });
  function ejemploHTML(t) {
    const e = t.ejemplo;
    if (!e || typeof e !== 'object') return '';
    const nota = e._nota ? '<p class="ej-nota"><b>Por qué es un buen ejemplo:</b> ' + esc(e._nota) + '</p>' : '';
    return '<details class="ejemplo" data-ejemplo><summary>Ver ejemplo resuelto · Distribuidora Los Aromos</summary>' +
      '<div class="ej-cuerpo"><p class="sub">Caso ficticio del curso. Úsalo como guía de forma y profundidad, no como respuesta para copiar: tu tarea es sobre tu organización.</p>' +
      '<div class="editor-ej">' + T.editorHTML(tareaEj(t), e, true) + '</div>' + nota + '</div></details>';
  }
  /** Activa los ejemplos de un contenedor: el diagrama se dibuja solo al abrirlo. */
  T.activarEjemplos = function (cont, tareas) {
    cont.querySelectorAll('[data-tarea]').forEach(tj => {
      const d = tj.querySelector('[data-ejemplo]'); if (!d) return;
      const t = tareas.find(x => x.id === tj.dataset.tarea); if (!t) return;
      let listo = false;
      d.addEventListener('toggle', () => { if (d.open && !listo) { listo = true; T.activarLectura(tareaEj(t), d.querySelector('.editor-ej')); } });
    });
  };

  /* ---------- Docente: ver una respuesta ---------- */
  T.verRespuesta = async function (respuestaId) {
    const d = await M.api('verRespuesta', { respuesta_id: respuestaId });
    const m = M.modal(d.estudiante.nombre + ' · ' + d.tarea.titulo,
      '<div class="opciones">' + chipEstado(d.respuesta) + '<span class="chip gris">Sesión ' + d.sesion.numero + '</span></div>' +
      (d.respuesta.archivo_url ? '<div><a class="btn s" href="' + esc(d.respuesta.archivo_url) + '" target="_blank" rel="noopener">Abrir el archivo en Drive</a></div>' : '') +
      (d.tarea.tipo === 'enlace' && d.respuesta.contenido.url ? '<div><a class="btn s" href="' + esc(d.respuesta.contenido.url) + '" target="_blank" rel="noopener">Abrir el enlace</a></div>' : '') +
      '<div class="editor" id="vr-ed">' + T.editorHTML(d.tarea, d.respuesta.contenido, true) + '</div>');
    m.el.querySelector('.modal').classList.add('ancho');
    T.activarLectura(d.tarea, $('#vr-ed', m.el));
  };

  /* ---------- Docente: editor de tareas de una sesión ---------- */
  T.editar = async function (sesionId, alGuardar) {
    const s = await M.api('verSesionDocente', { sesion_id: sesionId });
    const propias = (s.tareas || []).filter(t => t.tipo !== 'cierre');
    const m = M.modal('Sesión ' + s.numero + ' · Tareas',
      '<p class="sub">Las tareas se muestran al estudiante en este orden. Cada una puede llevar una explicación del concepto y un ejemplo resuelto, que el estudiante abre con «Ver ejemplo resuelto». La actividad de cierre se agrega sola al final de cada sesión, con su propia explicación y ejemplo.</p>' +
      '<div id="te-lista" style="display:grid;gap:12px"></div><div><button class="btn s" type="button" id="te-mas">Agregar tarea</button></div><div id="te-msg"></div>',
      '<button class="btn s" type="button" data-cerrar>Cancelar</button><button class="btn p" type="button" id="te-ok">Guardar tareas</button>');
    m.el.querySelector('.modal').classList.add('ancho');
    const lista = $('#te-lista', m.el);
    const bloque = t => {
      t = t || { tipo: 'texto', titulo: '', consigna: '', minutos: 20, criterio: '', config: {} };
      const c = t.config || {};
      const d = document.createElement('div'); d.className = 'tarea-ed'; d.dataset.id = t.id || '';
      d.innerHTML = '<div class="fila"><div class="campo"><label>Tipo</label><select data-f="tipo">' + Object.keys(TIPOS).filter(k => k !== 'cierre').map(k => '<option value="' + k + '"' + (t.tipo === k ? ' selected' : '') + '>' + TIPOS[k] + '</option>').join('') + '</select></div>' +
        '<div class="campo" style="grid-column:span 2"><label>Título *</label><input type="text" data-f="titulo" value="' + esc(t.titulo) + '"></div>' +
        '<div class="campo"><label>Minutos sugeridos</label><input type="number" min="0" max="180" data-f="minutos" value="' + esc(t.minutos || '') + '"></div></div>' +
        '<div class="campo"><label>Consigna</label><textarea data-f="consigna" rows="4" placeholder="Qué debe hacer, paso a paso.">' + esc(t.consigna || '') + '</textarea></div>' +
        '<div class="campo"><label>Cómo se revisa</label><input type="text" data-f="criterio" value="' + esc(t.criterio || '') + '" placeholder="Criterio de la pauta de cotejo o de la rúbrica"></div>' +
        '<div class="campo"><label>Qué es y para qué sirve</label><textarea data-f="explicacion" rows="3" placeholder="Explica el concepto con palabras simples, para alguien que lo ve por primera vez.">' + esc(t.explicacion || '') + '</textarea></div>' +
        '<details class="ejemplo te-ej"><summary>Ejemplo resuelto' + (t.ejemplo ? ' · tiene ejemplo' : ' · sin ejemplo') + '</summary><div class="ej-cuerpo"><p class="sub">Complétalo como lo haría un estudiante. Se muestra en modo lectura dentro de la tarea.</p><div data-ej-zona></div>' +
        '<div class="campo"><label>Por qué es un buen ejemplo</label><textarea data-f="ej_nota" rows="2">' + esc((t.ejemplo && t.ejemplo._nota) || '') + '</textarea></div></div></details>' +
        '<div class="fila te-config">' +
        '<div class="campo" data-solo="tabla"><label>Columnas de la tabla</label><input type="text" data-f="columnas" value="' + esc((c.columnas || []).join(', ')) + '" placeholder="Problema, Impacto, Frecuencia"><span class="ayuda">Separadas por comas, hasta 8.</span></div>' +
        '<div class="campo" data-solo="tabla"><label>Filas mínimas</label><input type="number" min="1" max="30" data-f="filas_min" value="' + esc(c.filas_min || 1) + '"></div>' +
        '<div class="campo" data-solo="texto"><label>Palabras mínimas</label><input type="number" min="0" max="2000" data-f="min_palabras" value="' + esc(c.min_palabras || 0) + '"></div>' +
        '<div class="campo" data-solo="benchmarking"><label>Soluciones mínimas</label><input type="number" min="1" max="10" data-f="min_soluciones" value="' + esc(c.min_soluciones || 3) + '"></div>' +
        '</div><div class="acciones"><button class="btn t peq" type="button" data-sube>Subir</button><button class="btn t peq" type="button" data-baja>Bajar</button><button class="btn t peq" type="button" data-quita>Quitar</button></div>';
      const sel = d.querySelector('[data-f="tipo"]');
      const ver = () => d.querySelectorAll('[data-solo]').forEach(x => { x.style.display = x.dataset.solo === sel.value ? '' : 'none'; });
      // Ejemplo: se edita con el mismo editor del estudiante; si cambian el tipo o las columnas, se vuelve a dibujar.
      const zona = d.querySelector('[data-ej-zona]');
      const tEj = () => ({ id: 'te-' + Math.random().toString(36).slice(2, 8), tipo: sel.value, config: { columnas: (d.querySelector('[data-f="columnas"]').value || '').split(',').map(x => x.trim()).filter(Boolean) } });
      const pintarEj = c => {
        const te = tEj(); d._tEj = te;
        const caja = document.createElement('div'); caja.className = 'editor-ej';
        caja.innerHTML = te.tipo === 'archivo'
          ? campo('Nombre del archivo de ejemplo', '', linea('nombre', (c || {}).nombre, 'Informe_LosAromos.pdf')) + campo('Qué contiene', '', area('nota', (c || {}).nota, 4))
          : T.editorHTML(te, c || {}, false);
        zona.innerHTML = ''; zona.appendChild(caja);
        if (te.tipo !== 'archivo') activarEditor(te, caja, null, false);
      };
      d._leerEj = () => {
        const caja = zona.querySelector('.editor-ej'); if (!caja) return null;
        const c = d._tEj.tipo === 'archivo' ? { archivo_id: 'ejemplo', nombre: (caja.querySelector('[data-c="nombre"]') || {}).value || '', nota: (caja.querySelector('[data-c="nota"]') || {}).value || '' } : T.leer(d._tEj, caja);
        if (d._tEj.tipo === 'archivo' && !c.nombre && !c.nota) return null;
        const nota = d.querySelector('[data-f="ej_nota"]').value.trim();
        if (nota) c._nota = nota;
        return c;
      };
      const ej0 = t.ejemplo ? Object.assign({}, t.ejemplo) : {};
      delete ej0._nota;
      pintarEj(ej0);
      sel.onchange = () => { ver(); pintarEj({}); };
      d.querySelector('[data-f="columnas"]').addEventListener('change', () => pintarEj(d._leerEj() || {}));
      ver();
      d.querySelector('[data-sube]').onclick = () => { if (d.previousElementSibling) lista.insertBefore(d, d.previousElementSibling); };
      d.querySelector('[data-baja]').onclick = () => { if (d.nextElementSibling) lista.insertBefore(d.nextElementSibling, d); };
      d.querySelector('[data-quita]').onclick = () => d.remove();
      lista.appendChild(d);
    };
    propias.forEach(bloque);
    if (!propias.length) bloque();
    $('#te-mas', m.el).onclick = () => bloque();
    $('#te-ok', m.el).onclick = async ev => {
      const tareas = Array.from(lista.querySelectorAll('.tarea-ed')).map(d => {
        const f = k => (d.querySelector('[data-f="' + k + '"]') || {}).value || '';
        return { id: d.dataset.id, tipo: f('tipo'), titulo: f('titulo'), consigna: f('consigna'), minutos: f('minutos'), criterio: f('criterio'),
          explicacion: f('explicacion'), ejemplo: d._leerEj(),
          config: { columnas: f('columnas').split(',').map(x => x.trim()).filter(Boolean), filas_min: f('filas_min'), min_palabras: f('min_palabras'), min_soluciones: f('min_soluciones') } };
      });
      await M.ocupado(ev.currentTarget, async () => {
        try { await M.api('guardarTareas', { sesion_id: s.id, tareas: tareas }); m.cerrar(); if (alGuardar) await alGuardar(); }
        catch (e) { M.msg($('#te-msg', m.el), e.message, 'mal'); }
      });
    };
  };
})();
