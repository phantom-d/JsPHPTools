<?php
putenv('TZ=Europe/Moscow');
if (!empty($_SESSION['passvars']['user_name']) && $_SESSION['passvars']['user_name'] == 'antoner') {
	$_GET['debug'] = true;
	define('KELNIK', true);
}
if (!defined('KELNIK'))
	define('KELNIK', ($_SERVER['REMOTE_ADDR'] == '84.52.126.180' || !empty($_GET['kelnik'])));

// Идет ли запрос посредством AJAX
if (!defined('IS_AJAX'))
	define('IS_AJAX', (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'));

if (!function_exists('debug_sql_array')) {

	/**
	 * Собирает массив SQL запросов, результатов и цепочки вызовов
	 * @param string $sql SQL запрос
	 * @param mixed $result Результат SQL запроса
	 */
	function debug_sql_array($sql = '', $result = null, $backtrace = null) {
		if (!empty($_GET['debug'])) {
			$backtrace = (!empty($backtrace)) ? $backtrace : debug_backtrace();
			$GLOBALS['sql_array'][str_replace(realpath($_SERVER['DOCUMENT_ROOT']), '', $backtrace[0]['file'])][$backtrace[0]['line']] = array(
				'sql'		=> $sql,
				'result'		=> $result,
				'backtrace'	=> $backtrace,
			);
		}
	}

}

if (!function_exists('debug_array')) {

	/**
	 * Собирает массив данных
	 * @param mixed $name Ключ массива
	 * @param mixed $value Данные
	 */
	function debug_array($name = '', $value = null, $backtrace = null) {
		if (!empty($_GET['debug'])) {
			$backtrace = (!empty($backtrace)) ? $backtrace : debug_backtrace();
			$GLOBALS['#_DEBUG_ARRAY'][str_replace(realpath($_SERVER['DOCUMENT_ROOT']), '', $backtrace[0]['file'])][$name][$backtrace[0]['line']] = array(
				'value'		=> $value,
				'backtrace'	=> $backtrace,
			);
		}
	}

}

if (KELNIK && !empty($_GET['debug'])) {
	if (!defined('E_STRICT')) {
		define('E_STRICT', 2048);
	}
	if (!defined('E_RECOVERABLE_ERROR')) {
		define('E_RECOVERABLE_ERROR', 4096);
	}
	if (!defined('E_DEPRECATED')) {
		define('E_DEPRECATED', 8192);
	}
	if (!defined('E_USER_DEPRECATED')) {
		define('E_USER_DEPRECATED', 16384);
	}

	// Обрабатываются все возможные ошибки
	error_reporting(-1);
	ini_set('display_errors', (int)(isset($_GET['display'])));

	if (!function_exists('debug_panel')) {

		function debug_panel() {
			$file = $_SERVER['DOCUMENT_ROOT'] . '/inc/debugpanel/debugpanel.php';
			if (!IS_AJAX && file_exists($file)) {
				require $file;
				$debug_panel = new Debug();
				$debug_panel->debug_log = true;
				if (!empty($GLOBALS['php_errors'])) {
					$debug_panel->debug['php_errors'] = $GLOBALS['php_errors'];
					$debug_panel->no_recode[] = 'php_errors';
				}
				if (!empty($GLOBALS['aTEViewData'])) {
					$debug_panel->debug['aTEViewData'] = $GLOBALS['aTEViewData'];
				}
				if (!empty($GLOBALS['view'])) {
					$debug_panel->debug['view'] = $GLOBALS['view'];
				}
				if (!empty($GLOBALS['sql_array'])) {
					$debug_panel->debug['sql_array'] = $GLOBALS['sql_array'];
					$debug_panel->no_recode[] = 'sql_array';
				}
				$debug_panel->debug['get_included_files'] = get_included_files();
				if (version_compare(phpversion(), '5.0.0') >= 0) {
					$constants = get_defined_constants(true);
					$constants = $constants['user'];
				} else {
					$constants = get_defined_constants();
				}
				$debug_panel->debug['get_defined_constants'] = $constants;
				$debug_panel->debug['#php_version'] = phpversion();
				$debug_panel->debug['$php_config'] = ini_get_all();
				$debug_panel->debugPanel(
					array(
						'globals' => true,
					//'css' => 'top: 15px; left: 15px;'
					)
				);
			}
		}

	}

	/**
	 * Обработчик ошибок
	 * @global array $php_errors Массив всех ошибок PHP
	 * @param type $type
	 * @param type $message
	 * @param type $file
	 * @param type $line
	 * @return boolean
	 */
	if (!function_exists('myErrorHandler')) {

		function myErrorHandler($type, $message, $file, $line) {
			// Описания типов ошибок
			global $php_errors;

			$return = '';
			$titles = array(
				E_ERROR => 'Фатальная ошибка',
				E_CORE_ERROR => 'Фатальная ошибка при запуске PHP',
				E_COMPILE_ERROR => 'Фатальная ошибка времени компиляции',
				E_WARNING => 'Предупреждение',
				E_CORE_WARNING => 'Предупреждение при запуске PHP',
				E_COMPILE_WARNING => 'Предупреждение времени компиляции',
				E_NOTICE => 'Уведомление',
				E_USER_ERROR => 'Ошибка, определенная пользователем',
				E_USER_WARNING => 'Предупреждение, определенное пользователем',
				E_USER_NOTICE => 'Уведомление, определенное пользователем',
				E_STRICT => 'Проблема совместимости в коде',
				E_RECOVERABLE_ERROR => 'Поправимая ошибка',
				E_DEPRECATED => 'Использование устаревших конструкций',
				E_USER_DEPRECATED => 'Использование устаревших конструкций, определенное пользователем',
			);

			// Вывод информации
			$return .= '<h3>' . $titles[$type] . '</h3>'
				. '<p>' . $message . '<br />'
				. 'Источник: ' . ($file) . ', line ' . $line . '<br />';

			// Получаем стек вызов и удалем из него вызов myErrorHandler
			$backtrace = debug_backtrace();
			array_shift($backtrace);

			$return .= 'Стек вызовов:</p><ol>';

			// Выводим список вызванных функций
			foreach ($backtrace as $call) {
				$return .= '<li>';
				if (array_key_exists('file', $call)) {
					$return .= $call['file'] . ', line '
						. $call['line'] . ': ';
				}

				if (array_key_exists('object', $call) &&
					method_exists($call['object'], '__toString')) {

					$return .= $call['object'];
				}

				if (array_key_exists('type', $call)) {
					if ($call['type'] == '->') {
						$return .= $call['class'] . '->';
					} else if ($call['type'] == '::') {
						$return .= $call['class'] . '::';
					}
				}

				$return .= $call['function'] . '(';

				// Печатаем аргументы функции
				$strArgs = '';
				foreach ($call['args'] as $arg) {

					if (is_null($arg)) {
						$strArgs .= 'null';
					} else if (is_bool($arg)) {
						$strArgs .= ($arg) ? 'true' : 'false';
					} else if (is_string($arg)) {
						$strArgs .= '"' . $arg . '"';
					} else if (is_integer($arg) || is_float($arg)) {
						$strArgs .= $arg;
					} else if (is_array($arg)) {
						$strArgs .= 'array (' . sizeof($arg) . ')';
					} else if (is_object($arg)) {
						$strArgs .= 'object (' . get_class($arg) . ')';
					} else if (is_resource($arg)) {
						$strArgs .= 'resource (' . get_resource_type($arg) . ')';
					}

					$strArgs .= ', ';
				}
				$strArgs = substr($strArgs, 0, -2);

				$return .= $strArgs . ')</li>';
			}

			$return .= '</ol>';
			list($usec, $sec) = explode(" ", microtime());
			$micro = substr((string)$usec, 1);
			$d = date('H:i:s' . $micro, $sec);

			$php_errors[$d][] = $return;

			// Стандартный обработчик ошибок нам не нужен
			return true;
		}

	}

	register_shutdown_function('debug_panel');
	if (!empty($_GET['debug_errors']))
		set_error_handler('myErrorHandler');
}
?>
