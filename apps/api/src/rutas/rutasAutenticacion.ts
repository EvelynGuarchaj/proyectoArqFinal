import { Router } from 'express';
import { esquemaLogin, esquemaRegistro, esquemaTokenRefresco } from '@reservalab/shared';
import { validar } from '../middleware/validar';
import { autenticarJwt } from '../middleware/autenticarJwt';
import * as controladorAutenticacion from '../controladores/controladorAutenticacion';

export const rutasAutenticacion = Router();

rutasAutenticacion.post('/register', validar(esquemaRegistro), controladorAutenticacion.registrar);
rutasAutenticacion.post('/login', validar(esquemaLogin), controladorAutenticacion.iniciarSesion);
rutasAutenticacion.post('/refresh', validar(esquemaTokenRefresco), controladorAutenticacion.refrescar);
rutasAutenticacion.post('/logout', autenticarJwt, validar(esquemaTokenRefresco), controladorAutenticacion.cerrarSesion);
