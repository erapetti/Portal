/**
 * PortalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 *
 * Ascii art: http://www.network-science.de/ascii/ font:"standard", reflection:no, adjustement:center, stretch:no, width:60
 */

const util = require('util');
const Memcached = require('memcached');
sails.memcached = new Memcached(sails.config.memcached);
sails.memcached.Get = util.promisify(sails.memcached.get);
sails.memcached.Set = util.promisify(sails.memcached.set);
sails.memcached.Delete = util.promisify(sails.memcached.delete);
sails.memcached.Incr = util.promisify(sails.memcached.incr);
sails.memcached.GetMulti = util.promisify(sails.memcached.getMulti);

module.exports = {
/*                 _             _
                  | | ___   __ _(_)_ __
                  | |/ _ \ / _` | | '_ \
                  | | (_) | (_| | | | | |
                  |_|\___/ \__, |_|_| |_|
                           |___/
*/
  login: async function(req,res) {
    const base64 = require('base-64');

    const userId = (req.param('userid') || '').replace(/ /g,'').toLowerCase().checkFormat(/[a-z]{1,4}\d+/);
    const password = (req.param('password') || '').checkFormat(/[a-zA-Z0-9áéíóúñäëïöüÁÉÍÓÚÑÄËÏÖÜçÇ,;.:ºª!|"@·#$~%&¬/()=?¿¡+*{}\t _-]+/);
    const secret = (req.param('secret') || '').toLowerCase().checkFormat(/[a-f\d]+\.[a-f\d]+/);
    let redirect = (req.param('r') || '').checkFormat(/[\w\d_.?=/%-]+/);
    let r64 = (req.param('r64') || '').checkFormat(/[\w\d_=/%\r\n]+/);
    if (!redirect && r64) {
      try {
        redirect = base64.decode(r64).checkFormat(/[\w\d_.?=/%:-]+/);
      } catch (ignore) { }
    } else if (redirect && !r64) {
      try {
        r64 = base64.encode(redirect);
      } catch (ignore) { }
    }

    let mensaje = undefined;

    if (req.sesion) {
      // ya hay una sesión válida
      await SEGSESIONES.updateSession(req.sesion.id);
      return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));
    }

    if (!userId && password) {
      mensaje = "Nombre de usuario incorrecto";
    } else if (userId && !password) {
      mensaje = "Hay caracteres no válidos en la contraseña"
    } else if (userId && password && secret){
      try {
        await sails.helpers.validateSecret(secret,req.ip);
        // await sails.helpers.validatePassword(userId,password,req.ip);
        // Creo la nueva sesión en la base de datos:
        const sessionId = await SEGSESIONES.newSession(userId);
        // Mando la cookie con el id de sesión
        setCookie(res,'SESION',sessionId);
        // Registro el ingreso en el log
        await SEGLOG.write(req,userId,1,'Usuario '+userId+' , Ingreso exitoso sesión '+sessionId+' desde '+req.ip);
        // Redireciono al cliente a la página con el menú
        return res.redirect((redirect ? redirect : sails.config.custom.baseUrl + "principales"));

      } catch (err) {
        mensaje=err.message;
      }
    }

    // borro la cookie de sesión por si existe pero está vencida:
    setCookie(res,'SESION',undefined);

    // genero un nuevo secret para cada pedido:
    const newsecret = await sails.helpers.newSecret(req.ip);

    let viewdata = {
      title:'Ingreso al Portal de Servicios',
      id:'login',
      mensaje:mensaje,
      secret:newsecret,
      r64:r64,
      descripcion:'',
      mtime:'',
    };

    // leo la descripción de la imagen de fondo
    try {
      viewdata.descripcion = await leoDescripcion('assets/images/fondo/descripcion.html');
    } catch (ignore) { }

    try {
      viewdata.mtime = await modificationTime('assets/images/fondo/background.png');
    } catch (ignore) { }

    return res.view(viewdata);
  },

/*              _            _             _
     _ __  _ __(_)_ __   ___(_)_ __   __ _| | ___  ___
    | '_ \| '__| | '_ \ / __| | '_ \ / _` | |/ _ \/ __|
    | |_) | |  | | | | | (__| | |_) | (_| | |  __/\__ \
    | .__/|_|  |_|_| |_|\___|_| .__/ \__,_|_|\___||___/
    |_|                       |_|
*/
  principales: async function(req,res) {

    let viewdata = {
      title: 'Portal de Servicios',
      id: 'principales',
      hay_email: !!req.sesion.email,
      hay_notificaciones: 0,
      nombre: req.sesion.PerNombreCompleto,
    };

    try {
      const newd = (req.param('d') || '').checkFormat(/\d+/);
      const newl = (req.param('l') || '').checkFormat(/\d+/);

      if (newd && newl) {
        // cambio de dependencia
        await SEGSESIONES.updateSession(req.sesion.id, newd, newl);
        // redirecciono para limpiar la URL
        return res.redirect(sails.config.custom.baseUrl + "principales");
      }

      // Obtengo los grupos
      const grupos = await SEGRELACION_GRUPO_USUARIO.grupos(req.sesion.SesionesUserId);
      viewdata.grupos = grupos;

      // genero un array con las dependencias del usuario
      const listaDependencias = unicos(grupos,{
        filter: (g => !!g.DependId && !!g.LugarId),
        map: (g => ({ dependId:g.DependId.id, lugarId:g.LugarId.id, dependLugarDesc:mkDependLugarDesc(g.DependId.DependDesc,g.LugarId.LugarDesc) })),
        getId: d => (d.dependId+':'+d.lugarId)
      });
      viewdata.dependencias = listaDependencias;
      viewdata.dependLugarDesc = findDependLugarDesc(listaDependencias, req.sesion.SesionesDependId, req.sesion.SesionesLugarId);

      if (!req.sesion.SesionesDependId && !req.sesion.SesionesLugarId) {
        if (typeof dependencias !== 'undefined' && dependencias.length == 1) {
          // tiene una sola dependencia entonces fuerzo el cambio hacia ahi
          req.sesion = await SEGSESIONES.updateSession(req.sesion.id, dependencias[0].dependId, dependencias[0].lugarId);
        }
      }

      // Obtengo las opciones de menú para la dependencia actual y la dependencia null
      viewdata.menues = await obtengoMenues(grupos, req.sesion.SesionesDependId, req.sesion.SesionesLugarId);

      // Obtengo la lista de favoritos asociada a los menues del usuario
      viewdata.favoritos = await FAVORITOS.listaFavoritos(req.sesion.SesionesUserId, viewdata.menues);

    } catch(e) {
      viewdata.mensaje = (typeof e.message === 'string' ? e.message : 'Error al generar la página. Reintente luego');
      sails.log.debug(e);
    }

    return res.view(viewdata);
  },

/*             _                         _
              | | ___   __ _  ___  _   _| |_
              | |/ _ \ / _` |/ _ \| | | | __|
              | | (_) | (_| | (_) | |_| | |_
              |_|\___/ \__, |\___/ \__,_|\__|
                       |___/
*/
  logout: async function(req,res) {
    try {
      await SEGSESIONES.endSession(req.sesion.id);
    } catch (ignore) { }
    setCookie(res,'SESION',undefined);
    return res.redirect(sails.config.custom.baseUrl);
  },

/*              ___ ___  _ __ _ __ ___  ___
               / __/ _ \| '__| '__/ _ \/ _ \
              | (_| (_) | |  | | |  __/ (_) |
               \___\___/|_|  |_|  \___|\___/
*/
  correo: async function(req,res) {
    if (!sails.config.paths.cantCorreos || !req.sesion.email) {
      return res.json({error:"No está configurada la dirección de correo del usuario"});
    }
    let memkey = sails.config.prefix.cantCorreos+req.sesion.SesionesUserId;
    let resp = { error: "No se pudo obtener la cantidad de correos pendientes" };
    try {
      resp = await sails.memcached.Get(memkey);
      if (typeof resp === 'undefined') {
        throw 'CACHE MISS';
      }
      sails.log.debug("cant correos tomado de cache ",resp);
    } catch(err) {
      // no está en cache
      try {
        resp = await getURL(sails.config.paths.cantCorreos);
        if (typeof resp !== 'undefined' && resp.cant.checkFormat(/\d+\+?/)) {
          sails.log("correo set ",resp);
          try {
            // lo guardo en cache hasta 5 segundos antes del próximo pedido
            await sails.memcached.Set(memkey, resp, sails.config.intervaloCorreo-5);
          } catch (ignore) { }
        }

      } catch(e) {
        resp = e.message ? {error:e.message} : e;
      }
    }
    return res.json(resp);
  },

  // solo para testing
  cantCorreos: async function(req,res) {
    return res.json({cant:"10+"});
  },

/*                             _
                ___ ___  _ __ | |_ __ _ _ __
               / __/ _ \| '_ \| __/ _` | '__|
              | (_| (_) | | | | || (_| | |
               \___\___/|_| |_|\__\__,_|_|
*/
  contar: async function(req,res) {
    if (!req.sesion) {
      return res.json({error:'SESSION TIMEDOUT'});
    }

    const url = (req.param('url') || '').checkFormat(/[\w\d\/\.? \n()'";=:+&áéíóúñüÁÉÍÓÚÑÜ_-]+/);
    if (typeof url === 'undefined') {
      sails.log.debug("contar: no hay url, entra con",req.param('url'));
      return res.json({error:'URL EXPECTED'});
    }
    await FAVORITOS.contar(url);

    return res.json();
  },

/*               __                 _
                / _| ___  _ __   __| | ___
               | |_ / _ \| '_ \ / _` |/ _ \
               |  _| (_) | | | | (_| | (_) |
               |_|  \___/|_| |_|\__,_|\___/

*/
  fondo: async function(req,res) {
sails.log.debug("Entra fondo");
    try {
      const permisos = await sails.helpers.validateAccess(req.sesion.SesionesUserId, req.sesion.SesionesDependId, req.sesion.SesionesLugarId, '/fondo');
      sails.log("permisos",permisos,"DSP",permisos.DSP);
      if (!permisos.DSP) {
        throw AccessDenied;
      }
    } catch (e) {
      return res.serverError(new Error('No tiene permiso para acceder a esta página'));
    }

    let viewdata = {
      id: 'fondo',
      title: 'Selección de imagen de fondo',
      mensaje:undefined,
      mtime:'',
      images: [],
    };

    try {
      try {
        viewdata.mtime = await modificationTime('assets/images/fondo/background.png');
      } catch (ignore) { }
      viewdata.images = await fondosDisponibles();
      const img = (req.param('img') || '').checkFormat(/[\w.-]+/);

      if (req.param('upload') && req.file('adjunto')) {
        const descripcion = req.param('descripcion');
        sails.log.debug("upload", descripcion);
        await subirFondo(req.file('adjunto'), descripcion);
        return res.redirect(sails.config.custom.baseUrl+"fondo");
      }
      if (req.param('borrar') && img) {
        sails.log.debug("borrar",img);
        await borrarFondo(img);
        return res.redirect(sails.config.custom.baseUrl+"fondo");
      }
      if (req.param('activar') && img) {
        sails.log.debug("activar",img);
        await activarFondo(img);
        return res.redirect(sails.config.custom.baseUrl+"fondo");
      }

    } catch(e) {
      viewdata.mensaje = e.message;
      return res.view(viewdata);
    }

    return res.view(viewdata);
  },

};

/*                            _
                    _ __ ___ (_)___  ___
                   | '_ ` _ \| / __|/ __|
                   | | | | | | \__ \ (__
                   |_| |_| |_|_|___/\___|
*/


Date.prototype.fechahora_toGXString = function() {
  const sprintf = require("sprintf");
  return sprintf("%02d/%02d/%02d %02d:%02d:%02d", this.getDate(),this.getMonth()+1,this.getFullYear()-2000,this.getHours(),this.getMinutes(),this.getSeconds());
};

String.prototype.checkFormat = function(regexp) {
  if (typeof this === 'undefined') {
    return undefined;
  }
  if (typeof regexp === 'string') {
    regexp = new RegExp('^'+regexp+'$');
  } else {
    regexp = new RegExp('^'+regexp.source+'$');
  }
  return (this.match(regexp) ? this.toString() : undefined);
};

function cmp (a, b) {
    return a - b;
}

function setCookie(res,cookie,val) {
  if (val) {
    res.cookie(cookie, val, { maxAge: sails.config.timeout.sesion*1000, httpOnly: true });
  } else {
    res.cookie(cookie, '', { maxAge: 0, httpOnly: true });
  }
}

async function leoDescripcion(filename) {
  const fs = require('fs');
  const readFile = util.promisify(fs.readFile);
  return await readFile(filename, 'utf8');
}

function filename2description(filename) {
  return (filename.lastIndexOf('.')>=0 ? filename.substr(0,filename.lastIndexOf('.')) : filename)+".html";
}

async function subirFondo(adjunto,descripcion) {
  adjunto.uploadPromise = util.promisify(adjunto.upload);
  const uploadedFiles = await adjunto.uploadPromise({maxBytes: 10000000});

  if (!uploadedFiles || uploadedFiles.length === 0){
    throw new Error('No file was uploaded');
  }
  await guardarFondo(uploadedFiles[0].fd, descripcion);
}

async function guardarFondo(filepath, description) {
  const fs = require('fs');
  const writeFile = util.promisify(fs.writeFile);
  const rename = util.promisify(fs.rename);
  const dirFondos = "./assets/images/fondo/";
  const filename = filepath.lastIndexOf('/')>=0 ? filepath.substr(filepath.lastIndexOf('/')+1) : filepath;

  if (description) {
    await writeFile(dirFondos+filename2description(filename), description);
  }
  return await rename(filepath, dirFondos+filename);
}

async function borrarFondo(filename) {
  const fs = require('fs');
  const unlink = util.promisify(fs.unlink);
  const dirFondos = "./assets/images/fondo/";
  await unlink(dirFondos+filename);
  try {
    await unlink(dirFondos+filename2description(filename));
  } catch(ignore) { }
}

async function activarFondo(filename) {
    const fs = require('fs');
    const copyFile = util.promisify(fs.copyFile);
    const dirFondos = "./assets/images/fondo/";
    sails.log(await modificationTime(dirFondos+'background.png'));
    await copyFile(dirFondos+filename, dirFondos+'background.png');
    //sails.log.info(fs.statSync(dirFondos+'background.png').mtimeMs);
    //fs.copyFileSync(dirFondos+filename, dirFondos+'background.png');
    //sails.log.info(fs.statSync(dirFondos+'background.png').mtimeMs);
    sails.log(await modificationTime(dirFondos+'background.png'));
    sails.log('activarFondo',dirFondos+filename, dirFondos+'background.png');
    //const sleep = util.promisify(setTimeout);
    //await sleep(5000);
    //sails.log("sale sleep");
}

async function fondosDisponibles() {
  Array.prototype.add = async function add(f) {
    if (f.match(/\.(png|jpg)$/i) && f != 'background.png') {
      let obj = {filename:f};
      try {
        obj.mtime = await modificationTime(dirFondos+f);
      } catch (ignore) { }
      listado.push(obj);
    }
  };

  let listado= [];
  const fs = require('fs');
  const readdir = util.promisify(fs.readdir);
  const dirFondos = "./assets/images/fondo/";
  const files = await readdir(dirFondos);
  await Promise.all( files.map((f) => listado.add(f)) );
  return listado;
}

async function modificationTime(filename) {
  const fs = require('fs');
  const stat = util.promisify(fs.stat);
  const s = await stat(filename);
  return (typeof s !== 'undefined' ? s.mtimeMs : undefined);
}

function mkDependLugarDesc(dependDesc,lugarDesc) {
  return (dependDesc==lugarDesc ? dependDesc : dependDesc+'/'+lugarDesc).substr(0,40);
}

function findDependLugarDesc(dependencias,dependId,lugarId) {
  if (!dependId || !lugarId) {
    return 'Seleccione una ubicación';
  }
  const dep = dependencias.filter(d => d.dependId==dependId && d.lugarId==lugarId);
  return (dep.length==0 ? 'S/D' : dep[0].dependLugarDesc);
}

function unicos(arrobj,opc) {
  if (typeof opc.filter == 'function') {
    arrobj = arrobj.filter(opc.filter);
  }
  if (typeof opc.map == 'function') {
    arrobj = arrobj.map(opc.map);
  }
  let lista;
  if (typeof opc.getId == 'function') {
    lista = _.uniq( arrobj, false, opc.getId );
  } else {
    lista = _.uniq( arrobj );
  }
  return lista;
}

// devuelve las opciones de menú para los grupos de esta dependencia + los
// grupos de la dependencia null (que aplican para todos) + el grupo G_TODOS
async function obtengoMenues(grupos,dependId,lugarId) {

  // los grupos que voy a usar:
  let listaGrupos = unicos( grupos, {
    filter: (g => (!g.DependId || g.DependId.id==dependId) && (!g.LugarId || g.LugarId.id==lugarId)),
    map: g => g.GrupId
  });
  //listaGrupos.push('G_TODOS');
  const menues = await SEGRELACION_GRUPO_MENU.menues(listaGrupos);
  const listaMenues = unicos( menues, {
    filter: m => m.MenuId != 'X_ADMINISTRAR_PERFIL',
    map: m => m.MenuId
  });
  const opciones = await SEGMENUESOPCIONES.opciones(listaMenues);
  const listaOpciones = unicos( opciones, {
    getId: (o => JSON.stringify([o.MenuId,o.MenuSubTitulo,o.MenuNivel1,o.MenuNivel2,o.MenuNivel3,o.MenuNivel4,o.MenuNivel5,o.MenuNivel6,o.MenuObjPath,o.MenuObjId]))
  });
  // calculo el "nivel" de cada opción:
  listaOpciones.forEach(o => {
    o.nivel = o.MenuNivel6 ? 6 : o.MenuNivel5 ? 5 : o.MenuNivel4 ? 4 : o.MenuNivel3 ? 3 : o.MenuNivel2 ? 2 : 1;
  });
  // prefijos de MenuId asociados con menúes específicos
  const mapeoMenues = {MA_:"Alumnos", MP_:"Personal", ML_:"Liceo"};
  // construyo los menúes recorriendo listaMenues
  return listaMenues.reduce(function(result, menuId) {
      const listaOpcionesDelMenu =
        listaOpciones.filter(o => o.MenuId == menuId)
          .sort((a,b) => cmp(
            JSON.stringify([a.MenuNivel1,a.MenuNivel2,a.MenuNivel3,a.MenuNivel4,a.MenuNivel5,a.MenuNivel6]),
            JSON.stringify([b.MenuNivel1,b.MenuNivel2,b.MenuNivel3,b.MenuNivel4,b.MenuNivel5,b.MenuNivel6])
          ));
      //agrego estas opciones a las que ya tenía
       Array.prototype.push.apply(result[mapeoMenues[menuId.substr(0,3)] || 'General'], listaOpcionesDelMenu);
      // devuelvo el objeto con todos los menúes que fui encontrando y sus opciones
      return result;
    },
    {General:[], Alumnos:[], Personal:[], Liceo:[]}
  );
}

async function getURL(url) {
  const http = require('http');
  let promise = new Promise((resolve,reject) => {
    http.get(url, function(res) {
      let body = '';
      res.on('data', (data) => {
        body += data;
      });
      res.on('end', () => {
        try {
          return resolve(JSON.parse(body));
        } catch (e) {
          return reject(e);
        }
      });
      res.on('error', (err) => {
        return reject(err.message);
      })
    });
  });
  return promise;
}
