import { datosIniciales } from './data.js';
import * as C from './core.js';

const CLAVE = 'dulce-medida-demo-v1';
let state = cargar();
const ui = { ia: null, iaCargando: false, iaError: '', invTab: 'MP', kardexItem: '', verFactor: false, confirmarReinicio: false };

function cargar() {
  try { const s = localStorage.getItem(CLAVE); if (s) return JSON.parse(s); } catch (e) { /* sin almacenamiento */ }
  return datosIniciales();
}
function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ } }

// ---------- Formato ----------
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const $ = n => pesos.format(Math.round(n || 0));
const num = (n, d = 2) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d }).format(n || 0);
const pct = (n, d = 1) => `${num((n || 0) * 100, d)} %`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const it = id => C.item(state, id);
const icono = p => (/mermelada/i.test(p) ? '🍓' : /panelita|leche/i.test(p) ? '🥥' : /gelatina/i.test(p) ? '🍮' : /galleta/i.test(p) ? '🍪' : '📦');
const badge = e => `<span class="badge b-${e}">${C.ESTADOS[e]}</span>`;
const signo = v => (v > 0.5 ? `<span class="pos">${$(v)} desfavorable</span>` : v < -0.5 ? `<span class="neg">${$(-v)} favorable</span>` : '<span class="muted">Sin variación</span>');

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('visible');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('visible'), 3200);
}

// ---------- Router ----------
function ruta() { const [, sec = 'inicio', id = ''] = (location.hash || '#/inicio').split('/'); return { sec, id: decodeURIComponent(id) }; }
function ir(h) { location.hash = h; }
function render() {
  const { sec, id } = ruta();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('activo', a.dataset.ruta === sec));
  const vistas = { inicio: vInicio, fichas: id ? () => vFicha(id) : vFichas, ia: vIA, ordenes: id ? () => vOrden(id) : vOrdenes, inventario: vInventario, configuracion: vConfig, contabilidad: vContabilidad };
  document.getElementById('app').innerHTML = (vistas[sec] || vInicio)();
  const r = document.getElementById('btn-reiniciar');
  r.textContent = ui.confirmarReinicio ? '¿Seguro? Clic para confirmar' : 'Reiniciar datos del demo';
}
window.addEventListener('hashchange', () => { render(); document.getElementById('app').focus(); window.scrollTo(0, 0); });

// ---------- Componentes ----------
function barraCosto(u) {
  const t = u.total || 1;
  return `<div class="barra" title="MP ${pct(u.mp / t, 0)} · MOD ${pct(u.mod / t, 0)} · CIF ${pct(u.cif / t, 0)}">
    <span class="c-mp" style="width:${(u.mp / t) * 100}%"></span><span class="c-mod" style="width:${(u.mod / t) * 100}%"></span><span class="c-cif" style="width:${(u.cif / t) * 100}%"></span></div>
    <div class="leyenda"><span><i class="c-mp"></i>MP ${pct(u.mp / t, 0)}</span><span><i class="c-mod"></i>MOD ${pct(u.mod / t, 0)}</span><span><i class="c-cif"></i>CIF ${pct(u.cif / t, 0)}</span></div>`;
}

// ---------- Vistas ----------
function vInicio() {
  const inv = state.items.filter(i => i.tipo !== 'PT').reduce((s, i) => s + i.stock * i.costo, 0);
  const pt = state.items.filter(i => i.tipo === 'PT').reduce((s, i) => s + i.stock * i.costo, 0);
  const abiertas = state.ordenes.filter(o => ['planeada', 'pendiente', 'proceso'].includes(o.estado)).length;
  const tMod = C.tarifasMOD(state.config);
  const alertas = state.fichas.map(f => {
    const max = C.maximoProducible(state, f);
    if (max >= f.rendimiento) return '';
    const falta = C.explosion(state, f, f.rendimiento).filter(l => l.faltante > 0).map(l => it(l.itemId).nombre).join(', ');
    return `<div class="alerta alerta-warn"><strong>${esc(it(f.productoId).nombre)}</strong>Con el inventario actual alcanza para ${max} de ${f.rendimiento} unidades de un lote. Falta: ${esc(falta)}.</div>`;
  }).join('');
  return `
  <div class="page-head"><div><h1>Manufactura integrada al inventario</h1>
    <p>Primera versión para pymes que compran materia prima y la transforman. La ficha técnica define el estándar; la orden de producción consume el inventario, registra lo real y calcula el costo del producto terminado: <strong>MP + MOD + CIF</strong>.</p></div></div>
  <div class="grid g4">
    <div class="kpi"><small>Inventario de MP y empaques</small><strong>${$(inv)}</strong></div>
    <div class="kpi"><small>Inventario de producto terminado</small><strong>${$(pt)}</strong></div>
    <div class="kpi"><small>Órdenes abiertas</small><strong>${abiertas}</strong></div>
    <div class="kpi"><small>Tarifa de CIF</small><strong>${$(C.tarifaCIF(state.config.cif))} / ${state.config.cif.base}</strong></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>Recorrido sugerido</h2><div class="pasos">
      <div class="paso"><div><strong>Revisa la configuración de costos.</strong><br><span class="muted">Tarifas de MOD por rol y de CIF por kilo, con su cálculo.</span> <a href="#/configuracion">Ir</a></div></div>
      <div class="paso"><div><strong>Mira una ficha técnica.</strong><br><span class="muted">Insumos, tiempos, sustitutos y costo estándar.</span> <a href="#/fichas/f-mermelada">Ver mermelada</a></div></div>
      <div class="paso"><div><strong>Crea una orden de 100 frascos de mermelada.</strong><br><span class="muted">Falta sucralosa: elige el sustituto y mira la alerta de impacto.</span> <a href="#/ordenes">Ir a órdenes</a></div></div>
      <div class="paso"><div><strong>Registra el consumo y cierra la orden.</strong><br><span class="muted">Costo real, variaciones, entrada al inventario y asientos contables.</span></div></div>
      <div class="paso"><div><strong>Crea una ficha nueva describiéndola con tus palabras.</strong><br><span class="muted">La IA la estructura y la conecta con el inventario.</span> <a href="#/ia">Probar la IA</a></div></div>
    </div></div>
    <div class="card"><h2>Alertas de disponibilidad</h2>${alertas || '<div class="alerta alerta-ok"><strong>Todo disponible</strong>Hay material para un lote de cada producto.</div>'}
      <h3>Tarifas de mano de obra vigentes</h3>
      <table><tbody>${state.config.mod.roles.map(r => `<tr><td>${esc(r.nombre)}</td><td class="num">${$(tMod[r.id])} / hora</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}

