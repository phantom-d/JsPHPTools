<?php

/**
 * Copyright 2010-2013 Craig Campbell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Server Side Chrome PHP debugger class
 *
 * @package ChromePhp
 * @author Craig Campbell <iamcraigcampbell@gmail.com>
 */
class ChromePhp {
	/**
	 * @var string
	 */

	const VERSION = '4.0.0';

	/**
	 * @var string
	 */
	const HEADER_NAME = 'X-ChromeLogger-Data';

	/**
	 * @var string
	 */
	const BACKTRACE_LEVEL = 'backtrace_level';

	/**
	 * @var string
	 */
	const LOG = 'log';

	/**
	 * @var string
	 */
	const WARN = 'warn';

	/**
	 * @var string
	 */
	const ERROR = 'error';

	/**
	 * @var string
	 */
	const GROUP = 'group';

	/**
	 * @var string
	 */
	const INFO = 'info';

	/**
	 * @var string
	 */
	const GROUP_END = 'groupEnd';

	/**
	 * @var string
	 */
	const GROUP_COLLAPSED = 'groupCollapsed';

	/**
	 * @var string
	 */
	protected $_php_version;

	/**
	 * @var int
	 */
	protected $_timestamp;

	/**
	 * @var array
	 */
	protected $_json = array(
		'version' => self::VERSION,
		'columns' => array('log', 'backtrace', 'type'),
		'rows' => array()
	);

	/**
	 * @var array
	 */
	protected $_backtraces = array();

	/**
	 * @var bool
	 */
	protected $_error_triggered = false;

	/**
	 * @var array
	 */
	protected $_settings = array(
		self::BACKTRACE_LEVEL => 1
	);

	/**
	 * @var ChromePhp
	 */
	protected static $_instance;

	/**
	 * Prevent recursion when working with objects referring to each other
	 *
	 * @var array
	 */
	protected $_processed = array();

	/**
	 * constructor
	 */
	private function __construct() {
		$this->_php_version = phpversion();
		$this->_timestamp = $this->_php_version >= 5.1 ? $_SERVER['REQUEST_TIME'] : time();
		$this->_json['request_uri'] = $_SERVER['REQUEST_URI'];
	}

