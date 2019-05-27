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
  //primaryKey: 'GrupUsrStatus', // no es cierto pero permite que el modelo levante
  attributes: {
    //GrupId: { type:'string' },
    GrupId: { model: 'SEGGRUPOS' },
    UserId: { model:'SEGUSUARIOS' },
    id: { type:'string', columnName:'GrupUsrStatus', required:true },
    GrupUsrStatusFchIni: { type: 'ref', columnType: 'datetime' },
    GrupUsrStatusFchFin: { type: 'ref', columnType: 'datetime' },
    DependId: { model: 'DEPENDENCIAS' },
    LugarId: { model: 'LUGARES' },
  },

  grupos: async function (userId) {
    const hoy = (new Date).fecha_toString();
    return (await this.find({
        UserId:userId,
        // GrupUsrStatus:'A',
        GrupUsrStatusFchIni:{'<=':hoy},
        or: [
          {GrupUsrStatusFchFin:'1000-01-01'},
          {GrupUsrStatusFchFin:{'>=':hoy}},
        ],
      })
      .populate('DependId')
      .populate('LugarId'))
      .filter( g => (!g.DependId || g.DependId.StatusId==1) &&  (!g.LugarId || g.LugarId.StatusId==1) )
      .concat([{GrupId:'G_TODOS', UserId:userId, GrupUsrStatus:'A', GrupUsrStatusFchIni:new Date(1000,0,1), GrupUsrStatusFchFin:new Date(1000,0,1), DependId:null, LugarId:null}])
      ;
  },
};

Date.prototype.fecha_toString = function() {
  const sprintf = require("sprintf");
  return sprintf("%04d-%02d-%02d", this.getFullYear(),this.getMonth()+1,this.getDate());
};
