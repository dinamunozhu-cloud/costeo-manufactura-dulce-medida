// Núcleo de cálculo: tarifas, costeo, explosión de materiales, órdenes y asientos.

export const redondear = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

// ---------- Unidades ----------
// La ficha expresa el consumo en unidad de consumo (g, ml, und);
// el inventario en su unidad (kg, L, und).
export const unidadConsumo = u => (u === 'kg' ? 'g' : u === 'L' ? 'ml' : u);
export const factorConversion = u => (u === 'kg' || u === 'L' ? 1000 : 1);
export const aInventario = (cantConsumo, unidadInv) => cantConsumo / factorConversion(unidadInv);

// ---------- Mano de obra directa ----------
export function horasDisponiblesMes(mod) {
  const horasDia = mod.jornada / 6; // jornada semanal repartida en 6 días
  const anual = mod.jornada * 52 - mod.festivos * horasDia - mod.vacaciones * horasDia;
  return anual / 12;
}
export const horasProductivasMes = mod => horasDisponiblesMes(mod) * mod.eficiencia;

export function costoMensualRol(rol, mod) {
  const recibeAuxilio = rol.salario <= 2 * mod.smmlv;
  const auxilio = recibeAuxilio ? mod.auxilio * (1 + mod.factorAux) : 0;
  return rol.salario * (1 + mod.factor) + auxilio;
}

export function tarifaRol(rol, mod) {
  if (rol.tarifaManual) return Number(rol.tarifaManual);
  return costoMensualRol(rol, mod) / horasProductivasMes(mod);
}

export function tarifasMOD(config) {
  const t = {};
  for (const r of config.mod.roles) t[r.id] = tarifaRol(r, config.mod);
  return t;
}

// ---------- CIF ----------
export const totalCIF = cif => cif.gastos.reduce((s, g) => s + Number(g.valor || 0), 0);
export const tarifaCIF = cif => totalCIF(cif) / Number(cif.capacidad || 1);

// Base de asignación de una cantidad de producto terminado (kg o unidades)
export function baseCIF(producto, unidades, cif) {
  return cif.base === 'kg' ? (unidades * producto.pesoG) / 1000 : unidades;
}

// ---------- Fichas técnicas ----------
export const item = (state, id) => state.items.find(i => i.id === id);
export const ficha = (state, id) => state.fichas.find(f => f.id === id);
export const fichaDeProducto = (state, productoId) => state.fichas.find(f => f.productoId === productoId);

export function costoEstandar(state, f) {
  const prod = item(state, f.productoId);
  const tMod = tarifasMOD(state.config);
  const mp = f.insumos.reduce((s, ins) => {
    const it = item(state, ins.itemId);
    return s + aInventario(ins.cant, it.unidad) * it.costo;
  }, 0);
  const horas = {};
  let mod = 0;
  for (const t of f.tiempos) {
    const h = (t.min * f.rendimiento) / 60;
    horas[t.rolId] = h;
    mod += h * (tMod[t.rolId] || 0);
  }
  const cif = baseCIF(prod, f.rendimiento, state.config.cif) * tarifaCIF(state.config.cif);
  const total = mp + mod + cif;
  const u = f.rendimiento;
  return {
    lote: { mp, mod, cif, total },
    unidad: { mp: mp / u, mod: mod / u, cif: cif / u, total: total / u },
    horas,
  };
}

export function margen(precio, costoUnit) {
  return precio > 0 ? 1 - costoUnit / precio : 0;
}

// ---------- Órdenes de producción ----------
export const ESTADOS = {
  planeada: 'Planeada',
  pendiente: 'Pendiente de material',
  proceso: 'En proceso',
  cerrada: 'Cerrada',
  anulada: 'Anulada',
};

// Explosión de materiales: requerimiento estándar de cada insumo en unidad de inventario
export function explosion(state, f, cantidad) {
  const escala = cantidad / f.rendimiento;
  return f.insumos.map(ins => {
    const it = item(state, ins.itemId);
    const requerido = aInventario(ins.cant * escala, it.unidad);
    return {
      itemId: ins.itemId,
      requerido,
      disponible: it.stock,
      faltante: Math.max(0, requerido - it.stock),
      sustituto: ins.sustituto || null,
    };
  });
}

// Cantidad máxima producible con el inventario actual (múltiplos de unidad)
export function maximoProducible(state, f) {
  let max = Infinity;
  for (const ins of f.insumos) {
    const it = item(state, ins.itemId);
    const porUnidad = aInventario(ins.cant / f.rendimiento, it.unidad);
    max = Math.min(max, Math.floor((it.stock + 1e-9) / porUnidad));
  }
  return Number.isFinite(max) ? max : 0;
}