	/**
	 * gets instance of this class
	 *
	 * @return ChromePhp
	 */
	public static function getInstance() {
		if (self::$_instance === null) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	/**
	 * logs a variable to the console
	 *
	 * @param mixed $data,... unlimited OPTIONAL number of additional logs [...]
	 * @return void
	 */
	public static function log() {
		$args = func_get_args();
		return self::_log('', $args);
	}

	/**
	 * logs a warning to the console
	 *
	 * @param mixed $data,... unlimited OPTIONAL number of additional logs [...]
	 * @return void
	 */
	public static function warn() {
		$args = func_get_args();
		return self::_log(self::WARN, $args);
	}

	/**
	 * logs an error to the console
	 *
	 * @param mixed $data,... unlimited OPTIONAL number of additional logs [...]
	 * @return void
	 */
	public static function error() {
		$args = func_get_args();
		return self::_log(self::ERROR, $args);
	}

	/**
	 * sends a group log
	 *
	 * @param string value
	 */
	public static function group() {
		$args = func_get_args();
		return self::_log(self::GROUP, $args);
	}

	/**
	 * sends an info log
	 *
	 * @param mixed $data,... unlimited OPTIONAL number of additional logs [...]
	 * @return void
	 */
	public static function info() {
		$args = func_get_args();
		return self::_log(self::INFO, $args);
	}

	/**
	 * sends a collapsed group log
	 *
	 * @param string value
	 */
	public static function groupCollapsed() {
		$args = func_get_args();
		return self::_log(self::GROUP_COLLAPSED, $args);
	}

	/**
	 * ends a group log
	 *
	 * @param string value
	 */
	public static function groupEnd() {
		$args = func_get_args();
		return self::_log(self::GROUP_END, $args);
	}

	/**
	 * internal logging call
	 *
	 * @param string $type
	 * @return void
	 */
	protected static function _log($type, array $args) {
		// nothing passed in, don't do anything
		if (count($args) == 0 && $type != self::GROUP_END) {
			return;
		}

		$logger = self::getInstance();

		$logger->_processed = array();

		$logs = array();
		foreach ($args as $arg) {
			$logs[] = $logger->_convert($arg);
		}

		$backtrace = debug_backtrace(false);
		$level = $logger->getSetting(self::BACKTRACE_LEVEL);

		$backtrace_message = 'unknown';
		if (isset($backtrace[$level]['file']) && isset($backtrace[$level]['line'])) {
			$backtrace_message = $backtrace[$level]['file'] . ' : ' . $backtrace[$level]['line'];
		}

		$logger->_addRow($logs, $backtrace_message, $type);
	}

	/**
	 * converts an object to a better format for logging
	 *
	 * @param Object
	 * @return array
	 */
	protected function _convert($object) {
		// if this isn't an object then just return it
		if (!is_object($object)) {
			return $object;
		}

		//Mark this object as processed so we don't convert it twice and it
		//Also avoid recursion when objects refer to each other
		$this->_processed[] = $object;

		$object_as_array = array();

		// first add the class name
		$object_as_array['___class_name'] = get_class($object);

		// loop through object vars
		$object_vars = get_object_vars($object);
		foreach ($object_vars as $key => $value) {

			// same instance as parent object
			if ($value === $object || in_array($value, $this->_processed, true)) {
				$value = 'recursion - parent object [' . get_class($value) . ']';
			}
			$object_as_array[$key] = $this->_convert($value);
		}

		$reflection = new ReflectionClass($object);

		// loop through the properties and add those
		foreach ($reflection->getProperties() as $property) {

			// if one of these properties was already added above then ignore it
			if (array_key_exists($property->getName(), $object_vars)) {
				continue;
			}
			$type = $this->_getPropertyKey($property);

			if ($this->_php_version >= 5.3) {
				$property->setAccessible(true);
			}

			try {
				$value = $property->getValue($object);
			} catch (ReflectionException $e) {
				$value = 'only PHP 5.3 can access private/protected properties';
			}

			// same instance as parent object
			if ($value === $object || in_array($value, $this->_processed, true)) {
				$value = 'recursion - parent object [' . get_class($value) . ']';
			}

			$object_as_array[$type] = $this->_convert($value);
		}
		return $object_as_array;
	}

	/**
	 * takes a reflection property and returns a nicely formatted key of the property name
	 *
	 * @param ReflectionProperty
	 * @return string
	 */
	protected function _getPropertyKey(ReflectionProperty $property) {
		$static = $property->isStatic() ? ' static' : '';
		if ($property->isPublic()) {
			return 'public' . $static . ' ' . $property->getName();
		}

		if ($property->isProtected()) {
			return 'protected' . $static . ' ' . $property->getName();
		}

		if ($property->isPrivate()) {
			return 'private' . $static . ' ' . $property->getName();
		}
	}

	/**
	 * adds a value to the data array
	 *
	 * @var mixed
	 * @return void
	 */
	protected function _addRow(array $logs, $backtrace, $type) {
		// if this is logged on the same line for example in a loop, set it to null to save space
		if (in_array($backtrace, $this->_backtraces)) {
			$backtrace = null;
		}

		// for group, groupEnd, and groupCollapsed
		// take out the backtrace since it is not useful
		if ($type == self::GROUP || $type == self::GROUP_END || $type == self::GROUP_COLLAPSED) {
			$backtrace = null;
		}

		if ($backtrace !== null) {
			$this->_backtraces[] = $backtrace;
		}

		$row = array($logs, $backtrace, $type);

		$this->_json['rows'][] = $row;
		$this->_writeHeader($this->_json);
	}

	protected function _writeHeader($data) {
		header(self::HEADER_NAME . ': ' . $this->_encode($data));
	}

	/**
	 * encodes the data to be sent along with the request
	 *
	 * @param array $data
	 * @return string
	 */
	protected function _encode($data) {
		return base64_encode(utf8_encode(json_encode($data)));
	}

	/**
	 * adds a setting
	 *
	 * @param string key
	 * @param mixed value
	 * @return void
	 */
	public function addSetting($key, $value) {
		$this->_settings[$key] = $value;
	}

	/**
	 * add ability to set multiple settings in one call
	 *
	 * @param array $settings
	 * @return void
	 */
	public function addSettings(array $settings) {
		foreach ($settings as $key => $value) {
			$this->addSetting($key, $value);
		}
	}

	/**
	 * gets a setting
	 *
	 * @param string key
	 * @return mixed
	 */
	public function getSetting($key) {
		if (!isset($this->_settings[$key])) {
			return null;
		}
		return $this->_settings[$key];
	}

}

/**
 * Класс для сбора и вывода информации в отдельную панель
 * @author Anton Ermolovich <anton.ermolovich@gmail.com>
 * @version 1.76
 */
class Debug {

