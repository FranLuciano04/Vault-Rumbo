// Genera el contrato OpenAPI preliminar de Rumbo (PC1): 05-Diseño/API/openapi.json.
// Uso, desde la raíz del repo:  node "05-Diseño/API/generar-openapi.js" "05-Diseño/API/openapi.json"
// El JSON no se edita a mano: se cambia este archivo y se vuelve a generar. Ver la nota «Contrato de la API (OpenAPI)».
const fs = require('fs');

const TODOS = ['admin', 'dueno', 'empleado', 'freelance'];
const INTERNOS = ['admin', 'dueno', 'empleado'];
const GESTION = ['admin', 'dueno'];

// ---------------------------------------------------------------------------
// Esquemas
// ---------------------------------------------------------------------------
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const uuid = (d, nullable) => ({ type: nullable ? ['string', 'null'] : 'string', format: 'uuid', ...(d && { description: d }) });
const str = (d, extra = {}) => ({ type: 'string', ...(d && { description: d }), ...extra });
const strN = (d, extra = {}) => ({ type: ['string', 'null'], ...(d && { description: d }), ...extra });
const fecha = (d, nullable) => ({ type: nullable ? ['string', 'null'] : 'string', format: 'date', ...(d && { description: d }) });
const dec = (d, nullable) => ({
  type: nullable ? ['string', 'null'] : 'string', format: 'decimal', pattern: '^\\d+(\\.\\d{1,4})?$',
  ...(d && { description: d }), examples: ['1000000.00'],
});
const int = (d, extra = {}) => ({ type: 'integer', ...(d && { description: d }), ...extra });
const bool = (d) => ({ type: 'boolean', ...(d && { description: d }) });
const ro = (s) => ({ ...s, readOnly: true });
const en = (vals, d) => ({ type: 'string', enum: vals, ...(d && { description: d }) });
const nullableRef = (n) => ({ oneOf: [ref(n), { type: 'null' }] });
const obj = (props, required = [], d) => ({
  type: 'object', ...(d && { description: d }), properties: props, ...(required.length && { required }),
});

