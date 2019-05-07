/**
 * SEGLOG.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGLOG',
  primaryKey: 'LogId',
  attributes: {
    LogId: { type:'number', autoIncrement:true },
    LogFecha: { type:'ref', columnType:'datetime' },
    LogUsuario: 'string',
    LogSistema: 'string',
    LogTipo: 'string',
    LogCodError: 'number',
    LogTxt: 'string',
  },

  write: async function (req,userId,codigo,texto) {
    try {
      const entry = {
        LogFecha: (new Date).fechahora_toString(),
        LogUsuario: userId,
        LogSistema: (req.options ? req.options.action : 'Portal'),
        LogTipo: 'Informativo',
        LogCodError: codigo,
        LogTxt: texto,
      };
      await SEGLOG.create(entry);
    } catch (e) {
      sails.log.error(e);
    }
  },
};

Date.prototype.fechahora_toString = function() {
        const sprintf = require("sprintf");
        return sprintf("%04d-%02d-%02d %02d:%02d:%02d", this.getFullYear(),this.getMonth()+1,this.getDate(),this.getHours(),this.getMinutes(),this.getSeconds());
};
