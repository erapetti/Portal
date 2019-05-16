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

  const loadavgvalue = await loadavg();

  if (loadavgvalue > sails.config.maxLoadAvg) {
    // El sistema tiene demasiada carga
      return res.serverError(new Error("El sistema está sobrecargado, por favor reintente el ingreso en unos minutos"));
  }

  return next();

};

async function loadavg() {
  const fs = require('fs');
  const util = require('util');
  const readFile = util.promisify(fs.readFile);
  try {
    const loadavgvalue = await readFile('/proc/loadavg');
    return parseInt(loadavgvalue.toString().split(' ')[0]);
  } catch (e) {
    return -1;
  }
}
