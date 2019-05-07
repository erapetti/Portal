/**
 * SEGRELACION_GRUPO_USUARIO.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGRELACION_GRUPO_USUARIO',
  primaryKey: 'GrupUsrStatus', // no es cierto pero permite que el modelo levante
  attributes: {
    GrupId: { type:'string' },
    UserId: { model:'SEGUSUARIOS' },
    GrupUsrStatus: { type:'string', required:true },
    GrupUsrStatusFchIni: { type: 'ref', columnType: 'datetime' },
    GrupUsrStatusFchFin: { type: 'ref', columnType: 'datetime' },
    DependId: { model: 'DEPENDENCIAS' },
    LugarId: { model: 'LUGARES' },
  },

  grupos: async function (userId) {
    const hoy = (new Date).fecha_toString();
    const result = await this.find({
        UserId:userId,
        GrupUsrStatus:'A',
        GrupUsrStatusFchIni:{'<=':hoy},
        or: [
          {GrupUsrStatusFchFin:'1000-01-01'},
          {GrupUsrStatusFchFin:{'>=':hoy}},
        ],
      })
      .populate('DependId')
      .populate('LugarId');

    return result.filter( r => (!r.DependId || r.DependId.StatusId==1) && (!r.LugarId || r.LugarId.StatusId==1));
  },
};

Date.prototype.fecha_toString = function() {
  const sprintf = require("sprintf");
  return sprintf("%04d-%02d-%02d", this.getFullYear(),this.getMonth()+1,this.getDate());
};
