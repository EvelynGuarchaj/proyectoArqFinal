function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const entorno = {
  puertoApi: Number(process.env.PUERTO_API ?? 3000),
  urlBaseDatos: requerida('URL_BASE_DATOS'),
  urlRedis: requerida('URL_REDIS'),
  urlNotificaciones: requerida('URL_NOTIFICACIONES'),
  secretoJwt: requerida('SECRETO_JWT'),
  duracionTokenAcceso: process.env.DURACION_TOKEN_ACCESO ?? '15m',
  diasTokenRefresco: Number(process.env.DIAS_TOKEN_REFRESCO ?? 7),
  ttlCacheSegundos: Number(process.env.TTL_CACHE_SEGUNDOS ?? 60),
  limiteSolicitudesPorMinuto: Number(process.env.LIMITE_SOLICITUDES_POR_MINUTO ?? 60),
  origenWeb: process.env.ORIGEN_WEB ?? 'http://localhost:5173',
};
