use SOAP::Lite;
use POSIX;
use Crypt::OpenSSL::Random;
use LWP::UserAgent;
use Cache::Memcached;
use DateTime;
use config;

package portal3;

sub init() ;
sub getSession($;$) ;
sub dbConnect(;$$$) ;
sub dbDisconnect ($) ;
sub dbGet ($$$$$) ;
sub dbInsert ($$%) ;
sub dbUpdate ($$$%) ;
sub _dbUpdate ($$$%) ;
sub dbDelete ($$%) ;
sub dbAudit ($$$) ;
sub validoSesion($$$) ;
sub leoPermiso($$) ;
sub myScriptName() ;
sub checkFormat($$) ;
sub error($;$) ;
sub nombreCompleto($) ;
sub dependencias($) ;
sub opcionesMenu($$$) ;
sub userInfo($$$) ;
sub newSession($) ;
sub updateSession($;$$) ;
sub endSession($) ;
sub portal_url(;$) ;
sub validatePassword($$) ;
sub newSecret() ;
sub validateSecret($) ;
sub notifications($) ;
sub validateToken($) ;
sub unreadEmail($) ;
sub addlog_db($$$) ;


require Exporter;
@ISA = qw(Exporter);
@EXPORT_OK = qw(
	getSession
	leoPermiso
	dbConnect
	dbDisconnect 
	dbGet 
	dbInsert 
	dbUpdate 
	dbDelete 
	dbAudit 
	validoSesion
	myScriptName
	checkFormat
	error
	userInfo
	updateSession
	endSession
	portal_url
	newSession
	validatePassword
	newSecret
	validateSecret
	notifications
	validateToken
	unreadEmail
	addlog_db
);

$::SESSION_TIMEOUT = 24 * 60 * 60; # duración de una sesión en el portal



sub getSession($;$) {
	my ($cookie,$onerrorreturn) = @_;

	my @result = _getSession($cookie);

	my $error = shift @result;

	if ($error ne "OK") {
		if (! $onerrorreturn) {
			if ($::debug) {
				print "getSession: error=$error\n";
			} else {
				print CGI::redirect( portal_url("login") );
			}
			exit(0);
		} else {
			return ();
		}
	}

        return @result; # $userid,$sessionid,$dependid,$lugarid,$grupid,$grupnivel,$timestamp,email
}

sub _getSession($) {
	my ($cookie) = @_;

	$cookie =~ /^ *([a-zA-Z\d]+) *$/ || return "Sesión no válida. Reinicie su conexión con el portal de servicios".($::debug ? ". Cookie no válida: $cookie" : "");

	my $sessionid = $1;

	my $sesion ;#= $::cache->get("$sessionid");

	if (!defined($sesion->{SesionesId}) or $sesion->{SesionesId} ne $sessionid) {

		my $sth = dbGet($::dbh_portal,
				"SEGSESIONES left join sso.sso on SesionesUserId=userid",
				["SesionesUserId","SesionesId","SesionesDependId","SesionesLugarId","SesionesGrupId","SesionesGrupNivelObjeto","SesionesTime","email"],
				"SesionesId='$sessionid'",
				"");

		($sth) || error("No se puede consultar la base de datos: ".$DBD::errstr,404);

		@row = $sth->fetchrow_array;
		$sth->finish;

		(defined($row[0])) || return "Sesión no válida. Reinicie su conexión con el portal de servicios".($::debug ? ". No está la sesión en la base de datos" : "");

	} else {

		@row = ($sesion->{SesionesUserId}, $sesion->{SesionesId}, $sesion->{SesionesDependId},
		        $sesion->{SesionesLugarId}, $sesion->{SesionesGrupId}, $sesion->{SesionesGrupNivelObjeto},
		        $sesion->{SesionesTime}, $sesion->{email});
	}

	if ($row[6] !~ /^ *(..)\/(..)\/(..) (..):(..):(..) *$/) {
		return "Sesión no válida. Reinicie su conexión con el portal de servicios".($::debug ? ". Fecha en formato inválido: ".$row[6] : "");
	}

	my $sessiontimestamp = POSIX::mktime($6,$5,$4,$1,$2-1,$3+100);
	if ($sessiontimestamp < time()-$::SESSION_TIMEOUT) {
		return "Sesión no válida. Reinicie su conexión con el portal de servicios".($::debug ? ". Fecha muy vieja: ".$sessiontimestamp : "");
	}

        return ("OK",@row); # OK,$userid,$sessionid,$dependid,$lugarid,$grupid,$grupnivel,$timestamp,$email
}

