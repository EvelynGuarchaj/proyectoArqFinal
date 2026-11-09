//dueño del archivo integrante C
import type { Request, Response } from 'express';
import * as servicioAhora from '../servicios/servicioAhora';

// RF-11: Obtener la ocupación actual de los espacios
export async function obtener(req: Request, res: Response) {
  const resultado = await servicioAhora.obtener();

  res.set('X-Cache', resultado.cache);

  res.status(200).json(resultado.datos);
}