// Impacto de usar un sustituto frente al insumo original
export function impactoSustituto(state, linea, umbral) {
  const orig = item(state, linea.itemId);
  const sus = item(state, linea.sustituto.itemId);
  const cantSus = linea.requerido * linea.sustituto.factor;
  const valorOrig = linea.requerido * orig.costo;
  const valorSus = cantSus * sus.costo;
  // Cantidad comparada en la misma unidad de inventario cuando aplica
  const varCantidad = orig.unidad === sus.unidad ? cantSus / linea.requerido - 1 : null;
  const varValor = valorSus / valorOrig - 1;
  const alerta = varValor >= umbral || (varCantidad !== null && varCantidad >= umbral);
  return {
    original: orig, sustituto: sus, cantOriginal: linea.requerido, cantSustituto: cantSus,
    valorOriginal: valorOrig, valorSustituto: valorSus, varCantidad, varValor,
    alerta, disponible: sus.stock >= cantSus - 1e-9,
  };
}

export function nuevaOrden(state, fichaId, cantidad) {
  const f = ficha(state, fichaId);
  const numero = 'OP-' + String(state.consecutivo++).padStart(3, '0');
  const lineas = explosion(state, f, cantidad).map(l => ({
    itemId: l.itemId,
    itemOriginal: null,
    estandar: l.requerido,
    real: l.requerido,
    consumido: 0,
    valorConsumido: 0,
    sustituto: l.sustituto,
  }));
  const escala = cantidad / f.rendimiento;
  const horasStd = {};
  for (const t of f.tiempos) horasStd[t.rolId] = (t.min * f.rendimiento * escala) / 60;
  const orden = {
    id: numero, numero, fichaId, productoId: f.productoId, cantidad,
    estado: 'planeada', fecha: new Date().toISOString().slice(0, 10),
    lineas, horasStd, horasReales: { ...horasStd }, eventos: [],
  };
  return orden;
}

export function faltantesOrden(state, orden) {
  return orden.lineas
    .map(l => ({ ...l, requerido: l.estandar - l.consumido, it: item(state, l.itemId) }))
    .filter(l => l.it.stock + 1e-9 < l.requerido);
}

// Reemplaza una línea por su sustituto aprobado
export function aplicarSustituto(state, orden, itemId) {
  const l = orden.lineas.find(x => x.itemId === itemId);
  const factor = l.sustituto.factor;
  l.itemOriginal = l.itemId;
  l.itemId = l.sustituto.itemId;
  l.estandarOriginal = l.estandar;
  l.estandar = l.estandar * factor;
  l.real = l.estandar;
  l.factor = factor;
  l.sustituto = null;
  orden.eventos.push(`Se reemplazó ${item(state, l.itemOriginal).nombre} por ${item(state, l.itemId).nombre} (factor ${factor}).`);
}

export function cambiarCantidad(state, orden, cantidad) {
  const nueva = nuevaOrden({ ...state, consecutivo: 0 }, orden.fichaId, cantidad);
  orden.cantidad = cantidad;
  orden.lineas = nueva.lineas;
  orden.horasStd = nueva.horasStd;
  orden.horasReales = { ...nueva.horasStd };
  orden.eventos.push(`Se ajustó la cantidad a ${cantidad} unidades por falta de material.`);
}

const cuentaInventario = (state, it) => (it.tipo === 'EMP' ? state.config.cuentas.emp : state.config.cuentas.mp);

function registrarAsiento(state, orden, concepto, debito, credito, valor) {
  if (valor <= 0) return;
  state.asientos.push({ fecha: new Date().toISOString().slice(0, 10), orden: orden.numero, concepto, debito, credito, valor });
}

// Registra el consumo real de las líneas: sale del inventario y va a producción en proceso
export function registrarConsumo(state, orden, cantidades) {
  let total = 0;
  for (const l of orden.lineas) {
    const cant = Number(cantidades[l.itemId] ?? 0);
    if (!(cant > 0)) continue;
    const it = item(state, l.itemId);
    if (cant > it.stock + 1e-9) throw new Error(`No hay suficiente ${it.nombre}: disponible ${redondear(it.stock, 3)} ${it.unidad}.`);
    const valor = cant * it.costo;
    it.stock -= cant;
    l.consumido += cant;
    l.valorConsumido += valor;
    total += valor;
    state.movimientos.push({ fecha: new Date().toISOString().slice(0, 10), itemId: it.id, concepto: `Consumo ${orden.numero}`, cantidad: -cant, costoUnit: it.costo });
    registrarAsiento(state, orden, `Consumo de ${it.nombre}`, state.config.cuentas.proceso, cuentaInventario(state, it), valor);
  }
  if (orden.estado === 'planeada') orden.estado = 'proceso';
  return total;
}

