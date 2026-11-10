// DUEÑA: B
// Controlador: lee la solicitud, llama al servicio y responde. Nunca importa prisma.
import type { Request, Response } from 'express';
import * as servicioDisponibilidad from '../servicios/servicioDisponibilidad';
import * as servicioEspacios from '../servicios/servicioEspacios';

// RF-05 GET /spaces
export async function listar(req: Request, res: Response) {
  const resultado = await servicioEspacios.listar(res.locals.consulta);
  res.set('X-Cache', resultado.cache);
  res.status(200).json(resultado.datos);
}

// RF-06 POST /spaces
export async function crear(req: Request, res: Response) {
  const espacio = await servicioEspacios.crear(res.locals.cuerpo);
  res.status(201).json(espacio);
}

// RF-06 PATCH /spaces/:id
export async function actualizar(req: Request, res: Response) {
  const espacio = await servicioEspacios.actualizar(res.locals.parametros.id, res.locals.cuerpo);
  res.status(200).json(espacio);
}

// RF-06 DELETE /spaces/:id (desactiva, no borra)
export async function desactivar(req: Request, res: Response) {
  await servicioEspacios.desactivar(res.locals.parametros.id);
  res.status(204).end();
}

// RF-07 GET /spaces/:id/availability?date=AAAA-MM-DD
export async function disponibilidad(req: Request, res: Response) {
  const resultado = await servicioDisponibilidad.obtenerDisponibilidad(
    res.locals.parametros.id,
    res.locals.consulta.date,
  );
  res.set('X-Cache', resultado.cache);
  res.status(200).json(resultado.datos);
}