const enums = {
  Moneda: en(['ARS', 'USD']),
  SegmentoCliente: en(['familia', 'amigos', 'individual', 'pareja']),
  CanalOportunidad: en(['instagram', 'whatsapp', 'presencial']),
  EstadoOportunidad: en(['nueva', 'en_gestion', 'cotizada', 'ganada', 'perdida']),
  MotivoPerdida: en(['precio', 'fechas_disponibilidad', 'desistio', 'otra_agencia', 'sin_respuesta', 'otro']),
  EstadoCotizacion: en(['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida']),
  CategoriaViaje: en(['grupal', 'individual']),
  EstadoViaje: en(['reservado', 'vendido', 'confirmado', 'en_curso', 'finalizado', 'cancelado']),
  TipoComision: en(['importe', 'porcentaje'], 'El porcentaje se aplica sobre la ganancia (DEC-0007).'),
  TipoPago: en(['sena', 'cuota', 'saldo']),
  EstadoPago: en(['pendiente', 'pagado', 'vencido', 'anulado']),
  FormaPago: en(['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'deposito'],
    'Las billeteras virtuales se registran como transferencia.'),
  TipoAlerta: en(['pago', 'formulario', 'salida', 'insistencia', 'resena', 'manual', 'recontacto', 'viaje']),
  EstadoAlerta: en(['pendiente', 'vista', 'resuelta']),
  RolUsuario: en(['admin', 'empleado', 'dueno', 'freelance']),
};

const auditoria = obj({
  created_by: ro(uuid('Usuario que creó el registro; vacío si lo hizo el proceso automático.', true)),
  updated_by: ro(uuid('Usuario que lo modificó por última vez; vacío si fue el proceso automático.', true)),
  created_at: ro({ type: 'string', format: 'date-time' }),
  updated_at: ro({ type: 'string', format: 'date-time' }),
}, [], 'Columnas de auditoría (DEC-0008). Las completa el servidor.');
const conAuditoria = (s) => ({ allOf: [s, ref('Auditoria')] });

const schemas = {
  ...enums,
  Auditoria: auditoria,
  Problema: obj({
    type: str('URI que identifica el tipo de error.', { format: 'uri-reference' }),
    title: str('Resumen legible del error.'),
    status: int('Código HTTP.'),
    detail: str('Explicación para esta ocurrencia.'),
    errores: {
      type: 'array', description: 'Detalle por campo, en los errores de validación.',
      items: obj({ campo: str(), mensaje: str() }, ['campo', 'mensaje']),
    },
  }, ['title', 'status'], 'Error con el formato application/problem+json (RFC 9457).'),
  SinDetallar: {
    type: 'object', additionalProperties: true,
    description: 'Esquema preliminar: se detalla en PC2, cuando FastAPI genere el contrato de referencia desde los esquemas Pydantic.',
  },

  // Seguridad (CU-24)
  Login: obj({ email: str(null, { format: 'email' }), password: str(null, { format: 'password' }) }, ['email', 'password']),
  Token: obj({
    access_token: str('Token firmado por core.seguridad (DEC-0008).'),
    token_type: str(null, { const: 'bearer' }),
    usuario: obj({ id: uuid(), nombre: str(), rol: ref('RolUsuario'), acceso_redes: bool() }, ['id', 'nombre', 'rol', 'acceso_redes']),
  }, ['access_token', 'token_type', 'usuario']),

  // Cliente (CU-02, CU-03)
  Cliente: conAuditoria(obj({
    id: ro(uuid()),
    asesor_asignado_id: uuid('Asesor asignado; define «mis clientes». Si lo crea un freelance, es él mismo.', true),
    nombre: str(null, { maxLength: 120 }),
    contacto: str('WhatsApp, Instagram o email.', { maxLength: 200 }),
    segmento: ref('SegmentoCliente'),
    etiquetas: { type: 'array', items: str(), description: 'Segmentación comercial libre.' },
    preferencias: strN(),
    no_recontactar: bool('Opt-out del CRM proactivo (CU-30).'),
  }, ['id', 'nombre', 'contacto', 'segmento', 'etiquetas', 'no_recontactar'])),
  ClienteCrear: obj({
    nombre: str(null, { maxLength: 120 }), contacto: str(null, { maxLength: 200 }), segmento: ref('SegmentoCliente'),
    etiquetas: { type: 'array', items: str() }, preferencias: strN(), asesor_asignado_id: uuid(null, true),
  }, ['nombre', 'contacto', 'segmento']),
  ClienteEditar: obj({
    nombre: str(null, { maxLength: 120 }), contacto: str(null, { maxLength: 200 }), segmento: ref('SegmentoCliente'),
    etiquetas: { type: 'array', items: str() }, preferencias: strN(), asesor_asignado_id: uuid(null, true),
    no_recontactar: bool(),
  }, [], 'Solo se envían los campos que cambian.'),

  // Oportunidad (CU-04, CU-05)
  Oportunidad: conAuditoria(obj({
    id: ro(uuid()),
    cliente_id: uuid(),
    responsable_id: uuid('Quien la registró o la sigue; define la vista personal (DEC-0005).'),
    canal: ref('CanalOportunidad'),
    destino_consultado: str('Texto libre; se normaliza a un Destino al confirmar la reserva (DEC-0006).'),
    fecha_desde_tentativa: fecha(null, true),
    fecha_hasta_tentativa: fecha(null, true),
    pasajeros: int(null, { minimum: 1 }),
    estado: ro(ref('EstadoOportunidad')),
    motivo_perdida: ro(nullableRef('MotivoPerdida')),
    motivo_perdida_detalle: ro(strN('Texto libre si el motivo es «otro».')),
    notas: strN('Notas de la consulta y del seguimiento.'),
  }, ['id', 'cliente_id', 'responsable_id', 'canal', 'destino_consultado', 'pasajeros', 'estado'])),
  OportunidadCrear: obj({
    cliente_id: uuid(), canal: ref('CanalOportunidad'), destino_consultado: str(),
    fecha_desde_tentativa: fecha(null, true), fecha_hasta_tentativa: fecha(null, true),
    pasajeros: int(null, { minimum: 1 }), notas: strN(),
  }, ['cliente_id', 'canal', 'destino_consultado', 'pasajeros'], 'El responsable es el usuario que la registra.'),
  OportunidadEditar: obj({
    canal: ref('CanalOportunidad'), destino_consultado: str(),
    fecha_desde_tentativa: fecha(null, true), fecha_hasta_tentativa: fecha(null, true),
    pasajeros: int(null, { minimum: 1 }), notas: strN(),
    responsable_id: uuid('Reasignar el responsable: solo admin o dueño.'),
  }, [], 'Solo se envían los campos que cambian.'),
  OportunidadPerder: obj({
    motivo_perdida: ref('MotivoPerdida'),
    motivo_perdida_detalle: strN('Obligatorio si el motivo es «otro».'),
  }, ['motivo_perdida']),
  Insistencia: obj({ fecha: fecha('Cuándo volver a contactar.'), descripcion: str() }, ['fecha', 'descripcion']),

  // Cotización (CU-06)
  ItemCotizacion: obj({ concepto: str('Aéreo, alojamiento, traslados, excursiones…'), precio: dec() }, ['concepto', 'precio']),
  Cotizacion: conAuditoria(obj({
    id: ro(uuid()),
    oportunidad_id: ro(uuid()),
    fecha: ro(fecha('Fecha de emisión.')),
    moneda: ref('Moneda'),
    items: { type: 'array', minItems: 1, items: ref('ItemCotizacion') },
    total: ro(dec('Suma de los ítems; la calcula el servidor.')),
    validez_hasta: ro(fecha('Fecha de emisión más la vigencia configurada (1 mes por defecto).')),
    estado: ro(ref('EstadoCotizacion')),
  }, ['id', 'oportunidad_id', 'fecha', 'moneda', 'items', 'total', 'validez_hasta', 'estado'])),
  CotizacionCrear: obj({
    moneda: ref('Moneda'),
    items: { type: 'array', minItems: 1, items: ref('ItemCotizacion') },
  }, ['moneda', 'items'], 'Cada envío crea una versión nueva; las anteriores quedan en el historial (CU-06 A1).'),

  // Viaje (CU-07, CU-08, CU-10, CU-27)
  Viaje: conAuditoria(obj({
    id: ro(uuid()),
    cliente_id: ro(uuid()),
    oportunidad_id: ro(uuid('Oportunidad de origen.', true)),
    destino_id: uuid(),
    operador_id: uuid(null, true),
    responsable_id: uuid(),
    vendedor_id: uuid(null, true),
    fecha_salida: fecha(),
    fecha_regreso: fecha(),
    categoria: ref('CategoriaViaje'),
    estado: ro(ref('EstadoViaje')),
    estado_previo: ro(nullableRef('EstadoViaje')),
    motivo_cancelacion: ro(strN()),
    fecha_cancelacion: ro(fecha(null, true)),
    moneda: ro(ref('Moneda')),
    precio_venta: dec(),
    costo: dec('Costo del operador.'),
    ganancia: ro(dec('precio_venta − costo.')),
    margen: ro(dec('ganancia / precio_venta, como fracción (0.25 = 25 %).', true)),
    comision_tipo: ref('TipoComision'),
    comision_vendedor: dec('Importe, o porcentaje sobre la ganancia, según comision_tipo.'),
    saldo_pendiente: ro(dec('Suma de los pagos no cobrados, en la moneda del viaje. Lo calcula la API (CU-12).')),
    porcentaje_pagado: ro(dec('Porción del precio de venta ya cobrada. Lo calcula la API (CU-12).')),
  }, ['id', 'cliente_id', 'destino_id', 'responsable_id', 'fecha_salida', 'fecha_regreso', 'categoria', 'estado',
    'moneda', 'precio_venta', 'costo', 'ganancia', 'comision_tipo', 'comision_vendedor', 'saldo_pendiente', 'porcentaje_pagado'])),
  EconomiaViaje: obj({
    precio_venta: dec(), costo: dec(), operador_id: uuid(null, true), vendedor_id: uuid(null, true),
    comision_tipo: ref('TipoComision'),
    comision_vendedor: dec('Si se omite, se toma el valor por defecto del vendedor (CU-13).'),
  }, ['precio_venta', 'costo'], 'Control económico del viaje (CU-10).'),
  PagoPlanItem: obj({ monto: dec('En la moneda del viaje.'), tipo: ref('TipoPago'), vencimiento: fecha() }, ['monto', 'tipo', 'vencimiento']),
  PlanDePagos: obj({
    pagos: { type: 'array', minItems: 1, items: ref('PagoPlanItem') },
  }, ['pagos'], 'La suma de los montos tiene que ser igual al precio de venta del viaje (CU-11).'),
  ConfirmarReserva: obj({
    destino_id: uuid('Del catálogo de destinos.'),
    fecha_salida: fecha(), fecha_regreso: fecha(),
    categoria: ref('CategoriaViaje'),
    responsable_id: uuid('Por defecto, el responsable de la oportunidad.'),
    moneda: { ...ref('Moneda'), description: 'Se toma de la cotización aceptada; solo se envía en la venta directa (CU-07 A1).' },
    economia: ref('EconomiaViaje'),
    plan_de_pagos: ref('PlanDePagos'),
  }, ['destino_id', 'fecha_salida', 'fecha_regreso', 'categoria', 'economia', 'plan_de_pagos'],
  'Crea en una sola transacción el viaje en estado reservado, su economía, el plan de pagos y las alertas de formularios, salida y vencimientos, y cierra la oportunidad como ganada (CU-07, CU-10, CU-11).'),
  Cancelacion: obj({ motivo_cancelacion: str(), fecha_cancelacion: fecha() }, ['motivo_cancelacion', 'fecha_cancelacion']),

  // Pago (CU-11, CU-12)
  Pago: conAuditoria(obj({
    id: ro(uuid()),
    viaje_id: ro(uuid()),
    monto: dec('Planificado, en la moneda del viaje.'),
    tipo: ref('TipoPago'),
    vencimiento: fecha(),
    estado: ro(ref('EstadoPago')),
    forma_pago: ro(nullableRef('FormaPago')),
    moneda_pago: ro(nullableRef('Moneda')),
    tipo_cambio: ro(dec('Si la moneda del cobro difiere de la del viaje.', true)),
    monto_cobrado: ro(dec('Importe real recibido, en moneda_pago.', true)),
    fecha_cobro: ro(fecha('Fecha efectiva del cobro.', true)),
  }, ['id', 'viaje_id', 'monto', 'tipo', 'vencimiento', 'estado'])),
  CobroRegistrar: obj({
    fecha_cobro: fecha(),
    forma_pago: ref('FormaPago'),
    moneda_pago: ref('Moneda'),
    tipo_cambio: dec('Obligatorio si moneda_pago difiere de la moneda del viaje.', true),
  }, ['fecha_cobro', 'forma_pago', 'moneda_pago'], 'El servidor calcula monto_cobrado y actualiza el estado del viaje (CU-12 A0 y A2).'),
  PagoReprogramar: obj({ vencimiento: fecha() }, ['vencimiento']),
  PagoDividir: obj({
    monto_ahora: dec('Parte que se va a cobrar ahora; el resto queda en un pago nuevo.'),
    vencimiento_resto: fecha('Vencimiento del pago con el resto.'),
  }, ['monto_ahora', 'vencimiento_resto']),

  // Alerta (CU-14, CU-28, CU-30)
  Alerta: conAuditoria(obj({
    id: ro(uuid()),
    propietario_id: ro(uuid('Dueño de la agenda donde aparece.')),
    viaje_id: ro(uuid('Origen.', true)),
    pago_id: ro(uuid('Origen.', true)),
    oportunidad_id: ro(uuid('Origen.', true)),
    cliente_id: ro(uuid('Origen.', true)),
    viaje_hotel_id: ro(uuid('Origen: tramo del itinerario (pago al proveedor).', true)),
    tipo: ro(ref('TipoAlerta')),
    descripcion: str(),
    fecha: fecha('Cuándo dispara.'),
    estado: ro(ref('EstadoAlerta')),
    resuelta_en: ro({ type: ['string', 'null'], format: 'date-time', description: 'Cuándo se resolvió; vacío si no está resuelta.' }),
    cerrada_por_cancelacion: ro(bool()),
  }, ['id', 'propietario_id', 'tipo', 'descripcion', 'fecha', 'estado', 'cerrada_por_cancelacion'],
  'A lo sumo uno de los cinco orígenes tiene valor; ninguno en un recordatorio manual suelto.')),
  AlertaCrear: obj({
    fecha: fecha(), descripcion: str(),
    viaje_id: uuid(null, true), cliente_id: uuid(null, true), oportunidad_id: uuid(null, true),
  }, ['fecha', 'descripcion'], 'Recordatorio manual (CU-28). Como máximo se asocia a una entidad.'),
  AlertaEditar: obj({ fecha: fecha(), descripcion: str() }, [], 'Solo mientras está pendiente (CU-28 A2).'),
  ProgresoDelDia: obj({
    resueltas_hoy: int('Alertas del propietario resueltas hoy, a mano o solas.', { minimum: 0 }),
    total_del_dia: int('Resueltas hoy más las vigentes (pendientes hasta hoy). Las pospuestas no cuentan.', { minimum: 0 }),
  }, ['resueltas_hoy', 'total_del_dia'], 'Progreso del día de la agenda (CU-14, RF-155).'),
  AlertaPosponer: obj({ fecha: fecha('Nueva fecha, posterior a la actual.') }, ['fecha']),
};

// Página genérica de resultados
const pagina = (items) => obj({
  items: { type: 'array', items },
  total: int('Cantidad total de resultados.'),
  pagina: int(null, { minimum: 1 }),
  por_pagina: int(null, { minimum: 1, maximum: 100 }),
}, ['items', 'total', 'pagina', 'por_pagina']);

// ---------------------------------------------------------------------------
// Parámetros y respuestas comunes
// ---------------------------------------------------------------------------
const parameters = {
  pagina: { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  por_pagina: { name: 'por_pagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  desde: { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Inicio del período.' },
  hasta: { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fin del período.' },
  mios: { name: 'mios', in: 'query', schema: { type: 'boolean', default: false }, description: 'Solo los registros propios (vista personal, DEC-0005).' },
};
const responses = {
  NoAutenticado: 'Falta el token o no es válido.',
  SinPermiso: 'El rol del usuario no alcanza para esta operación, o no es el responsable del registro.',
  NoEncontrado: 'No existe, o el usuario no lo puede ver (un freelance recibe 404 por lo ajeno).',
  Invalido: 'Los datos no pasan la validación.',
};
const respComponents = Object.fromEntries(Object.entries(responses).map(([k, d]) => [k, {
  description: d, content: { 'application/problem+json': { schema: ref('Problema') } },
}]));

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------
// Cada fila: [método, ruta, tag, operationId, resumen, CU, roles, respuesta OK, cuerpo, opciones]
// respuesta OK: [código, esquema | null, descripción] ; opciones: { q: [params], c409, propiedad, publico, e502, desc, tipoContenido }
const L = (n) => pagina(ref(n));
const SD = ref('SinDetallar');
const LSD = pagina(SD);
const P = (...names) => names.map((n) => ({ $ref: `#/components/parameters/${n}` }));
const q = (name, schema, description) => ({ name, in: 'query', schema, ...(description && { description }) });
const PAG = P('pagina', 'por_pagina');

const ops = [
  // ------------------------------------------------------------ seguridad
  ['post', '/auth/login', 'seguridad', 'iniciarSesion', 'Iniciar sesión', ['CU-24'], [], [200, ref('Token'), 'Sesión iniciada.'], ref('Login'),
    { publico: true, c401: 'Email o contraseña incorrectos, o usuario dado de baja (CU-24 A1).' }],
  ['post', '/auth/logout', 'seguridad', 'cerrarSesion', 'Cerrar sesión', ['CU-24'], TODOS, [204, null, 'Sesión cerrada.'], null, {}],
  ['get', '/auth/yo', 'seguridad', 'obtenerUsuarioActual', 'Usuario de la sesión, con su rol y accesos', ['CU-24'], TODOS, [200, SD, 'Usuario actual.'], null, {}],
  ['get', '/usuarios', 'seguridad', 'listarUsuarios', 'Listar usuarios', ['CU-25'], GESTION, [200, LSD, 'Usuarios.'], null, { q: [...PAG, q('activo', { type: 'boolean' })] }],
  ['post', '/usuarios', 'seguridad', 'crearUsuario', 'Dar de alta un usuario', ['CU-25'], GESTION, [201, SD, 'Usuario creado.'], SD, { c409: 'Ya existe un usuario con ese email (CU-25 A1).' }],
  ['get', '/usuarios/{usuario_id}', 'seguridad', 'obtenerUsuario', 'Ver un usuario', ['CU-25'], GESTION, [200, SD, 'Usuario.'], null, {}],
  ['patch', '/usuarios/{usuario_id}', 'seguridad', 'editarUsuario', 'Editar rol o accesos de un usuario', ['CU-25'], GESTION, [200, SD, 'Usuario actualizado.'], SD, { c409: 'No se puede quitar el rol admin al último administrador (CU-25 A4).' }],
  ['post', '/usuarios/{usuario_id}/baja', 'seguridad', 'darDeBajaUsuario', 'Dar de baja un usuario (baja lógica)', ['CU-25'], GESTION, [200, SD, 'Usuario inactivo.'], null, { c409: 'No se puede dar de baja al último administrador (CU-25 A4).' }],

  // ------------------------------------------------------------ configuracion
  ['get', '/configuracion', 'configuracion', 'obtenerConfiguracion', 'Ver los parámetros del negocio', ['CU-06', 'CU-07', 'CU-30'], GESTION, [200, SD, 'Vigencia de la cotización, anticipación de la alerta de salida y plazo del recontacto.'], null, {}],
  ['put', '/configuracion', 'configuracion', 'editarConfiguracion', 'Editar los parámetros del negocio', ['CU-06', 'CU-07', 'CU-30'], GESTION, [200, SD, 'Parámetros actualizados.'], SD, {}],
  ['put', '/usuarios/{usuario_id}/comision-por-defecto', 'configuracion', 'configurarComisionPorDefecto', 'Configurar la comisión por defecto de un vendedor', ['CU-13'], GESTION, [200, SD, 'Comisión por defecto actualizada. No recalcula viajes ya registrados.'], SD, {}],
  ['get', '/destinos', 'configuracion', 'listarDestinos', 'Listar destinos', ['CU-26'], TODOS, [200, LSD, 'Destinos.'], null, { q: [...PAG, q('activo', { type: 'boolean' }), q('buscar', { type: 'string' })] }],
  ['post', '/destinos', 'configuracion', 'crearDestino', 'Dar de alta un destino', ['CU-26'], GESTION, [201, SD, 'Destino creado.'], SD, { c409: 'Ya existe un destino con ese nombre (CU-26 A1).' }],
  ['get', '/destinos/{destino_id}', 'configuracion', 'obtenerDestino', 'Ver un destino', ['CU-26'], TODOS, [200, SD, 'Destino.'], null, {}],
  ['patch', '/destinos/{destino_id}', 'configuracion', 'editarDestino', 'Editar un destino', ['CU-26'], GESTION, [200, SD, 'Destino actualizado.'], SD, { c409: 'Ya existe un destino con ese nombre (CU-26 A1).' }],
  ['post', '/destinos/{destino_id}/baja', 'configuracion', 'darDeBajaDestino', 'Dar de baja un destino (baja lógica)', ['CU-26'], GESTION, [200, SD, 'Destino inactivo.'], null, {}],
  ['post', '/destinos/{destino_id}/reactivar', 'configuracion', 'reactivarDestino', 'Reactivar un destino', ['CU-26'], GESTION, [200, SD, 'Destino activo.'], null, {}],
  ['get', '/destinos/{destino_id}/requisitos', 'configuracion', 'listarRequisitosDestino', 'Listar los requisitos de un destino', ['CU-15'], TODOS, [200, LSD, 'Requisitos.'], null, { q: PAG }],
  ['post', '/destinos/{destino_id}/requisitos', 'configuracion', 'crearRequisitoDestino', 'Agregar un requisito a un destino', ['CU-15'], GESTION, [201, SD, 'Requisito creado.'], SD, {}],
  ['patch', '/requisitos-destino/{requisito_id}', 'configuracion', 'editarRequisitoDestino', 'Editar un requisito', ['CU-15'], GESTION, [200, SD, 'Requisito actualizado.'], SD, {}],
  ['post', '/requisitos-destino/{requisito_id}/baja', 'configuracion', 'darDeBajaRequisitoDestino', 'Quitar un requisito (baja lógica)', ['CU-15'], GESTION, [200, SD, 'Requisito inactivo.'], null, {}],
  ['get', '/operadores', 'configuracion', 'listarOperadores', 'Listar operadores', ['CU-31'], TODOS, [200, LSD, 'Operadores.'], null, { q: [...PAG, q('activo', { type: 'boolean' }), q('buscar', { type: 'string' })] }],
  ['post', '/operadores', 'configuracion', 'crearOperador', 'Dar de alta un operador', ['CU-31'], GESTION, [201, SD, 'Operador creado.'], SD, { c409: 'Ya existe un operador con ese nombre (CU-31 A1).' }],
  ['get', '/operadores/{operador_id}', 'configuracion', 'obtenerOperador', 'Ver un operador', ['CU-31'], TODOS, [200, SD, 'Operador.'], null, {}],
  ['patch', '/operadores/{operador_id}', 'configuracion', 'editarOperador', 'Editar un operador', ['CU-31'], GESTION, [200, SD, 'Operador actualizado.'], SD, { c409: 'Ya existe un operador con ese nombre (CU-31 A1).' }],
  ['post', '/operadores/{operador_id}/baja', 'configuracion', 'darDeBajaOperador', 'Dar de baja un operador (baja lógica)', ['CU-31'], GESTION, [200, SD, 'Operador inactivo.'], null, {}],
  ['post', '/operadores/{operador_id}/reactivar', 'configuracion', 'reactivarOperador', 'Reactivar un operador', ['CU-31'], GESTION, [200, SD, 'Operador activo.'], null, {}],

  // ------------------------------------------------------------ clientes
  ['get', '/clientes', 'clientes', 'listarClientes', 'Buscar clientes', ['CU-03'], TODOS, [200, L('Cliente'), 'Clientes.'], null,
    { q: [...PAG, ...P('mios'), q('buscar', { type: 'string' }, 'Nombre o contacto.'), q('segmento', ref('SegmentoCliente')), q('etiqueta', { type: 'string' })], freelance: true }],
  ['post', '/clientes', 'clientes', 'crearCliente', 'Registrar un cliente', ['CU-02'], TODOS, [201, ref('Cliente'), 'Cliente creado.'], ref('ClienteCrear'),
    { c409: 'Posible duplicado: ya hay un cliente con el mismo contacto; el detalle incluye su id para abrir la ficha existente (CU-02 A1).', freelance: true }],
  ['get', '/clientes/{cliente_id}', 'clientes', 'obtenerCliente', 'Ver la ficha de un cliente', ['CU-03'], TODOS, [200, ref('Cliente'), 'Ficha del cliente.'], null, { freelance: true }],
  ['patch', '/clientes/{cliente_id}', 'clientes', 'editarCliente', 'Editar la ficha de un cliente', ['CU-03', 'CU-30'], TODOS, [200, ref('Cliente'), 'Cliente actualizado. Marcar no_recontactar es el opt-out de CU-30 A1.'], ref('ClienteEditar'), { freelance: true }],
  ['get', '/clientes/{cliente_id}/historial', 'clientes', 'obtenerHistorialCliente', 'Historial del cliente: oportunidades, viajes y reseñas', ['CU-03'], TODOS, [200, SD, 'Historial.'], null, { freelance: true }],

  // ------------------------------------------------------------ oportunidades (incluye cotizaciones)
  ['get', '/oportunidades', 'oportunidades', 'listarOportunidades', 'Listar oportunidades (embudo)', ['CU-05'], TODOS, [200, L('Oportunidad'), 'Oportunidades.'], null,
    { q: [...PAG, ...P('mios'), q('estado', ref('EstadoOportunidad')), q('cliente_id', { type: 'string', format: 'uuid' })], freelance: true }],
  ['post', '/oportunidades', 'oportunidades', 'registrarConsulta', 'Registrar una consulta', ['CU-04', 'CU-30'], TODOS, [201, ref('Oportunidad'), 'Oportunidad creada en estado nueva. Si viene de un recontacto, el cliente sale de la lista de inactivos (CU-30 A2).'], ref('OportunidadCrear'), { freelance: true }],
  ['get', '/oportunidades/{oportunidad_id}', 'oportunidades', 'obtenerOportunidad', 'Ver una oportunidad', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad.'], null, { freelance: true }],
  ['patch', '/oportunidades/{oportunidad_id}', 'oportunidades', 'editarOportunidad', 'Editar una oportunidad o sus notas de seguimiento', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad actualizada.'], ref('OportunidadEditar'), { propiedad: true, freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/en-gestion', 'oportunidades', 'tomarOportunidad', 'Pasar la oportunidad a en gestión', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad en gestión.'], null, { propiedad: true, c409: 'La transición no es válida desde el estado actual (EST-Oportunidad).', freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/insistencias', 'oportunidades', 'agendarInsistencia', 'Agendar una insistencia', ['CU-05'], TODOS, [201, ref('Alerta'), 'Alerta de tipo insistencia creada.'], ref('Insistencia'), { propiedad: true, freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/perder', 'oportunidades', 'perderOportunidad', 'Cerrar la oportunidad como perdida', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad perdida.'], ref('OportunidadPerder'), { propiedad: true, c409: 'La oportunidad ya está cerrada.', freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/reactivar', 'oportunidades', 'reactivarOportunidad', 'Reactivar una oportunidad perdida', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad de nuevo en gestión.'], null, { propiedad: true, c409: 'Solo se reactiva una oportunidad perdida (CU-05 A3).', freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/ganar', 'oportunidades', 'ganarOportunidadSinCotizacion', 'Cerrar como ganada sin cotización formal (venta directa)', ['CU-05'], TODOS, [200, ref('Oportunidad'), 'Oportunidad ganada; sigue en confirmar reserva.'], null, { propiedad: true, c409: 'La transición no es válida desde el estado actual (CU-05 A4).', freelance: true }],
  ['get', '/oportunidades/{oportunidad_id}/cotizaciones', 'oportunidades', 'listarCotizaciones', 'Listar las cotizaciones (versiones) de una oportunidad', ['CU-06'], TODOS, [200, L('Cotizacion'), 'Cotizaciones.'], null, { q: PAG, freelance: true }],
  ['post', '/oportunidades/{oportunidad_id}/cotizaciones', 'oportunidades', 'emitirCotizacion', 'Emitir una cotización o una nueva versión', ['CU-06'], TODOS, [201, ref('Cotizacion'), 'Cotización en borrador, con total y vigencia calculados.'], ref('CotizacionCrear'), { propiedad: true, c409: 'La oportunidad está cerrada.', freelance: true }],
  ['get', '/cotizaciones/{cotizacion_id}', 'oportunidades', 'obtenerCotizacion', 'Ver una cotización', ['CU-06'], TODOS, [200, ref('Cotizacion'), 'Cotización.'], null, { freelance: true }],
  ['get', '/cotizaciones/{cotizacion_id}/documento', 'oportunidades', 'descargarCotizacion', 'Descargar el documento de la cotización', ['CU-06'], TODOS, [200, 'pdf', 'Documento para enviar al cliente.'], null, { freelance: true }],
  ['post', '/cotizaciones/{cotizacion_id}/enviar', 'oportunidades', 'marcarCotizacionEnviada', 'Marcar la cotización como enviada', ['CU-06'], TODOS, [200, ref('Cotizacion'), 'Cotización enviada; la oportunidad pasa a cotizada.'], null, { propiedad: true, c409: 'Solo se envía una cotización en borrador.', freelance: true }],
  ['post', '/cotizaciones/{cotizacion_id}/aceptar', 'oportunidades', 'aceptarCotizacion', 'Registrar que el cliente aceptó la cotización', ['CU-06'], TODOS, [200, ref('Cotizacion'), 'Cotización aceptada.'], null, { propiedad: true, c409: 'La cotización está vencida o ya no está enviada (CU-06 A5).', freelance: true }],
  ['post', '/cotizaciones/{cotizacion_id}/rechazar', 'oportunidades', 'rechazarCotizacion', 'Registrar que el cliente rechazó la cotización', ['CU-06'], TODOS, [200, ref('Cotizacion'), 'Cotización rechazada.'], null, { propiedad: true, c409: 'La cotización no está enviada.', freelance: true }],

  // ------------------------------------------------------------ viajes
  ['post', '/oportunidades/{oportunidad_id}/confirmar-reserva', 'viajes', 'confirmarReserva', 'Confirmar la reserva y crear el viaje', ['CU-07', 'CU-10', 'CU-11'], TODOS, [201, ref('Viaje'), 'Viaje creado en estado reservado.'], ref('ConfirmarReserva'),
    { propiedad: true, freelance: true, c409: 'La oportunidad está perdida o ya derivó en un viaje.', c422: 'Faltan destino o fechas (CU-07 A3), o la suma del plan de pagos no coincide con el precio de venta (CU-11 A1).' }],
  ['get', '/viajes', 'viajes', 'listarViajes', 'Listar viajes', ['CU-08'], TODOS, [200, L('Viaje'), 'Viajes.'], null,
    { q: [...PAG, ...P('mios', 'desde', 'hasta'), q('estado', ref('EstadoViaje')), q('cliente_id', { type: 'string', format: 'uuid' })], freelance: true }],
  ['get', '/viajes/{viaje_id}', 'viajes', 'obtenerViaje', 'Ver la ficha del viaje, con economía y saldo', ['CU-08', 'CU-10', 'CU-12'], TODOS, [200, ref('Viaje'), 'Viaje.'], null, { freelance: true }],
  ['post', '/viajes/{viaje_id}/iniciar', 'viajes', 'iniciarViaje', 'Pasar el viaje a en curso', ['CU-08'], TODOS, [200, ref('Viaje'), 'Viaje en curso.'], null, { propiedad: true, freelance: true, c409: 'La transición no es válida: la secuencia del viaje es estricta (EST-Viaje).' }],
  ['post', '/viajes/{viaje_id}/finalizar', 'viajes', 'finalizarViaje', 'Pasar el viaje a finalizado', ['CU-08'], TODOS, [200, ref('Viaje'), 'Viaje finalizado.'], null, { propiedad: true, freelance: true, c409: 'Solo se finaliza un viaje en curso.' }],
  ['post', '/viajes/{viaje_id}/corregir-estado', 'viajes', 'corregirEstadoViaje', 'Volver al estado anterior por un error de carga', ['CU-08'], TODOS, [200, ref('Viaje'), 'Viaje en el estado anterior.'], null, { propiedad: true, freelance: true, c409: 'No se corrige un viaje finalizado o cancelado, ni una transición automática (CU-08 A2).' }],
  ['post', '/viajes/{viaje_id}/cancelar', 'viajes', 'cancelarViaje', 'Cancelar el viaje', ['CU-27'], TODOS, [200, ref('Viaje'), 'Viaje cancelado: anula los pagos no cobrados y cierra sus alertas.'], ref('Cancelacion'), { propiedad: true, freelance: true, c409: 'No se cancela un viaje finalizado (CU-27 A1).' }],
  ['post', '/viajes/{viaje_id}/revertir-cancelacion', 'viajes', 'revertirCancelacion', 'Revertir la cancelación', ['CU-27'], TODOS, [200, ref('Viaje'), 'Viaje en el estado que tenía antes de cancelarse.'], null, { propiedad: true, freelance: true, c409: 'El viaje no está cancelado.' }],
  ['get', '/viajes/{viaje_id}/itinerario', 'viajes', 'obtenerItinerario', 'Ver el itinerario de hoteles', ['CU-09'], TODOS, [200, SD, 'Tramos en orden.'], null, { freelance: true }],
  ['post', '/viajes/{viaje_id}/itinerario', 'viajes', 'agregarTramo', 'Agregar un hotel al itinerario', ['CU-09'], TODOS, [201, SD, 'Tramo agregado; si tiene vencimiento de pago al proveedor, se agenda su alerta.'], SD, { propiedad: true, freelance: true, c409: 'Ya hay un tramo con ese orden en el viaje.' }],
  ['patch', '/tramos/{tramo_id}', 'viajes', 'editarTramo', 'Editar un tramo o marcar pagado al proveedor', ['CU-09'], TODOS, [200, SD, 'Tramo actualizado; su alerta se reagenda o se resuelve.'], SD, { propiedad: true, freelance: true, c409: 'Ya hay un tramo con ese orden en el viaje.' }],
  ['delete', '/tramos/{tramo_id}', 'viajes', 'quitarTramo', 'Quitar un hotel del itinerario', ['CU-09'], TODOS, [204, null, 'Tramo quitado; su alerta se cierra.'], null, { propiedad: true, freelance: true }],

  // ------------------------------------------------------------ economia
  ['put', '/viajes/{viaje_id}/economia', 'economia', 'registrarEconomia', 'Registrar la economía del viaje', ['CU-10'], TODOS, [200, ref('Viaje'), 'Economía actualizada; ganancia y margen recalculados.'], ref('EconomiaViaje'),
    { propiedad: true, freelance: true, c409: 'Cambió el precio de venta y el plan de pagos ya no suma lo mismo: hay que rebalancearlo (CU-10 A4, CU-11 A5).' }],
  ['get', '/viajes/{viaje_id}/pagos', 'economia', 'listarPagos', 'Ver el plan de pagos y su checklist', ['CU-11', 'CU-12'], TODOS, [200, { type: 'array', items: ref('Pago') }, 'Pagos del viaje en orden de vencimiento.'], null, { freelance: true }],
  ['put', '/viajes/{viaje_id}/pagos', 'economia', 'definirPlanDePagos', 'Definir o rebalancear el plan de pagos', ['CU-11'], TODOS, [200, { type: 'array', items: ref('Pago') }, 'Plan guardado; reemplaza los pagos pendientes y reagenda sus alertas.'], ref('PlanDePagos'),
    { propiedad: true, freelance: true, c422: 'La suma de los montos no coincide con el precio de venta (CU-11 A1).' }],
  ['patch', '/pagos/{pago_id}', 'economia', 'reprogramarPago', 'Reprogramar el vencimiento de un pago', ['CU-11'], TODOS, [200, ref('Pago'), 'Pago reprogramado; su alerta también.'], ref('PagoReprogramar'), { propiedad: true, freelance: true, c409: 'Solo se reprograma un pago pendiente o vencido.' }],
  ['post', '/pagos/{pago_id}/anular', 'economia', 'anularPago', 'Anular un pago (baja lógica)', ['CU-11'], TODOS, [200, ref('Pago'), 'Pago anulado.'], null, { propiedad: true, freelance: true, c409: 'No se anula un pago cobrado.' }],
  ['post', '/pagos/{pago_id}/dividir', 'economia', 'dividirPago', 'Dividir un pago para cobrar una parte', ['CU-11'], TODOS, [201, { type: 'array', items: ref('Pago'), minItems: 2, maxItems: 2 }, 'El pago original con el monto de ahora y el pago nuevo con el resto.'], ref('PagoDividir'),
    { propiedad: true, freelance: true, c409: 'Solo se divide un pago pendiente o vencido.', c422: 'El monto de ahora tiene que ser mayor que cero y menor que el del pago.' }],
  ['post', '/pagos/{pago_id}/cobrar', 'economia', 'registrarCobro', 'Registrar el cobro de un pago', ['CU-12'], TODOS, [200, ref('Pago'), 'Pago cobrado; se resuelve su alerta y, si corresponde, el viaje pasa a vendido o confirmado.'], ref('CobroRegistrar'),
    { propiedad: true, freelance: true, c409: 'El pago ya está cobrado o anulado.', c422: 'Falta el tipo de cambio porque la moneda del cobro difiere de la del viaje.' }],
  ['post', '/pagos/{pago_id}/revertir-cobro', 'economia', 'revertirCobro', 'Revertir un cobro cargado por error', ['CU-12'], TODOS, [200, ref('Pago'), 'Pago otra vez pendiente o vencido; el viaje vuelve atrás si corresponde (CU-12 A3).'], null, { propiedad: true, freelance: true, c409: 'El pago no está cobrado.' }],

  // ------------------------------------------------------------ alertas
  ['get', '/alertas', 'alertas', 'listarAlertas', 'Ver la agenda de alertas', ['CU-14', 'CU-30'], TODOS, [200, L('Alerta'), 'Alertas. Por defecto, las propias pendientes hasta hoy; con proximas=true, las pendientes con fecha posterior a hoy (CU-14 A5). Los recontactos de CU-30 son las de tipo recontacto.'], null,
    { q: [...PAG, ...P('hasta'), q('estado', ref('EstadoAlerta')), q('tipo', ref('TipoAlerta')), q('proximas', { type: 'boolean', default: false }, 'Solo las pendientes con fecha posterior a hoy, para adelantar trabajo (CU-14 A5).'), q('todas', { type: 'boolean', default: false }, 'Las de toda la agencia: solo admin y dueño (CU-14 A1).')] }],
  ['get', '/alertas/progreso-del-dia', 'alertas', 'verProgresoDelDia', 'Ver el progreso del día de la agenda', ['CU-14'], TODOS, [200, ref('ProgresoDelDia'), 'Resueltas hoy sobre el total del día, del usuario actual.'], null, {}],
  ['post', '/alertas', 'alertas', 'crearRecordatorio', 'Crear un recordatorio manual', ['CU-28'], TODOS, [201, ref('Alerta'), 'Alerta manual pendiente en la agenda propia.'], ref('AlertaCrear'), { c422: 'Se asoció a más de una entidad.' }],
  ['get', '/alertas/{alerta_id}', 'alertas', 'obtenerAlerta', 'Ver una alerta', ['CU-14'], TODOS, [200, ref('Alerta'), 'Alerta.'], null, {}],
  ['patch', '/alertas/{alerta_id}', 'alertas', 'editarRecordatorio', 'Editar fecha o descripción de un recordatorio', ['CU-28'], TODOS, [200, ref('Alerta'), 'Alerta actualizada.'], ref('AlertaEditar'), { propiedad: true, c409: 'Solo se edita una alerta pendiente.' }],
  ['post', '/alertas/{alerta_id}/vista', 'alertas', 'marcarAlertaVista', 'Marcar una alerta como vista', ['CU-14'], TODOS, [200, ref('Alerta'), 'Alerta vista.'], null, { propiedad: true, c409: 'La alerta ya está resuelta.' }],
  ['post', '/alertas/{alerta_id}/resolver', 'alertas', 'resolverAlerta', 'Resolver una alerta', ['CU-14'], TODOS, [200, ref('Alerta'), 'Alerta resuelta.'], null, { propiedad: true, c409: 'La alerta ya está resuelta.' }],
  ['post', '/alertas/{alerta_id}/posponer', 'alertas', 'posponerAlerta', 'Posponer una alerta', ['CU-14', 'CU-30'], TODOS, [200, ref('Alerta'), 'Alerta reprogramada.'], ref('AlertaPosponer'), { propiedad: true, c409: 'La alerta ya está resuelta.', c422: 'La nueva fecha tiene que ser posterior a la actual.' }],

  // ------------------------------------------------------------ hoteles
  ['get', '/hoteles', 'hoteles', 'buscarHoteles', 'Buscar y recomendar hoteles', ['CU-18'], TODOS, [200, LSD, 'Hoteles; con orden=valoracion, los mejor reseñados primero (CU-18 A2).'], null,
    { q: [...PAG, q('destino_id', { type: 'string', format: 'uuid' }), q('categoria', { type: 'string' }), q('precio_max', { type: 'string', format: 'decimal' }), q('servicio', { type: 'string' }), q('orden', { type: 'string', enum: ['nombre', 'valoracion', 'precio'] }), q('estado', { type: 'string', enum: ['activo', 'cerrado'] })] }],
  ['post', '/hoteles', 'hoteles', 'crearHotel', 'Dar de alta un hotel', ['CU-16'], INTERNOS, [201, SD, 'Hotel creado.'], SD, { c409: 'Posible duplicado en el mismo destino (CU-16 A2).' }],
  ['get', '/hoteles/{hotel_id}', 'hoteles', 'obtenerHotel', 'Ver un hotel', ['CU-18'], TODOS, [200, SD, 'Hotel.'], null, {}],
  ['patch', '/hoteles/{hotel_id}', 'hoteles', 'editarHotel', 'Editar un hotel', ['CU-16'], INTERNOS, [200, SD, 'Hotel actualizado.'], SD, {}],
  ['post', '/hoteles/{hotel_id}/baja', 'hoteles', 'cerrarHotel', 'Dar de baja un hotel que cerró', ['CU-16'], INTERNOS, [200, SD, 'Hotel cerrado.'], null, {}],
  ['get', '/hoteles/{hotel_id}/resenas', 'hoteles', 'listarResenas', 'Ver las reseñas de un hotel', ['CU-18'], TODOS, [200, LSD, 'Reseñas publicadas (admin y dueño pueden pedir también las ocultas).'], null, { q: PAG }],
  ['post', '/hoteles/{hotel_id}/resenas', 'hoteles', 'registrarResena', 'Registrar la reseña de un cliente', ['CU-17'], INTERNOS, [201, SD, 'Reseña publicada.'], SD, {}],
  ['post', '/resenas/{resena_id}/ocultar', 'hoteles', 'ocultarResena', 'Eliminar una reseña (baja lógica)', ['CU-29'], GESTION, [200, SD, 'Reseña oculta; deja de contar para la recomendación.'], SD, {}],
  ['post', '/resenas/{resena_id}/restaurar', 'hoteles', 'restaurarResena', 'Restaurar una reseña oculta', ['CU-29'], GESTION, [200, SD, 'Reseña publicada.'], null, {}],
  ['delete', '/resenas/{resena_id}', 'hoteles', 'eliminarResenaFisicamente', 'Eliminar una reseña físicamente (excepcional)', ['CU-29'], GESTION, [204, null, 'Reseña eliminada.'], null, { c409: 'No se puede eliminar sin romper la integridad referencial (CU-29 A2).' }],

  // ------------------------------------------------------------ redes
  ['get', '/contenidos', 'redes', 'listarContenidos', 'Ver el tablero y el calendario de contenido', ['CU-19'], INTERNOS, [200, LSD, 'Piezas de contenido.'], null,
    { q: [...PAG, ...P('desde', 'hasta'), q('estado_kanban', { type: 'string', enum: ['idea', 'en_produccion', 'listo', 'publicado', 'descartado'] }), q('canal', { type: 'string', enum: ['instagram', 'tiktok', 'whatsapp_ventas'] })], redes: true }],
  ['post', '/contenidos', 'redes', 'crearContenido', 'Crear una pieza de contenido', ['CU-19', 'CU-20'], INTERNOS, [201, SD, 'Pieza creada en la columna idea, o con el borrador elegido de la IA.'], SD, { redes: true }],
  ['get', '/contenidos/{contenido_id}', 'redes', 'obtenerContenido', 'Ver una pieza de contenido', ['CU-19'], INTERNOS, [200, SD, 'Pieza.'], null, { redes: true }],
  ['patch', '/contenidos/{contenido_id}', 'redes', 'editarContenido', 'Editar, reprogramar o mover una pieza en el tablero', ['CU-19', 'CU-20'], INTERNOS, [200, SD, 'Pieza actualizada.'], SD, { redes: true, c409: 'Transición no válida en el tablero (EST-ContenidoRed).' }],
  ['post', '/contenidos/{contenido_id}/descartar', 'redes', 'descartarContenido', 'Descartar una pieza (baja lógica)', ['CU-19'], INTERNOS, [200, SD, 'Pieza descartada.'], null, { redes: true, c409: 'No se descarta una pieza publicada.' }],
  ['post', '/contenidos/propuestas-ia', 'redes', 'generarPropuestaIA', 'Generar borradores de contenido con IA', ['CU-20'], INTERNOS, [200, SD, 'Uno o varios borradores de texto. No se guarda nada hasta que el empleado elige uno (CU-20 A2).'], SD,
    { redes: true, e502: 'La API de Claude no respondió o devolvió un error; el resto del sistema sigue funcionando (DEC-0012).',
      desc: 'Una sola llamada a Claude Sonnet 5.5 con el tema, el canal y el tono indicados; no envía datos del negocio (clientes, catálogo ni ventas).' }],

  // ------------------------------------------------------------ dashboard y calendario
  ['get', '/dashboard', 'dashboard', 'verDashboard', 'Ver indicadores y embudo de ventas', ['CU-21'], TODOS, [200, SD, 'KPIs y embudo del período.'], null,
    { q: P('desde', 'hasta'), desc: 'admin y dueño ven toda la agencia; empleado y freelance ven lo suyo (CU-21 A1, DEC-0008).' }],
  ['get', '/reportes', 'dashboard', 'listarReportes', 'Ver el catálogo de reportes', ['CU-22'], GESTION, [200, SD, 'Reportes disponibles.'], null, {}],
  ['get', '/reportes/{reporte_id}', 'dashboard', 'generarReporte', 'Generar un reporte del período', ['CU-22'], GESTION, [200, 'reporte', 'Reporte en JSON, Excel o PDF.'], null,
    { q: [...P('desde', 'hasta'), q('comparar_desde', { type: 'string', format: 'date' }, 'Período de comparación (CU-22 A2).'), q('comparar_hasta', { type: 'string', format: 'date' }), q('formato', { type: 'string', enum: ['json', 'xlsx', 'pdf'], default: 'json' })] }],
  ['get', '/calendario', 'calendario', 'verCalendario', 'Ver viajes y vencimientos en el calendario', ['CU-23'], TODOS, [200, SD, 'Eventos del período: salidas, regresos y vencimientos de pagos.'], null,
    { q: [...P('desde', 'hasta', 'mios'), q('tipo', { type: 'string', enum: ['viaje', 'vencimiento'] }), q('responsable_id', { type: 'string', format: 'uuid' })], freelance: true }],
];

// ---------------------------------------------------------------------------
// Armado
// ---------------------------------------------------------------------------
const paths = {};
const errorRef = (n) => ({ $ref: `#/components/responses/${n}` });
const problema = (d) => ({ description: d, content: { 'application/problem+json': { schema: ref('Problema') } } });

for (const [method, path, tag, operationId, summary, cus, roles, [okCode, okSchema, okDesc], body, o] of ops) {
  const descParts = [];
  if (o.desc) descParts.push(o.desc);
  descParts.push(o.publico ? '**Acceso:** público.' : `**Roles:** ${roles.join(', ')}.`);
  if (o.freelance) descParts.push('**Visibilidad:** freelance, solo lo propio (DEC-0008).');
  if (o.propiedad) descParts.push('**Escritura:** el responsable del registro, o admin o dueño (DEC-0005).');
  if (o.redes) descParts.push('**Capacidad:** acceso al módulo de redes (admin y dueño lo tienen por rol).');
  descParts.push(`**Casos de uso:** ${cus.join(', ')}.`);

  const params = [];
  for (const m of path.matchAll(/\{(\w+)\}/g)) params.push({ name: m[1], in: 'path', required: true, schema: { type: 'string', format: 'uuid' } });
  if (path === '/reportes/{reporte_id}') params[0].schema = { type: 'string' };
  if (o.q) params.push(...o.q);

  let okContent;
  if (okSchema === 'pdf') okContent = { 'application/pdf': { schema: { type: 'string', format: 'binary' } } };
  else if (okSchema === 'reporte') okContent = {
    'application/json': { schema: SD },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } },
    'application/pdf': { schema: { type: 'string', format: 'binary' } },
  };
  else if (okSchema) okContent = { 'application/json': { schema: okSchema } };

  const resp = { [okCode]: { description: okDesc, ...(okContent && { content: okContent }) } };
  if (o.publico) resp['401'] = problema(o.c401);
  else resp['401'] = errorRef('NoAutenticado');
  if (!o.publico && (roles.length < 4 || o.propiedad || o.redes)) resp['403'] = errorRef('SinPermiso');
  if (path.includes('{')) resp['404'] = errorRef('NoEncontrado');
  if (o.c409) resp['409'] = problema(o.c409);
  if (body || o.q) resp['422'] = o.c422 ? problema(o.c422) : errorRef('Invalido');
  if (o.e502) resp['502'] = problema(o.e502);

  const op = {
    tags: [tag], operationId, summary, description: descParts.join('\n\n'),
    'x-casos-de-uso': cus, 'x-roles': o.publico ? [] : roles,
    ...(params.length && { parameters: params }),
    ...(body && { requestBody: { required: true, content: { 'application/json': { schema: body } } } }),
    responses: resp,
    ...(o.publico && { security: [] }),
  };
  paths[path] = paths[path] || {};
  if (paths[path][method]) throw new Error(`Operación duplicada: ${method} ${path}`);
  paths[path][method] = op;
}

const tags = [
  ['seguridad', 'Inicio de sesión, usuarios y roles (CU-24, CU-25).'],
  ['configuracion', 'Parámetros del negocio, comisiones por defecto y catálogos de destinos, requisitos y operadores (CU-13, CU-15, CU-26, CU-31).'],
  ['clientes', 'Alta y ficha del cliente (CU-02, CU-03).'],
  ['oportunidades', 'Consultas, seguimiento, cotizaciones y recontacto (CU-04, CU-05, CU-06, CU-30).'],
  ['viajes', 'Reserva, estados, itinerario y cancelación del viaje (CU-07, CU-08, CU-09, CU-27).'],
  ['economia', 'Economía del viaje, plan de pagos y cobros (CU-10, CU-11, CU-12).'],
  ['alertas', 'Agenda de alertas y recordatorios (CU-14, CU-28).'],
  ['hoteles', 'Catálogo de hoteles y reseñas (CU-16, CU-17, CU-18, CU-29).'],
  ['redes', 'Contenido para redes y borradores con IA (CU-19, CU-20).'],
  ['dashboard', 'Indicadores, embudo y reportes (CU-21, CU-22).'],
  ['calendario', 'Calendario de viajes y vencimientos (CU-23).'],
].map(([name, description]) => ({ name, description }));

const doc = {
  openapi: '3.1.0',
  info: {
    title: 'Rumbo API',
    version: '0.1.0-pc1',
    summary: 'Contrato preliminar entre la vista (web y mobile) y el controlador (API FastAPI).',
    description: [
      'Contrato **preliminar** del PC1, escrito a mano a partir de los casos de uso, el DGM-ER y DEC-0005/DEC-0008.',
      'Lista **todos los endpoints** de los once módulos, con su rol y sus errores. Los esquemas están completos solo para el circuito de CU-01 (Cliente, Oportunidad, Cotización, Viaje, Pago y Alerta); el resto usa `SinDetallar`.',
      'En PC2, el contrato de referencia pasa a ser el que genera FastAPI desde los esquemas Pydantic.',
      'Convenciones: JSON con nombres en snake_case; fechas ISO 8601 (la interfaz las muestra como dd/mm/aa); importes como texto decimal; errores con application/problem+json.',
    ].join('\n\n'),
  },
  servers: [{ url: '/api', description: 'nginx deriva /api al contenedor de la API (DEC-0011).' }],
  security: [{ tokenBearer: [] }],
  tags,
  paths,
  components: {
    securitySchemes: {
      tokenBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token que devuelve /auth/login (DEC-0008).' },
    },
    parameters,
    responses: respComponents,
    schemas,
  },
};

const out = process.argv[2];
fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8');
const nOps = Object.values(paths).reduce((a, p) => a + Object.keys(p).length, 0);
console.log(`OK ${out}: ${Object.keys(paths).length} rutas, ${nOps} operaciones, ${Object.keys(schemas).length} esquemas`);
