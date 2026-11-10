// DUEÑA: Integrante C (stub creado por A)
import { parseArgs } from 'node:util';
import { ErrorCli } from './clienteApi';

import {
  crearEspacio,
  crearLlave,
  listarLlaves,
  revocarLlave,
  type Opciones,
} from './comandos';

const AYUDA = `Uso: pnpm --filter cli cli <comando> --correo <admin> --contrasena <clave> [opciones]

Comandos:
  crear-espacio   --nombre "Laboratorio 3" --edificio C --capacidad 20 --tipo laboratorio|salon [--apertura 7] [--cierre 21]
  crear-llave     --nombre "Pantalla edificio B" --permisos read:now,read:spaces [--limite 60]
  listar-llaves
  revocar-llave   --id 2
`;

const comandos: Record<
  string,
  (opciones: Opciones) => Promise<void>
> = {
  'crear-espacio': crearEspacio,
  'crear-llave': crearLlave,
  'listar-llaves': listarLlaves,
  'revocar-llave': revocarLlave,
};

async function principal() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      correo: { type: 'string' },
      contrasena: { type: 'string' },
      nombre: { type: 'string' },
      edificio: { type: 'string' },
      capacidad: { type: 'string' },
      tipo: { type: 'string' },
      apertura: { type: 'string' },
      cierre: { type: 'string' },
      permisos: { type: 'string' },
      limite: { type: 'string' },
      id: { type: 'string' },
      ayuda: { type: 'boolean', short: 'h' },
    },
  });

  const nombreComando = positionals[0];

  const comando = nombreComando
    ? comandos[nombreComando]
    : undefined;

  if (values.ayuda || !comando) {
    if (nombreComando && !comando) {
      console.error(`Comando desconocido: ${nombreComando}\n`);
    }

    console.log(AYUDA);

    process.exitCode = nombreComando && !comando ? 1 : 0;
    return;
  }

  await comando(values);
}

principal().catch((error: unknown) => {
  if (error instanceof ErrorCli) {
    console.error(`Error: ${error.message}`);
  } else if (
    error instanceof Error &&
    'code' in error &&
    String(error.code).startsWith('ERR_PARSE_ARGS')
  ) {
    console.error(`Error: ${error.message}\n\n${AYUDA}`);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
