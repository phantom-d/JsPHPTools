/**
 * jQuery AJAX Form
 * @version 2.19
 **/
(function ($, undefined) {
	$._ajax_form = {
		'options'	: {
			sendPath			: '/',
			type				: 'post',
			dataType			: 'html',
			onFocus			: false,
			//принимаемые значения соответствуют значениям CSS 'display', 'none'=false
			response			: false,
			send_ajax			: true,
			responseContainer	: '.ajaxresponse',
			responseClear		: false,
			responseTarget		: 'body',
			classes_valid		: 'error valid type0 type1 type2 type3',
			regexp			: {
				text		: /^[a-zа-яё\- ]+$/ig,
				email	: /^\w[\w|\.|\-]+@\w[\w|\.|\-]+\.[a-zA-Z]{2,4}$/i,
				phone	: /^((([0-9][-\. ]?){7})|([+]?[0-9][-\. ]?((([0-9][-\. ]?){3,5})|([(]([0-9][-\. ]?){3,5}[)][-\. ]?))([0-9][-\. ]?){5,7}))([-\. #]?(([0-9][-\. ]?){1,5})?)?$/,
				check	: /is_empty|is_text|is_phone|is_email/i
			},
			useMaskedPhone		: false,
			scrollToFirstError	: true,
			is_scrolled		: false,
			scrollSpeed		: 'fast',
			scrollTopAdd		: 0,
			maskPhone			: '9 (999) 999-99-99'
			/**
			* Задаваемые функции
			* before			: function(){},
			* after			: function(){},
			* beforeCheck		: function(){},
			* afterCheck		: function(){},
			* beforeCheckElement : function(){},
			* afterCheckElement	: function(){},
			* beforeSend		: function(){},
			* success			: function(){},
			* callBack		: function(){}
			**/
		},
		'scrollToObject' : function (obj, speed, topAdd) {
			if (!obj) return false;

			var offsetTop = $(obj).offset().top;
			topAdd = (topAdd) ? topAdd : 0;
			speed = (speed) ? speed : 'fast';

			$('html,body').animate({
				'scrollTop': parseInt(offsetTop) + parseInt(topAdd)
			}, speed);
			$(obj).focus();
		},
		'resetForm'	: function (forms, callback) {
			$(forms).each (function() {
				this.reset();
				$(this).find('textarea, select, input').parent()
					.removeClass('error valid type0 type1 type2 type3');
			});
			if (typeof callback == 'function')
				callback.call(this, forms);
		},
		'remove_empty'	: function (someArray) {
			var newArray = [];
			var element;
			$.each(someArray, function (element) {
				if (someArray[element] != '') {
					newArray.push(someArray[element]);
				}
			});
			return newArray;
		}

	}
	$.fn._ajax_form = function (params) {
		if (params.sendPath === undefined) {
			var sendPath = $(this).attr('action');
			params = $.extend(params, {
				'sendPath' : (!sendPath) ? $._ajax_form.options.sendPath : sendPath
			});
		}
		if (params.type === undefined) {
			var type = $(this).attr('method');
			params = $.extend(params, {
				'type' : (!type) ? $._ajax_form.options.type : type
			});
		}
		var options = $.extend($._ajax_form.options, params);

		return $(this).each(function () {
			var form = $(this),
			send = {
				formElements		: form.find('textarea, select, input[type="text"], input[type="hidden"], input[type="password"]'),
				validationError	: false,
				button			: form.find('input[type="submit"], button[type="submit"]'),
				datastring		: ''
			}
			if (options.useMaskedPhone) {
				send.formElements.each(function () {
					if ($(this).hasClass('is_phone')) {
						$(this).mask(options.maskPhone);
					}
				});
			}
			if (typeof options.before == 'function')
				options.before.call(this, send.formElements, send.button, options);
			send.formElements.filter(':not(select)').keyup(checkElement);
			send.formElements.filter('select').change(checkElement);
			send.button.click(checkElementsToSend);

			if (typeof options.after == 'function')
				options.after.call(this, form, send.formElements, options);

			function send_ajax_form() {
				var success = false;
				$.ajax({
					'type'		: options.type,
					'dataType'	: options.dataType,
					'beforeSend'	: function () {
						if (typeof options.beforeSend == 'function')
							options.beforeSend.call(this, send.datastring, options);
					},
					'url'		: options.sendPath.split('?')[0],
					'data'		: send.datastring,
					'complete'	: function () {
						if (typeof options.callBack == 'function')
							options.callBack.call(this, send.formElements, options);
					},
					'success'		: function (response) {
						if (options.response) {
							var text = '',
							content = '';
							if (options.dataType == 'json') {
								text = (response.error.length == 0) ?
											'<div class="message">' + response.message + '</div>' :
											'<div class="error">' + response.error + (typeof (response.debug) != 'undefined' ? response.debug : '') + '</div>';
							} else {
								text = response;
							}
							if (options.responseContainer) {
								content = $('<div/>').addClass(options.responseContainer).html(text);
							} else content = text;
							if (options.responseClear) $(options.responseTarget).html(content).show();
							else $(options.responseTarget).append(content).show();
						}
						if (options.dataType == 'json') {
							if (response.error.length == 0) success = true;
						} else success = true;
						if (success) {
							$._ajax_form.resetForm(form);
						}
						if (options.dataType == 'json') {
							if (typeof (response.error) == 'undefined') {
								response = {
									'error': {}
								}
							}
						}
						if (typeof options.success == 'function')
							options.success.call(this, form, response, send.formElements, options);
					}
				});
				return false;
			}

			function checkElementsToSend() {
				// @todo разобраться с блокированием.разблокированием кнопок после нажатия
				// send.button.attr('disabled', 'disabled');
				// reset validation var and send data
				options.scrollTo = {};
				send.validationError = false;
				send.datastring = 'ajax=1';
				if (typeof options.beforeCheck == 'function')
					send.validationError = options.beforeCheck.call(this, send.validationError, send.formElements, options, form);
				$.each(send.formElements, function () {
					var currentElement = $(this),
					value = currentElement.val(),
					name = currentElement.attr('name');
					currentElement.each(checkElement);

					if (currentElement.parent().hasClass('error')) {
						if (options.scrollToFirstError && !options.scrollTo.length) {
							options.scrollTo = currentElement;
						}
						send.validationError = true;
					}
					if (name != undefined && name != '')
						send.datastring += '&' + name + '=' + value;
				});
				form.find('input:checked').each(function () {
					var currentElement = $(this),
					value = currentElement.val(),
					name = currentElement.attr('name');
					send.datastring += '&' + name + '=' + value;
				});
				if (typeof options.afterCheck == 'function')
					send.validationError = options.afterCheck.call(this, send.validationError, send.formElements, options, form);
				if (!send.validationError) {
					if (options.send_ajax) {
						send_ajax_form();
						send.button.removeAttr('disabled');
						return false;
					} else {
						send.button.removeAttr('disabled');
						return true;
					}
				} else {
					if (options.scrollToFirstError && options.scrollTo.length) {
						$._ajax_form.scrollToObject(options.scrollTo, options.scrollSpeed, options.scrollTopAdd);
					}
					send.button.removeAttr('disabled');
					return false;
				}
				send.button.removeAttr('disabled');
				return true;
			}

			function checkElement() {
				var currentElement = $(this),
				surroundingElement = currentElement.parent(),
				classes = currentElement.attr('class');
				surroundingElement.removeClass(options.classes_valid);
				if (typeof options.beforeCheckElement == 'function') {
					send.validationError = options.beforeCheckElement.call(this, send.validationError, surroundingElement, currentElement, send.formElements, options);
					classes = currentElement.attr('class');
					if (classes && classes.match(options.regexp.check)) {
						if (send.validationError) {
							surroundingElement.addClass('error');
						} else {
							surroundingElement.addClass('valid');
						}
					}
				}
				var value = $.trim(currentElement.val());
				currentElement.val(value);
				if (classes) {
					if (classes.match(/is_empty/i)) {
						if (value == '') {
							surroundingElement.removeClass('valid');
							surroundingElement.addClass('error');
							surroundingElement.addClass('type0');
							send.validationError = true;
						} else {
							surroundingElement.addClass('valid');
						}
					}
					if (classes.match(/is_text/i)) {
						if (value != '' && !value.match(options.regexp.text)) {
							surroundingElement.removeClass('valid');
							surroundingElement.addClass('error');
							surroundingElement.addClass('type1');
							send.validationError = true;
						} else {
							if (!surroundingElement.attr('class').match(/type0/i)) surroundingElement.removeClass('error');
							if (value != '') surroundingElement.addClass('valid');
						}
					}
					if (classes.match(/is_email/i)) {
						if (value != '' && !value.match(options.regexp.email)) {
							surroundingElement.removeClass('valid');
							surroundingElement.addClass('error');
							surroundingElement.addClass('type1');
							send.validationError = true;
						} else {
							if (!surroundingElement.attr('class').match(/type0/i)) surroundingElement.removeClass('error');
							if (value != '') surroundingElement.addClass('valid');
						}
					}
					if (classes.match(/is_phone/i)) {
						var min_max = (matches = classes.match(/is_phone[-\d+?]{,2}/i)) ? matches[0].replace(/is_phone[-]*/i, '').split('-', 2) : [],
						phone_default = ['7', '16'],
						value_digits = value.replace(/[^0-9]/g, ''),
						value_symbol, value_full;
						value_full = value;
						if (options.useMaskedPhone) {
							value = value_symbol = value_digits;
							var min_max_dig = options.maskPhone.replace(/[^0-9]/g, '');
							min_max = [min_max_dig.length, min_max_dig.length];
						} else {
							value_symbol = value.replace(/[^a-zа-я?*!'?;%:+<>/\|=_,`~]/ig, '');
						}
						min_max = $._ajax_form.remove_empty(min_max),
						phone_default = $.extend(phone_default, min_max);
						if (value != '' && (!value.match(options.regexp.phone) || value_digits.length < parseInt(phone_default[0]) || value_digits.length > parseInt(phone_default[1]))) {
							surroundingElement.removeClass('valid');
							surroundingElement.addClass('error');
							send.validationError = true;
							if (value_digits.length > 0 && value_digits.length < parseInt(phone_default[0])) {
								surroundingElement.addClass('type2');
							} else if (value_digits.length > parseInt(phone_default[1])) {
								surroundingElement.addClass('type3');
							} else if (value_symbol.length > 0 && !value.match(options.regexp.phone)) {
								surroundingElement.addClass('type1');
							}
						} else {
							if (!surroundingElement.attr('class').match(/type0/i))
								surroundingElement.removeClass('error');
							if (value != '')
								surroundingElement.addClass('valid');
						}
						currentElement.val(value_full);
					}
				}
				if (typeof options.afterCheckElement == 'function') {
					send.validationError = options.afterCheckElement.call(this, send.validationError, surroundingElement, currentElement, send.formElements, options);
					classes = currentElement.attr('class');
					if (classes && classes.match(options.regexp.check)) {
						if (send.validationError) {
							surroundingElement.removeClass('valid');
							surroundingElement.addClass('error');
						} else {
							surroundingElement.removeClass('error');
							surroundingElement.addClass('valid');
						}
					}
				}
			}

			function focusInElement() {
				$(this).parent().find('.onfocus').css('display', options.onFocus);
			}

			function focusOutElement() {
				$(this).parent().find('.onfocus').css('display', 'none');
			}

		});
	}

	$.fn.reset = function () {
		$(this).each (function() {
			this.reset();
		});
	}

	$.fn.autoClear = function () {
		return $(this).each(function(){
			$(this).data('defaultValue', this.defaultValue);
			$(this).focusin(function() {   // обработка фокуса
				if ($(this).val() == $(this).data('defaultValue')) {
					$(this).val('');
				}
			})
			.blur(function() {    // обработка потери фокуса
				if ($(this).val() == '') {
					$(this).val($(this).data('defaultValue'));
				}
			});
		});
	}

	var pasteEventName = ($.browser.msie ? 'paste' : 'input') + '.mask';
	var iPhone = (window.orientation != undefined);
	$.mask = {
		//Predefined character definitions
		definitions: {
			'9': '[0-9]',
			'a': '[A-Za-z]',
			'*': '[A-Za-z0-9]'
		},
		dataName: 'rawMaskFn'
	}
	$.fn.extend({
		//Helper Function for Caret positioning
		caret: function (begin, end) {
			if (this.length == 0) return;
			if (typeof begin == 'number') {
				end = (typeof end == 'number') ? end : begin;
				return this.each(function () {
					if (this.setSelectionRange) {
						this.setSelectionRange(begin, end);
					} else if (this.createTextRange) {
						var range = this.createTextRange();
						range.collapse(true);
						range.moveEnd('character', end);
						range.moveStart('character', begin);
						range.select();
					}
				});
			} else {
				if (this[0].setSelectionRange) {
					begin = this[0].selectionStart;
					end = this[0].selectionEnd;
				} else if (document.selection && document.selection.createRange) {
					var range = document.selection.createRange();
					begin = 0 - range.duplicate().moveStart('character', -100000);
					end = begin + range.text.length;
				}
				return {
					begin: begin,
					end: end
				}
			}
		},
		unmask: function () {
			return this.trigger('unmask');
		},
		mask: function (mask, settings) {
			if (!mask && this.length > 0) {
				var input = $(this[0]);
				return input.data($.mask.dataName)();
			}
			settings = $.extend({
				placeholder: '_',
				completed: null
			}, settings);
			var defs = $.mask.definitions;
			var tests = [];
			var partialPosition = mask.length;
			var firstNonMaskPos = null;
			var len = mask.length;
			$.each(mask.split(''), function (i, c) {
				if (c == '?') {
					len--;
					partialPosition = i;
				} else if (defs[c]) {
					tests.push(new RegExp(defs[c]));
					if (firstNonMaskPos == null) firstNonMaskPos = tests.length - 1;
				} else {
					tests.push(null);
				}
			});
			return this.trigger('unmask').each(function () {
				var input = $(this);
				var buffer = $.map(mask.split(''), function (c, i) {
					if (c != '?') return (defs[c] ? settings.placeholder : c)
				});
				var focusText = input.val();

				function seekNext(pos) {
					while (++pos <= len && !tests[pos]);
					return pos;
				}

				function seekPrev(pos) {
					while (--pos >= 0 && !tests[pos]);
					return pos;
				}

				function shiftL(begin, end) {
					if (begin < 0) return;
					for (var i = begin, j = seekNext(end); i < len; i++) {
						if (tests[i]) {
							if (j < len && tests[i].test(buffer[j])) {
								buffer[i] = buffer[j];
								buffer[j] = settings.placeholder;
							} else break;
							j = seekNext(j);
						}
					}
					writeBuffer();
					input.caret(Math.max(firstNonMaskPos, begin));
				}

				function shiftR(pos) {
					for (var i = pos, c = settings.placeholder; i < len; i++) {
						if (tests[i]) {
							var j = seekNext(i);
							var t = buffer[i];
							buffer[i] = c;
							if (j < len && tests[j].test(t)) c = t;
							else break;
						}
					}
				}

				function keydownEvent(e) {
					var k = e.which;
					//backspace, delete, and escape get special treatment
					if (k == 8 || k == 46 || (iPhone && k == 127)) {
						var pos = input.caret(),
						begin = pos.begin,
						end = pos.end;
						if (end - begin == 0) {
							begin = k != 46 ? seekPrev(begin) : (end = seekNext(begin - 1));
							end = k == 46 ? seekNext(end) : end;
						}
						clearBuffer(begin, end);
						shiftL(begin, end - 1);
						return false;
					} else if (k == 27) { //escape
						input.val(focusText);
						input.caret(0, checkVal());
						return false;
					}
				}

				function keypressEvent(e) {
					var k = e.which,
					pos = input.caret();
					if (e.ctrlKey || e.altKey || e.metaKey || k < 32) { //Ignore
						return true;
					} else if (k) {
						if (pos.end - pos.begin != 0) {
							clearBuffer(pos.begin, pos.end);
							shiftL(pos.begin, pos.end - 1);
						}
						var p = seekNext(pos.begin - 1);
						if (p < len) {
							var c = String.fromCharCode(k);
							if (tests[p].test(c)) {
								shiftR(p);
								buffer[p] = c;
								writeBuffer();
								var next = seekNext(p);
								input.caret(next);
								if (settings.completed && next >= len) settings.completed.call(input);
							}
						}
						return false;
					}
				}

				function clearBuffer(start, end) {
					for (var i = start; i < end && i < len; i++) {
						if (tests[i]) buffer[i] = settings.placeholder;
					}
				}

				function writeBuffer() {
					return input.val(buffer.join('')).val();
				}

				function checkVal(allow) {
					//try to place characters where they belong
					var test = input.val();
					var lastMatch = -1;
					for (var i = 0, pos = 0; i < len; i++) {
						if (tests[i]) {
							buffer[i] = settings.placeholder;
							while (pos++ < test.length) {
								var c = test.charAt(pos - 1);
								if (tests[i].test(c)) {
									buffer[i] = c;
									lastMatch = i;
									break;
								}
							}
							if (pos > test.length) break;
						} else if (buffer[i] == test.charAt(pos) && i != partialPosition) {
							pos++;
							lastMatch = i;
						}
					}
					if (!allow && lastMatch + 1 < partialPosition) {
						input.val('');
						clearBuffer(0, len);
					} else if (allow || lastMatch + 1 >= partialPosition) {
						writeBuffer();
						if (!allow) input.val(input.val().substring(0, lastMatch + 1));
					}
					return (partialPosition ? i : firstNonMaskPos);
				}
				input.data($.mask.dataName, function () {
					return $.map(buffer, function (c, i) {
						return tests[i] && c != settings.placeholder ? c : null;
					}).join('');
				})
				if (!input.attr('readonly')) input.one('unmask', function () {
					input.unbind('.mask').removeData($.mask.dataName);
				}).bind('focus.mask', function () {
					focusText = input.val();
					var pos = checkVal();
					writeBuffer();
					var moveCaret = function () {
						if (pos == mask.length) input.caret(0, pos);
						else input.caret(pos);
					}
					($.browser.msie ? moveCaret : function () {
						setTimeout(moveCaret, 0)
					})();
				}).bind('blur.mask', function () {
					checkVal();
					if (input.val() != focusText) input.change();
				}).bind('keydown.mask', keydownEvent).bind('keypress.mask', keypressEvent).bind(pasteEventName, function () {
					setTimeout(function () {
						input.caret(checkVal(true));
					}, 0);
				});
				checkVal(); //Perform initial check for existing values
			});
		}
	});
})(jQuery);