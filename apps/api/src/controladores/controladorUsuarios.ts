import type { RequestHandler } from 'express';
import * as servicioUsuarios from '../servicios/servicioUsuarios';

export const listar: RequestHandler = async (req, res) => {
  res.json(await servicioUsuarios.listar());
};

export const crear: RequestHandler = async (req, res) => {
  res.status(201).json(await servicioUsuarios.crear(res.locals.cuerpo));
};

export const editar: RequestHandler = async (req, res) => {
  res.json(await servicioUsuarios.editar(res.locals.parametros.id, res.locals.cuerpo, req.usuario!.id));
};

export const desactivar: RequestHandler = async (req, res) => {
  await servicioUsuarios.desactivar(res.locals.parametros.id, req.usuario!.id);
  res.status(204).end();
};
