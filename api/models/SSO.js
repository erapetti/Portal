/**
 * SSO.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'sso',
  migrate: 'safe',
  tableName: 'sso',
  attributes: {
    id: { type:'string', columnName:'UserId', required:true },
    email: 'string',
    Clave: 'string',
    fecha: { type:'ref', columnType:'datetime' },
    activa: { type:'string', isIn:['S','N'] },
  },

  email: async function (id) {
    let sso = await this.findOne({id:id, activa:'S'});
    return (typeof sso === 'undefined' ? undefined : sso.email);
  },
};
