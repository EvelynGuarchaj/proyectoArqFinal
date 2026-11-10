import { Router } from 'express';
import { esquemaCrearUsuario, esquemaEditarUsuario, esquemaParametroId } from '@reservalab/shared';
import * as controladorUsuarios from '../controladores/controladorUsuarios';
import { autenticarJwt } from '../middleware/autenticarJwt';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';

export const rutasUsuarios = Router();
rutasUsuarios.use(autenticarJwt, requerirRol('administrador'));
rutasUsuarios.get('/', controladorUsuarios.listar);
rutasUsuarios.post('/', validar(esquemaCrearUsuario), controladorUsuarios.crear);
rutasUsuarios.patch('/:id', validar(esquemaParametroId, 'params'), validar(esquemaEditarUsuario), controladorUsuarios.editar);
rutasUsuarios.delete('/:id', validar(esquemaParametroId, 'params'), controladorUsuarios.desactivar);
