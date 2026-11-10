import { Router } from 'express';
import * as controladorSalud from '../controladores/controladorSalud';

export const rutasSalud = Router();

rutasSalud.get('/', controladorSalud.obtenerEstado);