	/**
	 * Отображение панели
	 * @var boolean
	 */
	var $debug_log = false;

	/**
	 * Ключи, которые должны быть удалены из глобального массива
	 * @var mixed
	 */
	var $unset_keys = array();

	/**
	 * Данные для отображения
	 * @var mixed
	 */
	var $debug = array();

	/**
	 * Отображение отладочной информации
	 * @var bollean
	 */
	var $debug_data = false;

	/**
	 * Список элементов, которые не требуется преобразовывать
	 * @var mixed
	 */
	var $no_recode = array();

	/**
	 * Глубина рекурсии
	 * @var mixed
	 */
	var $max_level = 10;

	/**
	 * Символы для замены
	 * @var mixed
	 */
	var $search = array(
		'{',
		'}',
		'[',
		']',
	);

	/**
	 * Замена символов
	 * @var mixed
	 */
	var $replace = array(
		'&lcub;',
		'&rcub;',
		'&lbrack;',
		'&rbrack;',
	);

	function __construct($debug = false) {
		$this->debug_data = !empty($debug);
		if (phpversion() >= 5.2) {
			ini_set('pcre.backtrack_limit', '1000M');
			ini_set('pcre.recursion_limit', '1000M');
		}
	}

	/**
	 * Вывод информации в отдельную панель
	 *
	 * @param mixed $params Массив параметров
	 * @param string $params['title'] Заголовок панели
	 * @param boolean $params['globals'] Отображение глобальных переменных
	 * @param integer $params['sorting'] Тип сортировки массива
	 * @param string $params['css'] CSS оформления панели
	 */
	function debugPanel($params) {
		$array = array();
		$title = 'Debug';
		$globals = FALSE;
		$ksort = SORT_ASC;
		$css = '';

		if (isset($params['title'])) {
			$title = $params['title'];
		}

		$array = $this->debug;
		if (!is_array($array)) {
			$array = array($title => $array);
		}

		if (isset($params['sorting'])) {
			$ksort = intval($params['sorting']);
		}

		ksort($array, $ksort);

		if (isset($params['globals']) && (boolean)$params['globals']) {
			$globals = TRUE;
		}
		if (isset($params['css'])) {
			$css = $params['css'];
		}

		if ($globals) {
			$array_globals = $GLOBALS;
			foreach (array_keys($array) as $key) {
				if (isset($array_globals[$key])) {
					unset($array_globals[$key]);
				}
			}
			if (!empty($this->unset_keys)) {
				foreach ((array)$this->unset_keys as $key) {
					if (isset($array_globals[$key])) {
						unset($array_globals[$key]);
					}
				}
			}
			ksort($array_globals, $ksort);
			if (count($array)) {
				$array["_GLOBALS"] = $array_globals;
				$title.= ' + GLOBALS';
			} else {
				$array = $array_globals;
				$title = 'GLOBALS';
			}
		}
		ksort($array, $ksort);
		if ($this->debug_log) {
			$doc_root = str_replace('/', '\/', $this->fixslashes(realpath($_SERVER['DOCUMENT_ROOT'])));
			$link = preg_replace('/^.*' . $doc_root . '/', '', $this->fixslashes(dirname(__FILE__)));
			ob_start();
			?>
			<script type="text/javascript">
				if (!window.addJS) {
					function addJS(src) {
						var script = document.createElement("script");
						script.type = "text/javascript";
						script.src = src;
						document.getElementsByTagName("head")[0].appendChild(script);
					}
				}
				if (typeof DEBUG_SCRIPT == "undefined" || !DEBUG_SCRIPT) {
					addJS('<?= $link ?>/js/debug.js');
					document.write('<link rel="stylesheet" type="text/css" href="<?= $link ?>/js/debug.css"/>');
				}
			</script>
			<?php
			echo ob_get_clean() . '<div class="DEBUG_INFO" style="' . $css . '"><a href="#" class="DEBUG">' . $title . '</a><pre>' . $this->prepare_data($array) . "</pre></div>\n";
		}
	}

