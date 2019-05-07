/**
 * SEGRELACION_GRUPO_MENU.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGRELACION_GRUPO_MENU',
  primaryKey: 'MenuId', // no es cierto pero permite que el modelo levante
  attributes: {
    GrupId: { type:'string', required:true },
    MenuId: { type:'string', required:true },
    GrupMenuOrden: 'number',
  },

  menues: async function(listaGrupos) {
    return await this.find({GrupId:{'in':listaGrupos}});
  },

};