# Crea una nueva sesión
sub newSession($) {
	my ($userid) = @_;

	Crypt::OpenSSL::Random::random_seed(time());
	my $sessionid = unpack 'L2',Crypt::OpenSSL::Random::random_bytes(8);

	my ($sec,$min,$hour,$mday,$mon,$year) = localtime(time);
	my $time = sprintf "%02d/%02d/%02d %02d:%02d:%02d",$mday,$mon+1,$year%100,$hour,$min,$sec;

	# Borro sesiones vencidas
	my $sth = dbGet($::dbh_portal, "SEGSESIONES", ["SesionesId","SesionesTime"], "SesionesUserId='$userid'", "");
	if ($sth) {
		while (my @row = $sth->fetchrow_array) {
			if ($row[1] =~ /^ *(..)\/(..)\/(..) (..):(..):(..) *$/) {
				my $sessiontimestamp = POSIX::mktime($6,$5,$4,$1,$2-1,$3+100);
				if ($sessiontimestamp < time()-$::SESSION_TIMEOUT) {
					endSession($row[0]);
				}
			}
		}
		$sth->finish;
	}

	my $email;
	$sth = dbGet($::dbh_portal, "sso.sso", ["email"], "userid='$userid' and activa<>'N'", "");
	if ($sth) {
		($email) = $sth->fetchrow_array;
		$sth->finish;
	}

	my %valores = (SesionesId=>$sessionid, SesionesUserId=>$userid, SesionesDependId=>0, SesionesLugarId=>0, SesionesTime=>$time, email=>$email);

	$::cache->set("$sessionid", \%valores, $::CACHE_TTL);

	delete $valores{email}; # Esto no se guarda en la base de datos

	return ( dbInsert($::dbh_portal, "SEGSESIONES", %valores) == 0 ? $sessionid : undef );
}

sub updateSession($;$$) {
	my ($sessionid,$dependid,$lugarid) = @_;

	$::dbh_portal->{AutoCommit} = 0;

	my $sth = dbGet($::dbh_portal,
		"SEGSESIONES",
		["SesionesId","SesionesUserId","SesionesDependId","SesionesLugarId"],
		"SesionesId='$sessionid'",
		"for update");

	($sth) || error("No se puede consultar la base de datos: ".$DBD::errstr,404);

	my ($sec,$min,$hour,$mday,$mon,$year) = localtime(time);
	my $time = sprintf "%02d/%02d/%02d %02d:%02d:%02d",$mday,$mon+1,$year%100,$hour,$min,$sec;
	my %valores = (SesionesTime=>$time);
	if (defined($dependid) && defined($lugarid)) {
		$valores{SesionesDependId} = $dependid;
		$valores{SesionesLugarId} = $lugarid;
	}
	if ( dbUpdate($::dbh_portal, "SEGSESIONES", "SesionesId='$sessionid'", %valores) ) {
		($sth) || error("No se puede actualizar la sesión: ".$DBD::errstr,404);
	}

	$sth->finish;

	$::dbh_portal->commit();
	$::dbh_portal->{AutoCommit} = 1;
}

sub endSession($) {
	my ($sessionid) = @_;

	$::cache->delete("$sessionid");

	my %valores = (SesionesId=>$sessionid);
	return dbDelete ($::dbh_portal,"SEGSESIONES",%valores);
}

# Verifica si el usuario tiene el permiso dado (valores posibles: INS, DLT, EJE, UPD, DSP)
sub leoPermiso($$) {
         my ($sessionid,$modo) = @_;

         my $name = CGI::script_name();
         $name =~ s%.*/%%;

         my $ws = SOAP::Lite->service('file:aws_autorizar_usuario_objeto.wsdl')
                              ->proxy('http://servicios.ces.edu.uy/Portal/servlet/aws_autorizar_usuario_objeto')
                              ->ns('http://servicios.ces.edu.uy/Portal/servlet/aws_autorizar_usuario_objeto','tns');

         my ($autorizado,$path) = $ws->call( SOAP::Data->name('ws_autorizar_usuario_objeto.Execute')->attr({xmlns => 'portal3Ev2'}),
                                                 (SOAP::Data->name('Sesionesid')->value($sessionid),
                                                  SOAP::Data->name('Programa')->value($name),
                                                  SOAP::Data->name('Modo')->value($modo)
                                                 )
                                                )->paramsall;

         return ($autorizado eq 'S');
}

