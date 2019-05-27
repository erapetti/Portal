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
	$('body#principales ul#left-side a:not([data-toggle])').click(function(){
		const href=$(this).attr('href');
    console.log("click",href);
		if (href === "") {
			document.title = "Portal de Servicios - Consejo de Educación Secundaria";
      return;
		}
    if (href !== "#" && $(this).attr('target') !== "_blank") {
			document.title = $(this).text() +' :: '+ href;
      ocultarFavoritos();
		}
    // cuento el clic
    $.ajax({url:'contar',data:{url:href},method:'POST'});
	});

  $('body#principales a#ainicio').click(function(){
    // restauro la barra de favoritos
    mostrarFavoritos();
  })
	// encabezado responsive en #principales
	$(window).resize();

  $("body#fondo img[data-target='#imgModal']").click(function(){
  	$('#imgSelected').attr('src', 'images/fondo/'+$(this).attr('alt'));
  	$('#imgTarget').val( $(this).attr('alt') );
  	$('#imgName').text( $(this).attr('alt') );
  });

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
  }
  if ($('body#principales #myNavbar').is(":hidden")) {
    // está colapsado
    $('body#principales #buscador').show();
    $('body#principales #depend').show();
    $('body#principales #nombre').show();
    ocultarFavoritos();
    return;
  }
  resizeFavoritos();
  let maxWidth = windowWidth - ($('body#principales .navbar-brand').outerWidth(true) || 0);
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

function resizeFavoritos() {
  console.log("entra resize favoritos",$('#favoritos').length);
  if (!$('#favoritos a').length) {
    ocultarFavoritos();
    return;
  }
  // cantidad de caracteres que pueden entrar en el ancho
  let len = ($('#favoritos').width() / 8) * 0.95;
  console.log("len:",len);
  for (let i=0; i<= $('#favoritos a').length; i++) {
    let btn = $('#favoritos a:eq('+i+')');
    len=len-btn.text().length-4;
    console.log("len",len,"entra button",btn.text());
    if (len>0) {
      console.log("lo activo");
      btn.removeClass("d-none");
    } else {
      btn.addClass("d-none");
    }
  }
  mostrarFavoritos();
}

function mostrarFavoritos() {
  $('body#principales #iframe').css('height','calc(100vh - 120px)');
  $('body#principales #navfavoritos').css('height',50);
  $('body#principales #favoritos').show();
}

function ocultarFavoritos() {
  $('body#principales #favoritos').hide();
  $('body#principales #navfavoritos').css('height',0);
  $('body#principales #iframe').css('height','calc(100vh - 70px)');
}


if (navigator.userAgent.match(/Firefox\/2[8-9]/) ||
    navigator.userAgent.match(/Firefox\/[3456789][0-9]/) ) {

      $('body#principales div#iframe iframe').attr('sandbox','allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals');
}