function vFichas() {
  const cards = state.fichas.map(f => {
    const p = it(f.productoId); const c = C.costoEstandar(state, f).unidad; const m = C.margen(p.precio, c.total);
    return `<div class="card ficha-card" data-action="abrir-ficha" data-id="${f.id}">
      <div class="ficha-top"><div><h2 style="margin-bottom:2px">${esc(p.nombre)}</h2><small>${p.pesoG} g por ${esc(p.unidad)} · lote de ${f.rendimiento} · ${esc(f.linea || '')}</small></div><div class="producto-icono">${icono(p.nombre)}</div></div>
      ${barraCosto(c)}
      <div class="cifras"><div><small>Costo estándar</small><strong>${$(c.total)}</strong></div><div><small>Precio de venta</small><strong>${$(p.precio)}</strong></div>
      <div><small>Margen bruto</small><strong class="${m < 0.3495 ? 'pos' : ''}">${pct(m)}</strong></div></div></div>`;
  }).join('');
  return `<div class="page-head"><div><h1>Fichas técnicas</h1><p>El estándar de cada producto: qué consume, cuánto tiempo toma por rol y cuánto debería costar. Se define al lanzar o actualizar el producto.</p></div>
    <a class="btn" href="#/ia">+ Crear ficha con IA</a></div><div class="grid g2">${cards}</div>`;
}

function vFicha(id) {
  const f = C.ficha(state, id); if (!f) return '<p>Ficha no encontrada.</p>';
  const p = it(f.productoId); const ce = C.costoEstandar(state, f); const tMod = C.tarifasMOD(state.config);
  const tCif = C.tarifaCIF(state.config.cif); const base = C.baseCIF(p, f.rendimiento, state.config.cif);
  const filas = f.insumos.map(ins => {
    const i = it(ins.itemId); const uc = C.unidadConsumo(i.unidad); const inv = C.aInventario(ins.cant, i.unidad);
    const sus = ins.sustituto ? `${esc(it(ins.sustituto.itemId).nombre)} <small>(factor ${num(ins.sustituto.factor)})</small>` : '<span class="muted">—</span>';
    return `<tr><td>${esc(i.nombre)}</td><td class="num">${num(ins.cant / f.rendimiento, 2)} ${uc}</td><td class="num">${num(ins.cant, 2)} ${uc}</td><td class="num">${num(inv, 3)} ${i.unidad}</td><td class="num">${$(i.costo)}</td><td class="num">${$(inv * i.costo)}</td><td>${sus}</td></tr>`;
  }).join('');
  const tiempos = f.tiempos.map(t => {
    const r = state.config.mod.roles.find(x => x.id === t.rolId); const h = (t.min * f.rendimiento) / 60;
    return `<tr><td>${esc(r ? r.nombre : t.rolId)}</td><td class="num">${num(t.min)}</td><td class="num">${num(h)}</td><td class="num">${$(tMod[t.rolId])}</td><td class="num">${$(h * tMod[t.rolId])}</td></tr>`;
  }).join('');
  const m = C.margen(p.precio, ce.unidad.total);
  return `<div class="page-head"><div><a href="#/fichas">← Fichas técnicas</a><h1>${icono(p.nombre)} ${esc(p.nombre)}</h1>
    <p>${p.pesoG} g por ${esc(p.unidad)} · lote estándar de ${f.rendimiento} ${esc(p.unidad)}s (${num((p.pesoG * f.rendimiento) / 1000)} kg) · línea ${esc(f.linea || '')}</p></div>
    <button class="btn" data-action="orden-desde-ficha" data-id="${f.id}">Crear orden con esta ficha</button></div>
  <div class="grid g3">
    <div class="kpi"><small>Costo estándar por ${esc(p.unidad)}</small><strong>${$(ce.unidad.total)}</strong>${barraCosto(ce.unidad)}</div>
    <div class="kpi"><small>Precio de venta (sin IVA)</small><div class="fila" style="margin-top:4px"><input type="number" id="precio" value="${Math.round(p.precio)}"><button class="btn btn-sm btn-sec" data-action="guardar-precio" data-id="${p.id}">Guardar</button></div></div>
    <div class="kpi"><small>Margen bruto</small><strong class="${m < 0.3495 ? 'pos' : ''}">${pct(m)}</strong><small>Objetivo: 35 % o más. Precio sugerido al 35 %: ${$(ce.unidad.total / 0.65)}</small></div>
  </div>
  <div class="card"><h2>Materiales</h2><p class="muted">La ficha se expresa en unidades de consumo (g, ml, und) y el sistema convierte a la unidad del inventario. El empaque hace parte del costo del producto.</p>
    <div class="table-wrap"><table><thead><tr><th>Insumo</th><th class="num">Por unidad</th><th class="num">Por lote</th><th class="num">En inventario</th><th class="num">Costo promedio</th><th class="num">Costo por lote</th><th>Sustituto aprobado</th></tr></thead>
    <tbody>${filas}<tr class="total"><td colspan="5">Materia prima y empaque</td><td class="num">${$(ce.lote.mp)}</td><td></td></tr></tbody></table></div></div>
  <div class="card"><h2>Tiempos estándar por rol</h2><p class="muted">Minutos por unidad, tomados del levantamiento de tiempos de la empresa. En la orden se comparan contra las horas reales.</p>
    <table><thead><tr><th>Rol</th><th class="num">Min / unidad</th><th class="num">Horas / lote</th><th class="num">Tarifa / hora</th><th class="num">Costo por lote</th></tr></thead>
    <tbody>${tiempos}<tr class="total"><td colspan="4">Mano de obra directa</td><td class="num">${$(ce.lote.mod)}</td></tr></tbody></table></div>
  <div class="card"><h2>Costo estándar</h2>
    <table><thead><tr><th>Elemento</th><th>Cómo se calcula</th><th class="num">Por lote</th><th class="num">Por unidad</th></tr></thead><tbody>
    <tr><td>Materia prima y empaque</td><td>Cantidad en inventario × costo promedio</td><td class="num">${$(ce.lote.mp)}</td><td class="num">${$(ce.unidad.mp)}</td></tr>
    <tr><td>Mano de obra directa</td><td>Horas por rol × tarifa del rol</td><td class="num">${$(ce.lote.mod)}</td><td class="num">${$(ce.unidad.mod)}</td></tr>
    <tr><td>CIF</td><td>${num(base)} ${state.config.cif.base} × ${$(tCif)}</td><td class="num">${$(ce.lote.cif)}</td><td class="num">${$(ce.unidad.cif)}</td></tr>
    <tr class="total"><td>Total</td><td></td><td class="num">${$(ce.lote.total)}</td><td class="num">${$(ce.unidad.total)}</td></tr></tbody></table></div>`;
}

