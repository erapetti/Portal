

module.exports = {

  friendlyName: 'Validate password',

  description: 'Valida usuario y contraseña contra el directorio LDAP',

  inputs: {
    userid: { type: 'string', example: 'u12345678', description: 'userid del Portal', required: true },
    password: { type: 'string' },
    ip: { type:'string' },
  },

  exits: {
    success: {
      description: 'Es válido',
    },
    error: {
      description: 'No es válido',
    }
  },

  fn: async function (inputs,exits) {

        async function LDAPvalidate(userid,password) {
          const { Client } = require('ldapts');
          const url = sails.config.LDAPurl;
          const client = new Client({ url, });
          try {
            await client.bind('uid='+ userid +',ou=People,o=ces', password);
          } catch (ex) {
            throw 'LDAPbindError';
          } finally {
            try {
              await client.unbind();
            } catch (ignore) { };
          }
        };

        let memkey = "Portal.ipInfo."+inputs.ip;
        let ipInfo = await sails.memcached.Get(memkey);
        if (typeof ipInfo !== 'undefined' && ipInfo.UserIntLog>2 && ((new Date).getTime()/1000 - ipInfo.UserDate) < sails.config.ipTimeout ) {
          return exits.error(new Error("Hay demasiadas equivocaciones desde su dirección. Debe esperar un minuto antes de reintentar el ingreso"));
        }

        let usuario = await SEGUSUARIOS.findOne({UserId:inputs.userid});
        if (!(usuario.UserEstado==2 && usuario.UserHab==1)) {
          return exits.error(new Error("Su usuario no está habilitado. Comuníquese con Mesa de Ayuda"));
        }
        if (usuario.UserIntLog>2 && ((new Date).getTime()/1000 - usuario.UserDate) < sails.config.ipTimeout) {
          return exits.error(new Error("Se ha equivocado demasiadas veces. Debe esperar un minuto antes de reintentar el ingreso"));
        }
        try {
          await LDAPvalidate(inputs.userid, inputs.password);
          try {
            // la contraseña es correcta, registro el ingreso:
            await SEGUSUARIOS.loginSuccess(inputs.userid);
            await sails.memcached.Set(memkey, {UserIntLog:0}, sails.config.memcachedTTL);
          } catch (ignore) { }

        } catch (err) {
          // la contraseña es incorrecta, registro el error:
          try {
            await SEGUSUARIOS.loginError(inputs.userid);
            let ipInfo;
            try {
              ipInfo = await sails.memcached.Get(memkey);
            } catch (ignore) { };
            if (typeof ipInfo === 'undefined') {
              ipInfo = {UserIntLog:0};
            }
            await sails.memcached.Set(memkey, {UserIntLog:ipInfo.UserIntLog+1,UserDate:(new Date).getTime()/1000}, sails.config.memcachedTTL);
          } catch (ignore) { }
          return exits.error(new Error('Usuario o contraseña incorrecta'));
        }
        return exits.success();
  }

};

Date.prototype.fechahora_toString = function() {
        const sprintf = require("sprintf");
        return sprintf("%04d-%02d-%02d %02d:%02d:%02d", this.getFullYear(),this.getMonth()+1,this.getDate(),this.getHours(),this.getMinutes(),this.getSeconds());
};