sub dbConnect(;$$$) {
        my ($base,$user,$pass) = @_;

        my ($db,$host,$dbh);

        if ($base eq "Portal") {
                $db="Portal";
                $host="sdb";
                $user=$::dbuser;
                $pass=$::dbpass;
        }
        $dbh = DBI->connect("DBI:mysql:$db:$host:3306",$user,$pass);
	$dbh->do("set character set utf8");

        return $dbh;
}

sub dbDisconnect ($) {
	$_[0]->disconnect();
}

sub dbGet ($$$$$) {
	my ($dbh,$tabla,$rcolumnas,$condicion,$extra) = @_;

	my $sql;
	if ($rcolumnas && $tabla) {
		$sql = "SELECT ". join(',',@$rcolumnas). " FROM $tabla";
	}
	($condicion) and $sql .= " WHERE $condicion";
	($extra) and $sql .= " $extra";

	($::debug) and print "$sql<br>\n";

	my $sth = $dbh->prepare($sql);
	$sth->execute();

	return $sth;
}

sub dbInsert ($$%) {
	my ($dbh,$tabla,%valores) = @_;

	my $sql = "INSERT into $tabla (". join(',',keys %valores).
	      ") values ('". join("','",values %valores) ."')";

	($::debug) and print "$sql<br>\n";

	$dbh->do($sql);

	return $dbh->{'mysql_errno'};
}


sub dbUpdate ($$$%) {
	my ($dbh,$tabla,$condicion,%valores) = @_;
	foreach $_ (keys %valores) {
		$valores{$_}="'".$valores{$_}."'";
	}

	return _dbUpdate($dbh,$tabla,$condicion,%valores);
}

sub _dbUpdate ($$$%) {
	my ($dbh,$tabla,$condicion,%valores) = @_;

	my $valores;
	foreach $_ (keys %valores) {
		$valores .= "$_=$valores{$_},";
	}
	$valores =~ s/,$//;
	my $sql = "UPDATE $tabla set $valores WHERE $condicion";
	($::debug) and print "$sql";
	$dbh->do($sql);

	return $dbh->{'mysql_errno'};
}

sub dbDelete ($$%) {
	my ($dbh,$tabla,%valores) = @_;

	my $where;
	foreach $_ (keys %valores) {
		$where.= " $_='$valores{$_}'";
	}
	return 0 if (!$where);

	my $sql = "DELETE from $tabla WHERE $where";

	$dbh->do($sql);

	return ! $dbh->{'mysql_errno'};
}

sub dbAudit ($$$) {
	my ($dbh,$usuario,$objeto) = @_;

	my $ip = $ENV{REMOTE_ADDR};
	if ($ip =~ /^10\.200\.0\./ && $ENV{HTTP_X_FORWARDED_FOR}) {
		$ip = $ENV{HTTP_X_FORWARDED_FOR};
		$ip =~ s/127\.0\.0\.1//;
		$ip =~ s/, $//;
		$ip =~ s/^, //;
	}

	my $programa = script_name();
	$programa =~ s%.*/%%;

	my $sql = sprintf("INSERT INTO audit (ip,usuario,objeto,programa) VALUES ('%s','%s','%s','%s')",$ip,$usuario,$objeto,$programa);
	$dbh->do($sql);

	return ! $dbh->{'mysql_errno'};
}

# Devuelve true si la sesión actual del usuario coincide con la dada
sub validoSesion($$$) {
	my ($userid,$sessionid,$dbh) = @_;

	my $sth = dbGet($dbh,"SEGUSUARIOS",["UserRnd"],"UserId='$userid'","");
	my @row = $sth->fetchrow_array;
	$sth->finish();
	
	($::debug) && print "En la base sessionid=$row[0] en la cookie sessionid=$sessionid\n";

	return (defined($row[0]) && $row[0] == $sessionid);
}

sub myScriptName() {
	my $script_name = CGI::script_name();
	$script_name =~ s%.*/%%;
	$script_name =~ s%\.pl$%%;

	return $script_name;
}


# valida el string contra una regexp
sub checkFormat($$) {
	my ($str,$fmt) = @_;

	if (defined($str)) {
		my $aux = $str;
		$aux =~ /^\s*($fmt)\s*$/ and return $1;
	}

	return undef;
}

sub error($;$) {
	my ($texto,$codigo) = @_;

	my %param = (-charset=>'utf-8');
	if ($codigo) {
		$param{-status} = $codigo;
		print CGI::header(\%param),"\n";
		print CGI::start_html();
	}

	print CGI::h3("ERROR: $texto"),"\n";
	print CGI::end_html(),"\n";

	exit(0);
}

