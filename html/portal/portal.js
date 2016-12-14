var substringMatcher = function(strs) {
  return function findMatches(q, cb) {
    var matches, substringRegex;

    matches = [];

    substrRegex = new RegExp(q, 'i');

    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
        matches.push(str);
      }
    });

    cb(matches);
  };
};


$(document).ready(function(){

	// construyo las ayudas del buscador
	var opciones = $('#myNavbar').find('a').map(function(){
//		if (this.href!=='' && !this.href.match(/principales#$|servlet.?$|\/portal\//)) {
//			console.log(this.href);
//		}
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
	})

	// encabezado responsive
	$(window).resize();
	setTimeout(function(){ $(window).resize() }, 900); // a veces hay que esperar a que la página se dibuje para que funcione
	setTimeout(function(){ $(window).resize() }, 2900);// a veces hay que esperar a que la página se dibuje para que funcione
});

// encabezado responsive:
$(window).resize(function(){

	$('#nombre').show();
	$('#depend').show();
	$('div.input-group').show();
	if ($('.navbar-ces').outerWidth() >= 768 && $('.navbar-ces').height() > 60) {
		$('#nombre').hide(); // oculto el nombre del usuario
		if ($('.navbar-ces').height() > 60) {
			$('#depend').hide(); // oculto el nombre de la dependencia
			if ($('.navbar-ces').height() > 60) {
				$('div.input-group').hide(); // oculto el buscador
			}
		}
	}
});