function vIA() {
  const ejemplo = 'Quiero crear la mermelada de mora dietética de 250 g. Un lote rinde 80 frascos. Uso 21 kilos de mora, 280 gramos de pectina de bajo metoxilo, 12 gramos de sucralosa, 50 gramos de ácido cítrico y 20 gramos de sorbato de potasio. Cada frasco lleva su tapa y su etiqueta adhesiva. El operario de conservas se demora 1,5 horas por lote y el de empaque 40 minutos por lote.';
  let resultado = '';
  if (ui.ia) resultado = vIAResultado();
  return `<div class="page-head"><div><h1>Crear ficha técnica con IA</h1>
    <p>Muchas pymes tienen su receta "en la cabeza" o en un cuaderno. Escríbela con tus palabras: la IA la convierte en una ficha estructurada, la conecta con los insumos del inventario y la deja lista para revisar. Tú decides antes de guardar.</p></div></div>
  <div class="card"><label for="ia-texto">Describe el producto, el lote, los insumos y los tiempos</label>
    <textarea id="ia-texto" placeholder="${esc(ejemplo)}">${esc(ui.iaTexto || '')}</textarea>
    <div class="acciones" style="margin-top:10px"><button class="btn" data-action="ia-interpretar" ${ui.iaCargando ? 'disabled' : ''}>${ui.iaCargando ? '<span class="cargando"></span>Interpretando…' : 'Interpretar con IA'}</button>
    <button class="btn btn-sec" data-action="ia-ejemplo">Usar el ejemplo</button></div>
    ${ui.iaError ? `<div class="alerta alerta-bad"><strong>No se pudo crear la ficha</strong>${esc(ui.iaError)}</div>` : ''}</div>
  ${resultado}`;
}

