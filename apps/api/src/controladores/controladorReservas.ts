// DUEÑA: B
// Controlador: lee la solicitud, llama al servicio y responde. Nunca importa prisma.
import type { Request, Response } from 'express';
import * as servicioReservas from '../servicios/servicioReservas';

// RF-08 POST /reservations
export async function crear(req: Request, res: Response) {
  const reserva = await servicioReservas.crear(req.usuario!.id, res.locals.cuerpo);
  res.status(201).json(reserva);
}

export async function listarEstudiantes(req: Request, res: Response) {
  res.json(await servicioReservas.listarEstudiantes());
}

export async function listarTodas(req: Request, res: Response) {
  res.json(await servicioReservas.listarTodas());
}

// RF-09 GET /reservations/me
export async function listarMias(req: Request, res: Response) {
  const reservas = await servicioReservas.listarMias(req.usuario!.id, req.usuario!.rol);
  res.status(200).json(reservas);
}

// RF-10 DELETE /reservations/:id (cambia el estado a cancelada)
export async function cancelar(req: Request, res: Response) {
  const reserva = await servicioReservas.cancelar(res.locals.parametros.id, req.usuario!);
  res.status(200).json(reserva);
}
