module.exports = {

  friendlyName: 'New secret',

  description: 'Protección para Cross-Site-Request-Forgery (csrf). No quiero usar lo que viene con SailsJs porque precisa redis',

  inputs: {
    ip: { type:'string' },
  },

  exits: {
    success: {
      secret: 'string',
    },
  },

  fn: async function (inputs,exits) {
    if (inputs.ip === 'undefined') {
      // me cubro con un valor razonable
      inputs.ip = "127.0.0.1";
    }
    var seed = inputs.ip.replace(/[^\d]/g,'');
    var mstime = (new Date).getTime();
    var secret = mstime.toString(16)+'.'+(Math.floor(Math.abs(Math.sin(seed+mstime)) * 1000000000000000)).toString(16);
    return exits.success(secret);
  }

};