function vIAResultado() {
  const r = ui.ia; const opciones = sel => state.items.filter(i => i.tipo !== 'PT').map(i => `<option value="${i.id}" ${sel === i.id ? 'selected' : ''}>${esc(i.nombre)} (${i.unidad})</option>`).join('');
  const roles = sel => state.config.mod.roles.map(x => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');
  const insumos = r.insumos.map((ins, k) => {
    const nuevo = !ins.itemId;
    return `<tr><td>${esc(ins.nombre)}</td><td class="num"><input type="number" step="any" id="ia-cant-${k}" value="${ins.cantidad}"> ${esc(ins.unidad)}</td>
      <td><select class="ancho" data-change="ia-map" data-k="${k}"><option value="" ${nuevo ? 'selected' : ''}>➕ Crear como insumo nuevo</option>${opciones(ins.itemId)}</select></td>
      <td>${nuevo ? `<input type="number" id="ia-costo-${k}" placeholder="Costo" value="${ins.costo || ''}"> por ${ins.unidad === 'g' ? 'kg' : ins.unidad === 'ml' ? 'L' : 'und'}` : '<span class="muted">Del inventario</span>'}</td></tr>`;
  }).join('');
  const tiempos = r.tiempos.map((t, k) => `<tr><td><select data-change="ia-rol" data-k="${k}"><option value="">Seleccione un rol</option>${roles(t.rolId)}</select></td><td class="num"><input type="number" step="any" id="ia-min-${k}" value="${+Number(t.minutosPorUnidad).toFixed(3)}"> min / unidad</td></tr>`).join('');
  return `<div class="card"><h2>Ficha propuesta por la IA</h2>
    <div class="alerta alerta-info"><strong>Revisa antes de guardar</strong>La IA propone; tú validas. Ajusta cantidades, asocia cada insumo al inventario y completa el costo de los insumos nuevos.</div>
    ${r.supuestos?.length ? `<div class="alerta alerta-warn"><strong>Supuestos de la IA</strong>${r.supuestos.map(esc).join('<br>')}</div>` : ''}
    <div class="fila">
      <div class="campo" style="flex:2"><label>Producto</label><input class="ancho" id="ia-nombre" value="${esc(r.producto.nombre)}"></div>
      <div class="campo"><label>Peso (g)</label><input type="number" id="ia-peso" value="${r.producto.pesoG}"></div>
      <div class="campo"><label>Unidad de venta</label><input id="ia-unidad" value="${esc(r.producto.unidadVenta)}" style="width:110px"></div>
      <div class="campo"><label>Rendimiento del lote</label><input type="number" id="ia-rend" value="${r.rendimiento}"></div>
      <div class="campo"><label>Precio de venta</label><input type="number" id="ia-precio" value="${r.precio || ''}" placeholder="Opcional"></div>
    </div>
    <h3>Insumos por lote</h3><div class="table-wrap"><table><thead><tr><th>Insumo interpretado</th><th class="num">Cantidad por lote</th><th>Insumo del inventario</th><th>Costo (si es nuevo)</th></tr></thead><tbody>${insumos}</tbody></table></div>
    <h3>Tiempos estándar</h3><table><thead><tr><th>Rol</th><th class="num">Tiempo</th></tr></thead><tbody>${tiempos}</tbody></table>
    <div class="acciones" style="margin-top:14px"><button class="btn" data-action="ia-guardar">Guardar ficha técnica</button><button class="btn btn-sec" data-action="ia-descartar">Descartar</button></div>
    <small>Modelo: ${esc(r.modelo || '')}</small></div>`;
}

function vOrdenes() {
  const filas = state.ordenes.slice().reverse().map(o => {
    const p = it(o.productoId);
    return `<tr data-action="abrir-orden" data-id="${o.id}" style="cursor:pointer"><td><a href="#/ordenes/${o.id}">${o.numero}</a></td><td>${esc(p.nombre)}</td><td class="num">${o.cantidad}</td><td>${badge(o.estado)}</td><td class="num">${o.cierre ? o.cierre.unidadesBuenas : '—'}</td><td class="num">${o.cierre ? $(o.cierre.unitarioReal) : '—'}</td></tr>`;
  }).join('');
  const opciones = state.fichas.map(f => `<option value="${f.id}">${esc(it(f.productoId).nombre)} (lote ${f.rendimiento})</option>`).join('');
  return `<div class="page-head"><div><h1>Órdenes de producción</h1><p>La orden carga la ficha técnica, verifica el inventario, consume la materia prima, registra lo real y valora el producto terminado.</p></div></div>
  <div class="card"><h2>Nueva orden</h2><div class="fila">
    <div class="campo" style="flex:1"><label for="nueva-ficha">Producto</label><select id="nueva-ficha" class="ancho">${opciones}</select></div>
    <div class="campo"><label for="nueva-cant">Cantidad a producir</label><input type="number" id="nueva-cant" value="100" min="1"></div>
    <div class="campo"><button class="btn" data-action="crear-orden">Crear orden</button></div></div></div>
  <div class="card"><h2>Órdenes</h2>${state.ordenes.length ? `<div class="table-wrap"><table><thead><tr><th>Orden</th><th>Producto</th><th class="num">Cantidad</th><th>Estado</th><th class="num">Unidades buenas</th><th class="num">Costo unitario real</th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="muted">Aún no hay órdenes. Crea la primera arriba.</p>'}</div>`;
}

function vFaltantes(o) {
  const falt = C.faltantesOrden(state, o);
  if (!falt.length) {
    return o.estado === 'pendiente'
      ? `<div class="alerta alerta-ok"><strong>Ya hay material disponible</strong>Puedes reactivar la orden.<div class="acciones" style="margin-top:8px"><button class="btn btn-sm" data-action="reactivar" data-id="${o.id}">Reactivar orden</button></div></div>`
      : '<div class="alerta alerta-ok"><strong>Material disponible</strong>El inventario alcanza para todos los insumos de la orden.</div>';
  }
  const f = C.ficha(state, o.fichaId); const max = C.maximoProducible(state, f);
  const sinConsumo = o.lineas.every(l => l.consumido === 0);
  const bloques = falt.map(l => {
    let opSus = '<p class="muted">Este insumo no tiene sustituto aprobado en la ficha técnica.</p>';
    if (l.sustituto) {
      const imp = C.impactoSustituto(state, { itemId: l.itemId, requerido: l.requerido, sustituto: l.sustituto }, state.config.umbralAlerta);
      const impUnit = (imp.valorSustituto - imp.valorOriginal) / o.cantidad;
      const std = C.costoEstandar(state, f).unidad.total;
      opSus = `<table><thead><tr><th></th><th class="num">Cantidad</th><th class="num">Valor</th><th class="num">Disponible</th></tr></thead><tbody>
        <tr><td>Original: ${esc(imp.original.nombre)}</td><td class="num">${num(imp.cantOriginal, 3)} ${imp.original.unidad}</td><td class="num">${$(imp.valorOriginal)}</td><td class="num">${num(imp.original.stock, 3)}</td></tr>
        <tr><td>Sustituto: ${esc(imp.sustituto.nombre)}</td><td class="num">${num(imp.cantSustituto, 3)} ${imp.sustituto.unidad}</td><td class="num">${$(imp.valorSustituto)}</td><td class="num">${num(imp.sustituto.stock, 3)}</td></tr></tbody></table>
        <div class="alerta ${imp.alerta ? 'alerta-warn' : 'alerta-ok'}"><strong>${imp.alerta ? '⚠ Alerta de impacto: supera el umbral de ' + pct(state.config.umbralAlerta, 0) : 'Sin alerta: no supera el umbral de ' + pct(state.config.umbralAlerta, 0)}</strong>
        ${imp.varCantidad !== null ? `Cantidad: ${imp.varCantidad >= 0 ? '+' : ''}${pct(imp.varCantidad)} · ` : ''}Valor: ${imp.varValor >= 0 ? '+' : ''}${pct(imp.varValor)} (${imp.valorSustituto >= imp.valorOriginal ? '+' : ''}${$(imp.valorSustituto - imp.valorOriginal)} en la orden).
        El costo unitario estándar pasaría de ${$(std)} a ${$(std + impUnit)}.</div>
        <button class="btn btn-sm" data-action="usar-sustituto" data-id="${o.id}" data-item="${l.itemId}" ${imp.disponible ? '' : 'disabled'}>Usar sustituto</button>`;
    }
    return `<div class="card" style="box-shadow:none"><h3 style="margin-top:0">Falta ${esc(l.it.nombre)}: se requieren ${num(l.requerido, 3)} ${l.it.unidad} y hay ${num(l.it.stock, 3)}</h3>
      <strong>Opción 1 · Usar el sustituto aprobado</strong>${opSus}</div>`;
  }).join('');
  return `<div class="alerta alerta-bad"><strong>Falta material para producir ${o.cantidad} unidades</strong>Elige cómo continuar. La orden no consume material faltante.</div>${bloques}
    <div class="card" style="box-shadow:none"><strong>Opción 2 · Reducir la cantidad</strong><p class="muted">Con el inventario actual alcanza para ${max} unidades.</p>
      <button class="btn btn-sm btn-sec" data-action="reducir" data-id="${o.id}" data-max="${max}" ${max > 0 && sinConsumo ? '' : 'disabled'}>Reducir la orden a ${max} unidades</button>
      <hr style="border:none;border-top:1px solid var(--line);margin:14px 0">
      <strong>Opción 3 · Dejar pendiente de material</strong><p class="muted">La orden queda en espera hasta que llegue el material.</p>
      <button class="btn btn-sm btn-sec" data-action="pendiente" data-id="${o.id}" ${o.estado === 'pendiente' ? 'disabled' : ''}>Dejar pendiente</button></div>`;
}

function vOrden(id) {
  const o = state.ordenes.find(x => x.id === id); if (!o) return '<p>Orden no encontrada.</p>';
  const p = it(o.productoId); const abierta = ['planeada', 'pendiente', 'proceso'].includes(o.estado);
  const falt = abierta ? C.faltantesOrden(state, o) : [];
  const enProceso = o.lineas.reduce((s, l) => s + l.valorConsumido, 0);
  const lineas = o.lineas.map(l => {
    const i = it(l.itemId); const pend = Math.max(0, l.estandar - l.consumido);
    const orig = l.itemOriginal ? `<br><small>Sustituye a ${esc(it(l.itemOriginal).nombre)} (factor ${num(l.factor)})</small>` : '';
    const input = abierta && o.estado !== 'pendiente' ? `<input type="number" step="any" id="cons-${l.itemId}" value="${+pend.toFixed(4)}">` : '';
    return `<tr><td>${esc(i.nombre)}${orig}</td><td class="num">${num(l.estandar, 3)} ${i.unidad}</td><td class="num">${num(l.consumido, 3)}</td><td class="num">${num(i.stock, 3)}</td><td class="num">${input}</td></tr>`;
  }).join('');
  const rolNom = rid => state.config.mod.roles.find(r => r.id === rid)?.nombre || rid;
  let cierre = '';
  if (o.estado === 'proceso') {
    cierre = `<div class="card"><h2>Cerrar la orden</h2><p class="muted">Registra las unidades buenas realmente producidas y las horas reales por rol. El costo unitario se recalcula sobre las unidades buenas; la merma la absorben las unidades buenas.</p>
      <div class="fila"><div class="campo"><label>Unidades buenas (${esc(p.unidad)})</label><input type="number" id="cierre-und" value="${o.cantidad}"></div>
      ${Object.keys(o.horasStd).map(r => `<div class="campo"><label>Horas reales: ${esc(rolNom(r))}</label><input type="number" step="any" id="cierre-h-${r}" value="${+o.horasStd[r].toFixed(2)}"> <small>Estándar: ${num(o.horasStd[r])} h</small></div>`).join('')}</div>
      <p>Valor acumulado en producción en proceso: <strong>${$(enProceso)}</strong></p>
      <button class="btn" data-action="cerrar" data-id="${o.id}">Cerrar orden y valorar el producto terminado</button></div>`;
  }
  let resultado = '';
  if (o.cierre) {
    const c = o.cierre; const m = C.margen(p.precio, c.unitarioEntrada);
    resultado = `<div class="card"><h2>Resultado de la orden</h2>
      <div class="grid g4"><div class="kpi"><small>Unidades buenas</small><strong>${c.unidadesBuenas}</strong><small>Merma: ${c.merma} (${pct(c.merma / o.cantidad)})</small></div>
      <div class="kpi"><small>Costo unitario real</small><strong>${$(c.unitarioReal)}</strong></div>
      <div class="kpi"><small>Costo unitario estándar</small><strong>${$(c.unitarioEstandar)}</strong><small>Diferencia: ${signo((c.unitarioReal - c.unitarioEstandar) * c.unidadesBuenas)}</small></div>
      <div class="kpi"><small>Margen con precio ${$(p.precio)}</small><strong class="${m < 0.3495 ? 'pos' : ''}">${pct(m)}</strong></div></div>
      <h3>Costo real de la orden</h3><table><thead><tr><th>Elemento</th><th>Cálculo</th><th class="num">Valor</th></tr></thead><tbody>
      <tr><td>Materia prima y empaque</td><td>Consumo real a costo promedio</td><td class="num">${$(c.mpReal)}</td></tr>
      <tr><td>Mano de obra directa</td><td>Horas reales × tarifa por rol</td><td class="num">${$(c.modReal)}</td></tr>
      <tr><td>CIF aplicado</td><td>${num(c.base)} ${state.config.cif.base} producidos × ${$(c.tarifaCIF)}</td><td class="num">${$(c.cifAplicado)}</td></tr>
      <tr class="total"><td>Total</td><td>÷ ${c.unidadesBuenas} unidades buenas = ${$(c.unitarioReal)}</td><td class="num">${$(c.totalReal)}</td></tr></tbody></table>
      <p class="muted" style="margin-top:8px">Valoración: ${c.valoracion === 'real' ? 'costo real (MP y MOD reales, CIF aplicado con la tarifa)' : 'costo estándar (la diferencia se registra como variación)'}. Entrada al inventario: ${c.unidadesBuenas} × ${$(c.unitarioEntrada)}.</p>
      <h3>Variación de materia prima (cantidad)</h3><div class="table-wrap"><table><thead><tr><th>Insumo</th><th class="num">Estándar permitido</th><th class="num">Real</th><th class="num">%</th><th class="num">Variación</th></tr></thead><tbody>
      ${c.variacionesMP.map(v => `<tr><td>${esc(it(v.itemId).nombre)}</td><td class="num">${num(v.estandar, 3)} ${v.unidad}</td><td class="num">${num(v.real, 3)}</td><td class="num">${pct(v.pct)}</td><td class="num">${signo(v.variacion)}</td></tr>`).join('')}</tbody></table></div>
      <h3>Variación de eficiencia de la mano de obra</h3><table><thead><tr><th>Rol</th><th class="num">Horas estándar permitidas</th><th class="num">Horas reales</th><th class="num">Variación</th></tr></thead><tbody>
      ${c.detalleMod.map(d => `<tr><td>${esc(rolNom(d.rolId))}</td><td class="num">${num(d.horasStd)}</td><td class="num">${num(d.horasReales)}</td><td class="num">${signo(d.variacion)}</td></tr>`).join('')}</tbody></table>
      <p class="muted" style="margin-top:8px">El estándar permitido se ajusta a las unidades buenas producidas.</p></div>
      <div class="card"><h2>Asientos contables de la orden</h2>${tablaAsientos(state.asientos.filter(a => a.orden === o.numero))}</div>`;
  }
  return `<div class="page-head"><div><a href="#/ordenes">← Órdenes</a><h1>${o.numero} · ${icono(p.nombre)} ${esc(p.nombre)}</h1>
    <p>${o.cantidad} ${esc(p.unidad)}s · creada el ${o.fecha} · ${badge(o.estado)}</p></div>
    <div class="acciones">${abierta && o.lineas.every(l => l.consumido === 0) ? `<button class="btn btn-danger btn-sm" data-action="anular" data-id="${o.id}">Anular orden</button>` : ''}</div></div>
  ${abierta ? vFaltantes(o) : ''}
  ${o.eventos.length ? `<div class="alerta alerta-info"><strong>Novedades</strong>${o.eventos.map(esc).join('<br>')}</div>` : ''}
  <div class="card"><h2>Materiales de la orden</h2><p class="muted">Cantidades estándar cargadas desde la ficha técnica y escaladas a ${o.cantidad} unidades. Registra el consumo real: sale del inventario y se acumula en producción en proceso.</p>
    <div class="table-wrap"><table><thead><tr><th>Insumo</th><th class="num">Estándar</th><th class="num">Consumido</th><th class="num">En inventario</th><th class="num">Registrar ahora</th></tr></thead><tbody>${lineas}</tbody></table></div>
    ${abierta && o.estado !== 'pendiente' ? `<div class="acciones" style="margin-top:10px"><button class="btn" data-action="consumir" data-id="${o.id}" ${falt.length ? 'disabled title="Resuelve primero el faltante"' : ''}>Registrar consumo</button>${falt.length ? '<small>Resuelve el faltante antes de consumir.</small>' : ''}</div>` : ''}</div>
  ${cierre}${resultado}`;
}

function tablaAsientos(lista) {
  if (!lista.length) return '<p class="muted">Aún no hay asientos.</p>';
  const total = lista.reduce((s, a) => s + a.valor, 0);
  return `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Orden</th><th>Concepto</th><th>Débito</th><th>Crédito</th><th class="num">Valor</th></tr></thead><tbody>
    ${lista.map(a => `<tr><td style="white-space:nowrap">${a.fecha}</td><td>${a.orden}</td><td>${esc(a.concepto)}</td><td>${esc(a.debito)}</td><td>${esc(a.credito)}</td><td class="num">${$(a.valor)}</td></tr>`).join('')}
    <tr class="total"><td colspan="5">Total movimientos (cada asiento cuadra débito = crédito)</td><td class="num">${$(total)}</td></tr></tbody></table></div>`;
}

function vInventario() {
  const tabs = { MP: 'Materias primas', EMP: 'Envases y empaques', PT: 'Productos terminados' };
  const lista = state.items.filter(i => i.tipo === ui.invTab);
  const total = lista.reduce((s, i) => s + i.stock * i.costo, 0);
  const filas = lista.map(i => `<tr><td>${esc(i.nombre)}</td><td>${esc(i.unidad)}</td><td class="num">${num(i.stock, 3)}</td>
    <td class="num">${i.tipo === 'PT' ? $(i.costo) : `<input type="number" data-change="costo" data-id="${i.id}" value="${Math.round(i.costo)}">`}</td><td class="num">${$(i.stock * i.costo)}</td></tr>`).join('');
  const sel = ui.kardexItem || state.items[0].id;
  let saldo = 0;
  const movs = state.movimientos.filter(m => m.itemId === sel).map(m => { saldo += m.cantidad; return `<tr><td>${m.fecha}</td><td>${esc(m.concepto)}</td><td class="num">${m.cantidad > 0 ? num(m.cantidad, 3) : ''}</td><td class="num">${m.cantidad < 0 ? num(-m.cantidad, 3) : ''}</td><td class="num">${$(m.costoUnit)}</td><td class="num">${num(saldo, 3)}</td></tr>`; }).join('');
  return `<div class="page-head"><div><h1>Inventario y kárdex</h1><p>Módulo existente: aquí se ve cómo la manufactura mueve las existencias. Los costos de materia prima son editables (en el sistema real vendrían de las compras, valoradas a costo promedio ponderado).</p></div></div>
  <div class="card"><div class="acciones" style="margin-bottom:12px">${Object.entries(tabs).map(([k, v]) => `<button class="btn btn-sm ${ui.invTab === k ? '' : 'btn-sec'}" data-action="inv-tab" data-tab="${k}">${v}</button>`).join('')}</div>
    <div class="table-wrap"><table><thead><tr><th>Ítem</th><th>Unidad</th><th class="num">Existencia</th><th class="num">Costo promedio</th><th class="num">Valor</th></tr></thead><tbody>${filas}<tr class="total"><td colspan="4">Total</td><td class="num">${$(total)}</td></tr></tbody></table></div></div>
  <div class="card"><h2>Kárdex</h2><select data-change="kardex" class="ancho" style="max-width:420px;margin-bottom:10px">${state.items.map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.nombre)}</option>`).join('')}</select>
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Entrada</th><th class="num">Salida</th><th class="num">Costo unitario</th><th class="num">Saldo</th></tr></thead><tbody>${movs || '<tr><td colspan="6" class="muted">Sin movimientos.</td></tr>'}</tbody></table></div></div>`;
}

function vConfig() {
  const cfg = state.config; const mod = cfg.mod; const tMod = C.tarifasMOD(cfg);
  const hDisp = C.horasDisponiblesMes(mod); const hProd = C.horasProductivasMes(mod);
  const gastos = cfg.cif.gastos.map((g, k) => `<tr><td><input class="ancho" data-change="gasto" data-k="${k}" data-campo="nombre" value="${esc(g.nombre)}"></td>
    <td><select data-change="gasto" data-k="${k}" data-campo="tipo"><option ${g.tipo === 'Fijo' ? 'selected' : ''}>Fijo</option><option ${g.tipo === 'Variable' ? 'selected' : ''}>Variable</option></select></td>
    <td class="num"><input type="number" data-change="gasto" data-k="${k}" data-campo="valor" value="${g.valor}" style="width:140px"></td><td><button class="btn btn-sm btn-danger" data-action="quitar-gasto" data-k="${k}">Quitar</button></td></tr>`).join('');
  const detalle = [['Prima', 8.33], ['Cesantías', 8.33], ['Intereses de cesantías', 1], ['Vacaciones', 4.17], ['Pensión', 12], ['ARL riesgo I', 0.522], ['Caja de compensación', 4]];
  const roles = mod.roles.map((r, k) => `<tr><td>${esc(r.nombre)}</td><td class="num"><input type="number" data-change="rol" data-k="${k}" data-campo="salario" value="${r.salario}" style="width:130px"></td>
    <td class="num"><input type="number" data-change="rol" data-k="${k}" data-campo="personas" value="${r.personas}" style="width:70px"></td><td class="num">${$(C.costoMensualRol(r, mod))}</td>
    <td class="num"><input type="number" data-change="rol" data-k="${k}" data-campo="tarifaManual" value="${r.tarifaManual || ''}" placeholder="Calculada" style="width:120px"></td><td class="num"><strong>${$(tMod[r.id])}</strong></td></tr>`).join('');
  return `<div class="page-head"><div><h1>Configuración de costos</h1><p>Se configura una vez al año (modelo de costo estándar). El usuario puede actualizar cualquier valor cuando cambien sus condiciones: las órdenes cerradas conservan su costo y las nuevas usan la tarifa vigente.</p></div></div>
  <div class="grid g2">
    <div class="card"><h2>Valoración del producto terminado</h2>
      <label><input type="radio" name="val" data-change="valoracion" value="real" ${cfg.valoracion === 'real' ? 'checked' : ''}> Costo real (recomendado)</label><p class="muted">MP real consumida + horas reales × tarifa + CIF aplicado con la tarifa (el CIF real solo se conoce al cierre del mes).</p>
      <label><input type="radio" name="val" data-change="valoracion" value="estandar" ${cfg.valoracion === 'estandar' ? 'checked' : ''}> Costo estándar</label><p class="muted">Entra con el costo de la ficha; la diferencia con lo real se registra como variación.</p></div>
    <div class="card"><h2>Alerta de sustitutos</h2><p class="muted">Si el sustituto consume más cantidad o más valor que el original en este porcentaje o más, el sistema alerta antes de confirmar.</p>
      <div class="fila"><input type="number" step="0.5" data-change="umbral" value="${cfg.umbralAlerta * 100}" style="width:80px"> %</div></div>
  </div>
  <div class="card"><h2>Costos indirectos de fabricación (CIF)</h2><p class="muted">Escribe los gastos de la planta con tus palabras. Solo van los de producción: la bodega de producto terminado es gasto de ventas y la administración es gasto operacional.</p>
    <div class="table-wrap"><table><thead><tr><th>Gasto mensual presupuestado</th><th>Tipo</th><th class="num">Valor</th><th></th></tr></thead><tbody>${gastos}
    <tr class="total"><td colspan="2">Total CIF del mes</td><td class="num">${$(C.totalCIF(cfg.cif))}</td><td></td></tr></tbody></table></div>
    <button class="btn btn-sm btn-sec" data-action="agregar-gasto" style="margin-top:8px">+ Agregar gasto</button>
    <div class="fila" style="margin-top:14px"><div class="campo"><label>Base de asignación</label><select data-change="base"><option value="kg" ${cfg.cif.base === 'kg' ? 'selected' : ''}>Peso (kg producidos)</option><option value="und" ${cfg.cif.base === 'und' ? 'selected' : ''}>Unidades producidas</option></select></div>
      <div class="campo"><label>Capacidad normal al mes (${cfg.cif.base})</label><input type="number" data-change="capacidad" value="${cfg.cif.capacidad}"></div>
      <div class="campo"><label>Tarifa de CIF</label><div class="formula">${$(C.totalCIF(cfg.cif))} ÷ ${num(cfg.cif.capacidad, 0)} ${cfg.cif.base} = <strong>${$(C.tarifaCIF(cfg.cif))} / ${cfg.cif.base}</strong></div></div></div>
    <p class="muted">Por qué por peso: refleja el volumen real que procesa la planta y toda pyme conoce el peso de su producto. La capacidad normal es el divisor que exige la NIC 2 (párrafo 13).</p></div>
  <div class="card"><h2>Mano de obra directa (MOD)</h2>
    <div class="formula">Tarifa por hora = costo total mensual del rol ÷ horas productivas al mes</div>
    <div class="fila" style="margin-top:12px">
      <div class="campo"><label>Factor prestacional (%)</label><input type="number" step="0.01" data-change="mod" data-campo="factor" value="${+(mod.factor * 100).toFixed(2)}"> <button class="detalle-toggle" data-action="ver-factor">${ui.verFactor ? 'Ocultar detalle' : 'Ver detalle'}</button></div>
      <div class="campo"><label>Jornada semanal (h)</label><input type="number" data-change="mod" data-campo="jornada" value="${mod.jornada}" style="width:80px"></div>
      <div class="campo"><label>Festivos al año</label><input type="number" data-change="mod" data-campo="festivos" value="${mod.festivos}" style="width:80px"></div>
      <div class="campo"><label>Días de vacaciones</label><input type="number" data-change="mod" data-campo="vacaciones" value="${mod.vacaciones}" style="width:80px"></div>
      <div class="campo"><label>Eficiencia operativa (%)</label><input type="number" data-change="mod" data-campo="eficiencia" value="${+(mod.eficiencia * 100).toFixed(1)}" style="width:80px"></div></div>
    ${ui.verFactor ? `<table style="max-width:420px"><tbody>${detalle.map(([n, v]) => `<tr><td>${n}</td><td class="num">${num(v, 3)} %</td></tr>`).join('')}<tr class="total"><td>Total sugerido</td><td class="num">38,35 %</td></tr></tbody></table>
      <p class="muted">Supuesto: empresa exonerada de salud, SENA e ICBF (sin exoneración, cerca de 51,86 %). Auxilio de transporte ${$(mod.auxilio)} con prima, cesantías e intereses (17,67 %) para quienes ganan hasta 2 SMMLV.</p>` : ''}
    <p>Horas disponibles: (${mod.jornada} × 52 − ${mod.festivos} festivos × ${num(mod.jornada / 6)} h − ${mod.vacaciones} días de vacaciones × ${num(mod.jornada / 6)} h) ÷ 12 = <strong>${num(hDisp)} h/mes</strong> × ${pct(mod.eficiencia, 0)} de eficiencia = <strong>${num(hProd)} horas productivas</strong>.</p>
    <p class="muted">No se usan las 210 horas de nómina (42 × 5): incluyen domingos y festivos pagados que no se trabajan y subcostearían la mano de obra. Eficiencia del 75 %: referencia del sector de alimentos, donde las plantas bien gestionadas alcanzan cerca del 75 % de OEE por limpiezas, alérgenos y validaciones.</p>
    <div class="table-wrap"><table><thead><tr><th>Rol</th><th class="num">Salario</th><th class="num">Personas</th><th class="num">Costo total mes</th><th class="num">Tarifa manual (opcional)</th><th class="num">Tarifa por hora</th></tr></thead><tbody>${roles}</tbody></table></div></div>`;
}

function vContabilidad() {
  const c = state.config.cuentas;
  const etiquetas = { mp: 'Inventario de materias primas', emp: 'Inventario de envases y empaques', proceso: 'Producción en proceso', pt: 'Inventario de producto terminado', mod: 'Mano de obra directa', cif: 'Costos indirectos de fabricación', costoVentas: 'Costo de ventas' };
  return `<div class="page-head"><div><h1>Contabilidad de costos</h1><p>Cada movimiento de la orden genera su asiento. La empresa configura las cuentas una sola vez; el sistema sugiere las del PUC colombiano.</p></div></div>
  <div class="grid g2"><div class="card"><h2>Cuentas</h2>${Object.entries(etiquetas).map(([k, v]) => `<div class="campo"><label>${v}</label><input class="ancho" data-change="cuenta" data-k="${k}" value="${esc(c[k])}"></div>`).join('')}</div>
  <div class="card"><h2>Cómo se registra</h2><table><thead><tr><th>Momento</th><th>Débito</th><th>Crédito</th></tr></thead><tbody>
    <tr><td>Consumo de materia prima</td><td>${esc(c.proceso)}</td><td>${esc(c.mp)} / ${esc(c.emp)}</td></tr>
    <tr><td>Aplicación de la MOD</td><td>${esc(c.proceso)}</td><td>${esc(c.mod)}</td></tr>
    <tr><td>Aplicación del CIF</td><td>${esc(c.proceso)}</td><td>${esc(c.cif)}</td></tr>
    <tr><td>Cierre de la orden</td><td>${esc(c.pt)}</td><td>${esc(c.proceso)}</td></tr>
    <tr><td>Venta (módulo existente)</td><td>${esc(c.costoVentas)}</td><td>${esc(c.pt)}</td></tr></tbody></table>
    <p class="muted" style="margin-top:8px">La nómina y los gastos reales se registran durante el mes en las cuentas de MOD y CIF; el saldo que queda es la diferencia entre lo real y lo aplicado (análisis de la fase 2).</p></div></div>
  <div class="card"><h2>Asientos generados</h2>${tablaAsientos(state.asientos)}</div>`;
}

// ---------- Acciones ----------
const acciones = {
  'abrir-ficha': el => ir('#/fichas/' + el.dataset.id),
  'abrir-orden': el => ir('#/ordenes/' + el.dataset.id),
  'orden-desde-ficha': el => crearOrden(el.dataset.id, C.ficha(state, el.dataset.id).rendimiento),
  'crear-orden': () => {
    const cant = Number(document.getElementById('nueva-cant').value);
    if (!(cant > 0)) return toast('Escribe una cantidad mayor que cero.');
    crearOrden(document.getElementById('nueva-ficha').value, cant);
  },
  'usar-sustituto': el => { const o = orden(el.dataset.id); C.aplicarSustituto(state, o, el.dataset.item); if (o.estado === 'pendiente') o.estado = 'planeada'; guardarYRender('Sustituto aplicado a la orden.'); },
  reducir: el => { const o = orden(el.dataset.id); C.cambiarCantidad(state, o, Number(el.dataset.max)); if (o.estado === 'pendiente') o.estado = 'planeada'; guardarYRender('Cantidad ajustada.'); },
  pendiente: el => { const o = orden(el.dataset.id); o.estado = 'pendiente'; o.eventos.push('Orden dejada pendiente de material.'); guardarYRender('Orden pendiente de material.'); },
  reactivar: el => { const o = orden(el.dataset.id); o.estado = 'planeada'; o.eventos.push('Orden reactivada: material disponible.'); guardarYRender('Orden reactivada.'); },
  anular: el => { try { C.anularOrden(orden(el.dataset.id)); guardarYRender('Orden anulada.'); } catch (e) { toast(e.message); } },
  consumir: el => {
    const o = orden(el.dataset.id); const cant = {};
    o.lineas.forEach(l => { const v = document.getElementById('cons-' + l.itemId); if (v) cant[l.itemId] = Number(v.value); });
    try { const v = C.registrarConsumo(state, o, cant); guardarYRender(`Consumo registrado: ${$(v)} a producción en proceso.`); } catch (e) { toast(e.message); }
  },
  cerrar: el => {
    const o = orden(el.dataset.id); const und = Number(document.getElementById('cierre-und').value);
    if (!(und >= 0)) return toast('Escribe las unidades buenas.');
    const horas = {}; Object.keys(o.horasStd).forEach(r => { horas[r] = Number(document.getElementById('cierre-h-' + r).value); });
    const c = C.cerrarOrden(state, o, und, horas); guardarYRender(`Orden cerrada: ${und} unidades a ${$(c.unitarioEntrada)} c/u.`);
  },
  'guardar-precio': el => { it(el.dataset.id).precio = Number(document.getElementById('precio').value); guardarYRender('Precio actualizado.'); },
  'inv-tab': el => { ui.invTab = el.dataset.tab; render(); },
  'agregar-gasto': () => { state.config.cif.gastos.push({ nombre: 'Nuevo gasto', valor: 0, tipo: 'Fijo' }); guardarYRender(); },
  'quitar-gasto': el => { state.config.cif.gastos.splice(Number(el.dataset.k), 1); guardarYRender(); },
  'ver-factor': () => { ui.verFactor = !ui.verFactor; render(); },
  reiniciar: () => {
    if (!ui.confirmarReinicio) { ui.confirmarReinicio = true; render(); setTimeout(() => { ui.confirmarReinicio = false; render(); }, 4000); return; }
    ui.confirmarReinicio = false; state = datosIniciales(); ui.ia = null; guardar(); ir('#/inicio'); render(); toast('Datos del demo reiniciados.');
  },
  'ia-ejemplo': () => { ui.iaTexto = document.getElementById('ia-texto').placeholder; render(); },
  'ia-interpretar': interpretarIA,
  'ia-descartar': () => { ui.ia = null; render(); },
  'ia-guardar': guardarFichaIA,
};

const cambios = {
  costo: el => { it(el.dataset.id).costo = Number(el.value); guardarYRender('Costo actualizado.'); },
  kardex: el => { ui.kardexItem = el.value; render(); },
  gasto: el => { const g = state.config.cif.gastos[Number(el.dataset.k)]; g[el.dataset.campo] = el.dataset.campo === 'valor' ? Number(el.value) : el.value; guardarYRender(); },
  base: el => { state.config.cif.base = el.value; guardarYRender(); },
  capacidad: el => { state.config.cif.capacidad = Number(el.value); guardarYRender(); },
  valoracion: el => { state.config.valoracion = el.value; guardarYRender('Valoración actualizada.'); },
  umbral: el => { state.config.umbralAlerta = Number(el.value) / 100; guardarYRender(); },
  mod: el => { const campo = el.dataset.campo; const v = Number(el.value); state.config.mod[campo] = ['factor', 'eficiencia'].includes(campo) ? v / 100 : v; guardarYRender(); },
  rol: el => { const r = state.config.mod.roles[Number(el.dataset.k)]; const v = el.value === '' ? null : Number(el.value); r[el.dataset.campo] = v; guardarYRender(); },
  cuenta: el => { state.config.cuentas[el.dataset.k] = el.value; guardarYRender(); },
  'ia-map': el => { leerIA(); ui.ia.insumos[Number(el.dataset.k)].itemId = el.value || null; render(); },
  'ia-rol': el => { leerIA(); ui.ia.tiempos[Number(el.dataset.k)].rolId = el.value || null; render(); },
};

const orden = id => state.ordenes.find(o => o.id === id);
function guardarYRender(msg) { guardar(); render(); if (msg) toast(msg); }
function crearOrden(fichaId, cantidad) {
  const o = C.nuevaOrden(state, fichaId, cantidad); state.ordenes.push(o); guardar(); ir('#/ordenes/' + o.id);
}

// ---------- IA ----------
async function interpretarIA() {
  const texto = document.getElementById('ia-texto').value.trim();
  ui.iaTexto = texto; ui.iaError = '';
  if (texto.length < 10) { ui.iaError = 'Escribe la receta o usa el ejemplo.'; return render(); }
  ui.iaCargando = true; render();
  try {
    const r = await fetch('/api/ia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto,
        inventario: state.items.filter(i => i.tipo !== 'PT').map(i => ({ id: i.id, nombre: i.nombre, unidad: i.unidad })),
        roles: state.config.mod.roles.map(x => ({ id: x.id, nombre: x.nombre })),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
    const f = data.ficha;
    f.insumos = (f.insumos || []).map(i => ({ ...i, itemId: state.items.some(x => x.id === i.itemId) ? i.itemId : null }));
    f.tiempos = (f.tiempos || []).map(t => ({ ...t, rolId: state.config.mod.roles.some(x => x.id === t.rolId) ? t.rolId : null }));
    f.modelo = data.modelo;
    ui.ia = f;
  } catch (e) {
    ui.iaError = e.message === 'Failed to fetch' ? 'No hay conexión con el servicio de IA.' : e.message;
  }
  ui.iaCargando = false; render();
}

function leerIA() {
  const r = ui.ia; const v = id => document.getElementById(id)?.value;
  r.producto.nombre = v('ia-nombre'); r.producto.pesoG = Number(v('ia-peso')); r.producto.unidadVenta = v('ia-unidad');
  r.rendimiento = Number(v('ia-rend')); r.precio = Number(v('ia-precio')) || null;
  r.insumos.forEach((ins, k) => { ins.cantidad = Number(v('ia-cant-' + k)); if (!ins.itemId) ins.costo = Number(v('ia-costo-' + k)) || null; });
  r.tiempos.forEach((t, k) => { t.minutosPorUnidad = Number(v('ia-min-' + k)); });
}

function guardarFichaIA() {
  leerIA(); const r = ui.ia;
  if (!r.producto.nombre || !(r.producto.pesoG > 0) || !(r.rendimiento > 0)) return toast('Completa el producto, el peso y el rendimiento.');
  const nuevos = r.insumos.filter(i => !i.itemId);
  if (nuevos.some(i => !(i.costo > 0))) return toast('Escribe el costo de los insumos nuevos.');
  if (r.tiempos.some(t => !t.rolId)) return toast('Asigna un rol a cada tiempo.');
  const base = r.producto.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + Date.now().toString(36);
  const insumos = r.insumos.map((ins, k) => {
    let id = ins.itemId;
    if (!id) {
      const unidad = ins.unidad === 'g' ? 'kg' : ins.unidad === 'ml' ? 'L' : 'und';
      id = `nuevo-${k}-${base}`;
      state.items.push({ id, nombre: ins.nombre, tipo: unidad === 'und' ? 'EMP' : 'MP', unidad, stock: 0, costo: ins.costo });
    }
    return { itemId: id, cant: ins.cantidad };
  });
  const prodId = 'pt-' + base;
  state.items.push({ id: prodId, nombre: r.producto.nombre, tipo: 'PT', unidad: r.producto.unidadVenta || 'unidad', stock: 0, costo: 0, pesoG: r.producto.pesoG, precio: r.precio || 0 });
  const f = { id: 'f-' + base, productoId: prodId, rendimiento: r.rendimiento, linea: 'Creada con IA', insumos, tiempos: r.tiempos.map(t => ({ rolId: t.rolId, min: t.minutosPorUnidad })) };
  state.fichas.push(f);
  if (!r.precio) { const c = C.costoEstandar(state, f).unidad.total; state.items.find(i => i.id === prodId).precio = Math.round(c / 0.65); }
  ui.ia = null; ui.iaTexto = '';
  guardar(); ir('#/fichas/' + f.id); toast('Ficha técnica creada. Los insumos nuevos quedan con existencia 0.');
}

// ---------- Eventos ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || !acciones[el.dataset.action]) return;
  if (el.tagName === 'TR' && e.target.closest('a')) return;
  e.preventDefault();
  acciones[el.dataset.action](el);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && cambios[el.dataset.change]) cambios[el.dataset.change](el);
});

render();
