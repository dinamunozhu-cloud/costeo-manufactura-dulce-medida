// Función serverless (Vercel): convierte la descripción libre de una receta
// en una ficha técnica estructurada, usando Gemini.
// Requiere la variable de entorno GEMINI_API_KEY (y opcionalmente GEMINI_MODEL).

const MODELO = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const RESPALDO = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const esperar = ms => new Promise(r => setTimeout(r, ms));

const esquema = {
  type: 'OBJECT',
  properties: {
    producto: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        pesoG: { type: 'NUMBER', description: 'Peso neto de una unidad de venta en gramos' },
        unidadVenta: { type: 'STRING', description: 'frasco, paquete, bolsa, unidad...' },
      },
      required: ['nombre', 'pesoG', 'unidadVenta'],
    },
    rendimiento: { type: 'NUMBER', description: 'Unidades de venta que produce un lote' },
    insumos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          itemId: { type: 'STRING', nullable: true, description: 'id del inventario si existe; null si es nuevo' },
          nombre: { type: 'STRING' },
          cantidad: { type: 'NUMBER', description: 'Cantidad por lote en la unidad de consumo' },
          unidad: { type: 'STRING', enum: ['g', 'ml', 'und'] },
        },
        required: ['nombre', 'cantidad', 'unidad'],
      },
    },
    tiempos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rolId: { type: 'STRING', nullable: true },
          minutosPorUnidad: { type: 'NUMBER' },
        },
        required: ['minutosPorUnidad'],
      },
    },
    supuestos: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['producto', 'rendimiento', 'insumos', 'tiempos', 'supuestos'],
};

function instrucciones(texto, inventario, roles) {
  return `Eres un analista de costos de una pyme manufacturera de alimentos en Colombia.
Convierte la descripción del usuario en una ficha técnica estructurada.

Reglas:
- Expresa cada insumo por LOTE en unidad de consumo: gramos (g) para sólidos, mililitros (ml) para líquidos, unidades (und) para envases, empaques y etiquetas. Convierte kilos, litros o libras.
- Si el usuario indica la cantidad por unidad de producto, multiplícala por el rendimiento del lote.
- Asocia cada insumo con el id del inventario existente cuando sea el mismo material; si no existe, usa itemId null.
- Expresa el tiempo de cada rol en MINUTOS POR UNIDAD de producto. Si el usuario da horas por lote, divide entre el rendimiento.
- Asocia cada tiempo al id del rol existente que corresponda; si no corresponde a ninguno, usa rolId null.
- No inventes insumos, cantidades ni tiempos que el usuario no mencionó. Si falta un dato necesario (por ejemplo el peso o el rendimiento), haz una estimación razonable y escríbela en "supuestos".
- Responde en español.

Inventario existente (id | nombre | unidad de inventario):
${inventario.map(i => `${i.id} | ${i.nombre} | ${i.unidad}`).join('\n')}

Roles de mano de obra directa (id | nombre):
${roles.map(r => `${r.id} | ${r.nombre}`).join('\n')}

Descripción del usuario:
"""${texto}"""`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Falta configurar la clave GEMINI_API_KEY en el servidor.' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { texto = '', inventario = [], roles = [] } = body;
    if (texto.trim().length < 10) {
      res.status(400).json({ error: 'Describe la receta con un poco más de detalle.' });
      return;
    }
    const peticion = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: instrucciones(texto, inventario, roles) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: esquema,
      },
    });
    // Si el modelo principal está saturado (503/429) o no existe (404), se reintenta
    // y luego se prueba con modelos de respaldo.
    const modelos = [...new Set([MODELO, ...RESPALDO])];
    let ultimoError = 'La IA no respondió correctamente.';
    for (const modelo of modelos) {
      for (let intento = 0; intento < 2; intento++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: peticion,
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          const salida = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          res.status(200).json({ ficha: JSON.parse(salida), modelo });
          return;
        }
        ultimoError = data?.error?.message || ultimoError;
        if (r.status === 503 || r.status === 429) {
          ultimoError = 'El servicio de IA está con alta demanda en este momento. Intenta de nuevo en unos segundos.';
          if (intento === 0) { await esperar(1500); continue; }
          break; // pasa al siguiente modelo
        }
        if (r.status === 404) break; // modelo no disponible: siguiente
        res.status(502).json({ error: ultimoError });
        return;
      }
    }
    res.status(503).json({ error: ultimoError });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo interpretar la respuesta de la IA: ' + e.message });
  }
}
