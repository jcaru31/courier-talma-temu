/**
 * Catalogo de templates de WhatsApp usados por el panel de SIMULACION.
 *
 * Estructura por entrada:
 *   clave: {
 *     description: texto humano para mostrar en el dropdown
 *     variables: nombres de variables que requiere el builder (UI puede usarlos para ayuda)
 *     build(ctx): retorna el payload `template` para la Graph API:
 *                 { name, language: { code }, components: [...] }
 *   }
 *
 * Hoy solo `hello_world` esta operativo (es el unico template garantizado
 * APPROVED en la cuenta de Meta). Cuando los otros 11 esten aprobados, se
 * agregan aqui como entradas adicionales sin tocar el resto del codigo.
 */

const TEMPLATES = {
  hello_world: {
    description: 'Hello World (Meta - test, sin variables)',
    variables: [],
    build() {
      return {
        name: 'hello_world',
        language: { code: 'en_US' },
      };
    },
  },
};

function listar() {
  return Object.entries(TEMPLATES).map(([clave, def]) => ({
    clave,
    description: def.description,
    variables: def.variables,
  }));
}

function existe(clave) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, clave);
}

function build(clave, ctx) {
  if (!existe(clave)) {
    const err = new Error(`Template "${clave}" no esta en el catalogo`);
    err.status = 400;
    err.code = 'TEMPLATE_DESCONOCIDO';
    throw err;
  }
  return TEMPLATES[clave].build(ctx || {});
}

module.exports = { listar, existe, build, CLAVES: Object.keys(TEMPLATES) };
