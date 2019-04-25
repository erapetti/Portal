/**
 * SEGSESIONES.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

async function mkSessionId () {
  var crypto = require('crypto');

  let randomArr = await crypto.randomBytes(8);
  let randomHex = ('0000000000000000' + randomArr.toString('hex')).substr(-16,16);
  // en javascript no puedo tener enteros de más de 53 bits, entonces uso strings de números:
  let sessionId = (parseInt(randomHex.substr(0,8),16).toString() + parseInt(randomHex.substr(8,8),16).toString()).substr(-19,19);
  return sessionId;
}

function userId2documento (userId) {
  let paisCod;
  let docCod;
  if (userId.match(/^u[0-9]/)) {
   paisCod = "UY";
   docCod="CI";
  } else {
   paisCod = userId.substr(0,2).toUpperCase().replace(/[^A-Z]/g,'');
   docCod = userId.substr(2,2).toUpperCase().replace(/[^A-Z]/g,'');
  }
  return {PaisCod:paisCod, DocCod:docCod, PerDocId:userId.replace(/[^\d]/g,'')};
}

function fechahora_fromGXString(str) {
  var fecha;
  if (str.match(/^ *(..)\/(..)\/(..) (..):(..):(..) *$/)) {
    str = str.replace(/^ *(..)\/(..)\/(..) (..):(..):(..) *$/,'20$3-$2-$1 $4:$5:$6');
    fecha = new Date(str);
  } else {
    throw 'Fecha Inválida';
  }
  return fecha;
}

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGSESIONES',
  primaryKey: 'SesionesId',
  attributes: {
    SesionesId: {type: 'string', required: true },
    SesionesUserId: 'string',
    SesionesTime: { type: 'ref', columnType: 'datetime' },
    SesionesDependId: 'number',
    SesionesLugarId: 'number',
    SesionesGrupId: 'string',
    SesionesGrupNivelObjeto: 'number',
  // CACHE:
    // email: 'string',
    // nombre: 'string',
  },

  cleanUp: async function (userid) {
    await this.getDatastore().sendNativeQuery(`
      delete from SEGSESIONES
      where SesionesUserId = $1
        and $2 <= timestampdiff( second, concat('20',substr(SesionesTime,7,2),'-',substr(SesionesTime,4,2),'-',substr(SesionesTime,1,2),' ',substr(SesionesTime,10,8)), now())
    `, [userid, sails.config.sessionTimeout]);
  },

  newSession: async function (userId) {
    // Genero el id de sesión:
    let sessionId = await mkSessionId();
    // Aprovecho para borrar sesiones vencidas:
    await this.cleanUp(userId);
    // Obtengo el email para guardarlo en la cache:
    let email = await SSO.email(userId);
    // Obtengo el nombre completo para guardarlo en la cache:
    let nombre = await PERSONAS.PerNombreCompleto(userId2documento(userId));

    // El objeto de la nueva sesión:
    let sesion = {
      SesionesId:sessionId,
      SesionesUserId:userId,
      SesionesDependId:0,
      SesionesLugarId:0,
      SesionesTime:(new Date).fechahora_toGXString(),
      email:email,
      PerNombreCompleto:nombre,
    };
    // salvo la sesión en la cache:
    await sails.memcached.Set("Portal:"+sessionId,sesion,sails.config.memcachedTTL);
    // salvo la sesión en la base de datos:
    delete sesion.email; // Esto no se guarda en SEGSESIONES
    delete sesion.PerNombreCompleto; // Esto no se guarda en SEGSESIONES
    await this.create(sesion);

    return sessionId;
  },

  endSession: async function (sessionId) {
    // cache delete
    await sails.memcached.Delete("Portal:"+sessionId);
    // db delete
    await this.destroy({SesionesId:sessionId});
  },

  getSession: async function (sessionId) {

    // si la sesión está vencida la invalido
    async function invalidoVencidas(sesion) {
      try {
        st = fechahora_fromGXString(sesion.SesionesTime);
        if (st.getTime() + sails.config.sessionTimeout*1000 < (new Date).getTime()) {
          throw 'sesionVencida';
        }
      } catch(e) {
        try {
          await this.endSession(sesion.sessionId);
        } catch (ignore) { }
        return undefined;
      }
      return sesion;
    }

    let sesion;
    try {
      sesion = await sails.memcached.Get("Portal:"+sessionId);
      if (!sesion) {
        throw 'NotSession';
      }
      sails.log("tomo la sesion de la cache",sesion);
    } catch (e) {
      try {
        sesion = await this.findOne({SesionesId:sessionId});
        if (!sesion) {
          throw 'NotSession';
        }
        // el email y el nombre tengo que traerlos aparte:
        sesion.email = await SSO.email(userId);
        sesion.PerNombreCompleto = await PERSONAS.PerNombreCompleto(userId2documento(userId));
        sails.log("tomo la sesion de la DB",sesion);
        // intento salvar la sesión en la cache, si falla no importa:
        try {
          await sails.memcached.Set("Portal:"+sessionId,sesion,sails.config.memcachedTTL);
        } catch (ignore) { }
      } catch (e) {
        // error al obtener la sesión de la base de datos
        return undefined;
      }
    }
    return invalidoVencidas(sesion);
  },

  updateSession: async function (sessionId, dependId, lugarId) {
    let valores = { SesionesTime:(new Date).fechahora_toGXString() };
    if (dependId & lugarId) {
      valores.SesionesDependId=dependId;
      valores.SesionesLugarId=lugarId;
    }
    await this.update({SesionesId:sessionId}, valores);
  },

};
