/**
 * SEGMENUESOPCIONES.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGMENUESOPCIONES',
  primaryKey: 'MenuId', // no es cierto pero permite que el modelo levante
  attributes: {
    MenuId: { type:'string', required:true },
    MenuNivel1: 'number',
    MenuNivel2: 'number',
    MenuNivel3: 'number',
    MenuNivel4: 'number',
    MenuNivel5: 'number',
    MenuNivel6: 'number',
    MenuObjPath: { type:'string', allowNull:true },
    MenuObjId: { type:'string', allowNull:true },
    MenuSubTitulo: 'string',
    MenuIFRAME: 'string',
  },

  opciones: async function (listaMenues) {
    return await this.find({MenuId:{'in':listaMenues}});
  },
};