	/**
	 * Замена двойных обратных слэшей из путей OS Windows
	 *
	 * @param string $str
	 * @return string
	 */
	function fixslashes($str) {
		return $str ? strtr($str, '\\', '/') : $str;
	}

	/**
	 * Подготовка данных для отображения
	 *
	 * @param mixed $data
	 * @return string
	 */
	function prepare_data($data) {
		$no_recode = array();
		$text = '';
		$return = '';

		foreach ((array)$this->no_recode as $key) {
			if (isset($data[$key])) {
				$no_recode[$key] = $data[$key];
				unset($data[$key]);
			}
		}
		if ((bool)count($no_recode)) {
			ob_start();
			var_dump($no_recode);
			$text = '["#_NORECODE"]=> ' . ob_get_clean();
		}

		$text = $text . $this->htmlSpecialChars($data);

		if ($this->debug_data)
			$return .= $text;
		$pattern = array(
			'/^array.+\{\n/',
			'/=>[\s]+/',
			'/([array|object].*\(0\))[\s]+\{[\s]*\}/',
			'/(\[.*=>)[\s]*[array|object].*\{[\s]+(\*RECURSION\*)[\s]*\}/',
			'/(\[.*=>.*[array|object].*\{)[\n]/',
			'/  /',
			'/[\n]([\s]*)\}/',
			'/\n\}$/',
		);
		$replace = array(
			'',
			'=> ',
			'$1 {}',
			'$1 $2',
			'<strong class="array_visib" style=" color: #00F;">$1</strong><div>',
			'     ',
			'</div><span>$1</span><strong style=" color: #00F;">}</strong>',
			'',
		);
		$return .= preg_replace($pattern, $replace, $text);
		if (phpversion() >= 5) {
			if (preg_last_error() == PREG_INTERNAL_ERROR) {
				$return = "There is an internal error!\n" . $return;
			} else if (preg_last_error() == PREG_BACKTRACK_LIMIT_ERROR) {
				$return = "Backtrack limit was exhausted!\n" . $return;
			} else if (preg_last_error() == PREG_RECURSION_LIMIT_ERROR) {
				$return = "Recursion limit was exhausted!\n" . $return;
			} else if (preg_last_error() == PREG_BAD_UTF8_ERROR) {
				$return = "Bad UTF8 error!\n" . $return;
			} else if (preg_last_error() == PREG_BAD_UTF8_ERROR) {
				$return = "Bad UTF8 offset error!\n" . $return;
			}
		}
		return $return;
	}

