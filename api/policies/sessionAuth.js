/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 * @docs        :: http://sailsjs.org/#!/documentation/concepts/Policies
 *
 */
module.exports = async function(req, res, next) {

  var sessionId = (typeof req.cookies.SESION === 'string' && req.cookies.SESION.match(/^\d+$/) ? req.cookies.SESION : undefined);

  if (sessionId) {
    try {
      req.sesion = await SEGSESIONES.getSession(sessionId);
    } catch (ignore) { }
  }
  const sinSesion = {
    "portal/login":1, // si no tiene sesion muestra el form de login
    "portal/cantcorreos":1, // lo uso solo para testing
  };
  if (!req.sesion && !(req.options && sinSesion[req.options.action]==1)) {
    sails.log.debug("redirect to / porque no hay sesion y req.url=",req.url," action=",req.options.action);
    if (req.wantsJSON) {
      return res.json({error:'SESSION TIMEDOUT'});
    } else {
      return res.redirect(sails.config.custom.baseUrl);
    }
  }
  return next();
};
