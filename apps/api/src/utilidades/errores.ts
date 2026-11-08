import type { CodigoError } from '@reservalab/shared';

export class ErrorAplicacion extends Error {
  constructor(
    public estado: number,
    public codigo: CodigoError,
    mensaje: string,
    public detalles?: unknown,
  ) {
    super(mensaje);
  }
}
// Uso: throw new ErrorAplicacion(409, 'TRASLAPE', 'El espacio ya está reservado en ese horario');
