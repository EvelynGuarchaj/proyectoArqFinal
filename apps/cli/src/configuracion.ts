//propiedad de integrante c
const urlApi = process.env.URL_API;

if (!urlApi) {
  console.error('Falta la variable URL_API en el .env de la raíz');
  process.exit(1);
}

export const configuracion = {
  urlApi
};
