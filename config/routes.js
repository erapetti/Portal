/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {


  '/': {
    controller: 'portal',
    action: 'login',
  },
  '/login': {
    controller: 'portal',
    action: 'login',
  },
  '/cgi-bin/portal/login': {
    controller: 'portal',
    action: 'login',
  },

  '/principales': {
    controller: 'portal',
    action: 'principales',
  },

  '/logout': {
    controller: 'portal',
    action: 'logout',
  },

  '/correo': {
    controller: 'portal',
    action: 'correo',
  },

  '/contar': {
    controller: 'portal',
    action: 'contar',
  },

  '/cantCorreos': {
    controller: 'portal',
    action: 'cantCorreos',
  },

  '/fondo': {
    controller: 'portal',
    action: 'fondo',
  },

  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/


};
