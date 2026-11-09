# Manufactura integrada al inventario · Dulce Medida S.A.S.

Primera versión de una experiencia de manufactura para el módulo de inventario de una solución de gestión para pymes (escenario SYNTHEX). Permite que una pyme que compra materia prima y la transforma pase su producción del Excel al sistema y conozca el costo real de lo que fabrica: **MP + MOD + CIF**.

**Demo:** https://costeo-manufactura-dulce-medida.vercel.app · **Autora:** Dina Luz Muñoz Huaitoto · Construido con Claude; la función inteligente del demo usa Gemini.

---

## 1. El problema y el usuario

Muchas pymes que transforman insumos (alimentos, cosméticos, talleres) llevan la producción en hojas de cálculo o cuadernos: no saben cuánto les cuesta realmente su producto, el inventario no refleja lo que se consume y los reemplazos de materiales se hacen "a ojo".

- **Usuario:** pyme que compra materia prima y la transforma con una ficha técnica, consumiendo mano de obra directa (MOD) y costos indirectos de fabricación (CIF).
- **Caso de demostración:** Dulce Medida S.A.S., empresa **ficticia** de alimentos y dulces dietéticos con 30 trabajadores. Cuatro productos con procesos distintos: mermelada (conservas), panelita de leche (dulces de leche), gelatina en polvo (mezclas) y galletas (galletería).
- **Enfoque:** un núcleo genérico que sirve para cualquier industria que transforme insumos, demostrado con un caso concreto del sector alimentos.

## 2. Qué incluye la primera versión y por qué

Regla de decisión: entra en la fase 1 todo lo que la pyme necesita para **pasar su producción al sistema y saber cuánto le cuesta su producto**.

| Bloque | Qué hace |
| --- | --- |
| Ficha técnica | Insumos por lote (en g, ml o und), rendimiento, peso, minutos por unidad de cada rol y sustituto aprobado por insumo. Muestra el costo estándar y el margen. |
| Orden de producción | Carga la ficha escalada a la cantidad, verifica el inventario y ofrece opciones si falta material. Estados: planeada, pendiente de material, en proceso, cerrada y anulada. |
| Faltantes y sustitutos | Si falta un insumo: usar el sustituto aprobado, reducir la cantidad o dejar pendiente. Si el sustituto consume 3 % o más en cantidad o valor, alerta antes de confirmar. |
| Consumo | La materia prima sale del inventario al registrar el consumo y su valor se acumula en producción en proceso. |
| Cierre | Unidades buenas reales y horas reales por rol. El costo unitario se recalcula sobre las unidades buenas. Variaciones de cantidad de MP y de eficiencia de MOD por rol. |
| Inventario | El producto terminado entra en su unidad de venta, valorado a costo promedio ponderado. Kárdex de movimientos. |
| Contabilidad | Asientos de consumo, aplicación de MOD y CIF, y cierre, con cuentas del PUC configurables. |
| IA | Crear la ficha técnica desde una descripción en lenguaje natural. |

**Qué queda para la fase 2** (porque agrega complejidad y primero hay que validar la base): lotes y vencimientos para trazabilidad (primera prioridad en alimentos), variación de precio de MP y variación de volumen de CIF, otros métodos de asignación de CIF, tarifa de MOD por persona o centro de trabajo, inventario comprometido entre órdenes, historial de versiones de la ficha, fichas de varios niveles, flujo de aprobación de sustitutos por calidad con ajuste de la etiqueta nutricional, cálculo automático de la eficiencia real y permisos por usuario.

## 3. Decisiones de costeo

### CIF: tarifa por kilogramo producido
- La pyme sí conoce sus CIF aunque no los llame así: el sistema le pide sus gastos de planta con sus palabras (arriendo, energía, gas, supervisor, calidad, mantenimiento…).
- **Tarifa = CIF presupuestados del mes ÷ capacidad normal** (NIC 2, párrafo 13). Caso: $68.300.000 ÷ 8.800 kg = **$7.761 por kg**.
- **Por qué peso y no minutos:** en la experiencia de la autora, una empresa del sector distribuía los CIF por minutos y algunos productos perdían competitividad frente al mercado. El peso es un dato que toda pyme conoce y refleja el volumen que procesa la planta. Una sola base por empresa (peso o unidades).
- **Por qué no MP ni MOD como base:** los CIF se moverían con el precio del proveedor, la TRM o el salario mínimo, y no con su comportamiento real.
- Solo son CIF los costos de planta: la bodega de producto terminado es gasto de ventas y la administración es gasto operacional.
- **Costo estándar anual:** la tarifa se mantiene durante el año; el usuario puede actualizarla y las órdenes cerradas conservan su costo.

### MOD: tarifa por rol
**Tarifa por hora = costo total mensual del rol ÷ horas productivas al mes.**
- Costo total = salario × (1 + 38,35 % de factor prestacional) + auxilio de transporte × (1 + 17,67 %). Supuesto: empresa exonerada de salud, SENA e ICBF.
- Horas disponibles: (42 h × 52 − 18 festivos × 7 h − 15 días de vacaciones × 7 h) ÷ 12 = 162,75 h/mes (Ley 2101 de 2021: 42 horas semanales desde julio de 2026).
- Eficiencia operativa del 75 %: en alimentos, una planta bien gestionada alcanza cerca del 75 % de OEE por limpiezas, alérgenos y validaciones. El OEE mide equipos y no personas, pero refleja las mismas restricciones. Horas productivas: 122,1 al mes.
- No se usan las 210 horas de nómina (42 × 5): incluyen domingos y festivos pagados no trabajados y subcostearían la mano de obra.
- El factor prestacional es sugerido y editable; el usuario también puede escribir su tarifa directamente.

