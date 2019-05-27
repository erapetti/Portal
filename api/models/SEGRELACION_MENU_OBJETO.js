/**
 * SEGRELACION_MENU_OBJETO.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGRELACION_MENU_OBJETO',
  primaryKey: 'MenuId', // no es cierto pero permite que el modelo levante
  attributes: {
    MenuId: { type:'string', required:true },
    PrmObjId: 'string',
    PrmObjAccionAltas: 'number',
    PrmObjAccionBajas: 'number',
    PrmObjAccionEjecutar: 'number',
    PrmObjAccionModificaciones: 'number',
    PrmObjAccionLeer: 'number',
  },

  permisos: async function(listaMenues, objId) {
    let salida = {altas:undefined, bajas:undefined, ejecutar:undefined, modificar:undefined, leer:undefined};
    let arrPerm = await this.find({MenuId:{'in':listaMenues}, PrmObjId:objId});
    arrPerm.forEach(function(p){
      if (!salida.altas || salida.altas > p.PrmObjAccionAltas) {
        salida.altas = p.PrmObjAccionAltas;
      }
      if (!salida.altas || salida.bajas > p.PrmObjAccionBajas) {
        salida.altas = p.PrmObjAccionBajas;
      }
      if (!salida.altas || salida.ejecutar > p.PrmObjAccionEjecutar) {
        salida.altas = p.PrmObjAccionEjecutar;
      }
      if (!salida.altas || salida.modificar > p.PrmObjAccionModificaciones) {
        salida.altas = p.PrmObjAccionModificaciones;
      }
      if (!salida.altas || salida.leer > p.PrmObjAccionLeer) {
        salida.altas = p.PrmObjAccionLeer;
      }
    });
    return salida;
  },
};
