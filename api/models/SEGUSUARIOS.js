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
  attributes: {
          id: { type:'string', columnName:'UserId', required:true },
          UserMail: 'string',
          UserRnd: 'number',
          UserIntLog: 'number',
          UserEstado: 'number',
          UserHab: 'number',
          UserDate: { type:'ref', columnType:'datetime' },
          UserFchLog: { type:'ref', columnType:'datetime' },
          PerId: { model:'PERSONAS' },
          grupos: { collection:'SEGRELACION_GRUPO_USUARIO', via:'UserId' },
  },

/* _             _       ____
  | | ___   __ _(_)_ __ / ___| _   _  ___ ___ ___  ___ ___
  | |/ _ \ / _` | | '_ \\___ \| | | |/ __/ __/ _ \/ __/ __|
  | | (_) | (_| | | | | |___) | |_| | (_| (_|  __/\__ \__ \
  |_|\___/ \__, |_|_| |_|____/ \__,_|\___\___\___||___/___/
           |___/
*/
  loginSuccess: async function(id) {
    await this.getDatastore().sendNativeQuery(`
      UPDATE SEGUSUARIOS
      SET UserIntLog = 0, UserFchLog = now()
      WHERE UserId = $1
    `, [id]);
  },

/*    _             _       _____
     | | ___   __ _(_)_ __ | ____|_ __ _ __ ___  _ __
     | |/ _ \ / _` | | '_ \|  _| | '__| '__/ _ \| '__|
     | | (_) | (_| | | | | | |___| |  | | | (_) | |
     |_|\___/ \__, |_|_| |_|_____|_|  |_|  \___/|_|
              |___/
*/
  loginError: async function(id) {
    await this.getDatastore().sendNativeQuery(`
      UPDATE SEGUSUARIOS
      SET UserIntLog = UserIntLog+1, UserDate = now()
      WHERE UserId = $1
    `, [id]);
  },

};
