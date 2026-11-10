import type { Request, Response } from 'express';
import * as servicioSalud from '../servicios/servicioSalud';

export async function obtenerEstado(req: Request, res: Response) {
  const estado = await servicioSalud.obtenerEstado();
  res.status(estado.estado === 'ok' ? 200 : 503).json(estado);
}
