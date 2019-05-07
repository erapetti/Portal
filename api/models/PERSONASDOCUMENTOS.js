/**
 * PERSONASDOCUMENTOS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Personas',
  migrate: 'safe',
  tableName: 'PERSONASDOCUMENTOS',
  primaryKey: 'PerDocId', // no es cierto pero permite que el modelo levante
  attributes: {
    PerId: { model:'PERSONAS', unique:true },
    PaisCod: 'string',
    DocCod: 'string',
    PerDocId: { type:'string', required:true },
  },

  PerNombreCompleto: async function(documento) {
    const p = await this.findOne(documento).populate('PerId');
    return (typeof p !== 'undefined' && p.PerId !== 'undefined' ? p.PerId.PerNombreCompleto : '');
  },
};
