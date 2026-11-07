// Datos semilla de Dulce Medida S.A.S. (empresa ficticia).
// Todos los valores son supuestos de referencia documentados en el README.

export const SMMLV_2026 = 1750905;
export const AUX_TRANSPORTE_2026 = 249095;

const mp = (id, nombre, unidad, stock, costo, grupo = 'MP') =>
  ({ id, nombre, tipo: grupo, unidad, stock, costo });

export function datosIniciales() {
  const items = [
    // Materias primas (unidad de inventario: kg o L)
    mp('fresa', 'Fresa', 'kg', 120, 11750),
    mp('pectina', 'Pectina de bajo metoxilo', 'kg', 2, 95000),
    mp('sucralosa', 'Sucralosa', 'kg', 0.01, 450000),
    mp('stevia', 'Stevia', 'kg', 1, 250000),
    mp('acido', 'Ácido cítrico', 'kg', 8, 12000),
    mp('sorbato', 'Sorbato de potasio', 'kg', 0.5, 28000),
    mp('lactato', 'Lactato de calcio', 'kg', 0.5, 30000),
    mp('leche', 'Leche entera pasteurizada', 'L', 80, 3400),
    mp('lechepolvo', 'Leche en polvo', 'kg', 15, 25673),
    mp('maltitol', 'Maltitol', 'kg', 20, 28000),
    mp('eritritol', 'Eritritol', 'kg', 10, 30000),
    mp('coco', 'Coco rallado', 'kg', 8, 22000),
    mp('bicarbonato', 'Bicarbonato de sodio', 'kg', 0.5, 6000),
    mp('gelatina', 'Gelatina sin sabor', 'kg', 30, 48000),
    mp('maltodextrina', 'Maltodextrina', 'kg', 6, 9000),
    mp('citrato', 'Citrato de sodio', 'kg', 2, 14000),
    mp('saborfresa', 'Saborizante de fresa', 'kg', 1, 80000),
    mp('colorante', 'Colorante rojo artificial', 'kg', 0.3, 60000),
    mp('colorantenat', 'Colorante natural de remolacha', 'kg', 0.5, 45000),
    mp('harina', 'Harina de trigo', 'kg', 50, 2400),
    mp('mantequilla', 'Mantequilla', 'kg', 15, 30000),
    mp('huevo', 'Huevo', 'kg', 6, 8558),
    mp('polvohornear', 'Polvo de hornear', 'kg', 0.5, 15000),
    mp('vainilla', 'Esencia de vainilla', 'kg', 0.5, 40000),
    mp('sal', 'Sal', 'kg', 1, 2000),
    // Envases y empaques (unidad de inventario: und)
    mp('frasco', 'Frasco de vidrio 250 g con tapa', 'und', 400, 1300, 'EMP'),
    mp('etfrasco', 'Etiqueta adhesiva para frasco', 'und', 400, 180, 'EMP'),
    mp('bolsatransp', 'Bolsa transparente panelita', 'und', 300, 150, 'EMP'),
    mp('etbolsa', 'Etiqueta para bolsa', 'und', 300, 120, 'EMP'),
    mp('bolsaherm', 'Bolsa impresa con cierre hermético', 'und', 400, 380, 'EMP'),
    mp('bolsamet', 'Bolsa impresa metalizada', 'und', 400, 320, 'EMP'),
    // Productos terminados (unidad de venta)
    { id: 'pt-mermelada', nombre: 'Mermelada de fresa dietética 250 g', tipo: 'PT', unidad: 'frasco', stock: 0, costo: 0, pesoG: 250, precio: 11871 },
    { id: 'pt-panelita', nombre: 'Panelita de leche con coco 120 g', tipo: 'PT', unidad: 'paquete', stock: 0, costo: 0, pesoG: 120, precio: 7978 },
    { id: 'pt-gelatina', nombre: 'Gelatina de fresa dietética 100 g', tipo: 'PT', unidad: 'bolsa', stock: 0, costo: 0, pesoG: 100, precio: 12080 },
    { id: 'pt-galleta', nombre: 'Galleta de mantequilla 100 g', tipo: 'PT', unidad: 'paquete', stock: 0, costo: 0, pesoG: 100, precio: 5900 },
  ];

  // Cantidades de la ficha en unidad de consumo por lote: g (kg), ml (L), und (und).
  const fichas = [
    {
      id: 'f-mermelada', productoId: 'pt-mermelada', rendimiento: 100, linea: 'Conservas',
      insumos: [
        { itemId: 'fresa', cant: 27000 },
        { itemId: 'pectina', cant: 350 },
        { itemId: 'sucralosa', cant: 15, sustituto: { itemId: 'stevia', factor: 2 } },
        { itemId: 'acido', cant: 60 },
        { itemId: 'sorbato', cant: 25 },
        { itemId: 'lactato', cant: 50 },
        { itemId: 'frasco', cant: 100 },
        { itemId: 'etfrasco', cant: 100 },
      ],
      tiempos: [{ rolId: 'conservas', min: 1.2 }, { rolId: 'empaque', min: 0.51 }],
    },
    {
      id: 'f-panelita', productoId: 'pt-panelita', rendimiento: 60, linea: 'Dulces de leche',
      insumos: [
        { itemId: 'leche', cant: 15000, sustituto: { itemId: 'lechepolvo', factor: 0.13 } },
        { itemId: 'maltitol', cant: 2500 },
        { itemId: 'coco', cant: 1200 },
        { itemId: 'lechepolvo', cant: 800 },
        { itemId: 'bicarbonato', cant: 10 },
        { itemId: 'bolsatransp', cant: 60 },
        { itemId: 'etbolsa', cant: 60 },
      ],
      tiempos: [{ rolId: 'dulces', min: 2.2 }, { rolId: 'empaque', min: 0.7 }],
    },
    {
      id: 'f-gelatina', productoId: 'pt-gelatina', rendimiento: 100, linea: 'Mezclas',
      insumos: [
        { itemId: 'gelatina', cant: 7070 },
        { itemId: 'maltodextrina', cant: 1210 },
        { itemId: 'acido', cant: 1010 },
        { itemId: 'citrato', cant: 400 },
        { itemId: 'saborfresa', cant: 250 },
        { itemId: 'sucralosa', cant: 100, sustituto: { itemId: 'stevia', factor: 2 } },
        { itemId: 'colorante', cant: 50, sustituto: { itemId: 'colorantenat', factor: 2 } },
        { itemId: 'bolsaherm', cant: 100 },
      ],
      tiempos: [{ rolId: 'mezclas', min: 0.78 }, { rolId: 'empaque', min: 0.6 }],
    },
    {
      id: 'f-galleta', productoId: 'pt-galleta', rendimiento: 100, linea: 'Galletería',
      insumos: [
        { itemId: 'harina', cant: 5500 },
        { itemId: 'mantequilla', cant: 3000 },
        { itemId: 'maltitol', cant: 1300, sustituto: { itemId: 'eritritol', factor: 1.3 } },
        { itemId: 'huevo', cant: 1000 },
        { itemId: 'polvohornear', cant: 50 },
        { itemId: 'vainilla', cant: 50 },
        { itemId: 'sal', cant: 30 },
        { itemId: 'bolsamet', cant: 100 },
      ],
      tiempos: [{ rolId: 'galleteria', min: 1.68 }, { rolId: 'empaque', min: 0.54 }],
    },
  ];

  const config = {
    empresa: 'Dulce Medida S.A.S.',
    valoracion: 'real', // 'real' (costeo normal) o 'estandar'
    umbralAlerta: 0.03,
    cif: {
      base: 'kg',
      capacidad: 8800,
      gastos: [
        { nombre: 'Salarios del personal de planta (supervisor, calidad, mantenimiento, aseo)', valor: 24800000, tipo: 'Fijo' },
        { nombre: 'Arriendo de la bodega', valor: 15000000, tipo: 'Fijo' },
        { nombre: 'Mantenimiento de maquinaria', valor: 8000000, tipo: 'Fijo' },
        { nombre: 'Energía', valor: 4500000, tipo: 'Variable' },
        { nombre: 'Depreciación de maquinaria', valor: 4000000, tipo: 'Fijo' },
        { nombre: 'Acueducto', valor: 3500000, tipo: 'Variable' },
        { nombre: 'Gas', valor: 3000000, tipo: 'Variable' },
        { nombre: 'Aseo, fumigación e implementos de planta', valor: 3000000, tipo: 'Fijo' },
        { nombre: 'Análisis de laboratorio', valor: 2500000, tipo: 'Fijo' },
      ],
    },
    mod: {
      smmlv: SMMLV_2026,
      auxilio: AUX_TRANSPORTE_2026,
      factor: 0.3835,
      factorAux: 0.1767,
      jornada: 42,
      festivos: 18,
      vacaciones: 15,
      eficiencia: 0.75,
      roles: [
        { id: 'conservas', nombre: 'Operario de conservas', salario: 2014000, personas: 4, tarifaManual: null },
        { id: 'dulces', nombre: 'Operario de dulces de leche', salario: 2014000, personas: 4, tarifaManual: null },
        { id: 'mezclas', nombre: 'Operario de mezclas', salario: 1838000, personas: 3, tarifaManual: null },
        { id: 'galleteria', nombre: 'Operario de galletería', salario: 2101000, personas: 4, tarifaManual: null },
        { id: 'empaque', nombre: 'Operario de empaque', salario: SMMLV_2026, personas: 3, tarifaManual: null },
      ],
    },
    cuentas: {
      mp: '1405 Materias primas',
      emp: '1460 Envases y empaques',
      proceso: '1410 Productos en proceso',
      pt: '1430 Productos terminados',
      mod: '72 Mano de obra directa',
      cif: '73 Costos indirectos de fabricación',
      costoVentas: '6120 Costo de ventas - industria manufacturera',
    },
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const movimientos = items
    .filter(i => i.stock > 0)
    .map(i => ({ fecha: hoy, itemId: i.id, concepto: 'Inventario inicial', cantidad: i.stock, costoUnit: i.costo }));

  return { items, fichas, config, ordenes: [], movimientos, asientos: [], consecutivo: 1 };
}
