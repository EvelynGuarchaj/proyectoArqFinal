import type { Request, Response } from 'express';
import * as servicioAutenticacion from '../servicios/servicioAutenticacion';

export async function registrar(req: Request, res: Response) {
  const usuario = await servicioAutenticacion.registrar(res.locals.cuerpo);
  res.status(201).json(usuario);
}

export async function iniciarSesion(req: Request, res: Response) {
  const respuesta = await servicioAutenticacion.iniciarSesion(res.locals.cuerpo);
  res.status(200).json(respuesta);
}

export async function refrescar(req: Request, res: Response) {
  const respuesta = await servicioAutenticacion.refrescar(res.locals.cuerpo.tokenRefresco);
  res.status(200).json(respuesta);
}

export async function cerrarSesion(req: Request, res: Response) {
  await servicioAutenticacion.cerrarSesion(req.usuario!.id, res.locals.cuerpo.tokenRefresco);
  res.status(204).end();
}
