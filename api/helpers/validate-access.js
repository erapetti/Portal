

module.exports = {

  friendlyName: 'Validate access',

  description: 'Valida si la sesión tiene permisos de acceso a la URL actual',

  inputs: {
    userId: { type: 'string', example: 'u12345678', description: 'userId del Portal', required: true },
    dependId: { type: 'number', description: 'número de dependencia', required: true },
    lugarId: { type: 'number', description: 'número de lugar', required: true },
    url: { type: 'string', description: 'URL a la cual se quiere acceder', required: true },
    wanted: { type: 'string', example: 'DSP', description: 'acceso que se quiere solicitar' },
  },

  exits: {
    success: {
      description: 'Tiene acceso',
      permisos: {INS:'number', DEL:'number',EJE:'number',UPD:'number',DSP:'number'}
    },
    error: {
      description: 'No tiene accesso',
    }
  },

  fn: async function (inputs,exits) {

    try {
      let objId = inputs.url;
      if (inputs.url.lastIndexOf('/') >= 0) {
        objId = inputs.url.substr(inputs.url.lastIndexOf('/')+1);
      }
      sails.log.debug("validate-access url=",inputs.url,"dependid=",inputs.dependId,"obj=",objId);
      const permisos = await SEGRELACION_MENU_OBJETO.getDatastore().sendNativeQuery(`
        select max(PrmObjAccionAltas<=GrupNivelObjeto) INS,
               max(PrmObjAccionBajas<=GrupNivelObjeto) DEL,
               max(PrmObjAccionEjecutar<=GrupNivelObjeto) EJE,
               max(PrmObjAccionModificaciones<=GrupNivelObjeto) UPD,
               max(PrmObjAccionLeer<=GrupNivelObjeto) DSP
        from SEGRELACION_GRUPO_USUARIO rgu
        join SEGGRUPOS g on g.GrupId='G_TODOS' or g.GrupId=rgu.GrupId
        join SEGRELACION_GRUPO_MENU rgm on rgm.GrupId=g.GrupId
        join SEGMENUES using (menuid)
        join SEGMENUESOPCIONES using (menuid)
        join SEGRELACION_MENU_OBJETO using (menuid)
        where userid=$1
          and (DependId=0 or DependId=$2)
          and (LugarId=0 or LugarId=$3)
          and GrupUsrStatusFchIni <= curdate()
          and ( GrupUsrStatusFchFin = '1000-01-01' or GrupUsrStatusFchFin >= curdate() )
          and PrmObjId=$4
        `, [inputs.userId, (inputs.dependId ? inputs.dependId : 0), (inputs.lugarId ? inputs.lugarId : 0), objId]);
        sails.log("validate-access",permisos.rows[0]);
      return exits.success(permisos.rows[0]);

    } catch(e) {
      sails.log.error("validateAccess: url:",inputs.url,"dependid:",inputs.dependId,e);
      return exits.error(e);
    }
  }

};
