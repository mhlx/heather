var Heather = (function() {
	
	var mermaidId = 0;
	var listRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/;
    var lazyRes = {
        mermaid_js: "js/mermaid.min.js",
        katex_css: "katex/katex.min.css",
        katex_js: "katex/katex.min.js"
    }

    var Util = (function() {
        var parser = new DOMParser();
        var platform = navigator.platform;
        var userAgent = navigator.userAgent;
        var edge = /Edge\/(\d+)/.exec(userAgent);
        var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
        var android = /Android/.test(userAgent);
        var mac = ios || /Mac/.test(platform);
        var chrome = !edge && /Chrome\//.test(userAgent)
		var firefox = !edge && /Firefox\//.test(userAgent)
        var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
        var headingTagNames = ["H1", "H2", "H3", "H4", "H5", "H6"];

        var isUndefined = function(o) {
            return (typeof o == 'undefined')
        }

        var cloneAttributes = function(element, sourceNode, filter) {
            filter = filter || function() {
                return true;
            }
            let attr;
            let attributes = Array.prototype.slice.call(sourceNode.attributes);
            while (attr = attributes.pop()) {
                if (filter(attr.nodeName)) {
                    element.setAttribute(attr.nodeName, attr.nodeValue);
                }
            }
        }

        return {
            parseHTML: function(html) {
                return parser.parseFromString(html, "text/html").body;
            },
            isUndefined: isUndefined,
            cloneAttributes: cloneAttributes,
            mobile: mobile,
            chrome: chrome,
            mac: mac,
            android: android,
            ios: ios,
            edge: edge,
			firefox:firefox,
            isHeading: function(element) {
                return element.nodeType == 1 && headingTagNames.includes(element.tagName);
            },
			createBarIcon : function(clazz,handler){
				var label = document.createElement('label');
				label.classList.add('heather_svg_'+clazz);
				label.classList.add('heather_svg_icon');
				if(handler){
					label.addEventListener('click',function(e){
						e.preventDefault();
						e.stopPropagation();
						handler.call(label,null);
					})
				}
				return label;
			}
        }

    })();

    var commands = {};

    var defaultConfig = {
        markdownParser: {
            html: true,
            linkify: true,
            callback: function(md) {
                if (window.markdownitTaskLists)
                    md.use(window.markdownitTaskLists);
                if (window.markdownitKatex)
                    md.use(window.markdownitKatex);
                if (window.markdownItAnchor)
                    md.use(window.markdownItAnchor);
            }
        },
        commandBarEnable: Util.mobile,
        editor: {
            lineNumbers: true,
            dragDrop: true,
            extraKeys: {
                'Enter': 'newlineAndIndentContinueMarkdownList'
            },
            callback: function(cm) {}
        },
        tooltipEnable: true,
        focused: true,
		nodeUpdateMill: 300,
		tooltip : {
			hljsTipEnable:true,
			headingTipEnable:true
		}
    }


    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    }

    String.prototype.splice = function(start, delCount, newSubStr) {
        return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
    }
	
	var setSize = CodeMirror.prototype.setSize;
	
	CodeMirror.prototype.setSize = function(width,height){
		if(!this.heather){
			setSize.call(this,width,height);
			return ;
		}
		var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
		if(width != null || height != null){
			var root = this.getRootNode();
			if(width != null){
				var width = interpret(width);
				root.style.width = width;
				this.display.wrapper.style.width = '100%';
			}
			if(height != null){
				var height = interpret(height);
				root.style.height = height;
				this.display.wrapper.style.height = '100%';
			}
			this.refresh();
		}
	}

    CodeMirror.registerHelper("fold", "heather", function(cm, start) {
        var heather = cm.heather;
        var nodes = heather.getNodesByLine(start.line);
        if (nodes.length == 0) {
            return null;
        }
        var node = nodes[0];
        var startLine = node.startLine;
        var endLine = node.endLine;
        if (Util.isHeading(node)) {
            var headLevel = parseInt(node.tagName.substring(1));
            var valid = false;
            for (const element of heather.node.children) {
                if (element === node) {
                    valid = true;
                    continue;
                }
                if (!valid) continue;
                if (Util.isHeading(element)) {
                    if (element.tagName === node.tagName || parseInt(element.tagName.substring(1)) < headLevel) {
                        endLine = parseInt(element.dataset.line);
                        return {
                            from: CodeMirror.Pos(startLine, cm.getLine(startLine).length),
                            to: CodeMirror.Pos(endLine - 1, cm.getLine(endLine - 1).length)
                        }
                    }
                }
            }
            endLine = cm.lastLine() + 1;
            return {
                from: CodeMirror.Pos(startLine, cm.getLine(startLine).length),
                to: CodeMirror.Pos(endLine - 1, cm.getLine(endLine - 1).length)
            }
        }
        return {
            from: CodeMirror.Pos(startLine, cm.getLine(startLine).length),
            to: CodeMirror.Pos(endLine - 1, cm.getLine(endLine - 1).length)
        }
    });

    function Heather(textarea, config) {
        config = Object.assign({}, defaultConfig, config);
        this.eventHandlers = [];
        this.editor = createEditor(textarea, config.editor);
        this.editor.heather = this;
        this.node = document.createElement('body');
        this.top = new Top(this);
        this.markdownParser = new MarkdownParser(config.markdownParser, this);
        this.toolbar = new Toolbar(this, config);
        this.commandBar = new CommandBar(this, config);
        this.tooltip = new Tooltip(this, config.tooltip);
        this.config = config;
		this.syncView = new SyncView(this);
		this.view = new View(this);
		this.focusedMode = new FocusedMode(this);
        this.nodeUpdate = new NodeUpdate(this);
        initKeyMap(this);
        handleDefaultEditorEvent(this);
        this.tableHelper = new TableHelper(this);
        if (config.focused === true) {
            this.setFocused(true);
        }
    }


    Heather.prototype.getValue = function() {
        return this.editor.getValue();
    }

    Heather.prototype.setValue = function(value) {
        this.editor.setValue(value);
    }

    Heather.prototype.getHtmlNode = function() {
		this.nodeUpdate.update(true);
		return this.node.cloneNode(true);
    }

    Heather.prototype.isFileUploadEnable = function() {
        var config = this.config.upload;
        return !Util.isUndefined(config) && !Util.isUndefined(config.url) && !Util.isUndefined(config.uploadFinish);
    }

    Heather.prototype.getNodesByLine = function(line, includePlainHtmlNode) {
        var nodes = [];
        var cm = this.editor;
        var addNode = function(node) {
            for (const dataLine of node.querySelectorAll('[data-line]')) {
                if (dataLine.hasAttribute('data-html') && includePlainHtmlNode !== true) continue;
                var _startLine = parseInt(dataLine.dataset.line);
                var _endLine = parseInt(dataLine.dataset.endLine);
                if (_startLine <= line && _endLine > line) {
                    dataLine.startLine = _startLine;
                    dataLine.endLine = _endLine;
                    nodes.push(dataLine);
                    addNode(dataLine);
                    break;
                }
            }
        }
		this.nodeUpdate.update(true);
        addNode(this.node);
        return nodes;
    }

    Heather.prototype.fold = function(pos) {
        this.editor.foldCode(pos);
    }

    Heather.prototype.isPreview = function() {
        return this.view.isEnable;
    }

    Heather.prototype.execCommand = function(name) {
		if(name.startsWith("editor.")) {
            name = name.substring(name.indexOf('.') + 1);
			this.editor.execCommand(name);
        } else {
			var handler = commands[name];
			if (!Util.isUndefined(handler)) {
				this.editor.ignoreNextFocusout = true;
				handler(this);
			}
		}
    }

    Heather.prototype.setPreview = function(preview) {
        if(preview === true)
			this.view.enable();
		else
			this.view.disable();
    }

    Heather.prototype.getToolbar = function() {
        return this.toolbar;
    }

    Heather.prototype.getCommandBar = function() {
        return this.commandBar;
    }

    Heather.prototype.isFullscreen = function() {
        return this.editor.getOption('fullScreen') === true;
    }
	
    Heather.prototype.setFullscreen = function(enable) {
       this.editor.setOption('fullScreen',enable);
    }
	
    Heather.prototype.hasSyncView = function() {
        return this.syncView.isEnable;
    }

    Heather.prototype.setSyncView = function(syncView) {
       if(syncView === true){
		   this.syncView.enable();
	   } else {
		   this.syncView.disable();
	   }
    }
	
	Heather.prototype.setSyncDisplayMode = function(mode){
		this.syncView.setDisplayMode(mode);
	}

    Heather.prototype.on = function(eventName, handler) {
        var me = this;
        if (eventName.startsWith("editor.")) {
            eventName = eventName.substring(eventName.indexOf('.') + 1);
            this.editor.on(eventName, handler);
            return {
				name : "editor."+eventName,
                off: function() {
                    me.editor.off(eventName, handler)
                }
            }
        }
        this.eventHandlers.push({
            name: eventName,
            handler: handler
        });
        return {
			name : eventName,
            off: function() {
                me.off(eventName, handler)
            }
        }
    }

    Heather.prototype.off = function(eventName, handler) {
        if (eventName.startsWith("editor.")) {
            eventName = eventName.substring(eventName.indexOf('.') + 1);
            this.editor.off(eventName, handler);
            return;
        }
        for (var i = this.eventHandlers.length - 1; i >= 0; i--) {
            var eh = this.eventHandlers[i];
            if (eh.handler === handler && eh.name === eventName) {
                this.eventHandlers.splice(i, 1);
                break;
            }
        }
    }

    Heather.prototype.setFocused = function(focus) {
		if(focus === true)
			this.focusedMode.enable();
		else
			this.focusedMode.disable();
    }

    Heather.prototype.isFocused = function() {
       return this.focusedMode.isEnable;
    }

    Heather.prototype.openSelectionHelper = function() {
        if (!this.isPreview()) {
            this.closeSelectionHelper(true);
            this.selectionHelper = new SelectionHelper(this);
            triggerEvent(this, 'selectionHelperOpen', this);
        }
    }

    Heather.prototype.hasSelectionHelper = function() {
        return !Util.isUndefined(this.selectionHelper);
    }

    Heather.prototype.closeSelectionHelper = function(unselect) {
        if (this.selectionHelper) {
            this.selectionHelper.remove(unselect !== true);
            this.selectionHelper = undefined;
            triggerEvent(this, 'selectionHelperClose', this);
        }
    }

    Heather.prototype.addKeyMap = function(keyMap) {
        var me = this;
        var _keyMap = {};
        for (const key in keyMap) {
            var v = keyMap[key];
            if (typeof v === 'string') {
                const value = v;
                _keyMap[key] = function() {
                    me.execCommand(value);
                };
            } else {
                _keyMap[key] = v;
            }
        }
        this.editor.addKeyMap(_keyMap);
        return _keyMap;
    }

    Heather.prototype.removeKeyMap = function(keyMap) {
        this.editor.removeKeyMap(keyMap);
    }

    Heather.prototype.render = function() {
		var start = performance.now();
        var value = this.editor.getValue();
        var node = Util.parseHTML(this.markdownParser.render(value));
        this.node = node;
        triggerEvent(this, 'rendered', value, this.node.innerHTML);
    }
	
	
	Heather.prototype.upload = function(file){
		if(!this.isFileUploadEnable()){
			return ;
		}
		new FileUpload(file, this, this.config.upload).start();
	}

    function handleDefaultEditorEvent(heather) {

        var editor = heather.editor;
        if (editor.getValue() != '') {
            heather.nodeUpdate.update();
        }

        //change task list status
        editor.on('mousedown', function(cm, e) {
            if (isWidget(e.target, cm)) {
                e.codemirrorIgnore = true;
                return;
            }
            var x = e.clientX;
            var y = e.clientY;
            changeTastListStatus(heather, x, y);
        })

        editor.on('touchstart', function(cm, e) {
            if (isWidget(e.target, cm)) {
                e.codemirrorIgnore = true;
                return;
            }
            var x = e.touches[0].clientX;
            var y = e.touches[0].clientY;
            changeTastListStatus(heather, x, y);
        });
        //file upload 
        editor.on('paste', function(editor, evt) {
            var clipboardData, pastedData;
            clipboardData = evt.clipboardData || window.clipboardData;
            var files = clipboardData.files;
            if (files && files.length > 0 && heather.isFileUploadEnable()) {
                var f = files[0];
                var type = f.type;
                if (type.indexOf('image/') == -1) {
                    return;
                }
                evt.preventDefault();
                evt.stopPropagation();
                f.from = 'paste';
                new FileUpload(f, heather, heather.config.upload).start();
            }
        });

        editor.on('drop', function(cm, e) {
            var files = e.dataTransfer.files;
            if (files.length > 0) {
                var file = files[0];
                if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".md")) {
                    e.preventDefault();
                    e.stopPropagation();
                    var reader = new FileReader();
                    reader.readAsText(file);
                    reader.onload = function(evt) {
                        var text = evt.target.result;
                        cm.replaceSelection(text);
                    }

                } else if (heather.isFileUploadEnable()) {
                    e.preventDefault();
                    e.stopPropagation();
                    file.from = 'drop';
                    new FileUpload(file, heather, heather.config.upload).start();
                }
            }
        });

        editor.on('optionChange', function(cm, option) {
            if (option === 'readOnly') {
                if (cm.isReadOnly()) {
					if(heather.commandBox){heather.commandBox.remove();heather.commandBox = null};
                    heather.commandBar.setKeepHidden(true);
                } else {
                    heather.commandBar.setKeepHidden(false);
                }
            }
			if (option === 'fullScreen') {
				CodeMirror.signal(cm, "update", cm);
				triggerEvent(heather, 'fullscreenChange', cm.getOption(option) === true);
			}
        })
    }

    function isWidget(target, cm) {
        var _target = target;
        while (_target != null) {
            if (_target.hasAttribute('data-widget')) return true;
            _target = _target.parentElement;
        }
        return false;
    }

    function initKeyMap(heather) {

        function toggleFullscreen() {
            heather.setFullscreen(!heather.isFullscreen());
        }

        function togglePreview() {
            heather.setPreview(!heather.isPreview());
        }

        function fold() {
            heather.fold(heather.editor.getCursor());
        }

        var keyMap = Util.mac ? {
            "Cmd-B": 'bold',
            "Cmd-I": 'italic',
            "Cmd-L": 'link',
            "Cmd-/": 'commands',
            "Cmd-Enter": toggleFullscreen,
            "Cmd-P": togglePreview,
            "Cmd-Q": fold,
			"Shift-Tab": 'editor.indentLess'
        } : {
            "Ctrl-B": 'bold',
            "Ctrl-I": 'italic',
            "Ctrl-L": 'link',
            "Alt-/": 'commands',
            "Ctrl-Enter": toggleFullscreen,
            "Ctrl-P": togglePreview,
            "Ctrl-Q": fold,
			"Shift-Tab": 'editor.indentLess'
        }

        heather.addKeyMap(keyMap);
    }

    function triggerEvent(heather, name, ...args) {
        for (var i = 0; i < heather.eventHandlers.length; i++) {
            var eh = heather.eventHandlers[i];
            if (eh.name === name) {
                try {
                    var handler = eh.handler;
                    handler.apply(heather, args);
                } catch (e) {}
            }
        }
    }

    function createEditor(textarea, config) {
        config = config || {};
        config.styleActiveLine = true;
        config.inputStyle = 'textarea';
        config.mode = {
            name: 'gfm'
        };
        config.lineWrapping = true;
        config.value = textarea.value;

        var node = document.createElement('div');
        node.classList.add('heather_editor_wrapper');
        textarea.after(node);

        var editor = CodeMirror._fromTextArea(textarea, config, node);
        editor.getRootNode = function() {
            return node;
        }

        if (config.callback) {
            config.callback(editor);
        }

        var fun = editor.doc.mode.innerMode;
        editor.doc.mode.innerMode = function(state) {
            var info = fun.call(null, state);
            if (info.mode) info.mode.fold = 'heather'
            return info;
        }
        editor.doc.mode.fold = 'heather';
		
		if(Util.firefox){
			var textarea = editor.getInputField();
			textarea.style.width = "1000px";
		}
        return editor;
    }

    var SelectionHelper = (function() {

        function SelectionHelper(heather) {

            var editor = heather.editor;
            var eventUnregisters = [];

            var html = '';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goLineUp"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goCharRight"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goLineDown"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goCharLeft"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<div class="heather_selection_helper_close"></div> ';

            var div = document.createElement('div');
            div.classList.add('heather_selection_helper');
            div.style.display = 'none';
            div.setAttribute('data-widget', '');
            div.innerHTML = html;
            editor.addWidget({
                line: 0,
                ch: 0
            }, div);

            var resize = function() {
                var w = editor.getWrapperElement().offsetWidth * 0.6;
                div.style.width = w + 'px'
                div.style.height = w + 'px';
                if (heather.isFullscreen()) {
                    div.style.position = 'fixed';
                    div.style.top = '';
                    div.style.bottom = '0px';
                } else {
                    div.style.position = 'absolute';
                    div.style.bottom = '';
                }
				pos();
            }

            var pos = function() {
                div.style.left = '';
                if (!heather.isFullscreen()) {
                    var w = editor.getWrapperElement().offsetWidth * 0.6;
					var cursor = editor.getCursor();
                    var top = editor.cursorCoords(cursor, 'local').top + editor.defaultTextHeight();
                    var h = editor.getScrollInfo().height;
                    if (top + w > h) {
                        top = h - w;
                    }
                    div.style.top = top + 'px';
                }
            }
            resize();
            div.style.display = '';

            this.start = editor.getCursor(true);
            this.end = editor.getCursor(false);
            this.marked = editor.markText(this.start, this.end, {
                className: "heather_selection_marked"
            });
            var me = this;

            var cursorActivityHandler = function(cm) {
                if (me.movedByMouseOrTouch === true) {
                    me.movedByMouseOrTouch = false;
                    me.start = editor.getCursor();
                }
                pos();
            };

            cursorActivityHandler(editor);

            editor.setOption('readOnly', 'nocursor');

            var close = div.querySelector('.heather_selection_helper_close');
            close.addEventListener('click', function() {
                heather.closeSelectionHelper();
            });
            var moveCursor = function(action) {
                if (me.end) {
                    editor.setCursor(me.end);
                }
                editor.execCommand(action);
                me.end = editor.getCursor();
                var cursors = me.getCursors();
                if (me.marked) {
                    me.marked.clear();
                }
                me.marked = editor.markText(cursors.start, cursors.end, {
                    className: "heather_selection_marked"
                });
            }

            var showCloseTimer;

            for (const arrow of div.querySelectorAll('[data-arrow]')) {
                arrow.addEventListener('touchstart', function() {
                    moveCursor(this.dataset.arrow);
                    close.style.display = 'none';
                })
                arrow.addEventListener('touchend', function() {
                    if (showCloseTimer){
                        clearTimeout(showCloseTimer);
					}
                    showCloseTimer = setTimeout(function() {
                        close.style.display = '';
                    }, 300)
                })
            }

            registerEvents('editor.cursorActivity', heather, cursorActivityHandler, eventUnregisters);
            registerEvents('editor.update', heather, resize, eventUnregisters);
            registerEvents('editor.mousedown', 'editor.touchstart', heather, function(cm, e) {
                if (isWidget(e.target, cm)) {
                    e.codemirrorIgnore = true;
                    return;
                }
                me.movedByMouseOrTouch = true;
                me.end = undefined;
                if (me.marked) {
                    me.marked.clear();
                }
            }, eventUnregisters);

            this.div = div;
            this.heather = heather;
            this.eventUnregisters = eventUnregisters;
        }

        SelectionHelper.prototype.getCursors = function() {
            var start;
            var end;
            if (this.end.line > this.start.line || (this.end.line == this.start.line && this.end.ch >= this.start.ch)) {
                start = this.start;
                end = this.end;
            } else {
                start = this.end;
                end = this.start;
            }
            return {
                start: start,
                end: end
            }
        }

        SelectionHelper.prototype.remove = function(setSelection) {
            if (this.marked) {
                this.marked.clear();
            }
            var editor = this.heather.editor;
            if (this.end && setSelection === true) {
                var cursors = this.getCursors();
                editor.setSelection(cursors.start, cursors.end);
            }
            this.div.remove();

            unregisterEvents(this.eventUnregisters);
            editor.setOption('readOnly', false);
            editor.focus();
        }

        return SelectionHelper;
    })();


    var Sync = (function(editor) {


        function Sync(editor, scrollElement) {
            this.editor = editor;
            this.scrollElement = scrollElement;
        }

        var getElementByLine = function(scrollElement, line) {
            return scrollElement.querySelector('[data-line="' + line + '"]');
        }
        var getElementByEndLine = function(scrollElement, line) {
            return scrollElement.querySelector('[data-end-line="' + line + '"]');
        }
        var getLineMarker = function(scrollElement) {
            return scrollElement.querySelectorAll('[data-line]');
        }

        function getEditorScrollInfo(editor, scrollElement) {
            var lines = [];
            var lineMarkers = getLineMarker(scrollElement);
            lineMarkers.forEach(function(ele) {
                lines.push(parseInt(ele.dataset.line));
            });
            var currentPosition = editor.getScrollInfo().top
            var lastMarker
            var nextMarker
            for (var i = 0; i < lines.length; i++) {
                const line = lines[i];
                const height = editor.heightAtLine(line, 'local')
                if (height < currentPosition) {
                    lastMarker = line
                } else {
                    nextMarker = line
                    break
                }
            }
            if (!Util.isUndefined(lastMarker) && Util.isUndefined(nextMarker)) {
                nextMarker = parseInt(lineMarkers[lineMarkers.length - 1].dataset.endLine);
            }
            var percentage = 0
            if (!Util.isUndefined(lastMarker) && !Util.isUndefined(nextMarker) && lastMarker !== nextMarker) {
                percentage = (currentPosition - editor.heightAtLine(lastMarker, 'local')) / (editor.heightAtLine(nextMarker, 'local') - editor.heightAtLine(lastMarker, 'local'))
            }
            return {
                lastMarker: lastMarker,
                nextMarker: nextMarker,
                percentage
            }
        }

        Sync.prototype.doSync = function() {
            var editorScroll = getEditorScrollInfo(this.editor, this.scrollElement);
            var lastPosition = 0
            var nextPosition = this.scrollElement.offsetHeight;
            var last;
            if (!Util.isUndefined(editorScroll.lastMarker)) {
                last = getElementByLine(this.scrollElement, editorScroll.lastMarker);
                if (!Util.isUndefined(last)) {
                    lastPosition = last.offsetTop - 10
                }
            }
            var next;
            if (!Util.isUndefined(editorScroll.nextMarker)) {
                next = getElementByLine(this.scrollElement, editorScroll.nextMarker) || getElementByEndLine(this.scrollElement, editorScroll.nextMarker)
                if (!Util.isUndefined(next)) {
                    nextPosition = next.offsetTop - 10
                }
            }
            var pos = nextPosition - lastPosition;
            if (!Util.isUndefined(last) && !Util.isUndefined(next) && last === next) {
                pos = last.offsetHeight;
            }
            var scrollTop = lastPosition + pos * editorScroll.percentage;
            this.scrollElement.scrollTop = scrollTop;
        }

        return Sync;
    })();

    var Bar = (function() {

        function Bar(element) {
            element.setAttribute('data-toolbar', '');
            this.element = element;
        }

        Bar.prototype.getElement = function() {
            return this.element;
        }
		
        Bar.prototype.remove = function() {
            this.element.remove();
        }

        Bar.prototype.height = function() {
            return this.length() == 0 ? 0 : this.element.offsetHeight;
        }

        Bar.prototype.width = function() {
            return this.element.offsetWidth;
        }

        Bar.prototype.length = function() {
            return this.element.childNodes.length;
        }
		
        Bar.prototype.clear = function() {
            this.element.innerHTML = '';
        }
		
        Bar.prototype.insertElement = function(element, index) {
            var toolbar = this.element;
            if (index >= this.length()) {
                toolbar.appendChild(element);
            } else {
                if (index <= 0) {
                    toolbar.insertBefore(element, toolbar.childNodes[0])
                } else {
                    toolbar.insertBefore(element, toolbar.childNodes[index])
                }
            }
        }

        Bar.prototype.addElement = function(element) {
            this.insertElement(element, this.length());
        }

        Bar.prototype.removeElement = function(deleteChecker) {
            var elements = this.element.childNodes;
            for (var i = elements.length - 1; i >= 0; i--) {
                var element = elements[i];
                if (deleteChecker(element)) {
                    element.remove();
                }
            }
        }

        return Bar;
    })();

    var Top = (function() {

        function Top(heather) {
            var div = document.createElement('div');
            div.classList.add('heather_top');
            div.style.left = heather.editor.getGutterElement().offsetWidth + 'px';
            heather.editor.getWrapperElement().append(div);
            this.div = div;
            this.components = [];
            this.cm = heather.editor;
            this.cachedHeight = 0;
            var me = this;
			
			var resize = function(cm){
				var gutterWidth = cm.getGutterElement().offsetWidth;
				me.div.style.left = gutterWidth + 'px';
				me.div.style.width = getEditorEditableWidth(cm)+'px';
			}
			
            heather.on('editor.update', function(cm) {
				resize(cm);
				me.calcMarginTop();
            })
        }

        Top.prototype.addComponent = function(cmp) {
            this.components.push(cmp)
        }

        Top.prototype.calcMarginTop = function() {
            var h = 0;
            for (const cmp of this.components) {
                h += cmp.getHeight();
            }
            if (h !== this.cachedHeight) {
                this.cachedHeight = h;
                this.cm.display.lineDiv.style.marginTop = h + 'px';
				if(h == 0){
					this.div.style.display = 'none';
				} else {
					this.div.style.display = '';
				}
				CodeMirror.signal(this.cm, "update", this.cm);
            }
        }

        Top.prototype.getHeight = function() {
            return this.cachedHeight;
        }

        return Top;
    })();

    var Toolbar = (function() {

        function Toolbar(heather, config) {
            var cm = heather.editor;
            var div = document.createElement('div');
            div.classList.add('heather_toolbar_bar');
            div.setAttribute('data-widget', '');

            heather.top.div.appendChild(div);
            this.height = 0;
            this.heather = heather;
            this.cm = cm;
            this.bar = new Bar(div);

            var me = this;

            heather.top.addComponent({
                getHeight: function() {
                    return me.bar.getElement().style.display === 'none' ? 0 : me.bar.height();
                }
            });
        }

        Toolbar.prototype.addElement = function(element) {
            this.bar.addElement(element);
            this.heather.top.calcMarginTop();
        }

        Toolbar.prototype.insertElement = function(element, index) {
            this.bar.insertElement(element, index);
            this.heather.top.calcMarginTop();
        }

        Toolbar.prototype.removeElement = function(deleteChecker) {
            this.bar.removeElement(deleteChecker);
            this.heather.top.calcMarginTop();
        }

        Toolbar.prototype.clear = function() {
            this.bar.clear();
            this.heather.top.calcMarginTop();
        }

        Toolbar.prototype.hide = function() {
            this.bar.getElement().style.display = 'none'
            this.heather.top.calcMarginTop();
        }

        Toolbar.prototype.show = function() {
            this.bar.getElement().style.display = ''
            this.heather.top.calcMarginTop();
        }

        return Toolbar;
    })();

    var CommandBar = (function() {

        function CommandBar(heather, config) {
            this.cm = heather.editor;
            this.heather = heather;
            this.eventUnregisters = [];
            this.config = config;
			this.bar = createBar(this.cm, this.heather);
			this.bar.getElement().setAttribute('data-widget', '');
			this.bar.getElement().style.display = 'none';
			this.cm.addWidget({
				line: 0,
				ch: 0
			}, this.bar.getElement());
            if (this.config.commandBarEnable !== false)
                this.enable();
        }

        CommandBar.prototype.getBarHelper = function() {
			return this.bar;
        }

        CommandBar.prototype.enable = function() {
            if (this.enabled === true) return;
            var me = this;

            registerEvents('selectionHelperOpen', 'commandBoxOpen', this.heather, function() {
                me.setKeepHidden(true);
            }, this.eventUnregisters);

            registerEvents('selectionHelperClose', 'commandBoxClose', this.heather, function() {
                me.setKeepHidden(false);
            }, this.eventUnregisters);
			
			registerEvents('editor.update','editor.cursorActivity',this.heather,function(cm){
				if (me.enabled !== true || me.keepHidden === true) {
					return;
				}
				var pos = cm.cursorCoords(true, 'local');
				me.bar.getElement().style.display = '';
				var toolbarHeight = me.heather.top.getHeight();
				var top = pos.top - cm.getScrollInfo().top - toolbarHeight;
				var cursor = cm.getCursor();
				var distance = cm.defaultTextHeight();
				if (top > distance + me.bar.getElement().offsetHeight) {
					me.bar.getElement().style.top = (pos.top - distance - me.bar.getElement().offsetHeight) + 'px';
				} else {
					me.bar.getElement().style.top = (pos.bottom + distance) + 'px';
				}
				me.bar.getElement().style.width = getEditorEditableWidth(cm)+'px';
			},this.eventUnregisters)

            this.enabled = true;
        }

        CommandBar.prototype.disable = function() {
            if (this.enabled !== true) return;
			this.bar.getElement().style.display = 'none';
            unregisterEvents(this.eventUnregisters);
            this.eventUnregisters = [];
            this.enabled = false;
        }

        CommandBar.prototype.setKeepHidden = function(keepHidden) {
			if(this.enabled !== true) return ;
			if (keepHidden !== true && (this.heather.hasSelectionHelper() || this.heather.commandBox)) return
            if (keepHidden === true){
                this.bar.getElement().style.display = 'none';
			} else {
				this.bar.getElement().style.display = '';
			}
            this.keepHidden = keepHidden === true;
        }
		
        function createBar(cm, heather) {
            var div = document.createElement('div');
            div.classList.add('heather_command_bar')
            var bar = new Bar(div);
			
            bar.addElement(Util.createBarIcon('command',function(){
				heather.execCommand('commands');
			}));
			
			bar.addElement(Util.createBarIcon('bold',function(){
				heather.execCommand('bold');
			}));
			
			bar.addElement(Util.createBarIcon('italic',function(){
				heather.execCommand('italic');
			}));
			
            bar.addElement(Util.createBarIcon('link',function(){
				heather.execCommand('link');
			}));
			
            bar.addElement(Util.createBarIcon('code',function(){
				heather.execCommand('code');
			}));


			bar.addElement(Util.createBarIcon('strike',function(){
				heather.execCommand('strike');
			}));

			bar.addElement(Util.createBarIcon('undo',function(){
				heather.execCommand('editor.undo');
			}));

            bar.addElement(Util.createBarIcon('redo',function(){
				heather.execCommand('editor.redo');
			}));

            div.addEventListener('click', function(e) {
                var cursor = cm.coordsChar({
                    left: e.clientX,
                    top: e.clientY
                }, 'window');
                cm.focus();
                cm.setCursor(cursor);
            });
            return bar;
        }

        return CommandBar;
    })();

    //markdown render that with line numbers
    var MarkdownParser = (function() {

        function MarkdownParser(config, heather) {
            config = config || {};
            config.highlight = function(str, lang) {
                if (lang == 'mermaid') {
                    return createUnparsedMermaidElement(str).outerHTML;
                }
                if (lang && hljs.getLanguage(lang)) {
                    return '<pre class="hljs"><code class="language-' + lang + '"></code><textarea style="display:none !important">'+str+'</textarea></pre>';                  
                }
            }
            var md = window.markdownit(config);
            if (config.callback)
                config.callback(md);
            addLineNumberAttribute(md, heather);
            this.md = md;
        }

        MarkdownParser.prototype.render = function(markdown) {
            return this.md.render(markdown);
        }

        function addLineNumberAttribute(md, heather) {
            var injectLineNumbers = function(tokens, idx, options, env, slf) {
                var line;
                if (tokens[idx].map) {
                    line = tokens[idx].map[0];
                    tokens[idx].attrJoin('class', 'line');
                    tokens[idx].attrSet('data-line', String(line));
                    tokens[idx].attrSet('data-end-line', String(tokens[idx].map[1]));
                }
                return slf.renderToken(tokens, idx, options, env, slf);
            }
            md.renderer.rules.paragraph_open = injectLineNumbers;
            md.renderer.rules.heading_open = injectLineNumbers;
            md.renderer.rules.blockquote_open = injectLineNumbers;
            md.renderer.rules.hr = injectLineNumbers;
            md.renderer.rules.ordered_list_open = injectLineNumbers;
            md.renderer.rules.bullet_list_open = injectLineNumbers;
            md.renderer.rules.table_open = injectLineNumbers;
            md.renderer.rules.list_item_open = injectLineNumbers;
            md.renderer.rules.link_open = injectLineNumbers;
            addFenceLineNumber(md);
            addHtmlBlockLineNumber(md);
            addCodeBlockLineNumber(md);
			addMathBlockLineNumber(md);
        }

        function addMathBlockLineNumber(md) {
            md.renderer.rules.math_block = function(tokens, idx, options, env, self) {
                var token = tokens[idx];
                var latex = token.content;
                var addLine = token.map;
                options.displayMode = true;
                if (addLine) {
                    return "<div class='katex-block line' data-line='" + token.map[0] + "' data-end-line='" + token.map[1] + "'>" + latex + "</div>";
                } else {
                    return "<span class='katex-block'>"+latex+"</span>";
                }
            }
        }

        function addCodeBlockLineNumber(md) {
            md.renderer.rules.code_block = function(tokens, idx, options, env, self) {
                var token = tokens[idx];
                if (token.map) {
                    var line = token.map[0];
                    var endLine = token.map[1];
                    return '<pre' + self.renderAttrs(token) + ' class="line" data-line="' + line + '" data-end-line="' + endLine + '"><code>' +
                        md.utils.escapeHtml(tokens[idx].content) +
                        '</code></pre>\n';
                }
                return '<pre' + self.renderAttrs(token) + '><code>' +
                    md.utils.escapeHtml(tokens[idx].content) +
                    '</code></pre>\n';
            };
        }

        function addHtmlBlockLineNumber(md) {
            md.renderer.rules.html_block = function(tokens, idx /*, options, env */ ) {
                var token = tokens[idx];
                var addLine = token.map;
                var content = token.content;
                if (addLine) {
                    var line = token.map[0];
                    var div = document.createElement('div');
                    div.classList.add("line");
                    div.setAttribute("data-html", '');
                    div.setAttribute("data-line", line);
                    div.setAttribute("data-end-line", token.map[1]);
                    div.innerHTML = content;
                    return div.outerHTML;
                } else {
                    return content;
                }
            }
        }


        function addFenceLineNumber(md) {
            md.renderer.rules.fence = function(tokens, idx, options, env, slf) {
                var token = tokens[idx],
                    info = token.info ? md.utils.unescapeAll(token.info).trim() : '',
                    langName = '',
                    highlighted, i, tmpAttrs, tmpToken;

                if (info) {
                    langName = info.split(/\s+/g)[0];
                }

                if (options.highlight) {
                    highlighted = options.highlight(token.content, langName) || md.utils.escapeHtml(token.content);
                } else {
                    highlighted = md.utils.escapeHtml(token.content);
                }

                var addLine = token.map;
                if (langName == 'mermaid') {
                    if (addLine) {
                        var div = document.createElement('div');
                        div.innerHTML = highlighted;
                        var ele = div.firstChild;
                        ele.classList.add("line");
                        ele.setAttribute("data-line", token.map[0]);
                        ele.setAttribute("data-end-line", token.map[1]);
                        return div.innerHTML;
                    } else {
                        return highlighted;
                    }

                }

                if (highlighted.indexOf('<pre') === 0) {
                    if (addLine) {
                        var div = document.createElement('div');
                        div.innerHTML = highlighted;
                        var ele = div.firstChild;
                        ele.classList.add("line");
                        ele.setAttribute("data-line", token.map[0]);
                        ele.setAttribute("data-end-line", token.map[1]);
                        return div.innerHTML;
                    }
                    return highlighted + '\n';
                }


                // If language exists, inject class gently, without modifying original token.
                // May be, one day we will add .clone() for token and simplify this part, but
                // now we prefer to keep things local.
                if (info) {
                    i = token.attrIndex('class');
                    tmpAttrs = token.attrs ? token.attrs.slice() : [];

                    if (i < 0) {
                        tmpAttrs.push(['class', options.langPrefix + langName]);
                    } else {
                        tmpAttrs[i][1] += ' ' + options.langPrefix + langName;
                    }

                    // Fake token just to render attributes
                    tmpToken = {
                        attrs: tmpAttrs
                    };
                    if (addLine) {
                        return '<pre class="line" data-line="' + token.map[0] + '"  data-end-line="' + token.map[1] + '"><code' + slf.renderAttrs(tmpToken) + '>' +
                            highlighted +
                            '</code></pre>\n';
                    } else {
                        return '<pre><code' + slf.renderAttrs(tmpToken) + '>' +
                            highlighted +
                            '</code></pre>\n';
                    }
                }

                if (addLine) {
                    return '<pre class="line" data-line="' + token.map[0] + '" data-end-line="' + token.map[1] + '"><code' + slf.renderAttrs(token) + '>' +
                        highlighted +
                        '</code></pre>\n';
                } else {
                    return '<pre><code' + slf.renderAttrs(token) + '>' +
                        highlighted +
                        '</code></pre>\n';
                }

            };
        }

        return MarkdownParser;

    })();

    var Tooltip = (function() {
		
		var HeadingTip = (function(){
			function HeadingTip(heather){
				this.eventUnregisters = [];
				this.heather = heather;
			}
			
			HeadingTip.prototype.disable = function(){
				if(this.commandBox){this.commandBox.remove();this.commandBox = null}
				unregisterEvents(this.eventUnregisters);
			}
			
			HeadingTip.prototype.enable = function(){
				var me = this;
				registerEvents('editor.cursorActivity', this.heather,function(cm){
					if(cm.somethingSelected()) {closeBox(me);return;}
					if(cm.display.input.composing) {closeBox(me);return;}
					var cursor = cm.getCursor();
                    var text = cm.getLine(cursor.line);
					var quote = getStartQuote(text);
					var ch = cursor.ch;
					var lefts = text.substring(0,ch).substring(quote.length).split('');
					if(lefts.length == 0) {closeBox(me);return;}
					var blank = 0;
					var array = [];
					for(const left of lefts){
						if(left == ' '){
							if(array.length > 0) {closeBox(me);return;}
							else {blank++;if(blank == 4){closeBox(me);return;}continue}
						} 
						if(left != '#') {closeBox(me);return;}
						ch--;
						array.push(left);
					}
					if(array.length == 0) {closeBox(me);return;}
					var rights = text.substring(cursor.ch).split('');
					for(const right of rights){
						if(right == '#') array.push(right);
						else if(right != ' ') {closeBox(me);return;}
						else break;
					}
					if(array.length > 6) {closeBox(me);return;}
					var items = [];
					var setHeading = function(level){
						cm.setSelection({
							line: cursor.line,
							ch: ch
						}, {
							line:  cursor.line,
							ch: ch+array.length
						});
						cm.replaceSelection('#'.repeat(level));
						cm.focus();
						cm.setCursor({line:cursor.line,ch:ch+level});
					}
					for(var i=1;i<=6;i++){
						items.push({
							html : i,
							handler : function(){
								var level = parseInt(this.textContent);
								setHeading(level);
							}
						})
					}
					var keyMap = {
					}
					for(var i=1;i<=6;i++){
						const level = i;
						keyMap[level] = function(){setHeading(level)};
					}
					cm.addKeyMap(keyMap);
					var box = new CommandBox(me.heather,items);
					box.select(array.length-1);
					box.onRemove(function(){
						cm.removeKeyMap(keyMap);
					})
					me.commandBox = box;
				},this.eventUnregisters);
			}
			
			return HeadingTip;
		})();

        var HljsTip = (function() {

            function HljsTip(heather) {
				this.eventUnregisters = [];
				var hljsLanguages = hljs.listLanguages();
                hljsLanguages.push('mermaid');
                this.languages = hljsLanguages;
				this.heather = heather;
            }

            HljsTip.prototype.enable = function() {
				var me = this;
				var editor = this.heather.editor;
				var setLanguage = function(selected) {
                    var lang = selected.textContent;
                    var cursor = editor.getCursor();
                    var text = editor.getLine(cursor.line);
                    var index = text.indexOf('``` ');
                    editor.setSelection({
                        line: cursor.line,
                        ch: index + 4
                    }, {
                        line: cursor.line,
                        ch: text.length
                    });
                    editor.replaceSelection(lang);
                    if (cursor.line + 1 == editor.lineCount()) {
                        editor.execCommand('newlineAndIndent');
                    } else {
                        editor.execCommand('goLineDown');
                    }
                    editor.focus();
                }
				registerEvents('editor.change', this.heather,function(cm){
					if(cm.display.input.composing) {closeBox(me);return;}
					var cursor = cm.getCursor();
                    var text = cm.getLine(cursor.line);
					var quote = getStartQuote(text);
					if(cursor.ch < quote.length + 4){closeBox(me);return;}
					var chLeft = text.substring(0,cursor.ch).substring(quote.length).trimLeft();
					if (!chLeft.startsWith("``` ")) {closeBox(me);return;}
					var lang = text.substring(quote.length).trimLeft().substring(4).trimLeft();
					if(lang.trim() === '') {closeBox(me);return;}
					var items = filter(me,lang,function(){
						setLanguage(this);
					});
					if(items.length == 0) {closeBox(me);return;}
					me.commandBox = new CommandBox(me.heather,items);
				},this.eventUnregisters);
            }

            HljsTip.prototype.disable = function() {
				if(this.commandBox){this.commandBox.remove();this.commandBox = null}
				unregisterEvents(this.eventUnregisters);
            }
			
			function filter(tip,str,handler){
				var array = str.split('');
				var languages = tip.languages;
				var langs = [];
				out:for(const lang of languages){
					for(const ch of array){
						if(lang.indexOf(ch) == -1){
							continue out;
						}
					}
					langs.push({
						html : lang,
						handler:handler
					});
				}
				return langs;
			}

            return HljsTip;
        })();

        function Tooltip(heather, config) {
			config = config || {};
            this.hljsTip = new HljsTip(heather);
			this.headingTip = new HeadingTip(heather);
            if(config.hljsTipEnable === true) this.hljsTip.enable();
            if(config.headingTipEnable === true) this.headingTip.enable();
        }

        Tooltip.prototype.enable = function() {
            this.hljsTip.enable();
			this.headingTip.enable();
        }
        Tooltip.prototype.disable = function() {
            this.hljsTip.disable();
			this.headingTip.disable();
        }
		
		var closeBox = function(o){if(o.commandBox){o.commandBox.remove();o.commandBox = null}};
        return Tooltip;

    })();

    var FileUpload = (function() {

        function FileUpload(file, heather, config) {
            this.uploadUrl = config.url;
            this.name = config.name || 'file';
            this.beforeUpload = config.beforeUpload;
            this.file = file;
            this.fileUploadFinish = config.uploadFinish;
            this.heather = heather;
            this.fileNameGen = config.fileNameGen;
            this.withCredentials = config.withCredentials === true;
        }

        FileUpload.prototype.start = function() {
            var me = this;
            var editor = this.heather.editor;
            var formData = new FormData();
            var fileName = this.file.name;
            if (this.fileNameGen)
                fileName = this.fileNameGen(this.file) || this.file.name;
            formData.append(this.name, this.file, fileName);
            var xhr = new XMLHttpRequest();
            if (this.withCredentials === true)
                xhr.withCredentials = true;
            var bar = document.createElement("div");
            var scrollInfo = editor.getScrollInfo();
            var scrollbarWidth = 0;
            if (scrollInfo.height > scrollInfo.offsetHeight) {
                var scroller = editor.getScrollerElement();
                scrollbarWidth = scroller.offsetWidth - scroller.offsetWidth;
            }
            bar.innerHTML = '<div class="heather_progressbar"><div></div><span style="position:absolute;top:0"></span><i class="heather_upload_stop_icon" style="position: absolute;top: 0;right: ' + scrollbarWidth + 'px;"><i></div>'
           
			bar.querySelector('i').addEventListener('click', function() {
                xhr.abort();
            });
            var widget = editor.addLineWidget(editor.getCursor().line, bar, {
                coverGutter: false,
                noHScroll: true
            })
			var marginTop = Math.max(bar.querySelector('.heather_progressbar').offsetHeight - bar.querySelector('.heather_upload_stop_icon').offsetHeight,0)/2;
            bar.querySelector('.heather_upload_stop_icon').style.marginTop = marginTop+'px';
			xhr.upload.addEventListener("progress", function(e) {
                if (e.lengthComputable) {
                    var percentComplete = parseInt(e.loaded * 100 / e.total) + "";
                    var pb = bar.querySelector('.heather_progressbar').firstChild;
                    pb.style.width = percentComplete + "%"
                    bar.querySelector('.heather_progressbar').querySelector('span').textContent = percentComplete + "%";
                }
            }, false);
            xhr.addEventListener('readystatechange', function(e) {
                if (this.readyState === 4) {
                    editor.removeLineWidget(widget);
                    if (xhr.status !== 0) {
                        var info = me.fileUploadFinish(xhr.response);
                        if (info) {
                            var type = (info.type || 'image').toLowerCase();
                            switch (type) {
                                case 'image':
                                    editor.focus();
                                    editor.replaceRange('![](' + info.url + ')', me.cursor);
                                    editor.setCursor({
                                        line: me.cursor.line,
                                        ch: me.cursor.ch + 2
                                    })
                                    break;
                                case 'file':
                                    editor.focus();
                                    editor.replaceRange('[](' + info.url + ')', me.cursor);
                                    editor.setCursor({
                                        line: me.cursor.line,
                                        ch: me.cursor.ch + 1
                                    })
                                    break;
                                case 'video':
                                    var video = document.createElement('video');
                                    video.setAttribute('controls', '');
                                    if (info.poster) {
                                        video.setAttribute('poster', info.poster);
                                    }
                                    var sources = info.sources || [];
                                    if (sources.length > 0) {
                                        for (var i = 0; i < sources.length; i++) {
                                            var source = sources[i];
                                            var ele = document.createElement('source');
                                            ele.setAttribute('src', source.src);
                                            ele.setAttribute('type', source.type);
                                            video.appendChild(ele);
                                        }
                                    } else {
                                        video.setAttribute('src', info.url);
                                    }
                                    editor.replaceRange(video.outerHTML, me.cursor);
                                    break;
                            }
                        }
                    }
                }
            });

            xhr.open("POST", this.uploadUrl);
            if (this.beforeUpload) {
                var result = this.beforeUpload({
                    formData: formData,
                    start: function() {
                        xhr.send(formData);
                    }
                }, this.file);

                if (result === true) {
                    xhr.send(formData);
                }
            } else {
                xhr.send(formData);
            }
            var cursor = editor.getCursor(true);
            this.cursor = cursor;
        }

        return FileUpload;
    })();

    var LazyLoader = (function() {

        var katexLoading = false;
        var katexLoaded = false;
        var mermaidLoading = false;
        var mermaidLoaded = false;
		var katexCallbacks = [];
		var mermaidCallbacks = [];

        function loadKatex(callback) {
            if (katexLoaded) {
                if (callback) callback();
                return;
            }
            if (katexLoading){
				katexCallbacks.push(callback);
				return;
			}
            katexLoading = true;

            var link = document.createElement('link');
            link.setAttribute('type', 'text/css');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', lazyRes.katex_css);
            document.head.appendChild(link);

			loadScript(lazyRes.katex_js).then(function(){
				katexLoaded = true;
                if (callback) callback();
				try{
					for(const cb of katexCallbacks){
						try{
							cb();
						}catch(e){}
					}
				} finally {
					katexCallbacks = [];
				}
			});
        }

        function loadMermaid(callback) {
            if (mermaidLoaded) {
                if (callback) callback();
                return;
            }
            if (mermaidLoading) {
				mermaidCallbacks.push(callback);
				return ;
			}
            mermaidLoading = true;
			loadScript(lazyRes.mermaid_js).then(function(){
				var config = {
					startOnLoad:false,
					flowchart:{
						useMaxWidth:true
					},
					sequence:{
						useMaxWidth:true
					}
				};
				mermaid.initialize(config);
                mermaidLoaded = true;
                if (callback) callback();
				try{
					for(const cb of mermaidCallbacks){
						try{
							cb();
						}catch(e){}
					}
				} finally {
					mermaidCallbacks = [];
				}
			});
        }

		var loadScript = function(uri){
			  return new Promise((resolve, reject) => {
				var tag = document.createElement('script');
				tag.src = uri;
				tag.async = true;
				tag.onload = () => {
				  resolve();
				};
				document.body.appendChild(tag);
			});
		}

        return {
            loadKatex: loadKatex,
            loadMermaid: loadMermaid
        }
    })();


    var TableHelper = (function() {

        function TableHelper(heather) {


            var commandsHandler = commands['commands'];

            commands['commands'] = function(heather) {
                var cm = heather.editor;
                var context = getTableMenuContext(cm);
                if (context === 'no') {
                    commandsHandler(heather);
                    return;
                }
                if (context === 'hide') return;

                var items = [{
                    html: '插入列(前方)',
                    handler: function() {
                        addCol(heather, context, true);
                    }
                }, {
                    html: '插入列(后方)',
                    handler: function() {
                        addCol(heather, context, false);
                    }
                }, {
                    html: '删除列',
                    handler: function() {
                        delCol(heather, context);
                    }
                }, {
                    html: '插入行(上方)',
                    handler: function() {
                        addRow(heather, context, true);
                    }
                }, {
                    html: '插入行(下方)',
                    handler: function() {
                        addRow(heather, context, false);
                    }
                }, {
                    html: '删除行',
                    handler: function() {
                        delRow(heather, context);
                    }
                }];
				var box = new CommandBox(heather,items);
				box.on('editor.cursorActivity',function(){
					box.remove();
				});
            }


            var getTableMenuContext = function(cm) {
                if (cm.somethingSelected()) return 'no';
                var cursor = cm.getCursor();
                var line = cursor.line;
				
				var state = cm.getStateAfter(line,true);
				if(state.overlay.codeBlock) return 'no';
				if(!maybeTable(cm,line)) return "no";
				
                var nodes = heather.getNodesByLine(line);
                if (nodes.length == 0) return 'no';
                var node = nodes[nodes.length - 1];
                if (node.tagName == 'P') node = nodes[nodes.length - 2];
                if (!node) return 'no';
                if (node.tagName !== 'TABLE') return 'no';
                var startLine = node.startLine;
                var endLine = node.endLine;

                var rowIndex = line - startLine;
                if (rowIndex == 1) return 'hide';
                if (rowIndex > 1) rowIndex--;

                var lineStr = cm.getLine(cursor.line);
                var lineLeft = lineStr.substring(0, cursor.ch);
                var lineRight = lineStr.substring(cursor.ch);
                var colIndex = -1;

                for (var i = 0; i < lineLeft.length; i++) {
                    var ch = lineLeft.charAt(i);
                    if (ch === '|' && (i == 0 || lineLeft.charAt(i - 1) != '\\')) {
                        colIndex++;
                    }
                }
                if (lineRight.indexOf('|') == -1) colIndex--;

                return {
                    node: node,
                    startLine: startLine,
                    endLine: endLine,
                    rowIndex: rowIndex,
                    colIndex: colIndex
                }
            }

            var keyMap = {
                'Tab': function(cm) {
                    if (!tab(heather))
                        heather.execCommand('editor.indentMore');
                }
            }

            heather.addKeyMap(keyMap);
        }

        function tab(heather) {
            var editor = heather.editor;
            if (!editor.somethingSelected()) {
                var cursor = editor.getCursor();
                var line = cursor.line;
				var state = editor.getStateAfter(line,true);
				if(state.overlay.codeBlock){
					 return ;
				}
				if(!maybeTable(editor,line)) return ;
                var nodes = heather.getNodesByLine(line);
                var mappingElem;
                if (nodes.length > 0) {
                    mappingElem = nodes[nodes.length - 1];
                    if (mappingElem.tagName == 'P') mappingElem = nodes[nodes.length - 2];
                }
                if (mappingElem && mappingElem.tagName === 'TABLE') {
                    var startLine = parseInt(mappingElem.dataset.line);
                    var endLine = parseInt(mappingElem.dataset.endLine) - 1;
                    var setNextCursor = function(i, substr) {
                        if (i == startLine + 1) return false; // 
                        substr = i == line && substr === true;
                        var lineStr = substr ? editor.getLine(i).substring(cursor.ch) : editor.getLine(i);
                        var firstCh, lastCh;
                        for (var j = 0; j < lineStr.length; j++) {
                            var ch = lineStr.charAt(j);
                            if (ch == '|') {
                                //find prev char '\';
                                var prevChar = j == 0 ? '' : lineStr.charAt(j - 1);
                                if (prevChar != '\\') {
                                    //find first
                                    //need to find next
                                    if (Util.isUndefined(firstCh)) {
                                        firstCh = j;
                                    } else {
                                        lastCh = j;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!Util.isUndefined(firstCh) && !Util.isUndefined(lastCh)) {
                            //set cursor at middle
                            var ch = parseInt(Math.ceil((lastCh - firstCh) / 2)) + firstCh + (substr ? cursor.ch : 0);
                            editor.setCursor({
                                line: i,
                                ch: ch
                            });
                            return true;
                        } else {
                            return false;
                        }
                    }

                    var hasNext = false;
                    for (var i = line; i <= endLine; i++) {
                        if (setNextCursor(i, true)) {
                            hasNext = true;
                            break;
                        }
                    }

                    if (!hasNext) {
                        return setNextCursor(startLine);
                    }

                    return true;
                }
            }
            return false;
        }

        function addCol(heather, context, before) {
            var cm = heather.editor;
            var line = cm.getCursor().line;
            var array = [];
            var lineIndex = 0;
            var _ch = 0;

            var node = context.node;
            var startLine = context.startLine;
            var endLine = context.endLine;
            var colIndex = context.colIndex;

            cm.eachLine(startLine, endLine, function(handle) {
                var index = -2;
                var text = handle.text;
                for (var i = 0; i < text.length; i++) {
                    var ch = text.charAt(i);
                    if (ch == '|' && (i == 0 || text.charAt(i - 1) !== '|')) {
                        index++;
                        var flag = before === true ? index == colIndex - 1 : index == colIndex;
                        if (flag) {
                            if (lineIndex != 1)
                                array.push(text.splice(i, 1, '|    |'));
                            else
                                array.push(text.splice(text.lastIndexOf('|'), 1, '|  --  |'));
                            if (lineIndex + startLine == line) {
                                _ch = i + 3;
                            }
                            break;
                        }
                    }
                }
                lineIndex++;
            });

            cm.setSelection({
                line: startLine,
                ch: 0
            }, {
                line: endLine,
                ch: 0
            });
            var newText = array.join('\n');
            if (endLine-1 != cm.lastLine()) {
                newText += '\n';
            }
            cm.replaceSelection(newText);
            cm.focus();
            cm.setCursor({
                line: line,
                ch: _ch
            })
        }


        function delCol(heather, context) {
            var cm = heather.editor;
            var node = context.node;
            var startLine = context.startLine;
            var endLine = context.endLine;
            var colIndex = context.colIndex;

            var array = [];
            var lineIndex = 0;
            var line = cm.getCursor().line;
            var _ch = 0;
            cm.eachLine(startLine, endLine, function(handle) {
                var index = -2;
                var prevIndex = -1;
                var text = handle.text;
                for (var i = 0; i < text.length; i++) {
                    var ch = text.charAt(i);
                    if (ch == '|' && (i == 0 || text.charAt(i - 1) !== '|')) {
                        index++;
                        if (index == colIndex) {
                            if (prevIndex == -1) {
                                return false;
                            }
                            var newStr = text.splice(prevIndex, i - prevIndex, '');
                            array.push(newStr == '|' ? '' : newStr);
                            if (lineIndex + startLine == line) {
                                _ch = prevIndex;
                            }
                            break;
                        }
                        prevIndex = i;
                    }
                }
                lineIndex++;
            });
            cm.setSelection({
                line: startLine,
                ch: 0
            }, {
                line: endLine,
                ch: 0
            });
            var table = array.join('\n');
            cm.replaceSelection((table.trim() == '' ? '' : table) + '\n');
            cm.focus();
            cm.setCursor({
                line: line,
                ch: _ch
            })
        }

        function delRow(heather, context) {
            var cm = heather.editor;
            var node = context.node;
            var startLine = context.startLine;
            var endLine = context.endLine;
            var rowIndex = context.rowIndex;

            if (rowIndex < 1) return;
            var array = [];
            var lineIndex = 0;
            var line = cm.getCursor().line;
            cm.eachLine(startLine, endLine, function(handle) {
                var _rowIndex = lineIndex > 1 ? lineIndex - 1 : lineIndex;
                if (rowIndex != _rowIndex || lineIndex == 1) {
                    array.push(handle.text);
                }
                lineIndex++;
            });
            cm.setSelection({
                line: startLine,
                ch: 0
            }, {
                line: endLine,
                ch: 0
            });
            var text = array.join('\n') + '\n';
            cm.replaceSelection(text);

            cm.focus();
            var line = line - 1;
            if (line == startLine + 1) {
                line--;
            }
            cm.setCursor({
                line: line,
                ch: 1
            })
        }

        function addRow(heather, context, before) {
            var cm = heather.editor;
            var node = context.node;
            var startLine = context.startLine;
            var endLine = context.endLine;
            var rowIndex = context.rowIndex;

            if (rowIndex == 0 && before === true) return;
            var lineIndex = rowIndex < 1 ? rowIndex : rowIndex + 1;
            var newLine = '';
            var tr = node.querySelectorAll('tr')[rowIndex];
            var rowLine = cm.getLine(startLine + rowIndex);
            var startSpaceLength = rowLine.length - rowLine.trimLeft().length;
            var quote = getStartQuote(rowLine);
            newLine += quote;
            for (var i = 0; i < tr.children.length; i++) {
                newLine += '|    ';
                if (i == tr.children.length - 1)
                    newLine += '|';
            }
            var newCh = 3 + quote.length;
            var targetLine = startLine + lineIndex;
            if (before === true) {
                if (targetLine >= cm.lineCount()) return;
                cm.setSelection({
                    line: targetLine,
                    ch: 0
                });
                cm.replaceSelection(newLine + '\n');
                cm.focus();
                cm.setCursor({
                    line: startLine + lineIndex,
                    ch: newCh
                });
            } else {
                if (rowIndex == 0) {
                    targetLine = startLine + 1;
                }
                cm.setSelection({
                    line: targetLine,
                    ch: cm.getLine(targetLine).length
                });
                cm.replaceSelection('\n' + newLine);
                cm.focus();
                cm.setCursor({
                    line: targetLine + 1,
                    ch: newCh
                });
            }
        }

        return TableHelper;

    })();

    commands['heading'] = function(heather) {
        var cm = heather.editor;
        var line = cm.getCursor().line;
		var heading = 1;
		first:while(line > 0){
			line--;
			var lineHandle = cm.getLineHandle(line);
			second:for(const style of lineHandle.styles){
				if(typeof style === 'string'){
					for(const s of style.split(' ')){
						if(s.startsWith('header-')){
							try{
								heading = parseInt(s.substring(7));
								break first;
							}catch(e){continue second;}
						}
					}
				}
			}
		}

        cm.replaceSelection("#".repeat(heading) + " " + cm.getSelection());
        cm.focus();
    }

    commands['commands'] = function(heather) {
        var items = [{
            html: '标题',
            handler: function() {
                heather.execCommand('heading');
            }
        }, {
            html: '表格',
            handler: function() {
                heather.execCommand('table');
            }
        }, {
            html: '代码块',
            handler: function() {
                heather.execCommand('codeBlock');
            }
        }, {
            html: '无序列表',
            handler: function() {
                heather.execCommand('unorderedList');
            }
        }, {
            html: '有序列表',
            handler: function() {
                heather.execCommand('orderedList');
            }
        }, {
            html: '任务列表',
            handler: function() {
                heather.execCommand('taskList');
            }
        }, {
            html: '引用',
            handler: function() {
                heather.execCommand('quote');
            }
        }, {
            html: '数学公式块',
            handler: function() {
                heather.execCommand('mathBlock');
            }
        }, {
            html: 'mermaid图表',
            handler: function() {
                heather.execCommand('mermaid');
            }
        }];
		var box = new CommandBox(heather,items);
		box.on('editor.cursorActivity',function(){
			box.remove();
		})
    }

    commands['table'] = function(heather) {
        var cm = heather.editor;
        var cursor = cm.getCursor();
        var rows = cols = 2;
        var text = '';
        for (var i = 0; i < cols; i++) {
            text += '|    ';
        }
        text += '|'
        text += "\n";
        var prefix = createPrefix(cm, cursor);
        text += prefix;
        for (var i = 0; i < cols; i++) {
            text += '|  --  ';
        }
        text += '|'
        if (rows > 1) {
            text += '\n';
            for (var i = 0; i < rows - 1; i++) {
                text += prefix;
                for (var j = 0; j < cols; j++) {
                    text += '|    ';
                }
                text += '|'
                if (i < rows - 2)
                    text += "\n";
            }
        }

        cm.replaceSelection(text);

        var lineStr = cm.getLine(cursor.line);
        var startCh, endCh;

        for (var i = 0; i < lineStr.length; i++) {
            if (lineStr.charAt(i) == '|') {
                if (!Util.isUndefined(startCh)) {
                    endCh = i;
                    break;
                }
                startCh = i;
            }
        }

        if (!Util.isUndefined(startCh) && !Util.isUndefined(endCh)) {
            var ch = startCh + (endCh - startCh) / 2;
            cm.focus();
            cm.setCursor({
                line: cursor.line,
                ch: ch
            });
        }
    }

    commands['taskList'] = function(heather) {
        runListCommand(heather, 'taskList')
    }

    commands['orderedList'] = function(heather) {
        runListCommand(heather, 'orderedList')
    }

    commands['unorderedList'] = function(heather) {
        runListCommand(heather, 'unorderedList')
    }

    commands['code'] = function(heather) {
        runWrapCommand(heather, '`');
    }

    commands['link'] = function(heather) {
        var cm = heather.editor;
        cm.focus();
        if (!cm.somethingSelected()) {
            cm.replaceSelection("[](https://)");
            var start_cursor = cm.getCursor();
            var cursorLine = start_cursor.line;
            var cursorCh = start_cursor.ch;
            cm.setCursor({
                line: cursorLine,
                ch: cursorCh - 11
            });
        } else {
            cm.replaceSelection("[" + cm.getSelection() + "](https://)");
        }
    }

    commands['strike'] = function(heather) {
        runWrapCommand(heather, '~~');
    }

    commands['mermaid'] = function(heather) {
        runWrapBlockCommand(heather, '``` mermaid', '```');
    }

    commands['codeBlock'] = function(heather) {
        runWrapBlockCommand(heather, '``` ', '```');
    }

    commands['mathBlock'] = function(heather) {
        runWrapBlockCommand(heather, '$$', '$$');
    }

    commands['quote'] = function(heather) {
        runBlockCommand(heather, function(line, i, startBlankLength, noSelection, singleLine) {
            return '> ' + line + (noSelection || singleLine ? '' : '  ');
        })
    }

    commands['bold'] = function(heather) {
        runWrapCommand(heather, '**');
    }

    commands['italic'] = function(heather) {
        runWrapCommand(heather, '*');
    }

    commands['br'] = function(heather) {
        var cm = heather.editor;
        cm.replaceSelection('<br>');
        cm.focus();
        var cursor = cm.getCursor('from');
        cursor.ch = cursor.ch + 4;
        cm.setCursor(cursor);
    }

    function runListCommand(heather, type) {
        runBlockCommand(heather, function(line, index) {
            if (type == 'orderedList') {
                return (index + 1) + '. ' + line;
            }
            if (type == 'unorderedList') {
                return '- ' + line;
            }
            if (type == 'taskList') {
                return '- [ ] ' + line;
            }
        })
    }

    function runWrapBlockCommand(heather, start, after) {
        var last = heather.editor.getCursor('to');
        var first = heather.editor.getCursor('from');
        var resetCursor = false;
        runBlockCommand(heather, function(line, i, startBlankLength, noSelection, singleLine) {
            if (noSelection) {
                resetCursor = true;
                var blank = ' '.repeat(last.ch);
                return start + '\n' + blank + '\n' + blank + after;
            } else {
                if (i == 0) {
                    if (last.line - first.line == 0) {
                        return start + '\n' + ' '.repeat(startBlankLength) + line + '\n' + ' '.repeat(startBlankLength) + after;
                    }
                    return start + '\n' + ' '.repeat(startBlankLength) + line;
                }
                if (i == last.line - first.line)
                    return line + '\n' + ' '.repeat(startBlankLength) + after;
                return line;
            }
        });
        if (resetCursor) {
            heather.editor.setCursor({
                line: last.line + 1,
                cursor: last.ch
            })
        }
    }


    function runBlockCommand(heather, lineHandler) {
        var cm = heather.editor;
        cm.focus();
        if (!cm.somethingSelected()) {
            cm.replaceSelection(lineHandler('', 0, 0, true, true));
        } else {
            var texts = cm.getSelection().split('\n');
            var replaces = [];
            var from = cm.getCursor('from');
            var singleLine = from.line == cm.getCursor('to').line;
            for (var i = 0; i < texts.length; i++) {
                var text = texts[i];
                if (i == 0) {
                    var fullLine = cm.getLine(from.line);
                    var startBlankLength = fullLine.length - fullLine.trimLeft().length;
                    var firstLineStartsWithBlank = fullLine.substring(0, from.ch).trimLeft() == '';
                    if (!firstLineStartsWithBlank) {
                        replaces.push("\n" + ' '.repeat(startBlankLength) + lineHandler(text, i, startBlankLength, false, singleLine));
                    } else {
                        from.ch = 0;
                        replaces.push(' '.repeat(startBlankLength) + lineHandler(text.trimLeft(), i, startBlankLength, false, singleLine));
                    }
                } else {
                    var startBlankLength = text.length - text.trimLeft().length;
                    replaces.push(' '.repeat(startBlankLength) + lineHandler(text.trimLeft(), i, startBlankLength, false, singleLine));
                }
            }
            cm.replaceSelection(replaces.join('\n'))
        }
    }

    function runWrapCommand(heather, wrap) {
        var cm = heather.editor;
        cm.focus();
        if (!cm.somethingSelected()) {
            cm.replaceSelection(wrap + wrap);
            var start_cursor = cm.getCursor();
            var cursorLine = start_cursor.line;
            var cursorCh = start_cursor.ch;
            cm.setCursor({
                line: cursorLine,
                ch: cursorCh - wrap.length
            });
        } else {
            cm.replaceSelection(wrap + cm.getSelection() + wrap);
        }
    }
    function afterDisplay(element) {
		var pres = element.matches('pre.hljs') ? [element] : element.querySelectorAll('pre.hljs');
		for(const pre of pres){
			if(pre.hasAttribute('data-processed')) continue;
			var code = pre.firstElementChild;
			var className = code.className || '';
			if(code.className.startsWith('language-')){
				var textarea = code.nextElementSibling;
				if(textarea){
					var language = className.substring(9).trim();
					var html = hljs.highlight(language, textarea.value, true).value;
					code.innerHTML = html;
					textarea.remove();
				}
			}
			pre.setAttribute('data-processed','');
		}
		
		var inlines = element.querySelectorAll(".katex-inline");
		var blocks = element.matches('.katex-block') ? [element] : element.querySelectorAll(".katex-block");
		
		if(inlines.length > 0 || blocks.length > 0){
			LazyLoader.loadKatex(function() {
				for (var i = 0; i < inlines.length; i++) {
					var inline = inlines[i];
					if(inline.hasAttribute('data-inline-katex')) continue;
					var expression = inline.textContent;
					var result = parseKatex(expression, false);
					var div = document.createElement('div');
					div.innerHTML = result;
					var child = div.firstChild;
					child.setAttribute('data-inline-katex', '');
					inline.outerHTML = child.outerHTML;
				}
				for (var i = 0; i < blocks.length; i++) {
					var block = blocks[i];
					if(block.hasAttribute('data-block-katex')) continue;
					var expression = block.textContent;
					var result = parseKatex(expression, true);
					var div = document.createElement('div');
					div.innerHTML = result;
					var child = div.firstChild;
					block.innerHTML = child.outerHTML;
					block.setAttribute('data-block-katex', '');
				}
			});
		}
      
		var mermaidElems = element.classList.contains('mermaid') ? [element] :  element.querySelectorAll('.mermaid');
		if(mermaidElems.length > 0){
			LazyLoader.loadMermaid(function() {
				for (const mermaidElem of mermaidElems) {
					if(mermaidElem.hasAttribute('data-processed')) continue;
					try {
						mermaid.parse(mermaidElem.textContent);
						var graph = mermaid.mermaidAPI.render('mermaid_'+mermaidId++, mermaidElem.nextElementSibling.value);
						mermaidElem.innerHTML = graph
					} catch (e) {
						mermaidElem.removeAttribute('data-mermaid-id');
						mermaidElem.innerHTML = '<pre>' + e.str + '</pre>'
					}
					mermaidElem.nextElementSibling.remove();
					mermaidElem.setAttribute('data-processed','');
				}
				
			});
		}
    }

    function parseKatex(expression, displayMode) {
        try {
            return katex.renderToString(expression, {
                throwOnError: true,
                displayMode: displayMode
            });
        } catch (e) {
            if (e instanceof katex.ParseError) {
                var attr = displayMode ? 'data-block-katex' : 'data-inline-katex'
                return '<span class="katex-mathml" data-error title="' + e.message + '" ' + attr + ' style="color:red"><math><semantics><annotation encoding="application/x-tex">' + expression + '</annotation></semantics></math>' + expression + '</span>';
            } else {
                throw e;
            }
        }
    }

    function changeTastListStatus(heather, x, y) {
        var cm = heather.editor;
        var cursor = cm.coordsChar({
            left: x,
            top: y
        }, 'window');
		var state = heather.editor.getStateAfter(cursor.line,false);
		if(state.overlay.codeBlock){
			 return ;
		}
		var lineHandle = cm.getLineHandle(cursor.line);
		var styles = lineHandle.styles;
		var startCh, endCh;
		for(var i=0;i<styles.length;i++){
			var style = styles[i];
			if(style === 'meta' || style === 'property'){
				endCh = styles[i-1];
				startCh = endCh - 3;
				break;
			}
		}
		if(Util.isUndefined(startCh) || Util.isUndefined(endCh)) return;
		var lineStr = lineHandle.text;
		if(cursor.ch <= startCh || cursor.ch >= endCh) return ;
		var text = lineStr.substring(startCh,endCh);
		if(text !== '[ ]' && text !== '[x]' && text !== '[X]') return ;
		cm.setSelection({
			line: cursor.line,
			ch: startCh + 1
		}, {
			line: cursor.line,
			ch: endCh-1
		});
		if (text !== '[ ]') {
			cm.replaceSelection(" ");
		} else {
			cm.replaceSelection("x");
		}
    }

    function createUnparsedMermaidElement(expression) {
        var div = document.createElement('div');
        div.classList.add('mermaid-block');
        div.innerHTML = '<div class="mermaid"></div><textarea class="mermaid-source" style="display:none !important">' + expression + '</textarea>';
        div.querySelector('.mermaid').innerHTML = expression;
        return div;
    }
	
	function getStartQuote(str){
		var newStr = str.trimLeft();
		if(str.length - newStr.length > 4){
			return "";
		}
		var match = listRE.exec(str);
		if(match != null){
			var quote = '';
			while(match != null){
				var start = match[0];
				quote += start;
				newStr = newStr.substring(start.length);
				var spaceLength = newStr.length - newStr.trimLeft().length;
				if(spaceLength > 4)
					break;
				newStr = newStr.trimLeft();
				quote += ' '.repeat(spaceLength);
				match = listRE.exec(newStr);
			}
			return quote;
		}
		return '';
	}

    function createPrefix(cm, cursor) {
		var quote = getStartQuote(cm.getLine(cursor.line));
		return " ".repeat(Math.max(cursor.ch - quote.length, 0)) + quote;
    }

    function registerEvents(...args) {
        var unregisters = args[args.length - 1];
        var heather = args[args.length - 3];
        var handler = args[args.length - 2];
        for (var i = 0; i < args.length - 3; i++) {
            unregisters.push(heather.on(args[i], handler))
        }
        return unregisters;
    }

    function unregisterEvents(unregisters) {
        for (const reg of unregisters) {
            try {
                reg.off();
            } catch (e) {
                console.log(e)
            }
        }
    }
	
	function getScrollBarWidth(cm){
		var scrollInfo = cm.getScrollInfo();
		var scrollBarWidth = 0;
		if (scrollInfo.height > scrollInfo.offsetHeight) {
			var scroller = cm.getScrollerElement();
			scrollBarWidth = scroller.offsetWidth - scroller.offsetWidth;
		}
		return scrollBarWidth;
	}
	
	function getEditorEditableWidth(cm){
		var scrollbarWidth = getScrollBarWidth(cm);
		return cm.getWrapperElement().offsetWidth-cm.getGutterElement().offsetWidth-scrollbarWidth;
	}
	
	function maybeTable(cm,line){
		var lastLine = cm.lastLine();
		if(line == lastLine && line == 0) return ;
		var startLine = line > 0 ? line - 1 : 0 ;
		var endLine = line == lastLine ? line : line + 1;
		var count = 0;
		for(var i=startLine;i<=endLine;i++){
			var lineStr = cm.getLine(i);
			lineStr = lineStr.substring(getStartQuote(lineStr).length).trim();
			if(!lineStr.startsWith('|') || !lineStr.endsWith('|') || lineStr.length <= 1){
				continue;
			}
			count ++ ;
		}
		return count  > 1;
	}
	
    var NodeUpdate = function() {

        function NodeUpdate(heather) {
            this.heather = heather;
            var me = this;
            var editor = heather.editor;
            this.change = false;

            editor.on('change', function() {
                me.change = true;
            })
        }

        NodeUpdate.prototype.update = function(immediate) {
            var heather = this.heather;
			if(heather.node && !this.change){
				return ;
			}
            if (this.nodeUpdateTimer) {
				clearTimeout(this.nodeUpdateTimer);
			}
			if(immediate === true){
				heather.render();
				this.change = false;
			} else {
				var me = this;
				this.nodeUpdateTimer = setTimeout(function() {
					heather.render();
					me.change = false;
				}, heather.config.nodeUpdateMill);
			}
        }

        return NodeUpdate;
    }();
	
	
	
	var SyncView = (function(){
		function SyncView(heather){
			this.partDisplay = false;
			this.isEnable = false;
			this.editor = heather.editor;
			this.heather = heather;
			this.unregisters = [];
			this.refreshDisplayMill = heather.config.refreshDisplayMill;
		}
		
		SyncView.prototype.enable = function(){
			if(this.isEnable) return ;
			this.isEnable = true;
			var wrapper = this.editor.getWrapperElement();
			wrapper.classList.add('heather_sync_view_editor');
			
			var div = document.createElement('div');
            div.classList.add('heather_sync_view');
            div.classList.add('markdown-body');
            var container = document.createElement('div');
            container.classList.add('heather_sync_view_container');
            div.appendChild(container);
			this.container = container;
			this.editor.getRootNode().appendChild(div);
			this.sync = new Sync(this.editor, div);
			if(this.partDisplay){
				setPartDisplay(this);
			} else {
				setFullDisplay(this);
			}
			var me = this;
            registerEvents('editor.scroll', this.heather, function() {
                me.sync.doSync();
            }, this.unregisters);
            registerEvents('editor.update', this.heather, function() {
				if(me.updateTimer){
					clearTimeout(me.updateTimer);
				}
				me.updateTimer = setTimeout(function(){
					if(!me.editor.display.input.composing){
						me.heather.nodeUpdate.update();
					}
				},10)
            }, this.unregisters);
			
			var fullscreenChangeHandler = function(fs) {
                if (fs) {
                    div.style.position = 'fixed';
                } else {
                    div.style.position = 'absolute';
                }
            }
            fullscreenChangeHandler(this.heather.isFullscreen());
			
            var previewChangeHandler = function(preview) {
                if (preview) {
                    wrapper.classList.remove('heather_sync_view_editor');
                    div.style.display = 'none';
                } else {
                    wrapper.classList.add('heather_sync_view_editor');
                    div.style.display = '';
                }
            }
            previewChangeHandler(this.heather.isPreview());

            var focusedHeightChangeHandler = function(h) {
                div.querySelector('.heather_sync_view_container').style['paddingBottom'] = h + 'px';
            }

            if (this.heather.isFocused()) {
                var h = parseFloat(this.editor.display.mover.style.paddingBottom);
                if (!isNaN(h)) {
                    focusedHeightChangeHandler(h);
                }
            }
            registerEvents('fullscreenChange', this.heather, fullscreenChangeHandler, this.unregisters);
            registerEvents('previewChange', this.heather, previewChangeHandler, this.unregisters);
            registerEvents('focusedHeightChange', this.heather, focusedHeightChangeHandler, this.unregisters);
			this.view = div;
			CodeMirror.signal(this.editor, "update", this.editor);
			triggerEvent(this.heather, 'syncViewChange', true);
		}
		
		SyncView.prototype.disable = function(){
			if(!this.isEnable) return ;
			this.isEnable = false;
			this.view.remove();
            unregisterEvents(this.unregisters);
            this.editor.getWrapperElement().classList.remove('heather_sync_view_editor');
			CodeMirror.signal(this.editor, "update", this.editor);
			triggerEvent(this.heather, 'syncViewChange', false);
		}
		
		SyncView.prototype.setDisplayMode = function(mode){
			if(mode === 'part')
				setPartDisplay(this);
			else
				setFullDisplay(this);
		}
		
		function setPartDisplay(view){
			view.partDisplay = true;
			if(!view.enable) return;
			for(var i=view.unregisters.length-1;i>=0;i--){
				var unreg = view.unregisters[i];
				if(unreg.name === 'rendered' || unreg.name == 'editor.viewportChange'){
					unreg.off();
					view.unregisters.splice(i,1);
				}
			}
			registerEvents('rendered', view.heather, function(){
				var html = '';
				var viewport = view.editor.getViewport();
				//part render
				for(const child of view.heather.node.children){
					var ls = parseInt(child.dataset.line);
					if(ls >= viewport.from && ls <= viewport.to){
						html += child.outerHTML;
					}
					if(ls > viewport.to){
						break;
					}
				} 
				view.container.innerHTML = html;
				afterDisplay(view.container); 
				view.sync.doSync();
			}, view.unregisters);
			 
			registerEvents('editor.viewportChange', view.heather, function(cm,start,end){
				var html = '';
				for(const child of view.heather.node.children){
					var ls = parseInt(child.dataset.line);
					if(ls >= start && ls <= end){
						html += child.outerHTML;
					}
					if(ls > end){
						break;
					}
				} 
				var node = view.container.cloneNode(true);
				node.innerHTML = html;
				morphdom(view.container, node);
				afterDisplay(view.container);
				view.sync.doSync();		
				
			 }, view.unregisters);
			view.heather.render();
		}
		
		function setFullDisplay(view){
			view.partDisplay = false
			if(!view.enable) return;
			for(var i=view.unregisters.length-1;i>=0;i--){
				var unreg = view.unregisters[i];
				if(unreg.name === 'rendered' || unreg.name == 'editor.viewportChange'){
					unreg.off();
					view.unregisters.splice(i,1);
				}
			}
			
			registerEvents('rendered', view.heather, function(){
				var node = view.container.cloneNode(true);
				node.innerHTML = view.heather.node.innerHTML;
				morphdom(view.container, node);
				var viewport = view.editor.getViewport();
				for(const child of view.container.children){
					var ls = parseInt(child.dataset.line);
					if(ls >= viewport.from && ls <= viewport.to){
						afterDisplay(child);
					}
					if(ls > viewport.to){
						break;
					}
				} 
				view.sync.doSync();
			}, view.unregisters);
			 
			registerEvents('editor.viewportChange', view.heather, function(cm,start,end){
				for(const child of view.container.children){
					var ls = parseInt(child.dataset.line);
					if(ls >= start && ls <= end){
						afterDisplay(child);
					}
					if(ls > end){
						break;
					}
				} 
				view.sync.doSync();
			 }, view.unregisters);
			 view.heather.render();
		}
			
		return SyncView;
	})();
	
	
	var View = (function(){
		function View(heather){
			this.isEnable = false;
			this.editor = heather.editor;
			this.heather = heather;
		}
		
		View.prototype.enable = function(){
			if(this.isEnable) return ;
			this.isEnable = true;
			var elem = this.editor.getScrollerElement();
            this.editor.setOption('readOnly', 'nocursor');
            var div = document.createElement('div');
			var container = document.createElement('div');
            container.classList.add('markdown-body');
            container.classList.add('heather_preview');
			container.setAttribute('tabindex',0);
			container.setAttribute('style','outline:none;')
			
			var me = this;
			container.addEventListener('keydown',function(e){
				if((e.ctrlKey || e.metaKey) && e.key === 'p'){
					e.preventDefault();
					e.stopPropagation();
					me.disable();
					return false;
				}
			});
           
			
            if (this.heather.config.disablePreviewCloseBtn !== true) {
                var close = document.createElement('div');
                close.classList.add('heather_preview_close');
                div.appendChild(close);
                close.addEventListener('click', function() {
                   me.disable();
                })
            }
			
			div.appendChild(container);
			elem.after(div);
			this.heather.nodeUpdate.update(true);
            container.innerHTML = this.heather.node.innerHTML;
			
			var displayViewportElement = function(container){
				for(const element of container.children){
					if(isElementInViewport(element)){
						afterDisplay(element);
					}
				}
			}
			displayViewportElement(container);
			container.addEventListener('scroll',function(){
				displayViewportElement(this);
			});
			
			container.focus();
			this.view = div;
			this.cursor = this.editor.getCursor();
			triggerEvent(this.heather, 'previewChange', true);
		}
		
		View.prototype.disable = function(){
			if(!this.isEnable) return ;
			this.isEnable = false;
			this.view.remove();
            this.editor.setOption('readOnly', false);
            this.editor.refresh();
            this.editor.focus();
            this.editor.setCursor(this.cursor);
			triggerEvent(this.heather, 'previewChange', false);
		}
		
		function isElementInViewport (el) {
			var rect = el.getBoundingClientRect();

			return (
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.offsetHeight) && 
				rect.right <= (window.innerWidth || document.documentElement.offsetWidth)
			);
		}
		
		return View;
	})();
	
	
	var FocusedMode = (function(){
		function FocusedMode(heather){
			this.isEnable = false;
			this.editor = heather.editor;
			this.unregisters = [];
			this.heather = heather;
		}
		
		FocusedMode.prototype.enable = function(){
			if(this.isEnable) return;
			this.isEnable = true;
			
			var me = this;
			var setPadding = function(cm) {
                var wrapper = cm.getWrapperElement();
                var height = wrapper.offsetHeight / 2;
				if(me.cachedHeight !== height){
					me.cachedHeight = height;
					cm.display.mover.style.paddingBottom = height + 'px';
					setTimeout(function(){
						cm.refresh();//TODO ? 
					},10)
					triggerEvent(me.heather, 'focusedHeightChange', height);
				}
            }

            if (!Util.android) {
                setPadding(this.editor);
                registerEvents('editor.update', this.heather, setPadding, this.unregisters);
            }

            registerEvents('editor.change', 'fullscreenChange', this.heather, function(cm) {
                scrollToMiddleByCursor(me.heather);
            }, this.unregisters);

            triggerEvent(this.heather, 'focusedChange', true);
		}
		
		FocusedMode.prototype.disable = function(){
			if(!this.isEnable) return;
			this.isEnable = false;
			unregisterEvents(this.unregisters);
            this.editor.display.mover.style.paddingBottom = '';
            triggerEvent(this.heather, 'focusedChange', false);
            triggerEvent(this.heather, 'focusedHeightChange', 0);
		}
		
		
		function scrollToMiddleByCursor(heather, cursor) {
			var cm = heather.editor;
			if (cm.somethingSelected()) return;
			var height = cm.getWrapperElement().offsetHeight / 2;

			var pos = cm.cursorCoords(cursor || true, 'local');
			var space = pos.top - height + heather.top.getHeight();

			if (Util.ios && heather.isFullscreen()) {
				//ios will scroll screen when focused
				window.scrollTo(0, 0);
			}
			if (Util.mobile) {
				cm.scrollTo(null, space);
			} else {
				var minHeight = height / 2;
				if (space - cm.getScrollInfo().top <= minHeight) return;
				if(Util.edge){
					cm.scrollTo(null, space);
					return ;
				}
				if (this.scrollToMiddleTimer) {
					clearTimeout(this.scrollToMiddleTimer);
				}
				this.scrollToMiddleTimer = setTimeout(function() {
					var scroller = cm.display.scroller;
					scroller.scrollTo({
						top: space,
						behavior: 'smooth'
					})
					var scrollTimeout;
					var scrollHandler = function() {
						clearTimeout(scrollTimeout);
						scrollTimeout = setTimeout(function() {
							scroller.removeEventListener('scroll', scrollHandler);
							CodeMirror.signal(cm, "update", cm);	
						}, 50);
					}
					scroller.addEventListener('scroll', scrollHandler);
				}, 200)
			}
		}
		return FocusedMode;
	})();
	
	
	var CommandBox = (function(){
		function CommandBox(heather,items){
			this.heather = heather;
			if(this.heather.commandBox){
				this.heather.commandBox.remove();
			}
			createCommandBoxElement(this,this.heather, items);
			this.heather.commandBox = this;
		}
		
		CommandBox.prototype.select = function(i){
			if(!this.state || i<0) return ;
			var active = this.state.element.querySelector('.active');
			if(active != null) active.classList.remove('active');
			var lis = this.state.element.querySelectorAll('li');
			if(i>lis.length-1) return ;
			lis[i].classList.add('active');
		}
		
		CommandBox.prototype.updatePosition = function(){
			if(!this.state) return ;
			posBox(this);
		}
		
		CommandBox.prototype.on = function(name,handle){
			if(!this.state) return ;
			registerEvents(name, this.heather,handle,this.state.eventUnregisters);
		}
		
		CommandBox.prototype.onRemove = function(handle){
			if(!this.state) return ;
			this.state.removeHandlers.push(handle);
		}
		
		CommandBox.prototype.remove = function(){
			if(!this.state){
				return ;
			}
			this.heather.editor.removeKeyMap(this.state.keyMap);
			this.state.element.remove();
			for(const onRemove of this.state.removeHandlers){
				try{
					onRemove.call(this);
				}catch(e){console.log(e)}
			}
            unregisterEvents(this.state.eventUnregisters);
			this.state = null;
			this.heather.commandBox = null;
			triggerEvent(this.heather, 'commandBoxClose');
		}
		
		function createCommandBoxElement(box,heather, items) {
			var div = document.createElement('div');
			div.classList.add('heather_command_box')
			div.setAttribute('data-widget', '');
			var ul = document.createElement('ul');

			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var li = document.createElement('li');
				li.innerHTML = item.html;
				li.setAttribute('data-index', i);
				if (i == 0)
					li.classList.add('active');
				ul.appendChild(li);
			}

			var execute = function(li) {
				var handler = items[parseInt(li.dataset.index)].handler;
				if (handler) {
					handler.call(li);
				}
				box.remove();
			}

			var keyMap = {
				'Up': function() {
					var current = ul.querySelector('.active');
					var prev = current.previousElementSibling;
					if (prev != null) {
						current.classList.remove('active');
						prev.classList.add('active');
						ul.parentElement.scrollTop = prev.offsetTop;
					} else {
						var lis = ul.querySelectorAll('li');
						if (lis.length > 0) {
							var last = lis[lis.length - 1];
							current.classList.remove('active');
							last.classList.add('active');
							ul.parentElement.scrollTop = last.offsetTop;
						}
					}
				},
				'Down': function() {
					var current = ul.querySelector('.active');
					var next = current.nextElementSibling;
					if (next != null) {
						current.classList.remove('active');
						next.classList.add('active');
						ul.parentElement.scrollTop = next.offsetTop;
					} else {
						var li = ul.querySelector('li');
						if (li != null) {
							current.classList.remove('active');
							li.classList.add('active');
							ul.parentElement.scrollTop = li.offsetTop;
						}
					}
				},
				'Enter': function() {
					var li = ul.querySelector('.active');
					execute(li);
				},
				'Esc': function() {
					heather.editor.removeKeyMap(keyMap);
					box.remove();
				}
			}

			for (const li of ul.querySelectorAll('li')) {
				li.addEventListener('click', function() {
					execute(this);
				})
			}
			div.appendChild(ul);

			heather.editor.addKeyMap(keyMap);
			var eventUnregisters = [] ;
			heather.editor.addWidget({
                line: 0,
                ch: 0
            }, div);
			box.state =  {
				element : div,
				keyMap : keyMap,
				eventUnregisters : eventUnregisters,
				cursor:heather.editor.getCursor(),
				removeHandlers:[]
			};
            registerEvents('editor.update', heather, function(){
				posBox(box)
			}, eventUnregisters);
			posBox(box); 
			triggerEvent(heather, 'commandBoxOpen', div);
		}
		
		function posBox(box){
			var heather = box.heather;
			var cm = heather.editor;
			var cursor = cm.getCursor();
			var oldCursor = box.state.cursor;
			if(cursor.line !== oldCursor.line || cursor.ch !== oldCursor.ch){box.remove();return}
			var div = box.state.element;
			var pos = cm.cursorCoords(true, 'local');
			div.style.maxHeight = '';
			div.style.maxWidth = '';
			div.style.overflowY = '';
			div.style.overflowX = '';
			div.style.left = pos.left + 'px';
			div.style.right = '';

			var top = pos.bottom - cm.getScrollInfo().top - heather.top.getHeight();
			var left = parseFloat(div.style.left);
			var code = cm.display.lineDiv;
			var scrollBarWidth = getScrollBarWidth(cm);
			if (left + div.offsetWidth + scrollBarWidth > code.offsetWidth) {
				div.style.left = '';
				div.style.right = scrollBarWidth+'px';
			}
			
			var currentSpace = cm.getWrapperElement().offsetHeight - (top  + heather.top.getHeight());
			if (currentSpace - div.offsetHeight < 0) {
				if (top - (pos.bottom-pos.top) >  div.offsetHeight) {
					div.style.top = (pos.top - div.offsetHeight) + 'px';
				} else {
					div.style.overflowY = 'auto';
					if (currentSpace > top) {
						div.style.maxHeight = currentSpace + 'px';
						div.style.top = pos.bottom + 'px';
					} else {
						div.style.maxHeight = top + 'px';
						div.style.top = (pos.bottom - div.offsetHeight) + 'px';
					}
				} 
			}else {
				div.style.top = pos.bottom + 'px';
			}
			
			var maxWidth = getEditorEditableWidth(cm);
			if(div.offsetWidth > maxWidth){
				div.style.maxWidth = maxWidth + 'px';
				div.style.left = '0px';
				div.style.right = '';
			}
		}

		return CommandBox;
	})();
	
	Heather.commands = commands;
	Heather.lazyRes = lazyRes;
	Heather.Util = Util;
	Heather.defaultConfig = defaultConfig;
	Heather.version =  '2.1.4';
	
	return Heather;
})();