var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
    var matches, substringRegex;

    matches = [];

    substrRegex = new RegExp(sacoTildes(q), 'i');

    $.each(strs, function(i, str) {
      if (substrRegex.test(sacoTildes(str))) {
        matches.push(str);
      }
    });

    cb(matches);
  };
};

function sacoTildes (str) {
  return str.replace(/á/g,'a').replace(/é/g,'e').replace(/i/g,'i').replace(/ó/g,'o').replace(/ú/g,'u');
}

// handler for .ready
$(function(){

	// construyo las ayudas del buscador
	var opciones = $('#myNavbar').find('a').map(function(){
		return (this.href!=='' && !this.href.match(/principales#$|servlet.?$|\/portal\//) ? this.text : undefined);
	}).get();
  $('input#search').typeahead({ hint:true, highlight:true, minLength:1 },
	                            { name:'q', source:substringMatcher(opciones), limit:10 }
	                           );

	// asocio la función que sugiere ayudas del buscador
	// Ojo que supone que el nombre de menú no está repetido, ya que sólo abre el primero
	$('input#search').bind('typeahead:select', function(ev, suggestion){

		var link=$('#myNavbar').find('a').filter(function(){ return this.text===suggestion }).get(0);
		if (link) {
			link.click();
		}
	});

	// asocio la función que abre el enlace cuando recibo un enter
	$('input#search').on('keydown', function(e){

		if (e.which == 13) {
			var suggestion = $('input#search').val();
			var link=$('#myNavbar').find('a').filter(function(){ return this.text.toUpperCase()===suggestion.toUpperCase() }).get(0);
			if (link) {
				link.click();
			}
		}
	});

	// ajuste del título de la página
	$('a').click(function(){
// console.log(" text="+ $(this).text() + " href=" + $(this).attr('href'));
		var href=$(this).attr('href').replace(/.*\//,'').replace(/\?.*/,'');
		if (href === "") {
			document.title = "Portal de Servicios - Consejo de Educación Secundaria";
		} else if (href !== "#" && $(this).attr('target') !== "_blank") {
			document.title = $(this).text() +' :: '+ href;
		}
	});

	// encabezado responsive
	$(window).resize();
//	setTimeout(function(){ $(window).resize() }, 900); // a veces hay que esperar a que la página se dibuje para que funcione
//	setTimeout(function(){ $(window).resize() }, 2900);// a veces hay que esperar a que la página se dibuje para que funcione

  // favoritos
  if ($('#favoritos').length > 0) {
    actualizoFavoritos();
  }
});


var resized = "";
var windowWidth = $(window).width();

// encabezado responsive:
$(window).resize(async function () {
  if (windowWidth != $(window).width()) {
    resized = "";
    windowWidth = $(window).width();
    resizeFavoritos();
  }
  if (! $('.navbar-brand').outerWidth(true)) {
    return;
  }
  if (window.innerWidth < 992) {
    // está colapsado
    $('#buscador').show();
    $('#depend').show();
    $('#nombre').show();
    return;
  }
  let maxWidth = windowWidth - $('.navbar-brand').outerWidth(true);
  let myNavbarWidth = $('#myNavbar').outerWidth(true);
  console.log("windowWidth:",windowWidth," brand:",$('.navbar-brand').outerWidth(true)," maxWidth:",maxWidth," navbar:",myNavbarWidth);

  console.log("needs shrink:",myNavbarWidth > maxWidth);
  console.log("width=",myNavbarWidth,"ww=",maxWidth," resized=",resized);

  if (myNavbarWidth > maxWidth) {
    // está muy ancho oculto algo
    if ($('#nombre').is(":visible")) {
      console.log("hide nombre width=",$('#nombre').width()," outerWidth=",$('#nombre').outerWidth(true));
      myNavbarWidth = myNavbarWidth - $('#nombre').outerWidth(true);
      await $('#nombre').hide();
      resized = "shrink";
    }
    if (myNavbarWidth > maxWidth && $('#depend').is(":visible")) {
      console.log("hide depend");
      myNavbarWidth = myNavbarWidth - $('#depend').outerWidth(true);
      await $('#depend').hide();
      resized = "shrink";
    }
    if (myNavbarWidth > maxWidth && $('#buscador').is(":visible")) {
      console.log("hide buscador");
      await $('#buscador').hide();
      resized = "shrink";
    } else { console.log("no achico buscador:",myNavbarWidth,maxWidth,"anchos para sumar:",$('.navbar-brand').outerWidth(true),$('#myNavbar').outerWidth(true));}

  } else if (resized!="shrink") {

    myNavbarWidth = $('#left-side').outerWidth(true) + $('#right-side').outerWidth(true);

    console.log("para achicar navbar:",myNavbarWidth," ww:",maxWidth);
    // tengo lugar para mostrar algo más
    if (myNavbarWidth+$('#buscador').width() < maxWidth && $('#buscador').is(":hidden")) {
      console.log("show buscador");
      await $('#buscador').show();
      myNavbarWidth = myNavbarWidth + $('#buscador').width();
      resized = "grow";
    }
    if (myNavbarWidth+$('#depend').width() < maxWidth && $('#buscador').is(":visible") && $('#depend').is(":hidden")) {
      console.log("show depend");
      await $('#depend').show();
      myNavbarWidth = myNavbarWidth + $('#depend').width();
      resized = "grow";
    }
    if (myNavbarWidth+$('#nombre').width() < maxWidth && $('#buscador').is(":visible") && $('#depend').is(":visible") && $('#nombre').is(":hidden")) {
      await $('#nombre').show();
      console.log("show nombre");
      resized = "grow";
    }
  }
  return;
});


// cantidad de correos nuevos
function refreshEmail() {
  $.ajax({url:'correo',
    success:function(data){
      if (typeof data.cant === "string") {
        $('#emails').text(data.cant);
        if (data.cant == 0) {
          $('#emails').removeClass('red');
        } else {
          $('#emails').addClass('red');
        }
      } else if (typeof data.error === "string" && data.error == "SESSION TIMEDOUT") {
        window.top.location.href = "/";
      }
    }
  });
}

function actualizoFavoritos() {
  $.ajax({url:'favoritos',
    success:function(data){
      let favoritos = "";
      data.forEach(function(item){
        favoritos=favoritos.concat("<li class='d-none'><i class='far fa-star'></i><a href='"+item.url+"'>"+item.title+"</a></li>");
      });
      $('#favoritos').html( favoritos );
      resizeFavoritos();
    },
  });
}

function resizeFavoritos() {
  let len = ($(window).width() - 30) / 8 - 8;
  console.log("len inicial",len)
  $('#favoritos li').each(function(){
    len=len-$(this).text().length-2;
    console.log($(this).text(),$(this).text().length,len);
    if (len>0) {
      $(this).removeClass("d-none");
    } else {
      $(this).addClass("d-none");
    }
  });
}

if (navigator.userAgent.match(/Firefox\/2[8-9]/) ||
    navigator.userAgent.match(/Firefox\/[3456789][0-9]/) ) {

      $('div#iframe iframe').attr('sandbox','allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals');
}
