import { crearApp } from './app';
import { entorno } from './config/entorno';

const app = crearApp();

app.listen(entorno.puertoApi, () => {
  console.log(`API de ReservaLab escuchando en http://localhost:${entorno.puertoApi} (documentación en /docs)`);
});
