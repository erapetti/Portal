/**
 * PortalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const util = require('util');
var Memcached = require('memcached');
sails.memcached = new Memcached(sails.config.memcached);
sails.memcached.Get = util.promisify(sails.memcached.get);
sails.memcached.Set = util.promisify(sails.memcached.set);
sails.memcached.Delete = util.promisify(sails.memcached.delete);

module.exports = {

  login: async function(req,res) {
    var base64 = require('base-64');

    var userId = (req.param('userid') ? req.param('userid').replace(/ /g,'').toLowerCase() : undefined);
    var password = req.param('password');
    var secret = (req.param('secret') && req.param('secret').match(/^[a-fA-F\d]+\.[a-fA-F\d]+$/) ? req.param('secret') : undefined);
    var redirect = (req.param('r') && req.param('r').match(/^[\w\d_.?=/%-]+$/) ? req.param('r') : undefined);
    if (!redirect) {
      try {
        let r = base64.decode(req.param('r64'));
        redirect = (r.match(/^[\w\d_.?=/%:-]+$/) ? r : undefined);
      } catch (ignore) { }
    }

    var mensaje = undefined;

    if (req.sesion) {
      // ya hay una sesión válida
      SEGSESIONES.updateSession(req.sesion.sessionId);
      return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));
    }

    if (userId && password) {
      if (! userId.match(/^u\d+$/)) {
        mensaje = "Nombre de usuario incorrecto";
      } else if (! password.match(/^[a-zA-Z0-9áéíóúñäëïöüÁÉÍÓÚÑÄËÏÖÜçÇ,;.:ºª!|"@·#$~%&¬/()=?¿¡+*{}\t _-]+$/)) {
        mensaje = "Hay caracteres no válidos en la contraseña"
      } else {
        try {
          await sails.helpers.validateSecret(secret,req.ip);
          // await sails.helpers.validatePassword(userId,password,req.ip);
          // Creo la nueva sesión en la base de datos:
          let sessionId = await SEGSESIONES.newSession(userId);
          res.cookie('SESION', sessionId.toString(), { maxAge: sails.config.sessionTimeout*1000, httpOnly: true });
          return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));

        } catch (err) {
          mensaje=err.message;
        }
      }
    }

    // borro la cookie de sesión por si existe pero está vencida:
    res.cookie('SESION', '', { maxAge: 0, httpOnly: true });

    // genero un nuevo secret para cada pedido:
    secret = await sails.helpers.newSecret(req.ip);

    let r64;
    if (redirect) {
      // mantengo la redirección pedida
      r64 = base64.encode(redirect);
    }

    return res.view({title:"Ingreso al Portal de Servicios",mensaje:mensaje,secret:secret,r64:r64});
  },

  principales: async function(req,res) {
    return res.view({title:"Portal de Servicios"});
  },

  logout: async function(req,res) {
    try {
      await SEGSESIONES.endSession(req.sesion.SesionesId);
    } catch (ignore) { }
    res.cookie('SESION', '', { maxAge: 0, httpOnly: true });
    return res.redirect(sails.config.custom.baseUrl);
  },

};

Date.prototype.fechahora_toGXString = function() {
  var sprintf = require("sprintf");
  return sprintf("%02d/%02d/%02d %02d:%02d:%02d", this.getDate(),this.getMonth()+1,this.getFullYear()-2000,this.getHours(),this.getMinutes(),this.getSeconds());
};