	/**
	 * Преобразование данных и чистка от запрещённых символов
	 *
	 * @param mixed $data
	 * @param integer $level
	 * @param string $recursion
	 * @return string
	 */
	function htmlSpecialChars($data, $level = 0, $recursion = '') {
		$string = '';
		if ($level > $this->max_level + 1) {
			$string .= $this->add_tabs($level);
			return $string . "*LIMIT EXCEEDED*\n";
		}
		if (is_array($data) && isset($data[$recursion]) && is_array($data[$recursion])) {
			ob_start();
			var_dump($data);
			$result = ob_get_clean();
			$pattern = "/\[\"{$recursion}\"\]=\>[\s]+\*RECURSION\*/";
			if (preg_match($pattern, $result)) {
				$string .= $this->add_tabs($level);
				return "*RECURSION*\n";
			}
		}
		foreach ($data as $key => $item) {
			$string .= $this->add_tabs($level);
			$string .= '["' . str_replace(array("\r\n", "\n", '  '), ' ', $key) . '"]=> ';
			if (is_bool($item) || is_null($item)) {
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else if (is_numeric($item)) {
				$item = is_float($item) ? (float)$item : (int)$item;
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else if (!(is_bool($item) || is_null($item) || is_int($item) || is_float($item)) && is_resource($item)) {
				$item = str_replace($this->search, $this->replace, $item);
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else if (!(is_bool($item) || is_null($item) || is_int($item) || is_float($item) || is_resource($item)) && is_scalar($item)) {
				$item = str_replace($this->search, $this->replace, $item);
				ob_start();
				var_dump($item);
				$item_string = ob_get_clean();
				if (preg_match('/^string/', $item_string) && strlen($item) > 100) {
					$string .= "string (" . strlen($item) . ") {";
					if (!empty($item)) {
						$string .= "\n" . htmlSpecialChars($item) . "\n";
					}
					$string .= $this->add_tabs($level)
						. "}\n";
				} else {
					$string .= htmlSpecialChars($item_string);
				}
			} else {
				$recursion = $key;
				ob_start();
				var_dump($item);
				if (preg_match('/^object.*\(0\)/', ob_get_clean())) {
					$string .= "object (0) {}\n";
				} else {
					if (is_object($item)) {
						++$level;
						$class_name = get_class($item);
						$methods = get_class_methods($class_name);
						$properties = get_class_vars($class_name);
						sort($methods, SORT_STRING);
						ksort($properties, SORT_STRING);

						$string .= "object() {\n"
							. $this->add_tabs($level)
							. "['{$class_name}']=> array(" . count($methods) . ") {";

						if (!empty($methods)) {
							$string .= "\n" . $this->htmlSpecialChars((array)$methods, $level + 1);
						}

						$string .= $this->add_tabs($level)
							. "}\n"
							. $this->add_tabs($level)
							. "['properties']=> array(" . count($properties) . ") {";

						if (!empty($properties)) {
							$string .= "\n" . $this->htmlSpecialChars((array)$properties, $level + 1);
						}

						$string .= $this->add_tabs($level)
							. "}\n"
							. $this->add_tabs($level)
							. '["data"]=> object(' . count($item) . ") {";
						if (!empty($item)) {
							$item_data = (array)$item;
							ksort($item_data, SORT_STRING);
							$string .= "\n" . $this->htmlSpecialChars($item_data, $level + 1, $recursion)
								. $this->add_tabs($level);
						}
						$string .= "}\n"
							. $this->add_tabs($level - 1)
							. "}\n";
						--$level;
					} else {
						if (!empty($item)) {
							$string .= "array(" . count($item) . ") {\n";

							$test_array = array_keys($item);
							if (!empty($test_array) && is_string($test_array[0])) {
								$sorting = (preg_match('!^[0-9]+!', $test_array[0])) ? SORT_NUMERIC : SORT_STRING;
								ksort($item, $sorting);
							}

							$string .= $this->htmlSpecialChars((array)$item, $level + 1, $recursion)
								. $this->add_tabs($level)
								. "}\n";
						} else {
							$string .= "array(0){}\n";
						}
					}
				}
			}
		}
		return $string;
	}

	/**
	 * Добавление оступа в соответствии с позицией
	 *
	 * @param integer $tabs
	 * @return string
	 */
	function add_tabs($tabs) {
		$string = '';
		while ($tabs) {
			$string .= "\t";
			$tabs--;
		}
		return $string;
	}

}
?>