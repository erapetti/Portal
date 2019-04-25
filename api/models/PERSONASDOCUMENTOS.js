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
  primaryKey: 'PerId',
  attributes: {
          PerId: { type: 'number', required: true },
          PaisCod: 'string',
          DocCod: 'string',
          PerDocId: 'string',
  },
};