// Cierra la orden con las unidades buenas y las horas reales por rol
export function cerrarOrden(state, orden, unidadesBuenas, horasReales) {
  const f = ficha(state, orden.fichaId);
  const prod = item(state, orden.productoId);
  const tMod = tarifasMOD(state.config);
  const tCif = tarifaCIF(state.config.cif);

  const mpReal = orden.lineas.reduce((s, l) => s + l.valorConsumido, 0);
  let modReal = 0;
  const detalleMod = [];
  for (const rolId of Object.keys(orden.horasStd)) {
    const hReal = Number(horasReales[rolId] || 0);
    const valor = hReal * tMod[rolId];
    modReal += valor;
    // Horas estándar permitidas para las unidades buenas producidas
    const hStdPermitidas = (orden.horasStd[rolId] / orden.cantidad) * unidadesBuenas;
    detalleMod.push({
      rolId, horasReales: hReal, horasStd: hStdPermitidas, tarifa: tMod[rolId], valor,
      variacion: (hReal - hStdPermitidas) * tMod[rolId],
    });
  }
  const base = baseCIF(prod, unidadesBuenas, state.config.cif);
  const cifAplicado = base * tCif;

  // Variación de cantidad de MP: real vs estándar permitido para las unidades buenas
  const variacionesMP = orden.lineas.map(l => {
    const it = item(state, l.itemId);
    const stdPermitido = (l.estandar / orden.cantidad) * unidadesBuenas;
    return {
      itemId: l.itemId, real: l.consumido, estandar: stdPermitido, unidad: it.unidad,
      variacion: (l.consumido - stdPermitido) * it.costo,
      pct: stdPermitido > 0 ? l.consumido / stdPermitido - 1 : 0,
    };
  });

  const std = costoEstandar(state, f).unidad;
  const totalReal = mpReal + modReal + cifAplicado;
  const unitarioReal = unidadesBuenas > 0 ? totalReal / unidadesBuenas : 0;
  const unitarioEntrada = state.config.valoracion === 'estandar' ? std.total : unitarioReal;
  const valorEntrada = unitarioEntrada * unidadesBuenas;

  // Asientos de aplicación y cierre
  const c = state.config.cuentas;
  registrarAsiento(state, orden, 'Aplicación de mano de obra directa (horas reales × tarifa)', c.proceso, c.mod, modReal);
  registrarAsiento(state, orden, `Aplicación de CIF (${String(redondear(base, 2)).replace('.', ',')} ${state.config.cif.base} × tarifa)`, c.proceso, c.cif, cifAplicado);
  registrarAsiento(state, orden, `Cierre: entrada de ${unidadesBuenas} ${prod.unidad}(s) de ${prod.nombre}`, c.pt, c.proceso, valorEntrada);
  if (state.config.valoracion === 'estandar' && Math.abs(totalReal - valorEntrada) > 0.5) {
    const dif = totalReal - valorEntrada;
    registrarAsiento(state, orden, 'Variación entre costo real y estándar', dif > 0 ? 'Variaciones de costo' : c.proceso, dif > 0 ? c.proceso : 'Variaciones de costo', Math.abs(dif));
  }

  // Entrada del producto terminado al inventario (costo promedio ponderado)
  const valorPrevio = prod.stock * prod.costo;
  prod.stock += unidadesBuenas;
  prod.costo = prod.stock > 0 ? (valorPrevio + valorEntrada) / prod.stock : 0;
  state.movimientos.push({ fecha: new Date().toISOString().slice(0, 10), itemId: prod.id, concepto: `Entrada ${orden.numero}`, cantidad: unidadesBuenas, costoUnit: unitarioEntrada });

  orden.estado = 'cerrada';
  orden.horasReales = horasReales;
  orden.cierre = {
    unidadesBuenas, base, tarifaCIF: tCif, mpReal, modReal, cifAplicado, totalReal,
    unitarioReal, unitarioEstandar: std.total, unitarioEntrada, valoracion: state.config.valoracion,
    detalleMod, variacionesMP, merma: orden.cantidad - unidadesBuenas,
  };
  return orden.cierre;
}

export function anularOrden(orden) {
  if (orden.lineas.some(l => l.consumido > 0)) throw new Error('No se puede anular: la orden ya tiene consumos registrados.');
  orden.estado = 'anulada';
}
