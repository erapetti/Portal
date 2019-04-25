module.exports = {

  friendlyName: 'Validate secret',

  description: 'Determina si es válido el secret recibido (para evitar csrf)',

  inputs: {
    secret: { type:'string' },
    ip: { type:'string' },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    error: {
      description: 'No es válido',
    }
  },

  fn: async function (inputs,exits) {
    try {
      if (inputs.ip === 'undefined') {
        // me cubro con un valor razonable
        inputs.ip = "127.0.0.1";
      }
      sails.log(inputs.secret);
      var seed = inputs.ip.replace(/[^\d]/g,'');
      sails.log(seed);
      var mstime = parseInt(inputs.secret.split('.')[0],16);
      sails.log("pruebo secret:",((new Date).getTime() - mstime)/1000,sails.config.secretTimeout);
      if (((new Date).getTime() - mstime)/1000 > sails.config.secretTimeout) {
        throw 'error';
      }
      sails.log(Math.abs(Math.sin(seed+mstime)));
      var secret = mstime.toString(16)+'.'+(Math.floor(Math.abs(Math.sin(seed+mstime)) * 1000000000000000)).toString(16);
      sails.log(inputs.secret, mstime, seed, secret);
      if (inputs.secret != secret) {
        throw 'error';
      }
    } catch(e) {
      return exits.error(new Error("El formulario está vencido. Reintente el ingreso"));
    }
    return exits.success();
  }

};
