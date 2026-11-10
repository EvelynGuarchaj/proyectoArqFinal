// Dueño del archivo: Integrante C
import type { Request, Response } from 'express';
import * as servicioLlavesApi from '../servicios/servicioLlavesApi';

// POST /api/v1/api-keys
// Crear una nueva llave API
export async function crear(req: Request, res: Response) {
  const llave = await servicioLlavesApi.crear(res.locals.cuerpo);

  res.status(201).json(llave);
}

// GET /api/v1/api-keys
// Listar todas las llaves API
export async function listar(req: Request, res: Response) {
  const llaves = await servicioLlavesApi.listar();

  res.status(200).json(llaves);
}

// DELETE /api/v1/api-keys/:id
// Revocar una llave API
export async function revocar(req: Request, res: Response) {
  const llave = await servicioLlavesApi.revocar(
    res.locals.parametros.id
  );

  res.status(200).json(llave);
}