sub nombreCompleto($) {
	my ($userid) = @_;

	my $sth = dbGet($::dbh_portal,
			"SEGUSUARIOS join Personas.PERSONAS using (perid)",
			["pernombrecompleto"],
			"userid='$userid'",
			"");

	($sth) || error("No se puede consultar la base de datos: ".$DBD::errstr,404);

	my @row = $sth->fetchrow_array;
	$sth->finish;

	return $row[0];
}

# dependencias asociadas a un usuario en el portal
sub dependencias($) {
	my ($userid) = @_;

	my $sth = dbGet($::dbh_portal,
			'SEGRELACION_GRUPO_USUARIO join Direcciones.DEPENDENCIAS using (dependid) join Direcciones.LUGARES using (lugarid)',
			['dependid,lugarid,substr(if(dependdesc=lugardesc,dependdesc,lugardesc),1,40) dependlugar'],
			"userid='$userid' and (GrupUsrStatusFchFin='1000-01-01' or GrupUsrStatusFchFin>now()) and GrupUsrStatus='A'",
			"group by dependid,lugarid");
#			['dependid,lugarid,substr(if(dependdesc=lugardesc,dependdesc,concat(dependdesc,"/",lugardesc)),1,40) dependlugar'],

	($sth) || error("No se puede consultar la base de datos: ".$DBD::errstr,404);

	return $sth->fetchall_arrayref;
}

sub opcionesMenu($$$) {
	my ($userid,$dependid,$lugarid) = @_;

	my $sth = dbGet($::dbh_portal,
			"SEGRELACION_GRUPO_MENU
			join (select grupid from SEGRELACION_GRUPO_USUARIO where (userid='$userid' and ((dependid='$dependid' and lugarid='$lugarid') or (dependid=0 and lugarid=0)) and GrupUsrStatusFchIni<now() and (GrupUsrStatusFchFin='1000-01-01' or GrupUsrStatusFchFin>now()) and GrupUsrStatus='A') group by grupid
				union
				select 'G_TODOS' grupid) GRP using (grupid)
			join SEGMENUES using (menuid)
			join SEGMENUESOPCIONES using (menuid)",
			["trim(MenuSubTitulo)","MenuNivel1 n1","MenuNivel2 n2","MenuNivel3 n3","MenuNivel4 n4","MenuNivel5 n5","MenuNivel6 n6","MenuObjPath","MenuObjId","MenuIFRAME","MenuId"],
			"menuid<>'X_ADMINISTRAR_PERFIL'",
			"group by menuid,n1,n2,n3,n4,n5,n6 order by menuid,n1,n2,n3,n4,n5,n6,GrupMenuOrden");

	($sth) || error("No se puede consultar la base de datos: ".$DBD::errstr,404);

	return $sth->fetchall_arrayref;
}

# obtiene datos adicionales del usuario de la sesión
sub userInfo($$$) {
	my ($userid,$dependid,$lugarid) = @_;
	my %info;

	$info{nombre} = nombreCompleto($userid);
	$info{dependencias} = dependencias($userid);
	$info{menu} = opcionesMenu($userid,$dependid,$lugarid);

	return %info;
}

# url modificada porque el proxy le agrega /portal/ antes del cgi-bin
sub portal_url(;$) {
	my ($script_name) = @_;

	my $portal_url = CGI::url();
	$portal_url =~ s/cgi-bin/portal\/cgi-bin/;

	if ($script_name) {
		$portal_url =~ s%[^/]+/?$%%; # saco el último componente
		$portal_url .= $script_name; # agrego script_name
	}

	return $portal_url;
}

# Genera un nuevo secret para validar el acceso al formulario
sub newSecret() {
	my $time = time() - 1451617200;
	my $today = int($time / 36000);
	srand($time);
	my $seed = int(rand(1000000000));
	srand($seed);
	srand(int(rand(1000000000)));
	return $today.':'.$seed.':'.int(rand(1000000000));
}

sub validateSecret($) {
	my ($secret) = @_;

	my $time = time() - 1451617200;
	my ($today,$seed,$proposed) = split(':',$secret);
	srand($seed);
	srand(int(rand(1000000000)));
	return ($proposed == int(rand(1000000000))) && ($today == int($time / 36000));
}

