try {
	var jqueryIsLoaded=jQuery;
	jQueryIsLoaded=true;
} catch(err) {
	var jQueryIsLoaded=false;
}
if (!jQueryIsLoaded){
	addJS("http://code.jquery.com/jquery-latest.js");
}
if (!DEBUG_SCRIPT){
	setTimeout(function(){
		jQuery(document).ready(function(){
			$('.DEBUG_INFO').hover(
					function(){
						var zindex = $(this).css('z-index');
						$(this).css('z-index', parseInt(zindex, 10) + 1);
					},
					function(){
						var zindex = $(this).css('z-index');
						$(this).css('z-index', parseInt(zindex, 10) - 1);
					}
			).find('.DEBUG').unbind('click').click(function(){
				var next = $(this).next('pre');
				if (next.css('display') == 'none') next.slideDown(400);
				else next.slideUp(400);
				return false;
			}).find('pre b').before('<div class="divider"/>');
			$('.DEBUG pre').each(function() {
				var current = $(this);
				current.css('display', 'none')
				.unbind('click').click(function(){
					if (current.css('display') == 'none') current.slideDown(400);
					else current.slideUp(400);
					return false;
				});
			});
			$('.DEBUG_INFO .array_visib').each(function(){
				var current = $(this).next();
				current.css({'display' : 'none'})
				.next().css({'display' : 'none'});

				$(this).css({
					'cursor' : 'pointer'
				}).unbind('click').click(function(){
					if (current.css('display') == 'none'){
						current.next().show();
						var hide = false;
					} else hide = true;

					current.slideToggle('400', 'linear', function(){
						if (hide) current.next().hide();
					});
					return false;
				});
			});
		});
	}, 1000);
}
var DEBUG_SCRIPT = true;