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
      var seed = inputs.ip.replace(/[^\d]/g,'');
      var mstime = parseInt(inputs.secret.split('.')[0],16);
      if (((new Date).getTime() - mstime)/1000 > sails.config.timeout.secret) {
        throw 'error';
      }
      var secret = mstime.toString(16)+'.'+(Math.floor(Math.abs(Math.sin(seed+mstime)) * 1000000000000000)).toString(16);
      if (inputs.secret != secret) {
        throw 'error';
      }
    } catch(e) {
      return exits.error(new Error("El formulario está vencido. Reintente el ingreso"));
    }
    return exits.success();
  }

};