# Valida usuario y contraseña
sub validatePassword($$) {
	my ($userid,$password) = @_;

	my $sth = dbGet($::dbh_portal,"SEGUSUARIOS",["UserIntLog","UserEstado","UserHab","UNIX_TIMESTAMP(UserDate)"],"userid='$userid'","");
	($sth) || return 1;

	my @row = $sth->fetchrow_array;
	(@row) || return 1;

	($row[1]==2 && $row[2]==1) || return 2; # usuario no habilitado o bloqueado

	my $userintlog = $row[0];
	($userintlog>5 and $row[3]>=time()-$userintlog*10) && return 3; # A partir del 5 fallo penalizo 10 segundos por cada error
	

	my $ldap = Net::LDAP->new('ldap.ces.edu.uy') or return 0;

	my $mesg = $ldap->bind("uid=$userid,ou=People,o=ces", password=>$password) or return 0;
	$ldap->unbind;

	if ($mesg->code() == 0) {
		#ingreso con éxito
		my %valores = (UserFchLog=>"now()",UserIntLog=>0);
		_dbUpdate($::dbh_portal,"SEGUSUARIOS","userid='$userid'",%valores);
		return 0;
	} else {
		# ingreso fallido
		my %valores = (UserDate=>"now()",UserIntLog=>$userintlog+1);
		_dbUpdate($::dbh_portal,"SEGUSUARIOS","userid='$userid'",%valores);

		sleep $userintlog;
		return 4;
	}

}

# Si este usuario tiene notificaciones pendientes
sub notifications($) {
	my ($userid) = @_;

	my $sth = dbGet($::dbh_portal,"notificaciones.NOTIFICADOS JOIN notificaciones.NOTIFICACIONES using (NotId)",
		["NotId"],
		"notsts='A' and NotUsrSts='A' and NotFchPub is not null and NotUsrFchNot='1000-01-01' and NotUsrFchPub<now() and NotUsrIdNot='$userid'",
		"limit 1");

        ($sth) || return -1;

        my @row = $sth->fetchrow_array;
        return defined($row[0]);
}

# Valida un token de Google Sign-in y devuelve el userid del Portal
sub validateToken ($) {
	my ($id_token) = @_;

	my $ua = LWP::UserAgent->new(ssl_opts => { verify_hostname => 1 });
	my $response = $ua->get("https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=$id_token");
	return undef unless (defined($response) && $response->is_success); # error de comunicación con Google

	my $content =  $response->decoded_content;
	return undef unless ($content =~ /["']41139243817-59sjiktp89dnettgtk1gm3kvhlu74o2q.apps.googleusercontent.com["']/); #error de client id

	$content =~ /["']exp["']: ["'](\d+)["']/;
	my $expiry = $1;
	return undef unless ($expiry > time()); # token expirado

	$content =~ /["']email["']: ["']([0-9a-zA-Z._+@%!]+)["']/;
	my $email = $1;
	return undef unless (defined($email)); # no puedo extraer un email válido

	my $sth = dbGet($::dbh_portal,"SEGUSUARIOS",["userid"],"UserMail='$email'","");
	return undef unless (defined($sth)); # fallo al armar la consulta para obtener el userid

	my @row = $sth->fetchrow_array;
	$sth->finish;
	return undef unless (defined($row[0])); # no hay userid asociado al email

	return $row[0]; # éxito !
}

sub unreadEmail ($) {
	my ($email) = @_;

        my $ua = LWP::UserAgent->new();
        my $response = $ua->get("http://mail.ces.edu.uy/cgi-bin/correos_nuevos.pl?email=$email");
        return undef unless (defined($response) && $response->is_success && $response->code==200); # error de comunicación

	my $content =  $response->decoded_content;

	return undef unless ($content =~ /^\d+\+?$/);

	return $&;
}

sub addlog_db($$$) {
        my($userid,$codigo,$texto) = @_;

        my $script = CGI::script_name();
        $script =~ s/.*\///;

	# fijo la TZ en -0300 porque con local me toma el DST aunque para linux no está vigente
        my $fecha = DateTime->now(time_zone=>'-0300')->strftime('%F %H:%M:%S');

        dbInsert($::dbh_portal, "SEGLOG", (LogFecha=>$fecha, LogUsuario=>$userid, LogSistema=>$script, LogTipo=>"Informativo", LogCodError=>$codigo, LogTxt=>$texto));
}

######################################################################

if (!$::dbh_portal) {
	$::dbh_portal = dbConnect("Portal") || error("No se puede establecer una conexión a la base de datos: ".$DBD::errstr,404);
}

$::cache = new Cache::Memcached { servers=>['localhost:11211'], namespace=>"portal" };
$::CACHE_TTL = 24*60*60; # las entradas en la cache son válidas por un día

# Security settings:
$CGI::POST_MAX=1024 * 100;  # max 100K posts
$CGI::DISABLE_UPLOADS = 1;  # no uploads


1;
