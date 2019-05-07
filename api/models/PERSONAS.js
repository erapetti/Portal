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
  attributes: {
          id: { type:'number', columnName:'PerId', required:true },
          PerNombreCompleto: 'string',
          PerFchFall: { type:'ref', columnType:'datetime' },
  },

};
