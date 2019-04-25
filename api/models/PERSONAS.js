/**
 * PERSONAS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Personas',
  migrate: 'safe',
  tableName: 'PERSONAS',
  primaryKey: 'PerId',
  attributes: {
          PerId: { type: 'number', required: true },
          PerNombreCompleto: 'string',
          PerFchFall: { type: 'ref', columnType: 'datetime' },
  },

  findByDoc: async function(documento) {
    let pd = await PERSONASDOCUMENTOS.findOne(documento);
    if (typeof pd === 'undefined') {
      throw new Error("No se encuentra el registro de la persona con documento "+documento.PerDocId);
    }
    return await PERSONAS.findOne({PerId:pd.PerId});
  },

  PerNombreCompleto: async function(documento) {
    let p = await PERSONAS.findByDoc(documento);
    return (typeof p !== 'undefined' ? p.PerNombreCompleto : '');
  },
};
