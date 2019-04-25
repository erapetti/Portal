/**
 * PortalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const util = require('util');
const Memcached = require('memcached');
sails.memcached = new Memcached(sails.config.memcached);
sails.memcached.Get = util.promisify(sails.memcached.get);
sails.memcached.Set = util.promisify(sails.memcached.set);
sails.memcached.Delete = util.promisify(sails.memcached.delete);

module.exports = {
/*                 _             _
                  | | ___   __ _(_)_ __
                  | |/ _ \ / _` | | '_ \
                  | | (_) | (_| | | | | |
                  |_|\___/ \__, |_|_| |_|
                           |___/
*/
  login: async function(req,res) {
    const base64 = require('base-64');

    var userId = (req.param('userid') || '').replace(/ /g,'').toLowerCase().checkFormat(/[a-z]{1,4}\d+/);
    var password = (req.param('password') || '').checkFormat(/[a-zA-Z0-9áéíóúñäëïöüÁÉÍÓÚÑÄËÏÖÜçÇ,;.:ºª!|"@·#$~%&¬/()=?¿¡+*{}\t _-]+/);
    var secret = (req.param('secret') || '').toLowerCase().checkFormat(/[a-f\d]+\.[a-f\d]+/);
    var redirect = (req.param('r') || '').checkFormat(/[\w\d_.?=/%-]+/);
    var r64 = (req.param('r64') || '').checkFormat(/[\w\d_=/%\r\n]+/);
    if (!redirect && r64) {
      try {
        redirect = base64.decode(r64).checkFormat(/[\w\d_.?=/%:-]+/);
      } catch (ignore) { }
    } else if (redirect && !r64) {
      try {
        r64 = base64.encode(redirect);
      } catch (ignore) { }
    }

    var mensaje = undefined;

    if (req.sesion) {
      // ya hay una sesión válida
      SEGSESIONES.updateSession(req.sesion.sessionId);
      return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));
    }

    if (!userId && password) {
      mensaje = "Nombre de usuario incorrecto";
    } else if (userId && !password) {
      mensaje = "Hay caracteres no válidos en la contraseña"
    } else if (userId && password && secret){
      try {
        await sails.helpers.validateSecret(secret,req.ip);
        // await sails.helpers.validatePassword(userId,password,req.ip);
        // Creo la nueva sesión en la base de datos:
        let sessionId = await SEGSESIONES.newSession(userId);
        setCookie(res,'SESION',sessionId);
        return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));

      } catch (err) {
        mensaje=err.message;
      }
    }

    // borro la cookie de sesión por si existe pero está vencida:
    setCookie(res,'SESION',undefined);

    // genero un nuevo secret para cada pedido:
    secret = await sails.helpers.newSecret(req.ip);

    // leo la descripción de la imagen de fondo
    let descripcion = '';
    try {
      descripcion = await leoDescripcion('assets/images/descripcion.html');
    } catch (ignore) { }

    let mtime = '';
    try {
      mtime = await modificationTime('assets/images/background.jpg');
    } catch (ignore) { sails.log(ignore);}

    return res.view({title:"Ingreso al Portal de Servicios",mensaje:mensaje,secret:secret,r64:r64,descripcion:descripcion,mtime:mtime});
  },

/*              _            _             _
     _ __  _ __(_)_ __   ___(_)_ __   __ _| | ___  ___
    | '_ \| '__| | '_ \ / __| | '_ \ / _` | |/ _ \/ __|
    | |_) | |  | | | | | (__| | |_) | (_| | |  __/\__ \
    | .__/|_|  |_|_| |_|\___|_| .__/ \__,_|_|\___||___/
    |_|                       |_|
*/
  principales: async function(req,res) {
    return res.view({title:"Portal de Servicios"});
  },

/*             _                         _
              | | ___   __ _  ___  _   _| |_
              | |/ _ \ / _` |/ _ \| | | | __|
              | | (_) | (_| | (_) | |_| | |_
              |_|\___/ \__, |\___/ \__,_|\__|
                       |___/
*/
  logout: async function(req,res) {
    try {
      await SEGSESIONES.endSession(req.sesion.SesionesId);
    } catch (ignore) { }
    setCookie(res,'SESION',undefined);
    return res.redirect(sails.config.custom.baseUrl);
  },

};

/*                            _
                    _ __ ___ (_)___  ___
                   | '_ ` _ \| / __|/ __|
                   | | | | | | \__ \ (__
                   |_| |_| |_|_|___/\___|
*/


Date.prototype.fechahora_toGXString = function() {
  const sprintf = require("sprintf");
  return sprintf("%02d/%02d/%02d %02d:%02d:%02d", this.getDate(),this.getMonth()+1,this.getFullYear()-2000,this.getHours(),this.getMinutes(),this.getSeconds());
};

String.prototype.checkFormat = function(regexp) {
  if (typeof this === 'undefined') {
    return undefined;
  }
  if (typeof regexp === 'string') {
    regexp = new RegExp('^'+regexp+'$');
  } else {
    regexp = new RegExp('^'+regexp.source+'$');
  }
  return (this.match(regexp) ? this.toString() : undefined);
};

function setCookie(res,cookie,val) {
  if (val) {
    res.cookie(cookie, val, { maxAge: sails.config.sessionTimeout*1000, httpOnly: true });
  } else {
    res.cookie(cookie, '', { maxAge: 0, httpOnly: true });
  }
}

async function leoDescripcion(filename) {
  const fs = require('fs');
  const readFile = util.promisify(fs.readFile);
  return await readFile(filename, 'utf8');
}

async function modificationTime(filename) {
  const fs = require('fs');
  const stat = util.promisify(fs.stat);
  const s = await stat(filename);
  return (typeof s !== 'undefined' ? s.mtimeMs : undefined);
}
