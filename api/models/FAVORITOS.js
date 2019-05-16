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
    url:'string',
    title:'string',
    iframe:'string',
    cant:'number',
    encodedUrl:'string',
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

  listaFavoritos: async function (userid,menues) {
    let memkey = sails.config.prefix.favoritosUsuario+userid;
    try {
      let favoritos = await sails.memcached.Get(memkey);
      if (!favoritos) {
        throw 'CACHE MISS';
      }
      sails.log.debug("tomo favoritos de la cache");
      return favoritos;
    } catch (e) {
      sails.log.debug("listaFavoritos",e);
      // cache miss or cache error
      try {
        let favoritos = await calculoFavoritos(menues);
        if (favoritos && favoritos.length>0) {
          await sails.memcached.Set(memkey, favoritos, sails.config.timeout.favoritosUsuario);
        }
        return favoritos;
      } catch (e) {
        return undefined;
      }
    }
  },

};

/*                            _
                    _ __ ___ (_)___  ___
                   | '_ ` _ \| / __|/ __|
                   | | | | | | \__ \ (__
                   |_| |_| |_|_|___/\___|
*/

Date.prototype.fechahora_toYMDString = function() {
  const sprintf = require("sprintf");
  return sprintf("%04d%02d%02d", this.getFullYear(),this.getMonth()+1,this.getDate());
};

function cmp (a, b) {
    return a - b;
}

function mkUltimosDias(n) {
  let d = new Date();
  let ultimos = [];
  for (let i=0; i<n; i++) {
    ultimos.push(d.fechahora_toYMDString());
    d.setDate(d.getDate() - 1);
  }
  return ultimos;
}

async function actualizoAccesos(favoritos,memkeys,ultimosDias) {
  // traigo la info desde la cache
  let accesos = await sails.memcached.GetMulti(memkeys);
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
  return favoritos;
}

function menues2ObjArr(menues) {
  let favoritos = [];
  for (const m in menues) {
    menues[m].forEach(function(o){
      if (o.MenuObjPath) {
        const url = o.MenuObjPath+(o.MenuObjId ? o.MenuObjId : '');
        const encodedUrl = encodeURI(url).substr(0,sails.config.memcachedmaxKeySize-sails.config.prefix.favoritos.length-8);
        favoritos.push({url:url,title:o.MenuSubTitulo,iframe:o.MenuIFRAME,cant:0,encodedUrl:encodedUrl});
      }
    });
  }
  return favoritos;
}

async function calculoFavoritos(menues) {
  sails.log.debug("recalculo favoritos");
  let favoritos = menues2ObjArr(menues);
  // armo la lista de claves que tengo que traer de la cache
  let memkeys = [];
  let ultimosDias = mkUltimosDias(sails.config.timeout.favoritos);
  favoritos.forEach(function(favorito){
    ultimosDias.forEach(function(dia){
      const memkey = sails.config.prefix.favoritos+dia+favorito.encodedUrl;
      memkeys.push(memkey);
    });
  });
  try {
    favoritos = await actualizoAccesos(favoritos,memkeys,ultimosDias);
  } catch (e) {
    return undefined;
  }
  // ordeno según la cantidad de accesos
  favoritos = favoritos.sort((a,b) => cmp(b.cant,a.cant));
  // copio los 10 primeros a la salida
  let salida = [];
  for (let i=0; i<Math.min(10,favoritos.length) && favoritos[i].cant>0; i++) {
    salida.push(favoritos[i]);
  }
  sails.log.debug("calculoFavoritos",salida);
  return salida;
}
