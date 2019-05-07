/**
 * DEPENDENCIAS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Direcciones',
  migrate: 'safe',
  tableName: 'DEPENDENCIAS',
  attributes: {
    id: { type:'number', columnName:'DependId', required:true },
    DependDesc: 'string',
    StatusId: 'number',
  },

};
