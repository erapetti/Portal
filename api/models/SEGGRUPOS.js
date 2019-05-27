/**
 * SEGGRUPOS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGGRUPOS',
  primaryKey: 'GrupId',
  attributes: {
    GrupId: { type:'string', required:true },
//    GrupNivel: { type:'string' },
    GrupDsc: { type:'string' },
    GrupNivelObjeto: { type:'number' },
//    GrupAbv: { type:'string' },
  },

};
