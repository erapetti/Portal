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
	var opciones = $('body#principales #myNavbar').find('a').map(function(){
		return (this.href!=='' && !this.href.match(/principales#$|servlet.?$|\/portal\//) ? this.text : undefined);
	}).get();
  $('body#principales input#search').typeahead({ hint:true, highlight:true, minLength:1 },
	                            { name:'q', source:substringMatcher(opciones), limit:10 }
	                           );

	// asocio la función que sugiere ayudas del buscador
	// Ojo que supone que el nombre de menú no está repetido, ya que sólo abre el primero
	$('body#principales input#search').bind('typeahead:select', function(ev, suggestion){

		var link=$('body#principales #myNavbar').find('a').filter(function(){ return this.text===suggestion }).get(0);
		if (link) {
			link.click();
		}
	});

	// asocio la función que abre el enlace cuando recibo un enter
	$('body#principales input#search').on('keydown', function(e){

		if (e.which == 13) {
			var suggestion = $('body#principales input#search').val();
			var link=$('body#principales #myNavbar').find('a').filter(function(){ return this.text.toUpperCase()===suggestion.toUpperCase() }).get(0);
			if (link) {
				link.click();
			}
		}
	});

	// ajuste del título de la página
	$('body#principales a:not([data-toggle])').click(function(){
		var href=$(this).attr('href').replace(/.*\//,'').replace(/\?.*/,'');
		if (href === "") {
			document.title = "Portal de Servicios - Consejo de Educación Secundaria";
		} else if (href !== "#" && $(this).attr('target') !== "_blank") {
			document.title = $(this).text() +' :: '+ href;
		}
    $('body#principales #favoritos').hide();
    $('body#principales #navfavoritos').css('height',0);
    $('body#principales #iframe').css('height','calc(100vh - 70px)')
	});

  $('body#principales a#ainicio').click(function(){
    $('body#principales #iframe').css('height','calc(100vh - 120px)')
    $('body#principales #navfavoritos').css('height',50);
    $('body#principales #favoritos').show();
  })
	// encabezado responsive
	$(window).resize();
//	setTimeout(function(){ $(window).resize() }, 900); // a veces hay que esperar a que la página se dibuje para que funcione
//	setTimeout(function(){ $(window).resize() }, 2900);// a veces hay que esperar a que la página se dibuje para que funcione

  // favoritos
  if ($('body#principales #favoritos').length > 0) {
    actualizoFavoritos();
  }
});


var resized = "";
var windowWidth = $(window).width();

// encabezado responsive:
$(window).resize(async function () {
  if ($('body#principales').length==0) {
    return;
  }
  if (windowWidth != $(window).width()) {
    resized = "";
    windowWidth = $(window).width();
    resizeFavoritos();
  }
  if (! $('body#principales .navbar-brand').outerWidth(true)) {
    return;
  }
  if (window.innerWidth < 992) {
    // está colapsado
    $('body#principales #buscador').show();
    $('body#principales #depend').show();
    $('body#principales #nombre').show();
    return;
  }
  let maxWidth = windowWidth - $('body#principales .navbar-brand').outerWidth(true);
  let myNavbarWidth = $('body#principales #myNavbar').outerWidth(true);

  if (myNavbarWidth > maxWidth) {
    // está muy ancho oculto algo
    if ($('body#principales #nombre').is(":visible")) {
      myNavbarWidth = myNavbarWidth - $('body#principales #nombre').outerWidth(true);
      await $('body#principales #nombre').hide();
      resized = "shrink";
    }
    if (myNavbarWidth > maxWidth && $('body#principales #depend').is(":visible")) {
      myNavbarWidth = myNavbarWidth - $('body#principales #depend').outerWidth(true);
      await $('body#principales #depend').hide();
      resized = "shrink";
    }
    if (myNavbarWidth > maxWidth && $('body#principales #buscador').is(":visible")) {
      await $('body#principales #buscador').hide();
      resized = "shrink";
    } else { console.log("no achico buscador:",myNavbarWidth,maxWidth,"anchos para sumar:",$('.navbar-brand').outerWidth(true),$('#myNavbar').outerWidth(true));}

  } else if (resized!="shrink") {

    myNavbarWidth = $('body#principales #left-side').outerWidth(true) + $('body#principales #right-side').outerWidth(true);

    // tengo lugar para mostrar algo más
    if (myNavbarWidth+$('body#principales #buscador').width() < maxWidth && $('body#principales #buscador').is(":hidden")) {
      await $('body#principales #buscador').show();
      myNavbarWidth = myNavbarWidth + $('body#principales #buscador').width();
      resized = "grow";
    }
    if (myNavbarWidth+$('body#principales #depend').width() < maxWidth && $('body#principales #buscador').is(":visible") && $('body#principales #depend').is(":hidden")) {
      await $('body#principales #depend').show();
      myNavbarWidth = myNavbarWidth + $('body#principales #depend').width();
      resized = "grow";
    }
    if (myNavbarWidth+$('body#principales #nombre').width() < maxWidth && $('body#principales #buscador').is(":visible") && $('#depend').is(":visible") && $('body#principales #nombre').is(":hidden")) {
      await $('body#principales #nombre').show();
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
        //favoritos=favoritos.concat("<li class='d-none'><i class='far fa-star'></i><a href='"+item.url+"'>"+item.title+"</a></li>");
        favoritos=favoritos.concat("<button type='button' class='btn d-none'><i class='far fa-star'></i><a href='"+item.url+"'>"+item.title+"</a></button>");
      });
      $('#favoritos').html( favoritos );
      resizeFavoritos();
    },
  });
}

function resizeFavoritos() {
  let len = ($(window).width() - 30) / 8 - 8;
  $('#favoritos button').each(function(){
    len=len-$(this).text().length-4;
    if (len>0) {
      $(this).removeClass("d-none");
    } else {
      $(this).addClass("d-none");
    }
  });
}

if (navigator.userAgent.match(/Firefox\/2[8-9]/) ||
    navigator.userAgent.match(/Firefox\/[3456789][0-9]/) ) {

      $('body#principales div#iframe iframe').attr('sandbox','allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals');
}
