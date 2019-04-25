/**
 * SEGUSUARIOS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGUSUARIOS',
  primaryKey: 'UserId',
  attributes: {
          UserId: {type: 'string', required: true },
          UserMail: 'string',
          UserRnd: 'number',
          UserIntLog: 'number',
          UserEstado: 'number',
          UserHab: 'number',
          UserDate: { type: 'ref', columnType: 'datetime' },
          UserFchLog: { type: 'ref', columnType: 'datetime' },
          PerId: { model: 'PERSONAS' },
  },

  loginSuccess: async function(userid) {
    await this.getDatastore().sendNativeQuery(`
      UPDATE SEGUSUARIOS
      SET UserIntLog = 0, UserFchLog = now()
      WHERE UserId = $1
    `, [userid]);
  },

  loginError: async function(userid) {
    let err =
    await this.getDatastore().sendNativeQuery(`
      UPDATE SEGUSUARIOS
      SET UserIntLog = UserIntLog+1, UserDate = now()
      WHERE UserId = $1
    `, [userid]);
  },

};
