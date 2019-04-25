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
  primaryKey: 'UserId',
  attributes: {
    UserId: { type:'string', required: true },
    email: 'string',
    Clave: 'string',
    fecha: { type: 'ref', columnType: 'datetime' },
    activa: { type: 'string', isIn: ['S','N'] },
  },

  email: async function (userid) {
    let sso = await this.findOne({UserId:userid,activa:'S'});
    return (typeof sso === 'undefined' ? undefined : sso.email);
  },
};
