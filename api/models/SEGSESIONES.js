/**
 * SEGSESIONES.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'Portal',
  migrate: 'safe',
  tableName: 'SEGSESIONES',
  attributes: {
    id: { type:'string', columnName:'SesionesId', required:true },
    SesionesUserId: { model:'SEGUSUARIOS', unique:true },
    SesionesTime: { type:'ref', columnType:'datetime' },
    SesionesDependId: { model:'DEPENDENCIAS', unique:true },
    SesionesLugarId: { model:'LUGARES', unique:true },
    SesionesGrupId: 'string',
    SesionesGrupNivelObjeto: 'number',
  // CACHE:
    // email: 'string',
    // PerNombreCompleto: 'string',
  },

/*               _                  _   _
             ___| | ___  __ _ _ __ | | | |_ __
            / __| |/ _ \/ _` | '_ \| | | | '_ \
           | (__| |  __/ (_| | | | | |_| | |_) |
            \___|_|\___|\__,_|_| |_|\___/| .__/
                                         |_|
*/
  cleanUp: async function (userId) {
    await this.getDatastore().sendNativeQuery(`
      delete from SEGSESIONES
      where SesionesUserId = $1
        and $2 <= timestampdiff( second, concat('20',substr(SesionesTime,7,2),'-',substr(SesionesTime,4,2),'-',substr(SesionesTime,1,2),' ',substr(SesionesTime,10,8)), now())
    `, [userId, sails.config.timeout.sesion]);
  },

/*                      ____                _
   _ __   _____      __/ ___|  ___  ___ ___(_) ___  _ __
  | '_ \ / _ \ \ /\ / /\___ \ / _ \/ __/ __| |/ _ \| '_ \
  | | | |  __/\ V  V /  ___) |  __/\__ \__ \ | (_) | | | |
  |_| |_|\___| \_/\_/  |____/ \___||___/___/_|\___/|_| |_|
*/
  newSession: async function (userId) {

    async function mkSessionId () {
      const crypto = require('crypto');

      const randomArr = await crypto.randomBytes(8);
      const randomHex = ('0000000000000000' + randomArr.toString('hex')).substr(-16,16);
      // en javascript no puedo tener enteros de más de 53 bits, entonces uso strings de números:
      const sessionId = (parseInt(randomHex.substr(0,8),16).toString() + parseInt(randomHex.substr(8,8),16).toString()).substr(-18,18);
      return sessionId;
    }

    // Genero el id de sesión:
    const sessionId = await mkSessionId();
    // Aprovecho para borrar sesiones vencidas:
    await this.cleanUp(userId);
    // Obtengo el email para guardarlo en la cache:
    const email = await SSO.email(userId);
    // Obtengo el nombre completo para guardarlo en la cache:
    const nombre = await PERSONASDOCUMENTOS.PerNombreCompleto(userId2documento(userId));

    // El objeto de la nueva sesión:
    const sesion = {
      id:sessionId,
      SesionesUserId:userId,
      SesionesDependId:null,
      SesionesLugarId:null,
      SesionesTime:(new Date).fechahora_toGXString(),
      email:email,
      PerNombreCompleto:nombre,
    };
    // salvo la sesión en la cache:
    await sails.memcached.Set(sails.config.prefix.sesion+sessionId, sesion, sails.config.memcachedTTL);
    // salvo la sesión en la base de datos:
    delete sesion.email; // Esto no se guarda en SEGSESIONES
    delete sesion.PerNombreCompleto; // Esto no se guarda en SEGSESIONES
    await this.create(sesion);

    return sessionId;
  },

/*                  _ ____                _
      ___ _ __   __| / ___|  ___  ___ ___(_) ___  _ __
     / _ \ '_ \ / _` \___ \ / _ \/ __/ __| |/ _ \| '_ \
    |  __/ | | | (_| |___) |  __/\__ \__ \ | (_) | | | |
     \___|_| |_|\__,_|____/ \___||___/___/_|\___/|_| |_|
*/
  endSession: async function (id) {
    // cache delete
    await sails.memcached.Delete(sails.config.prefix.sesion+id);
    // db delete
    await this.destroy(id);
  },

/*               _   ____                _
       __ _  ___| |_/ ___|  ___  ___ ___(_) ___  _ __
      / _` |/ _ \ __\___ \ / _ \/ __/ __| |/ _ \| '_ \
     | (_| |  __/ |_ ___) |  __/\__ \__ \ | (_) | | | |
      \__, |\___|\__|____/ \___||___/___/_|\___/|_| |_|
      |___/
*/
  getSession: async function (id) {

    // si la sesión está vencida la invalido
    async function invalidoVencidas(sesion) {
      try {
        st = fechahora_fromGXString(sesion.SesionesTime);
        if (st.getTime() + sails.config.timeout.sesion*1000 < (new Date).getTime()) {
          throw 'sesionVencida';
        }
      } catch(e) {
        try {
          await this.endSession(sesion.id);
        } catch (ignore) { }
        return undefined;
      }
      return sesion;
    }

    let sesion;
    try {
      sesion = await sails.memcached.Get(sails.config.prefix.sesion+id);
      if (!sesion) {
        throw 'NotSession';
      }
      sails.log("tomo la sesion de la cache",sesion);
    } catch (e) {
      try {
        // reconstruyo la sesión desde la base de datos
        sesion = await this.findOne(id);
        if (!sesion) {
          throw 'NotSession';
        }
        // el email y el nombre tengo que traerlos aparte:
        sesion.email = await SSO.email(sesion.SesionesUserId);
        sesion.PerNombreCompleto = await PERSONASDOCUMENTOS.PerNombreCompleto(userId2documento(sesion.SesionesUserId));
        sails.log("tomo la sesion de la DB",sesion);
        // intento salvar la sesión en la cache, si falla no importa:
        try {
          await sails.memcached.Set(sails.config.prefix.sesion+id, sesion, sails.config.memcachedTTL);
        } catch (ignore) { }
      } catch (e) {
        // error al obtener la sesión de la base de datos
        return undefined;
      }
    }
    return await invalidoVencidas(sesion);
  },

/*                     _       _       ____                _
       _   _ _ __   __| | __ _| |_ ___/ ___|  ___  ___ ___(_) ___  _ __
      | | | | '_ \ / _` |/ _` | __/ _ \___ \ / _ \/ __/ __| |/ _ \| '_ \
      | |_| | |_) | (_| | (_| | ||  __/___) |  __/\__ \__ \ | (_) | | | |
       \__,_| .__/ \__,_|\__,_|\__\___|____/ \___||___/___/_|\___/|_| |_|
            |_|
*/
  updateSession: async function (id, dependId, lugarId) {
    let valores = { SesionesTime:(new Date).fechahora_toGXString() };
    if (dependId & lugarId) {
      valores.SesionesDependId=dependId;
      valores.SesionesLugarId=lugarId;
    }
    await this.update(id, valores);
    let sesion;
    try {
      sesion = await sails.memcached.Get(sails.config.prefix.sesion+id);
      sesion.SesionesTime=(new Date).fechahora_toGXString();
      sesion.SesionesDependId=dependId;
      sesion.SesionesLugarId=lugarId;
      await sails.memcached.Set(sails.config.prefix.sesion+id, sesion, sails.config.memcachedTTL);
    } catch (e) {
      // no pude obtener la sesión de la cache, la reconstruyo
      sesion=this.getSession(id);
    }
    return sesion;
  },

};

/*                            _
                    _ __ ___ (_)___  ___
                   | '_ ` _ \| / __|/ __|
                   | | | | | | \__ \ (__
                   |_| |_| |_|_|___/\___|
*/

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
