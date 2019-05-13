/**
 * FAVORITOS.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  // memcached

  attributes: {
    id: { type:'string', required:true },
    value: 'string',
  },

  contar: async function (url) {
    try {
      let memkey = (sails.config.prefix.favoritos+(new Date()).fechahora_toYMDString()+encodeURI(url)).substr(0,sails.config.memcachedmaxKeySize);
sails.log.debug("contar",memkey);
      let ok = await sails.memcached.Incr(memkey, 1);
      if (!ok) {
        ok = await sails.memcached.Set(memkey, 1, 24*60*60*sails.config.timeout.favoritos);
      }
    } catch (ignore) { }
  },

  listaFavoritos: async function (menues) {
    let memkeys = [];
    let favoritos = [];
    let ultimosDias = mkUltimosDias(sails.config.timeout.favoritos);
    // armo la lista de claves que tengo que traer de la cache
    for (m in menues) {
      menues[m].forEach(function(o){
        if (o.MenuObjPath) {
          const url = o.MenuObjPath+(o.MenuObjId ? o.MenuObjId : '');
          const encodedUrl = encodeURI(url).substr(0,sails.config.memcachedmaxKeySize-sails.config.prefix.favoritos.length-8);
          ultimosDias.forEach(function(dia){
            const memkey = sails.config.prefix.favoritos+dia+encodedUrl;
            memkeys.push(memkey);
          });
          favoritos.push({url:url,title:o.MenuSubTitulo,iframe:o.MenuIFRAME,cant:0,encodedUrl:encodedUrl});
        }
      });
    }
    return undefined;
    let accesos;
    try {
      // traigo la info desde la cache
      accesos = await sails.memcached.GetMulti(memkeys);
    } catch (e) {
      return undefined;
    }
    // calculo el uso de cada opción de menú en favoritos
    favoritos.forEach(function(favorito){
      for (let d=1; d<sails.config.timeout.favoritos; d++) {
        const memkey = sails.config.prefix.favoritos+ultimosDias[d]+favorito.encodedUrl;
        if (accesos[memkey]) {
          // el peso es -(x+F)*(x-F)/F/F con F el total de días que se toman en cuenta
          const peso = -(d+sails.config.timeout.favoritos)*(d-sails.config.timeout.favoritos)/sails.config.timeout.favoritos/sails.config.timeout.favoritos;
          favorito.cant = favorito.cant + accesos[memkey] * peso;
        }
      }
    });
    // elimino los favoritos que no tuvieron uso
    for (let i=0; i<favoritos.length; i++) {
      if (favoritos[i].cant == 0) {
        favoritos.splice(i, 1);
        i--;
      }
    }
    // ordeno los que quedaron
    favoritos = favoritos.sort((a,b) => b.cant < a.cant ? -1 : b.cant != a.cant);
    // dejo solo los 10 primeros
    favoritos.splice(10);
    return favoritos;
  },

};


Date.prototype.fechahora_toYMDString = function() {
  const sprintf = require("sprintf");
  return sprintf("%04d%02d%02d", this.getFullYear(),this.getMonth()+1,this.getDate());
};

function mkUltimosDias(n) {
  let d = new Date();
  let ultimos = [];
  for (let i=0; i<n; i++) {
    ultimos.push(d.fechahora_toYMDString());
    d.setDate(d.getDate() - 1);
  }
  return ultimos;
}