### Valoración del producto terminado
Por defecto, **costo real**: MP real consumida + horas reales × tarifa + kilos reales × tarifa de CIF (el CIF real solo se conoce al cierre del mes). La empresa puede configurar **costo estándar**.

## 4. Contabilidad de costos

| Momento | Débito | Crédito |
| --- | --- | --- |
| Consumo de materia prima y empaque | 1410 Productos en proceso | 1405 Materias primas / 1460 Envases y empaques |
| Aplicación de la MOD | 1410 Productos en proceso | 72 Mano de obra directa |
| Aplicación del CIF | 1410 Productos en proceso | 73 Costos indirectos |
| Cierre de la orden | 1430 Productos terminados | 1410 Productos en proceso |
| Venta (módulo existente) | 6120 Costo de ventas | 1430 Productos terminados |

## 5. Precio y margen
Margen bruto objetivo de 35 % o más, ajustado con benchmarking de precios de competidores (precio de fábrica de referencia = precio en tienda ÷ 1,19 ÷ 1,30). Precio = costo ÷ (1 − margen).

| Producto | Costo estándar | Margen | Precio sin IVA |
| --- | --- | --- | --- |
| Mermelada de fresa 250 g | $7.716 | 35 % | $11.871 |
| Panelita de leche con coco 120 g | $5.186 | 35 % | $7.978 |
| Gelatina de fresa 100 g | $6.040 | 50 % | $12.080 |
| Galleta de mantequilla 100 g | $3.540 | 40 % | $5.900 |

## 6. Supuestos
1. La compra de materia prima ya existe en el módulo de inventario; el demo arranca con inventario inicial y su costo.
2. Valoración del inventario a costo promedio ponderado.
3. Ficha técnica de un solo nivel (insumos → producto terminado).
4. Recetas genéricas de referencia; tiempos estándar de referencia del sector; salarios como múltiplos del salario mínimo 2026 ($1.750.905). Precios de fresa, harina, huevo y leche en polvo tomados de SIPSA y Corabastos 2026; los demás son estimados.
5. Empresa y datos ficticios, ajustados para no exponer información de empresas reales.
6. El demo guarda los datos en el navegador de cada visitante (botón "Reiniciar datos del demo"); en el producto real vivirían en la base de datos del sistema.

## 7. La IA en la experiencia
**Para qué:** muchas pymes tienen la receta "en la cabeza". El usuario la describe con sus palabras (por ejemplo: "un lote rinde 80 frascos, uso 21 kilos de mora…") y la IA:
- convierte unidades (kilos, litros, horas por lote) a la unidad de la ficha,
- asocia cada insumo con el inventario existente o lo marca como nuevo,
- pasa los tiempos a minutos por unidad y los asocia a los roles,
- declara los supuestos que hizo.

El usuario revisa y corrige antes de guardar: **la IA propone, la persona decide.**

**Cómo:** función serverless `api/ia.js` que llama a Gemini con salida estructurada (esquema JSON). La clave vive como variable de entorno en Vercel, nunca en el código.

**Construcción:** el demo se diseñó y construyó con Claude (diseño de producto, cálculos y código). Se eligió Gemini para la función dentro del demo por su nivel gratuito de API.

**Elección del modelo, con datos:** se probó primero el modelo más reciente (gemini-3.8-flash): en tres pruebas tardó entre 30 y 53 segundos y falló dos veces por alta demanda. Con gemini-2.5-flash y el razonamiento reducido, tres pruebas tardaron 12, 11 y 18 segundos (promedio 13,7 s) sin errores y con la misma interpretación. Criterio: 15 segundos o menos en promedio. Para la tarea (convertir unidades y asociar insumos) no se necesita el modelo más potente.

**Contingencia:** cada llamada tiene un tiempo máximo de espera; si el modelo está saturado o no responde, el sistema reintenta y pasa a un modelo de respaldo, con mensajes de error en español.

## 8. Recorrido sugerido del demo
1. **Configuración de costos:** tarifas de MOD por rol y de CIF por kilo, con su cálculo.
2. **Ficha de la mermelada:** insumos, tiempos, sustitutos y costo estándar.
3. **Orden de 100 frascos de mermelada:** falta sucralosa; elegir el sustituto (stevia) y ver la alerta de impacto.
4. **Registrar el consumo y cerrar** con las unidades buenas y las horas reales: costo real, variaciones, entrada al inventario y asientos.
5. **Crear una ficha con IA** a partir del texto de ejemplo.

## 9. Aspectos técnicos
- HTML, CSS y JavaScript sin dependencias (`index.html`, `styles.css`, `js/`), más una función serverless en Node (`api/ia.js`).
- `js/core.js`: lógica de costeo (tarifas, explosión de materiales, sustitutos, consumo, cierre, variaciones y asientos).
- `js/data.js`: datos semilla del caso.
- `js/app.js`: interfaz y navegación.

**Despliegue en Vercel:** importar el repositorio y agregar la variable de entorno `GEMINI_API_KEY` y `GEMINI_MODEL` (en el demo: `gemini-2.5-flash`; si no se define, se usa `gemini-flash-latest`).
