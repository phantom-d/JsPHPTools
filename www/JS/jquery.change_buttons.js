/**
 * Смена внешнего вида кнопок
 * @author Ermolovich Anton Viktorovich <anton.ermolovich@gmail.com>
 * @package Change buttons
 * @version 1.1
 * @example
		<script type="text/javascript">
			jQuery(document).ready(function(){
				jQuery('.button').change_buttons({
					image		: '/images/button.png',
					left_width	: 15,
					right_width	: 15,
					height		: 30,
					type			: 'submit',
					change_type	: false,
					callback		: function(){},
					state		: {
						normal	: 0,
						over		: 1,
						active	: 2,
						disable	: 3
					}
				});
			});
		</script>
		<input type="submit" class="button" value="This is the button"/>
 */
(function($, undefined){
	$.fn.change_buttons = function(params) {
		var defaults = {
			'image'		: '/images/button.png',
			'left_width'	: 0,
			'right_width'	: 0,
			'height'		: 0,
			'html_tag'	: 'button',
			'allowed_tags'	: ['a', 'button'],
			'type'		: 'submit',
			'change_type'	: false,
			'single_image'	: false,
			'single_width'	: 0,
			//callback		: function(){},
			state		: {
				'normal'	: 0,
				'over'	: 1,
				'active'	: 2,
				'disable'	: 3
			}
		};
		var options = $.extend({}, defaults, params);
		if ($.inArray(options.html_tag, defaults.allowed_tags) === -1) {
			options.html_tag = 'button';
		}

		return this.each(function(){
			var currentButton = $(this);
			currentButton.operations = {
				getAttributes	: function() {
					var curElement = currentButton[0],
					curAttr = curElement.attributes,
					attr = ["abort","blur","change","click","dblclick","error","focus","keydown","keypress","keyup","load","mousedown","mousemove","mouseout","mouseover","mouseup","reset","resize","select","submit","unload"],
					listAttr = {};
					$.each(curAttr, function(i, v){
						if($.inArray(v.nodeName.replace(/^on/,""), attr) === -1){
							listAttr[v.nodeName] = v.nodeValue;
						}
					});
					if (options.html_tag === 'button' && listAttr['type'] === undefined) listAttr['type'] = options.type;
					if (options.html_tag === 'button' && options.change_type) listAttr['type'] = options.change_type;
					return listAttr;
				},
				replaceButton	: function() {
					var replacementButton = $('<' + options.html_tag + '/>'),
					img_left = $('<span/>'),
					img_center = $('<span/>'),
					img_right = $('<span/>'),
					currentAttr = currentButton.operations.getAttributes(),
					value = '',
					width = 'auto';
					if (options.html_tag === 'button') {
						value = (currentAttr.value !== undefined) ? currentAttr.value : '';
					} else {
						value = $(currentButton).text();
						width = $(currentButton).width();
					}
					var disable = (currentAttr.disabled !== undefined) ? 1 : 0,
					mOver = true,
					mDown = true,
					offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px",
					offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + (parseInt(options.height, 10) * 4)) + "px";

					$.each(currentAttr, function(i, v) {
						replacementButton.attr(i, v);
					});
					replacementButton.css({
						'border'		: '0 none',
						'background'	: 'none transparent'
					});
					img_left.css({
						'display'		: 'block',
						'width'		: width,
						'position'	: 'relative',
						'padding'		: '0px ' + options.right_width + 'px ' + '0px ' + options.left_width + 'px',
						'backgroundImage'	: "url(" + options.image + ")",
						'backgroundRepeat'	: "no-repeat",
						'backgroundPosition': "0px " + offset_top,
						'margin'		: '0px'
					}).attr('class', 'buttonLeft');
					img_right.css({
						'display'		: 'block',
						'height'		: options.height + 'px',
						'width'		: options.right_width + 'px',
						'position'	: 'absolute',
						'right'		: '0px',
						'backgroundImage'	: "url(" + options.image + ")",
						'backgroundRepeat'	: "no-repeat",
						'backgroundPosition': "-" + options.left_width + "px " + offset_top,
						'padding'		: '0px',
						'margin'		: '0px'
					}).attr('class', 'buttonRight');
					img_center.css({
						'display'		: 'block',
						'line-height'	: options.height + 'px',
						'backgroundImage'	: "url(" + options.image + ")",
						'backgroundRepeat'	: "repeat-x",
						'backgroundPosition': "0px " + offset_top_center,
						'padding'		: '0px',
						'margin'		: '0px'
					}).attr('class', 'buttonCenter').text(value);

					if (disable == 0) {
						$(document).mouseup(function(){
							if (!mDown) replacementButton.mouseup();
						});

						replacementButton.unbind('mouseover mouseenter').bind('mouseover mouseenter', function() {
							if (mDown){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.over, 10)) + "px",
								offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.over, 10)) + (parseInt(options.height, 10) * 4)) + "px";
								img_left.css('backgroundPosition', "0px " + offset_top);
								img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
								img_center.css('backgroundPosition', "0px " + offset_top_center);
							}
							mOver = false;
						});

						replacementButton.unbind('mouseleave mouseout').bind('mouseleave mouseout', function() {
							if (mDown){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px",
								offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + (parseInt(options.height, 10) * 4)) + "px";
								img_left.css('backgroundPosition', "0px " + offset_top);
								img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
								img_center.css('backgroundPosition', "0px " + offset_top_center);
							}
							mOver = true;
						});

						replacementButton.unbind('mouseup').bind('mouseup', function() {
							if (mOver){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px",
								offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + (parseInt(options.height, 10) * 4)) + "px";
								img_left.css('backgroundPosition', "0px " + offset_top);
								img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
								img_center.css('backgroundPosition', "0px " + offset_top_center);
							} else if (!mOver) {
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.over, 10)) + "px",
								offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.over, 10)) + (parseInt(options.height, 10) * 4)) + "px";
								img_left.css('backgroundPosition', "0px " + offset_top);
								img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
								img_center.css('backgroundPosition', "0px " + offset_top_center);
							}
							mDown = true;
						});

						replacementButton.unbind('mousedown').bind('mousedown', function() {
							mDown = false;
							var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.active, 10)) + "px",
							offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.active, 10)) + (parseInt(options.height, 10) * 4)) + "px";
							img_left.css('backgroundPosition', "0px " + offset_top);
							img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
							img_center.css('backgroundPosition', "0px " + offset_top_center);
						});
					} else {
						replacementButton.attr('disabled', 'disabled');
						var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.disable, 10)) + "px",
						offset_top_center = "-" + ((parseInt(options.height, 10) * parseInt(options.state.disable, 10)) + (parseInt(options.height, 10) * 4)) + "px";
						img_left.css('backgroundPosition', "0px " + offset_top);
						img_right.css('backgroundPosition', "-" + options.left_width + "px " + offset_top);
						img_center.css('backgroundPosition', "0px " + offset_top_center);
					}

					img_left.append(img_right).append(img_center);
					var test = replacementButton.append(img_left);
					currentButton.replaceWith(test);
				},
				replaceSingleImage	: function () {
					var replacementButton = $('<' + options.html_tag + '/>'),
					img_single = $('<span/>');
					var currentAttr = currentButton.operations.getAttributes();
					var value = (currentAttr.value !== undefined) ? currentAttr.value : '',
					disable = (currentAttr.disabled !== undefined) ? 1 : 0,
					mOver = true,
					mDown = true,
					offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px";

					$.each(currentAttr, function(i, v) {
						replacementButton.attr(i, v);
					});
					replacementButton.css({
						'border'		: '0 none',
						'background'	: 'none transparent'
					});
					img_single.css({
						'display'		: 'block',
						'height'	: options.height + 'px',
						'backgroundImage'	: "url(" + options.image + ")",
						'backgroundRepeat'	: "no-repeat",
						'backgroundPosition': "0px " + offset_top,
						'width'		: options.single_width + 'px',
						'padding'		: '0px',
						'margin'		: '0px'
					}).attr('class', 'buttonSingle').text(value);

					if (disable == 0) {
						$(document).mouseup(function() {
							if (!mDown) replacementButton.mouseup();
						});

						replacementButton.unbind('mouseover mouseenter').bind('mouseover mouseenter', function() {
							if (mDown){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.over, 10)) + "px";
								img_single.css('backgroundPosition', "0px " + offset_top);
							}
							mOver = false;
						});

						replacementButton.unbind('mouseleave mouseout').bind('mouseleave mouseout', function() {
							if (mDown){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px";
								img_single.css('backgroundPosition', "0px " + offset_top);
							}
							mOver = true;
						});

						replacementButton.unbind('mouseup').bind('mouseup', function() {
							if (mOver){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.normal, 10)) + "px";
								img_single.css('backgroundPosition', "0px " + offset_top);
							}
							else if (!mOver){
								var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.over, 10)) + "px";
								img_single.css('backgroundPosition', "0px " + offset_top);
							}
							mDown = true;
						});

						replacementButton.unbind('mousedown').bind('mousedown', function() {
							mDown = false;
							var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.active, 10)) + "px";
							img_single.css('backgroundPosition', "0px " + offset_top);
						});
					} else {
						replacementButton.attr('disabled', 'disabled');
						var offset_top = "-" + (parseInt(options.height, 10) * parseInt(options.state.disable, 10)) + "px";
						img_single.css('backgroundPosition', "0px " + offset_top);
					}

					var test = replacementButton.append(img_single);
					currentButton.replaceWith(test);
				}
			};
			if (options.single_image){
				currentButton.operations.replaceSingleImage();
			} else {
				currentButton.operations.replaceButton();
			}
			if (typeof options.callback == 'function')
				options.callback.call(this);
		});
	}
})(jQuery);