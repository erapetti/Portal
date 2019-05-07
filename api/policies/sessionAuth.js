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
  if (!req.sesion && !(req.options && (req.options.action=="portal/login" || req.options.action=="portal/correo"))) {
    sails.log.debug("redirect to / porque no hay sesion y req.url=",req.url);
    return res.redirect(sails.config.custom.baseUrl);
  }
  return next();
};
