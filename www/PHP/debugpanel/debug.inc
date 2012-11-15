<?php
if (!empty($_SESSION['passvars']['user_name']) && $_SESSION['passvars']['user_name'] == 'antoner') {
	$_GET['debug'] = true;
	define('KELNIK', true);
}
if (!defined('KELNIK'))
	define('KELNIK', ($_SERVER['REMOTE_ADDR'] == '84.52.126.180' || !empty($_GET['kelnik'])));

// Идет ли запрос посредством AJAX
if (!defined('IS_AJAX'))
	define('IS_AJAX', (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest'));


if (isset($_SESSION['sql_array']))
	unset($_SESSION['sql_array']);
if (isset($sql_array))
	unset($sql_array);
if (isset($_SESSION['debug_array']))
	unset($_SESSION['debug_array']);
if (isset($debug_array))
	unset($debug_array);

if (!function_exists('debug_sql_array')) {

	/**
	 * Собирает массив SQL запросов, результатов и цепочки вызовов
	 * @param string $sql SQL запрос
	 * @param mixed $result Результат SQL запроса
	 * @param mixed $backtrace Результат функции debug_backtrace() для вставки в часто используемые функции
	 * 	чтобы отследить откуда был вызов
	 */
	function debug_sql_array($sql = '', $result = null, $backtrace = null, $session = false) {
		if (KELNIK && !empty($_GET['debug'])) {
			$backtrace = (!empty($backtrace)) ? $backtrace : debug_backtrace();
			$array = array(
				'sql' => $sql,
				'result' => $result,
				'backtrace' => $backtrace,
			);
			list($usec, $sec) = explode(" ", microtime());
			$micro = substr((string)$usec, 1);
			$d = date('H:i:s' . $micro, $sec);
			$path = str_replace(realpath($_SERVER['DOCUMENT_ROOT']), '', $backtrace[0]['file']) . '<span style="display: none;">' . $d . '</span>';
			if (!empty($session)) {
				if (!isset($_SESSION['sql_array']))
					$_SESSION['sql_array'] = array();
				$_SESSION['sql_array'][count($_SESSION['sql_array']) + 1 . '. ' . $path] = $array;
			} else {
				if (!isset($GLOBALS['sql_array']))
					$GLOBALS['sql_array'] = array();
				$GLOBALS['sql_array'][count($GLOBALS['sql_array']) + 1 . '. ' . $path] = $array;
			}
		}
	}

}

if (!function_exists('debug_array')) {
	/**
	 * Собирает массив данных
	 * @param mixed $name Ключ массива
	 * @param mixed $value Данные
	 * @param mixed $backtrace Результат функции debug_backtrace() для вставки в часто используемые функции
	 * 	чтобы отследить откуда был вызов
	 */
	function debug_array($name = '', $value = null, $backtrace = null, $session = false) {
		if (KELNIK && !empty($_GET['debug'])) {
			$backtrace = (!empty($backtrace)) ? $backtrace : debug_backtrace();
			$array = array(
				'value' => $value,
				'backtrace' => $backtrace,
			);
			list($usec, $sec) = explode(" ", microtime());
			$micro = substr((string)$usec, 1);
			$d = date('H:i:s' . $micro, $sec);
			$path = str_replace(realpath($_SERVER['DOCUMENT_ROOT']), '', $backtrace[0]['file']) . '<span style="display: none;">' . $d . '</span>';
			if (!empty($session)) {
				if (!isset($_SESSION['debug_array']))
					$_SESSION['debug_array'] = array();
				$_SESSION['debug_array'][count($_SESSION['debug_array']) + 1 . '. ' . $path] = $array;
			} else {
				if (!isset($GLOBALS['debug_array']))
					$GLOBALS['debug_array'] = array();
				$GLOBALS['debug_array'][count($GLOBALS['debug_array']) + 1 . '. ' . $path] = $array;
			}
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
	ini_set('display_errors', 0);

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
					$debug_panel->debug['#_SQL_ARRAY'] = $GLOBALS['sql_array'];
				}
				if (!empty($GLOBALS['debug_array'])) {
					$debug_panel->debug['#_DEBUG_ARRAY'] = $GLOBALS['debug_array'];
				}
				if (!empty($_SESSION['sql_array'])) {
					$debug_panel->debug['$_SQL_ARRAY'] = $_SESSION['sql_array'];
				}
				if (!empty($_SESSION['debug_array'])) {
					$debug_panel->debug['$_DEBUG_ARRAY'] = $_SESSION['debug_array'];
				}
				$debug_panel->debug['get_included_files'] = get_included_files();
				if (isset($_GET['const'])) {
					if (version_compare(phpversion(), '5.0.0') >= 0) {
						$constants = get_defined_constants(true);
						$constants = $constants['user'];
					} else {
						$constants = get_defined_constants();
					}
					$debug_panel->debug['get_defined_constants'] = $constants;
				}
				$debug_panel->debug['#php_version'] = phpversion();
				if (isset($_GET['config'])) {
					$debug_panel->debug['$php_config'] = ini_get_all();
				}
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
