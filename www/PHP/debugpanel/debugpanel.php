<?php

/**
 * Класс для сбора и вывода информации в отдельную панель
 * @author Anton Ermolovich <anton.ermolovich@gmail.com>
 * @version 1.7
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

	function __construct() {
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

		if (isset($params['title']))
			$title = $params['title'];

		$array = $this->debug;
		if (!is_array($array))
			$array = array($title => $array);

		if (isset($params['sorting']))
			$ksort = intval($params['sorting']);

		ksort($array, $ksort);

		if (isset($params['globals']) && (boolean)$params['globals'])
			$globals = TRUE;
		if (isset($params['css']))
			$css = $params['css'];

		if ($globals) {
			$array_globals = $GLOBALS;
			foreach (array_keys($array) as $key) {
				if (isset($array_globals[$key]))
					unset($array_globals[$key]);
			}
			if (!empty($this->unset_keys)) {
				foreach ((array)$this->unset_keys as $key) {
					if (isset($array_globals[$key]))
						unset($array_globals[$key]);
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
				if (!window.addJS){
					function addJS(src){
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
		$return = preg_replace($pattern, $replace, $text);
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
			$string .= '["' . $key . '"]=> ';
			if (is_bool($item) || is_null($item)) {
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else if (is_numeric($item)) {
				$item = is_float($item) ? (float)$item : (int)$item;
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else if (!(is_bool($item) || is_null($item) || is_int($item) || is_float($item)) && (is_scalar($item) || is_resource($item))) {
				$item = str_replace($this->search, $this->replace, $item);
				ob_start();
				var_dump($item);
				$string .= htmlSpecialChars(ob_get_clean());
			} else {
				$recursion = $key;
				ob_start();
				var_dump($item);
				if (preg_match('/^object.*\(0\)/', ob_get_clean())) {
					$string .= "object (0) {";
				} else {
					if (is_object($item)) {
						$level = $level + 1;
						$class_name = get_class($item);
						$methods = get_class_methods($class_name);
						$properties = get_class_vars($class_name);
						sort($methods, SORT_STRING);

						$string .= "object() {" . "\n";
						$string .= $this->add_tabs($level);
						$string .= "['{$class_name}']=> array(" . count($methods) . ") {" . "\n";

						if (!empty($methods)) {
							$string .= $this->htmlSpecialChars((array)$methods, $level + 1);
						}

						$string .= $this->add_tabs($level);
						$string .= "}" . "\n";
						$string .= $this->add_tabs($level);
						if (!empty($properties)) {
							$string .= '["properties"]=> object() {' . "\n";
							$string .= $this->htmlSpecialChars((array)$properties, $level + 1);
							$string .= $this->add_tabs($level);
							$string .= "}" . "\n";
						} else {
							$string .= '["properties"]=> *EMPTY*' . "\n";
						}
						$string .= $this->add_tabs($level);
						$string .= '["data"]=> object() {' . "\n";
					} else {
						$string .= "array(" . count($item) . ") {" . "\n";
					}
				}
				if (!empty($item)) {
					$string .= $this->htmlSpecialChars((array)$item, $level + 1, $recursion);
					if (is_object($item)) {
						$string .= $this->add_tabs($level);
						$string .= '}' . "\n";
						$level = $level - 1;
					}
					$string .= $this->add_tabs($level);
				}
				$string .= '}' . "\n";
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