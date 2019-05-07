/**
 * LUGARES.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Direcciones',
  migrate: 'safe',
  tableName: 'LUGARES',
  attributes: {
    id: { type:'number', columnName:'LugarId', required:true },
    LugarDesc: 'string',
    StatusId: 'number',
  },

};
