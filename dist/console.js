'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var Console = (function () {
  var Console = (function () {
    function Console(element) {
      var _this = this;

      var options = arguments[1] === undefined ? {} : arguments[1];

      _classCallCheck(this, Console);

      options.theme = options.theme || 'eclipse';
      options.mode = options.mode || 'javascript';
      console.log(options);

      this.container = element;
      this.container.classList.add('jsconsole', options.theme);
      this.logBuffer = [];
      this.history = [];
      this.historyIndex = -1;
      this.events = {};

      var enter = function enter() {
        var text = _this.input.getValue().trim();
        if (text) _this.exec(text);
      };

      var shiftEnter = function shiftEnter() {
        CodeMirror.commands.newlineAndIndent(_this.input);
      };

      var cancel = function cancel() {
        // TODO: copy, not cancel when we hit ^C on windows with an active selection
        _this.resetInput();
      };

      var up = function up(cm, evt) {
        var cursor = _this.input.getCursor();
        if (cursor.line === 0 && cursor.ch === 0) {
          _this.historyIndex++;
          if (_this.historyIndex > _this.history.length - 1) _this.historyIndex = _this.history.length - 1;
          _this.resetInput(_this.history[_this.historyIndex]);
        } else {
          CodeMirror.commands.goLineUp(_this.input);
        }
      };

      var down = function down(cm, evt) {
        var cursor = _this.input.getCursor();
        var lastLine = _this.input.lastLine();
        if (cursor.line === lastLine) {
          _this.historyIndex--;
          if (_this.historyIndex < -1) _this.historyIndex = -1;
          _this.resetInput(_this.history[_this.historyIndex]);
        } else {
          CodeMirror.commands.goLineDown(_this.input);
        }
      };

      var inputKeymap = {
        Up: up,
        Down: down,
        'Ctrl-C': cancel,
        Enter: enter,
        'Shift-Enter': shiftEnter
      };

      var outputContainer = document.createElement('div');
      var inputContainer = document.createElement('div');
      outputContainer.className = 'jsconsole-output';
      inputContainer.className = 'jsconsole-input';

      this.container.appendChild(outputContainer);
      this.container.appendChild(inputContainer);

      this.input = CodeMirror(inputContainer, {
        theme: options.theme,
        mode: options.mode,
        extraKeys: inputKeymap,
        tabSize: 2,
        indentUnit: 2,
        undoDepth: 100,
        autofocus: true,
        lineWrapping: true,
        viewportMargin: Infinity,
        gutters: ['repl']
      });
      this.output = CodeMirror(outputContainer, {
        theme: options.theme,
        mode: options.mode,
        gutters: ['repl'],
        tabSize: 2,
        viewportMargin: Infinity,
        lineWrapping: true,
        indentUnit: 2,
        readOnly: true
      });
      this.resetOutput();

      this.input.on('focus', function () {
        var cursor = _this.output.getCursor();
        _this.output.setSelection(cursor, cursor);
      });
      this.output.on('focus', function () {
        var cursor = _this.input.getCursor();
        _this.input.setSelection(cursor, cursor);
      });

      this.output.on('keydown', function (cm, evt) {
        // if we start typing when the output is focused, send it to the input
        if (evt.metaKey || evt.ctrlKey) {
          if (evt.which === 67) {} else if (evt.which === 86) {
            // ^V
            _this.input.triggerOnKeyDown(evt);
          }
        } else {
          _this.input.triggerOnKeyDown(evt);
          _this.input.focus();
        }
      });

      // codemirror doesn't handle mouseup events, so need to bind to the container
      outputContainer.addEventListener('mouseup', function (evt) {
        if (_this.output.getSelection().length === 0) {
          // need to defer the input focusing to get it to work.
          setTimeout(function () {
            return _this.input.focus();
          }, 0);
        }
      });

      this.input.setMarker = this.output.setMarker = function (line, el) {
        this.setGutterMarker(line, 'repl', el.cloneNode());
      };

      this.resetInput();
    }

    _createClass(Console, [{
      key: 'on',
      value: function on(event, fn) {
        this.events[event] = fn;
      }
    }, {
      key: 'off',
      value: function off(event) {
        delete this.events[event];
      }
    }, {
      key: 'trigger',
      value: function trigger(event, data) {
        if (typeof this.events[event] === 'function') this.events[event](data);
      }
    }, {
      key: 'flushLogBuffer',
      value: function flushLogBuffer() {
        var _this2 = this;

        if (this.logBuffer.length) {
          this.logBuffer.forEach(function (msg) {
            _this2.print(msg);
            _this2.origConsoleLog(msg);
          });
          this.logBuffer.length = 0;
        }
      }
    }, {
      key: 'addHistory',
      value: function addHistory(text) {
        this.historyIndex = -1;
        this.history.unshift(text);
      }
    }, {
      key: 'appendEntry',
      value: function appendEntry(input, output) {
        this.trigger('entry', { input: input, output: output });
        var range = this.appendOutput(input.toString().trim());
        this.output.setMarker(range[0].line, previousCommand);
        for (var i = range[0].line; i <= range[1].line; i++) {
          if (i > range[0].line) this.output.setMarker(i, previousCommandContinuation);
          this.output.addLineClass(i, 'text', 'prev-command');
        }

        this.flushLogBuffer();

        var parsedOutput = this.parseOutput(output);

        range = this.appendOutput(parsedOutput.formatted);
        var isError = parsedOutput.value instanceof Error;

        if (isError) {
          this.output.setMarker(range[0].line, errorMarker);
        } else {
          this.output.setMarker(range[0].line, completionValue);
        }
        for (var i = range[0].line; i <= range[1].line; i++) {
          this.output.addLineClass(i, 'text', 'completion-value');
          this.output.addLineClass(i, 'text', parsedOutput['class']);
        }
        this.output.addLineClass(range[1].line, 'text', 'completion-value-end');
      }
    }, {
      key: 'parseOutput',
      value: function parseOutput(value) {
        var type = typeof value;
        if (value instanceof Error) type = 'error';
        if (value === null) type = 'null';
        var output = {
          value: value,
          type: type,
          'class': 'type-' + type
        };

        switch (type) {
          case 'string':
            output.formatted = '"' + value + '"';
            output['class'] = 'string';
            break;
          case 'undefined':
            output.formatted = 'undefined';
            break;
          case 'null':
            output.formatted = 'null';
            break;
          case 'object':
          case 'array':
            // Todo: pretty print object output
            output.formatted = JSON.stringify(value);
            break;
          case 'error':
            output.formatted = value.message.trim();
            break;
          default:
            output.formatted = value.toString().trim();
        }
        return output;
      }
    }, {
      key: 'evaluate',
      value: function evaluate(code) {
        var out = {};
        try {
          out.completionValue = eval.call(null, code);
        } catch (e) {
          out.error = true;
          out.completionValue = e;
          out.recoverable = e instanceof SyntaxError && e.message.match('^Unexpected (token|end)');
        }
        return out;
      }
    }, {
      key: 'exec',
      value: function exec(text) {
        var _this3 = this;

        this.isEvaluating = true;
        var rv = this.evaluate(text);
        if (!rv) {
          return;
        }this.isEvaluating = false;
        var doc = this.input.getDoc();

        if (rv.error && !rv.recoverable) {
          this.appendEntry(text, rv.completionValue);
          this.addHistory(text);
          this.resetInput();
        } else if (rv.recoverable) {
          CodeMirror.commands.newlineAndIndent(this.input);
        } else {
          this.appendEntry(text, rv.completionValue);
          this.addHistory(text);
          this.resetInput();
        }

        doc.eachLine(function (line) {
          if (line.lineNo() === 0) _this3.input.setMarker(line, prompt);else _this3.input.setMarker(line, promptContinuation);
        });
      }
    }, {
      key: 'resetInput',
      value: function resetInput() {
        var text = arguments[0] === undefined ? '' : arguments[0];

        this.input.setValue(text.toString());
        this.input.execCommand('goDocEnd');
        this.input.setMarker(0, prompt);
      }
    }, {
      key: 'resetOutput',
      value: function resetOutput() {
        // magic number to make things align properly when there is no input;
        this.output.setSize(null, 8);
        this.output.setValue('');
      }
    }, {
      key: 'appendOutput',
      value: function appendOutput(text) {
        this.output.setSize(null, 'auto');
        var doc = this.output.getDoc();
        var range;
        if (doc.getLine(doc.lastLine()).match(/^\s*$/)) {
          range = append(this.output, text.toString());
        } else {
          range = append(this.output, '\n' + text.toString());
          range[0].line = range[0].line + 1;
        }
        //this.output.markText(range[0], range[1], {className : 'output'});

        return range;
      }
    }, {
      key: 'print',
      value: function print(text) {
        var className = arguments[1] === undefined ? 'message' : arguments[1];
        var gutterMarker = arguments[2] === undefined ? document.createElement('span') : arguments[2];

        var range = this.appendOutput(text);
        for (var i = range[0].line; i <= range[1].line; i++) {
          this.output.addLineClass(i, 'text', className);
          this.output.setMarker(i, gutterMarker);
        }
        return range;
      }
    }, {
      key: 'simpleFormatter',

      // basic, dumb formatter for console.log style %X formatting
      value: function simpleFormatter(msg) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        var replacementIndex = 0;
        return msg.replace(/%./mg, function (pattern, loc, originalString) {
          return args[replacementIndex++];
        });
      }
    }, {
      key: 'appendInput',
      value: function appendInput(text) {
        return append(this.input, text.toString());
      }
    }, {
      key: 'wrapLog',
      value: function wrapLog(console) {
        var _this4 = this;

        var origConsoleLog = console.log.bind(console);
        console.log = function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          _this4.logBuffer.push(_this4.simpleFormatter.apply(_this4, args));
          if (!_this4.isEvaluating) {
            _this4.flushLogBuffer();
          }
        };
        return this.origConsoleLog = origConsoleLog;
      }
    }, {
      key: 'setMode',
      value: function setMode(mode) {
        this.input.setOption('mode', mode);
        this.output.setOption('mode', mode);
      }
    }, {
      key: 'setTheme',
      value: function setTheme(theme) {
        this.input.setOption('theme', theme);
        this.output.setOption('theme', theme);
      }
    }]);

    return Console;
  })();

  var prompt = document.createElement('span'),
      promptContinuation = document.createElement('span'),
      errorMarker = document.createElement('span'),
      infoMarker = document.createElement('span'),
      previousCommand = document.createElement('span'),
      previousCommandContinuation = document.createElement('span'),
      completionValue = document.createElement('span');

  errorMarker.className = 'console-error gutter-icon';
  infoMarker.className = 'console-info gutter-icon';
  prompt.className = 'prompt gutter-icon';
  promptContinuation.className = 'prompt-continuation gutter-icon';
  previousCommand.className = 'prev-command gutter-icon';
  previousCommandContinuation.className = 'prev-command-continuation gutter-icon';
  completionValue.className = 'completion-value gutter-icon';

  function append(cm, text) {
    var doc = cm.getDoc();

    var lastLine = doc.lastLine();
    var line = doc.getLine(lastLine); // get the line contents
    var pos = CodeMirror.Pos(lastLine, line.length + 1);
    doc.replaceRange(text, pos); // adds a new line
    return [pos, CodeMirror.Pos(doc.lastLine())];
  }

  return Console;
})();
// ^C
// don't need to do
// anything here yet.