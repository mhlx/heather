var Heather = (function(){
	
	var lazyRes = {
        mermaid_js: "js/mermaid.min.js",
        katex_css: "katex/katex.min.css",
        katex_js: "katex/katex.min.js"
    }
	
	var Util = (function(){
		
		var platform = navigator.platform;
		var userAgent = navigator.userAgent;
		var edge = /Edge\/(\d+)/.exec(userAgent);
		var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
		var android = /Android/.test(userAgent);
		var mac = ios || /Mac/.test(platform);
		var chrome = !edge && /Chrome\//.test(userAgent)
		var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);

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
			parseHTML : function(html){
				return new DOMParser().parseFromString(html, "text/html");	
			},
			isUndefined : isUndefined,
			getDefault: function(o, dft) {
				return isUndefined ? dft : o;
			},
			cloneAttributes : cloneAttributes,
			mobile : mobile,
			chrome : chrome,
			mac : mac,
			android : android,
			ios : ios,
			edge : edge
		}
		
	})();
	
	var commands = {};
	
	var defaultConfig = {
		markdownParser:{
			html : true,
			linkify:true,
			callback:function(md){
				if(window.markdownitTaskLists)
					md.use(window.markdownitTaskLists);
				if(window.markdownitKatex)
					md.use(window.markdownitKatex);
				if(window.markdownItAnchor)
					md.use(window.markdownItAnchor);
			}
		},
		commandBarEnable : Util.mobile,
		partPreviewEnable : !Util.mobile,
		editor : {
			lineNumbers : true,
			dragDrop:true,
			extraKeys:{
				'Enter':'newlineAndIndentContinueMarkdownList'
			},
			callback:function(cm){
			}
		},
		autoRenderMill:300,
		renderSelected:false,
		tooltipEnable:true,
		focused : true
	}
	
	
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.split(search).join(replacement);
	}
	
    String.prototype.splice = function(start, delCount, newSubStr) {
        return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
    }
	
	function Editor(textarea,config){
		config = Object.assign({}, defaultConfig, config);
		this.eventHandlers = [];
		this.editor = createEditor(textarea,config);
		this.gutterWidth = this.editor.getGutterElement().offsetWidth;
		this.node = document.createElement('body');
		this.top = new Top(this);
		this.markdownParser = new MarkdownParser(config.markdownParser,this);
		this.toolbar = new Toolbar(this,config);
		this.commandBar = new CommandBar(this,config);
		this.tooltip = new Tooltip(this.editor,config);
		this.partPreview = new PartPreview(this,config);
		this.config = config;
		initKeyMap(this);
		handleDefaultEditorEvent(this);
		this.tableHelper = new TableHelper(this);
		if(config.focused === true){
			this.setFocused(true);
		}
	}
	
	Editor.prototype.getValue = function(){
		return this.editor.getValue();
	}
	
	Editor.prototype.setValue = function(value){
		this.editor.setValue(value);
	}	
	
	Editor.prototype.getHtmlNode = function(){
		return this.node;
	}
	
	Editor.prototype.isFileUploadEnable = function(){
		var config = this.config.upload;
		return !Util.isUndefined(config) && !Util.isUndefined(config.url) && !Util.isUndefined(config.uploadFinish);
	}
	
	Editor.prototype.getNodesByLine = function(line){
		var nodes = [];
		var cm = this.editor;
		var addNode = function(node){
			for(const dataLine of node.querySelectorAll('[data-line]')){
				if(dataLine.hasAttribute('data-html')) continue;
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
		addNode(this.node);
		return nodes;
	}
		
	Editor.prototype.isPreview = function(){
		return !Util.isUndefined(this.previewState);
	}
	
	Editor.prototype.execCommand = function(name){
		var handler = commands[name];
		if(!Util.isUndefined(handler)){
			this.editor.ignoreNextFocusout = true;
			handler(this);
		}
	}
	
	Editor.prototype.setPreview = function(preview){
		if(preview === true && this.previewState) return;
		if(preview !== true && !this.previewState) return;
		if(preview === true){
			
			var elem = this.editor.getScrollerElement();
			this.editor.setOption('readOnly','nocursor');
			var div = document.createElement('div');
			div.classList.add('markdown-body');
			div.classList.add('heather_preview');
			div.innerHTML = this.node.innerHTML;
			
			var close = document.createElement('div');
			close.classList.add('heather_preview_close');
			close.innerHTML = '<i class="fas fa-eye-slash heather_icon"></i>';
			div.appendChild(close);
			
			div.addEventListener('scroll',function(){
				close.style.top = (this.scrollTop+10)+'px';
			});
			
			var me = this;
			close.addEventListener('click',function(){
				me.setPreview(false);
			})
			
			elem.after(div);
			renderKatexAndMermaid(div);
			this.previewState = {
				element : div,
				cursor:me.editor.getCursor()
			}
		} else {
			this.previewState.element.remove();
			this.editor.setOption('readOnly',false);
			this.editor.refresh();
			this.editor.focus();
			this.editor.setCursor(this.previewState.cursor);
			this.previewState = undefined;
		}
		triggerEvent(this,'previewChange',preview === true);
	}
	
	Editor.prototype.getToolbar = function(){
		return this.toolbar;
	}
	
	Editor.prototype.getCommandBar = function(){
		return this.commandBar;
	}	
	
	Editor.prototype.isFullscreen = function(){
		return !Util.isUndefined(this.fullscreenState);
	}
	
	Editor.prototype.hasSyncView = function(){
		return !Util.isUndefined(this.syncViewState);
	}
	
	Editor.prototype.setSyncView = function(syncView){
		if(syncView === true && this.syncViewState) return ;
		if(syncView !== true && !this.syncViewState) return ;
		var wrap = this.editor.getWrapperElement();
		if(syncView === true){
			var me = this;
			wrap.classList.add('heather_sync_view_editor');
			
			var div = document.createElement('div');
			div.classList.add('heather_sync_view');
			div.classList.add('markdown-body');
			var container = document.createElement('div');
			container.classList.add('heather_sync_view_container');
			div.appendChild(container);
			
			this.editor.getRootNode().appendChild(div);
			
			var mill = me.config.autoRenderMill;
			
			var renderedHandler = function(value,html){
				if(me.renderTimeout)
					clearTimeout(me.renderTimeout);
				me.renderTimeout = setTimeout(function(){
					var node = container.cloneNode(false);
					node.innerHTML = html;
					morphdomUpdate(container,node,me.config);
				},mill)
			}
			this.render();
			renderedHandler(null,this.node.innerHTML);
			
			
			var unregisters = [];
			registerEvents('rendered',this,renderedHandler,unregisters);
			
			var sync = new Sync(this.editor,div);
			
			registerEvents('editor.scroll',this,function(){
				sync.doSync();
			},unregisters);
			
			var fullscreenChangeHandler = function(fs){
				if(fs){
					div.style.position = 'fixed';
				} else {
					div.style.position = 'absolute';
				}
			}
			fullscreenChangeHandler(this.isFullscreen());
			var previewChangeHandler = function(preview){
				if(preview){
					wrap.classList.remove('heather_sync_view_editor');
					div.style.display = 'none';
				} else {
					wrap.classList.add('heather_sync_view_editor');
					div.style.display = '';
				}
			}
			previewChangeHandler(this.isPreview());
			
			var focusedHeightChangeHandler = function(h){
				div.querySelector('.heather_sync_view_container').style['paddingBottom'] = h + 'px';
			}
			
			if(this.isFocused()){
				var h = parseFloat(this.editor.display.mover.style.paddingBottom);
				if(!isNaN(h)){
					focusedHeightChangeHandler(h);
				}
			}
			
			registerEvents('fullscreenChange',this,fullscreenChangeHandler,unregisters);	
			registerEvents('previewChange',this,previewChangeHandler,unregisters);	
			registerEvents('focusedHeightChange',this,focusedHeightChangeHandler,unregisters);
			
			this.syncViewState = {
				view : div,
				unregisters : unregisters
			}
			
		} else {
			this.syncViewState.view.remove();
			unregisterEvents(this.syncViewState.unregisters);
			this.syncViewState = undefined;
			wrap.classList.remove('heather_sync_view_editor');
		}
		triggerEvent(this,'syncViewChange',syncView === true);
		CodeMirror.signal(this.editor, "resize", this.editor);
	}
	
	Editor.prototype.setFullscreen = function(fullscreen){
		if(fullscreen === true && this.editor.getOption('fullScreen')) return;
		if(fullscreen !== true && !this.editor.getOption('fullScreen')) return;
		if(fullscreen === true){
			this.editor.setOption("fullScreen", true);
			this.fullscreenState = {
				
			};
		} else {
			this.editor.setOption("fullScreen", false);
			this.fullscreenState = undefined;
		}
		CodeMirror.signal(this.editor, "resize", this.editor);
		this.commandBar.rePosition();
		this.partPreview.rePosition();
		triggerEvent(this,'fullscreenChange',fullscreen === true);
	}
	
	Editor.prototype.on = function(eventName, handler) {
		var me = this;
		if(eventName.startsWith("editor.")){
			eventName = eventName.substring(eventName.indexOf('.')+1);
			this.editor.on(eventName,handler);
			return {
				off : function(){
					me.editor.off(eventName,handler)
				}
			}
		}
		this.eventHandlers.push({
			name : eventName,
			handler : handler
		});
		return {
			off : function(){
				me.off(eventName,handler)
			}
		}
	}

	Editor.prototype.off = function(eventName, handler) {
		if(eventName.startsWith("editor.")){
			eventName = eventName.substring(eventName.indexOf('.')+1);
			this.editor.off(eventName,handler);
			return ;
		}
		for(var i=this.eventHandlers.length-1;i>=0;i--){
			var eh = this.eventHandlers[i];
			if(eh.handler === handler && eh.name === eventName){
				this.eventHandlers.splice(i,1);
				break;
			}
		}
	}
	
	
	Editor.prototype.setFocused = function(focus) {
		if(this.focusedState && focus === true) return;
		if(!this.focusedState && focus !== true) return;
		if(focus === true){
			var me = this;
			
			var setPadding = function(cm){
				var wrapper = cm.getWrapperElement();
				var height = wrapper.clientHeight/2;
				cm.display.mover.style.paddingBottom = height + 'px';
				cm.refresh();
				triggerEvent(me,'focusedHeightChange',height);
			}
			var unregisters = [];
			
			if(!Util.android){
				setPadding(this.editor);
				registerEvents('editor.resize',this,setPadding,unregisters);
			}
			
			registerEvents('editor.change','fullscreenChange',this,function(cm){
				scrollToMiddleByCursor(me);
			},unregisters);
			
			this.focusedState = {
				unregisters : unregisters
			}
			triggerEvent(this,'focusedChange',true);
		} else {
			unregisterEvents(this.focusedState.unregisters);
			this.focusedState = undefined;
			this.editor.display.mover.style.paddingBottom = '';
			triggerEvent(this,'focusedChange',false);
			triggerEvent(this,'focusedHeightChange',0);
		}
	}
	
	Editor.prototype.isFocused = function(){
		return !Util.isUndefined(this.focusedState);
	}
	
	Editor.prototype.openSelectionHelper = function(){
		if(!this.isPreview()){
			this.closeSelectionHelper(true);
			this.selectionHelper = new SelectionHelper(this);
			triggerEvent(this,'selectionHelperOpen',this);
		}
	}
	
	Editor.prototype.hasSelectionHelper = function(){
		return !Util.isUndefined(this.selectionHelper);
	}	
	
	Editor.prototype.closeSelectionHelper = function(unselect){
		if(this.selectionHelper){
			this.selectionHelper.remove(unselect !== true);
			this.selectionHelper = undefined;
			triggerEvent(this,'selectionHelperClose',this);
		}
	}
	
	Editor.prototype.addKeyMap = function(keyMap) {
		var me = this;
		var _keyMap = {};
		for (const key in keyMap) {
			var v = keyMap[key];
			if(typeof v === 'string'){
				const value = v;
				_keyMap[key] = function(){
					me.execCommand(value);
				};
			} else {
				_keyMap[key] = v;
			}
		}
		this.editor.addKeyMap(_keyMap);
		return _keyMap;
	}	
	
	Editor.prototype.removeKeyMap = function(keyMap) {
		this.editor.removeKeyMap(keyMap);
	}
	
	Editor.prototype.render = function(){
		var value = this.editor.getValue();
		var node = Util.parseHTML(this.markdownParser.render(value)).body;
		triggerEvent(this,'rendered',value,node.innerHTML);
		this.node = node;
	}
	
	function scrollToMiddleByCursor(heather,cursor){
		var cm = heather.editor;
		cm.operation(function(){
			if(cm.somethingSelected()) return ;
			var height = cm.getWrapperElement().clientHeight/2;
			var pos = cm.cursorCoords(cursor || true,'local');
			var space = pos.top - height + heather.top.getHeight();
			if(Util.ios && heather.isFullscreen()){
				//ios will scroll screen when focused
				window.scrollTo(0,0);
			}
			cm.scrollTo(null, space);
			heather.commandBar.rePosition();
			heather.partPreview.rePosition();
		})
	}
	
	function handleDefaultEditorEvent(heather){
		
		var editor = heather.editor;
		
		function checkGutterWidth(){
			var gutterWidth = editor.getGutterElement().offsetWidth;
			if(heather.gutterWidth !== gutterWidth){
				triggerEvent(heather,'gutterWidthChange',gutterWidth);
				heather.gutterWidth = gutterWidth;
			}
		}
		
		if(editor.getValue() != ''){
			heather.render();
			checkGutterWidth();
		}
		
		editor.on('change',function(cm){
			heather.render();
			checkGutterWidth();
		});
		
		//change task list status
		editor.on('mousedown',function(cm,e){
			if(isWidget(e.target,cm)){
				e.codemirrorIgnore  = true;
				return ;
			}
			var x = e.clientX;
			var y = e.clientY;
			changeTastListStatus(heather,x,y);
		})
		
		editor.on('touchstart',function(cm,e){
			if(isWidget(e.target,cm)){
				e.codemirrorIgnore  = true;
				return ;
			}
			var x = e.touches[0].clientX;
			var y = e.touches[0].clientY;
			changeTastListStatus(heather,x,y);
		});
		//file upload 
		editor.on('paste', function(editor, evt) {
			var clipboardData, pastedData;
			clipboardData = evt.clipboardData || window.clipboardData;
			var files = clipboardData.files;
			if (files.length > 0 && heather.isFileUploadEnable()) {
				var f = files[0];
				var type = f.type;
				if (type.indexOf('image/') == -1) {
					return;
				}
				evt.preventDefault();
				evt.stopPropagation();
				f.from = 'paste';
				new FileUpload(f,heather, heather.config.upload).start();
			}
		});
		
		editor.on('drop',function(cm,e){
			var files = e.dataTransfer.files;
			if (files.length > 0) {
				var file = files[0];
				if(file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".md")){
					e.preventDefault();
					e.stopPropagation();
					var reader = new FileReader();
					reader.readAsText(file);
					reader.onload = function (evt) {
						var text = evt.target.result;
						cm.replaceSelection(text);
					}
					
				} else if(heather.isFileUploadEnable()){
					e.preventDefault();
					e.stopPropagation();
					file.from = 'drop';
					new FileUpload(file,heather, heather.config.upload).start();
				}
			}
		});
		
		editor.on('optionChange',function(cm,option){
			if(option === 'readOnly'){
				if(cm.isReadOnly()){
					removeCommandWidget(heather);
					heather.commandBar.setKeepHidden(true);
				} else {
					heather.commandBar.setKeepHidden(false);
				}
			}
		})

	}
	
	function isWidget(target,cm){
		var _target = target;
		while(_target != null){
			if(_target.hasAttribute('data-widget')) return true;
			_target = _target.parentElement;
		}
		return false;
	}
		
	function initKeyMap(heather) {
		
		function toggleFullscreen(){
			heather.setFullscreen(!heather.isFullscreen());
		}
		
		function togglePreview(){
			heather.setPreview(!heather.isPreview());
		}
		
		function indentMore(){
			heather.editor.execCommand('indentMore');
		}
		
		function indentLess(){
			heather.editor.execCommand('indentLess');
		}
		
		var keyMap = Util.mac ? {
			"Cmd-B": 'bold',
			"Cmd-I": 'italic',
			"Cmd-L": 'link',
			"Cmd-/": 'commands',
			"Cmd-Enter": toggleFullscreen,
			"Cmd-P": togglePreview,
			"Tab":indentMore,
			"Shift-Tab":indentLess
		} : {
			"Ctrl-B": 'bold',
			"Ctrl-I": 'italic',
			"Ctrl-L": 'link',
			"Alt-/": 'commands',
			"Ctrl-Enter": toggleFullscreen,
			"Ctrl-P": togglePreview,
			"Tab":indentMore,
			"Shift-Tab":indentLess
		}
		
		heather.addKeyMap(keyMap);
	}
	
	function triggerEvent(heather,name,... args){
		for(var i=0;i<heather.eventHandlers.length;i++){
			var eh = heather.eventHandlers[i];
			if(eh.name === name){
				try{
					var handler = eh.handler;
					handler.apply(heather,args);
				}catch(e){}
			}
		}	
	}
	
	function createEditor(textarea,config){
		config = config.editor || {};
		config.styleActiveLine =  true;	
		config.inputStyle = 'textarea';
		config.mode = {name:'gfm'};
		config.lineWrapping = true;
		config.value = textarea.value;
		
		var node = document.createElement('div');
		node.classList.add('heather_editor_wrapper');
		textarea.after(node);
		
		var editor = CodeMirror._fromTextArea(textarea, config,node);
		editor.getRootNode = function(){
			return node;
		}
		
		if(config.callback){
			config.callback(editor);
		}
		
		return editor;
	}
	
	var SelectionHelper = (function(){
		
		function SelectionHelper(heather){
			
			var editor = heather.editor;
			var eventUnregisters = [];
			
			var html = '';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goLineUp"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goCharRight"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goLineDown"><span class="heather_selection_helper_touch" ></span></span> ';
            html += '<span class="heather_selection_helper_wrap" data-arrow="goCharLeft"><span class="heather_selection_helper_touch" ></span></span> ';
			html += '<div class="heather_selection_helper_close"><i class="fas fa-times heather_icon" style="margin:0px !important"></i></div> ';
			
			var div = document.createElement('div');
			div.classList.add('heather_selection_helper');
			div.style.visibility = 'hidden';
			div.setAttribute('data-widget','');
			div.innerHTML = html;
			editor.addWidget({line:0,ch:0},div);
			
			var resize = function(){
				var w = editor.getWrapperElement().clientWidth*0.6;
				div.style.width = w+'px'
				div.style.height = w+'px';
				if(heather.isFullscreen()){
					div.style.position = 'fixed';
					div.style.top = '';
					div.style.bottom = '0px';
				} else {
					div.style.position = 'absolute';
					div.style.bottom = '';
				}
			}
			
			var pos = function(){
				div.style.left = '';
				if(!heather.isFullscreen()){
					var w = editor.getWrapperElement().clientWidth*0.6;
					var top = editor.cursorCoords(false,'local').top+editor.defaultTextHeight();
					var h = editor.getScrollInfo().height;
					if(top + w > h){
						top = h - w;
					}
					div.style.top = top+'px';
				}
			}
			resize();
			pos();
			div.style.visibility = 'visible';
			
			this.start = editor.getCursor(true);
			this.end = editor.getCursor(false);
			this.marked = editor.markText(this.start,this.end, {
				className: "heather_selection_marked"
			});
			var me = this;
			
			var cursorActivityHandler = function(cm){
				if (me.movedByMouseOrTouch === true) {
					me.movedByMouseOrTouch = false;
					me.start = editor.getCursor();
				}
				pos();
			};
			
			cursorActivityHandler(editor);
			
			editor.setOption('readOnly','nocursor');
			
			var close = div.querySelector('.heather_selection_helper_close').firstChild;
			close.addEventListener('click',function(){
				heather.closeSelectionHelper();
			});
			var moveCursor = function(action){
				if(me.end){
					editor.setCursor(me.end);
				}
				editor.execCommand(action);
				me.end = editor.getCursor();
				var cursors = me.getCursors();
				if(me.marked){
					me.marked.clear();
				}
				me.marked = editor.markText(cursors.start,cursors.end, {
					className: "heather_selection_marked"
				});
			}
			
			var showCloseTimer;
			
			for(const arrow of div.querySelectorAll('[data-arrow]')){
				arrow.addEventListener('touchstart',function(){
					moveCursor(this.dataset.arrow);
					close.style.display = 'none';
				})
				arrow.addEventListener('touchend',function(){
					if(showCloseTimer)
						clearTimeout(showCloseTimer);
					showCloseTimer = setTimeout(function(){
						close.style.display = '';
					},300)
				})
			}
			
			registerEvents('editor.cursorActivity',heather,cursorActivityHandler,eventUnregisters);
			registerEvents('editor.resize',heather,resize,eventUnregisters);
			registerEvents('editor.mousedown','editor.touchstart',heather,function(cm,e){
				if(isWidget(e.target,cm)){
					e.codemirrorIgnore  = true;
					return ;
				}
				me.movedByMouseOrTouch = true;
				me.end = undefined;
				if(me.marked){
					me.marked.clear();
				}
			},eventUnregisters);
			
			this.div = div;
			this.heather = heather;
			this.eventUnregisters = eventUnregisters;
		}
		
		SelectionHelper.prototype.getCursors = function(){
			var start;
			var end ;
			if(this.end.line > this.start.line || (this.end.line == this.start.line && this.end.ch >= this.start.ch)){
				start = this.start;
				end = this.end;
			}  else {
				start = this.end;
				end = this.start;
			}
			return {
				start : start,
				end : end
			}
		}
		
		SelectionHelper.prototype.remove = function(setSelection){
			if (this.marked) {
				this.marked.clear();
			}
			var editor = this.heather.editor;
			if(this.end && setSelection === true){
				var cursors = this.getCursors();
				editor.setSelection(cursors.start,cursors.end);
			}
			this.div.remove();
			
			unregisterEvents(this.eventUnregisters);
			editor.setOption('readOnly',false);
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
                pos = last.clientHeight;
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
			this.keepHidden = false;
		}


		Bar.prototype.hide = function() {
			this.element.style.visibility = 'hidden';
			this.hidden = true;
		}
		Bar.prototype.getElement = function() {
			return this.element;
		}
		Bar.prototype.remove = function() {
			this.element.remove();
		}

		Bar.prototype.height = function() {
			return this.element.offsetHeight;
		}

		Bar.prototype.width = function() {
			return this.element.clientWidth;
		}

		Bar.prototype.length = function() {
			return this.element.childNodes.length;
		}

		Bar.prototype.show = function() {
			if (this.keepHidden) {
				return;
			}
			this.element.style.visibility = 'visible';
			this.hidden = false;
		}

		Bar.prototype.addItem = function(item) {
			insertItem(this, item, this.items.length);
		}

		Bar.prototype.clear = function() {
			this.element.innerHTML = '';
		}

		function createElement(icon, handler) {
			var i = document.createElement('i');
			i.setAttribute('class', icon);
			i.setAttribute('style', 'cursor: pointer;margin-right:20px');
			if (handler) {
				var defaultEvent = 'click';
				var isFunction = typeof handler === "function";
				var event = isFunction ? defaultEvent : (handler.event || defaultEvent);

				i.addEventListener(event, function(e) {
					e.preventDefault();
					e.stopPropagation();

					if (isFunction) {
						handler(i);
					} else {
						handler.handler(i);
					}

				})
			}
			return i;
		}

		Bar.prototype.insertIcon = function(clazz, handler, index, callback) {
			var newIcon = createElement(clazz, handler);
			if (callback) callback(newIcon);
			this.insertElement(newIcon, index);
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

		Bar.prototype.addIcon = function(clazz, handler, callback) {
			this.insertIcon(clazz, handler, this.length(), callback);
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
	
	var Top = (function(){
		
		function Top(heather){
			var div = document.createElement('div');
			div.classList.add('heather_top');
			div.style.left = heather.gutterWidth+'px';
			heather.editor.getWrapperElement().append(div);
			this.div = div;
			this.components = [];
			this.cm = heather.editor;
			this.cachedHeight = 0;
			var me = this;
			heather.on('editor.resize',function(){
				me.calcMarginTop();
			});
			heather.on('gutterWidthChange',function(w){
				div.style.left = w+'px';
			})
		}
		
		Top.prototype.addComponent = function(cmp){
			this.components.push(cmp)
		}
		
		Top.prototype.calcMarginTop = function(){
			var h = 0;
			for(const cmp of this.components){
				h += cmp.getHeight();
			}
			if(h !== this.cachedHeight){
				this.cachedHeight = h;
				this.cm.display.lineDiv.style.marginTop = h + 'px';
				CodeMirror.signal(this.cm, "resize", this.cm);
			}
		}
		
		Top.prototype.getHeight = function(){
			return this.cachedHeight;
		}
		
		return Top;
	})();
	
	var Toolbar = (function(){
		
		function Toolbar(heather,config){
			var cm = heather.editor;
			var div = document.createElement('div');
			div.classList.add('heather_toolbar_bar');
			div.setAttribute('data-widget','');
			
			heather.top.div.appendChild(div);
			this.height = 0;
			this.heather = heather;
			this.cm = cm;
			this.bar = new Bar(div);
			
			var me = this;
			
			heather.top.addComponent({
				getHeight : function(){
					return me.bar.getElement().style.display === 'none' ? 0 : me.bar.height();
				}
			});
		}
		
		Toolbar.prototype.addElement = function(element){
			this.bar.addElement(element);
			this.heather.top.calcMarginTop();
		}
		
		Toolbar.prototype.insertElement = function(element,index){
			this.bar.insertElement(element,index);
			this.heather.top.calcMarginTop();
		}	
		
		Toolbar.prototype.addIcon = function(icon,handler,callback){
			this.bar.addIcon(icon,handler,callback);
			this.heather.top.calcMarginTop();
		}
		
		Toolbar.prototype.insertIcon = function(clazz, handler, index, callback){
			this.bar.addIcon(clazz, handler, index, callback);
			this.heather.top.calcMarginTop();
		}	
		
		Toolbar.prototype.removeElement = function(deleteChecker){
			this.bar.removeElement(deleteChecker);
			this.heather.top.calcMarginTop();
		}
		
		Toolbar.prototype.clear = function(){
			this.bar.clear();
			this.heather.top.calcMarginTop();
		}
	
		Toolbar.prototype.hide = function(){
			this.bar.getElement().style.display = 'none'
			this.heather.top.calcMarginTop();
		}
		
		Toolbar.prototype.show = function(){
			this.bar.getElement().style.display = ''
			this.heather.top.calcMarginTop();
		}
		
		return Toolbar;
	})();
	
	var CommandBar = (function(){
		
		function CommandBar(heather,config){
			this.cm = heather.editor;
			this.heather = heather;
			this.eventUnregisters = [];
			if(config.commandBarEnable !== false)
				this.enable();
		}
		
		CommandBar.prototype.rePosition = function(){
			if(!this.bar || this.keepHidden === true){
				return ;
			}
			var cm = this.cm;
			var pos = cm.cursorCoords(true,'local');
			this.bar.style.visibility = 'visible';
			var toolbarHeight = this.heather.top.getHeight();
			var top = pos.top - cm.getScrollInfo().top - toolbarHeight;
			var distance = 2*cm.defaultTextHeight();
			if(top > distance+this.bar.clientHeight){
				this.bar.style.top = (pos.top - distance - this.bar.clientHeight)+'px';
			} else {
				this.bar.style.top = (pos.top + distance)+'px';
			}
		}
		
		CommandBar.prototype.getBarHelper = function(){
			return this.bar;
		}
		
		CommandBar.prototype.enable = function(){
			if(this.enabled === true) return ;
			var me = this;
			var cursorActivityListener = function(cm){
				if(me.ignoreNextActivity === true){
					me.ignoreNextActivity = false;
					return ;
				}
				if(!me.bar){
					me.bar = createBar(cm,me.heather);
					me.bar.setAttribute('data-widget','');
					cm.addWidget({line:0,ch:0},me.bar);
				}
				me.rePosition();
			}
			cursorActivityListener(this.cm);
			
			registerEvents('editor.cursorActivity',this.heather,cursorActivityListener,this.eventUnregisters);
			registerEvents('editor.resize',this.heather,function(){
				me.rePosition();
				me.ignoreNextActivity = true;
			},this.eventUnregisters);
			
			registerEvents('selectionHelperOpen','commandWidgetOpen',this.heather,function(){
				me.setKeepHidden(true);
			},this.eventUnregisters);
			
			registerEvents('selectionHelperClose','commandWidgetClose',this.heather,function(){
				me.setKeepHidden(false);
			},this.eventUnregisters);
			
			this.enabled = true;
		}	
		
		CommandBar.prototype.disable = function(){
			if(this.enabled !== true) return ;
			if(this.bar){
				this.bar.remove();
				this.bar = undefined;
			}
			unregisterEvents(this.eventUnregisters);
			this.eventUnregisters = [];
			this.enabled = false;
		}
		
		CommandBar.prototype.setKeepHidden = function(keepHidden){
			if(keepHidden === true && this.bar)
				this.bar.style.display = 'none';
			if(keepHidden !== true && (this.heather.hasSelectionHelper() || !Util.isUndefined(this.heather.commandWidgetState))) return
			if(keepHidden !== true && this.bar)
				this.bar.style.display = '';
			this.keepHidden = keepHidden === true;
		}	
		
		function createBar(cm,heather){
			var div = document.createElement('div');
			div.classList.add('heather_command_bar')
			var bar = new Bar(div);
			bar.addIcon('fas fa-bars heather_icon', function() {
				heather.execCommand('commands')
			});
			bar.addIcon('fas fa-bold heather_icon', function() {
				heather.execCommand('bold')
			});
			
			bar.addIcon('fas fa-italic heather_icon',function(){
				heather.execCommand('italic')
			});
			
			bar.addIcon('fas fa-link heather_icon', function() {
				heather.execCommand('link');
			})
			
			bar.addIcon('fas fa-code heather_icon', function() {
				heather.execCommand('code');
			})
			
			bar.addIcon('fas heather_icon', function() {
				heather.execCommand('br');
			},function(ele){
				ele.innerHTML = 'BR'
			})
			
			bar.addIcon('fas fa-strikethrough heather_icon', function() {
				heather.execCommand('strikethrough');
			})

			bar.addIcon('fas fa-undo heather_icon', function() {
				heather.editor.execCommand('undo');
			})
			
			bar.addIcon('fas fa-redo heather_icon', function() {
				heather.editor.execCommand('redo');
			})
			

			div.addEventListener('click',function(e){
				var cursor = cm.coordsChar({left:e.clientX, top:e.clientY}, 'window');
				cm.focus();
				cm.setCursor(cursor);
			});
			return div;
		}
		
		return CommandBar;
	})();
	
	var PartPreview = (function() {
		
		function PartPreview(heather,config) {
			this.config = config || {};
			this.heather = heather;
			this.editor = heather.editor;
			this.eventUnregisters = [];
			if(this.config.partPreviewEnable !== false){
				this.enable();
			}
		}

		PartPreview.prototype.enable = function() {
			if(this.enabled === true) return ;
			this.keepHidden = false;
			var editor = this.editor;
			this.widget = new Widget(this);
			var me = this;
			
			registerEvents('selectionHelperOpen','commandWidgetOpen',this.heather,function(){
				me.setKeepHidden(true);
			},this.eventUnregisters);
			
			registerEvents('selectionHelperClose','commandWidgetClose',this.heather,function(){
				me.setKeepHidden(false);
			},this.eventUnregisters);	
			
			registerEvents('editor.cursorActivity',this.heather,function(cm){
				if(me.keepHidden === true) return ;
				me.widget.update();
			},this.eventUnregisters);
			
			registerEvents('editor.change',this.heather,function(cm){
				if (me.changed !== true) {
					me.changed = true;
				}
			},this.eventUnregisters);
			
			registerEvents('rendered',this.heather,function(){
				if(me.changed !== true) return ;
				me.changed = false;
				if(me.keepHidden !== true)
					me.widget.update();
			},this.eventUnregisters);
	
			registerEvents('syncViewChange',this.heather,function(hidden){
				me.setKeepHidden(hidden)
			},this.eventUnregisters);
			
			this.enabled = true;
		}

		PartPreview.prototype.disable = function() {
			if(this.enabled !== true) return ;
			if (this.widget) {
				this.widget.remove();
			}
			unregisterEvents(this.eventUnregisters);
			this.eventUnregisters = [];
			this.enabled = false;
		}
		
		PartPreview.prototype.hidden = function(){
			if (this.widget) {
				this.widget.hide();
			}
		}
		
		PartPreview.prototype.rePosition = function(){
			if (this.widget && this.keepHidden !== true) {
				this.widget.update();
			}
		}
		
		PartPreview.prototype.setKeepHidden = function(keepHidden){
			if(keepHidden === true){
				if(this.widget){
					this.widget.hide();
				}
			} else {
				if(this.heather.hasSelectionHelper()
					|| !Util.isUndefined(this.heather.commandWidgetState)
					|| this.heather.hasSyncView()){
					return ;
				}
				if(this.widget){
					this.widget.update();
				}
			}
			this.keepHidden = keepHidden;
		}
		
		var Widget = (function() {
			
			var Widget = function(preview) {
				
				var div = document.createElement('div');
				div.classList.add('markdown-body');
				div.classList.add('heather_part_preview');
				div.style.display = 'none';
				div.setAttribute('data-widget','');
				div.addEventListener('click',function(e){
					if(preview.disable === true) return ;
					var cursor = preview.editor.coordsChar({left:e.clientX, top:e.clientY}, 'window');
					preview.editor.focus();
					preview.editor.setCursor(cursor);
				});
				
				div.appendChild(document.createElement('div'));
				
				this.preview = preview;
				this.widget = div;
				
				this.preview.editor.addWidget({
					line:0,ch:0
				},this.widget);
			}

			Widget.prototype.update = function() {
				var editor = this.preview.editor;
				
				var html;
				if(!editor.somethingSelected()){
					var nodeStatus = getNodeStatus(this.preview.heather);
					if(nodeStatus == null){
						this.hide();
						return ;
					};
					html = nodeStatus.node.outerHTML;
				} else if(this.preview.config.renderSelected === true){
					html = Util.parseHTML(this.preview.heather.markdownParser.render(editor.getSelection())).body.innerHTML;
				}
				
				if(!html){
					this.hide();
					return ;
				};
					
				var me = this;
				
				var div = this.widget.firstChild.cloneNode(false);
				div.innerHTML = html;
				div = morphdomUpdate(this.widget.firstChild,div);
				this.show();
				this.scrollContent(nodeStatus);
			}
			
			Widget.prototype.hide = function() {
				this.widget.style.display = 'none';
			}

			Widget.prototype.show = function() {
				if(this.keepHidden !== true){
					this.widget.style.display = '';
					this.updatePosition();
				}
			}

			Widget.prototype.remove = function() {
				this.widget.remove();
			}
			
			Widget.prototype.scrollContent = function(nodeStatus) {
				if(nodeStatus == null) return ;
				var rootNode = this.widget.firstChild;
				var editor = this.preview.editor;
				var line = editor.getCursor().line;
				var startTop = editor.cursorCoords({line:nodeStatus.startLine,ch:0}, 'local').top;
				var endLine = Math.min(editor.lineCount()-1,nodeStatus.endLine);
				var endTop= editor.cursorCoords({line:endLine,ch:editor.getLine(endLine).length}, 'local').top;
				var currentTop = editor.cursorCoords(editor.getCursor(), 'local').top;
				var markdownHeight = endTop - startTop;
				var p = (Math.max(currentTop - startTop-50,0))/markdownHeight;
				var h = rootNode.clientHeight*p;
				this.widget.scrollTop = h;
			}
			
			Widget.prototype.updatePosition = function(){
				var editor = this.preview.editor;
				var pos = editor.cursorCoords(true,'local');
				var bar = this.preview.heather.commandBar.bar;
				var topHeight = this.preview.heather.top.getHeight();
				var top = pos.top - editor.getScrollInfo().top - topHeight;
				var distance = 2*editor.defaultTextHeight()+(bar ? 5 : 0);
				var height = (bar ? bar.clientHeight : 0) + this.widget.clientHeight;
				if(top > height + distance){
					this.widget.style.top = (pos.top - distance - height) + 'px';
				} else {
					if(bar){
						if(pos.top - bar.offsetTop - bar.clientHeight < 0){
							this.widget.style.top =  (pos.top + distance + bar.clientHeight) + 'px';
							return ;
						}
					}
					this.widget.style.top = (pos.top + distance) + 'px';
				}
			}

			var getNodeStatus = function(heather) {
				var line = heather.editor.getCursor().line;
				if(heather.editor.getLine(line) == ''){
					line = line - 1;
				}
				if(line < 0)
					return null;
				var nodes = heather.getNodesByLine(line);
				if(nodes.length == 0) return null;
				var node = nodes[0];
				return {
					node: node,
					endLine: node.endLine,
					startLine: node.startLine,
				};
			}

			return Widget;
		})();

		return PartPreview;
	})();	
	
	//markdown render that with line numbers
	var MarkdownParser = (function(){
		
		function MarkdownParser(config,heather){
			config = config||{};
			if(!config.highlight){
				config.highlight = function(str, lang) {
					if (lang == 'mermaid') {
                       return createUnparsedMermaidElement(str).outerHTML;
                    }
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return '<pre class="hljs"><code class="language-' + lang + '">' +
                                hljs.highlight(lang, str, true).value +
                                '</code></pre>';
                        } catch (__) {}
                    }
                }
			}
			var md = window.markdownit(config);
			addLineNumberAttribute(md,heather);
			if(config.callback)
				config.callback(md);
			this.md = md;
		}
		
		MarkdownParser.prototype.render = function(markdown){
			return this.md.render(markdown);
		}
		
		function addLineNumberAttribute(md,heather){
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
			LazyLoader.eventHandlers.push({
				name : 'katex',
				handler:function(){
					addMathBlockLineNumber(md);
					heather.render();
				}
			})
			
		}
		
		function addMathBlockLineNumber(md){
			md.renderer.rules.math_block = function(tokens, idx, options, env, self) {
				var token = tokens[idx];
				var latex = token.content;
				var addLine = token.map;
				options.displayMode = true;
				if (addLine) {
					return "<div class='katex-block line' data-line='" + token.map[0] + "' data-end-line='" + token.map[1] + "'>"+latex+"</div>";
				} else {
					return renderKatexBlock(latex,options);
				}
			}
		}

		function addCodeBlockLineNumber(md){
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
		
		function addHtmlBlockLineNumber(md){
			md.renderer.rules.html_block = function (tokens, idx /*, options, env */) {
				var token = tokens[idx];
				var addLine = token.map;
				var content = token.content;
				if(addLine){
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
			};
		}
		
		
		function addFenceLineNumber(md){
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
				if(langName == 'mermaid'){
					if(addLine){
						var div = document.createElement('div');
						div.innerHTML = highlighted;
						var ele = div.firstChild; 
						ele.classList.add("line");
						ele.setAttribute("data-line", token.map[0]);
						ele.setAttribute("data-end-line", token.map[1]);
						return div.innerHTML;
					}else{
						return highlighted;
					}
					
				}

				if (highlighted.indexOf('<pre') === 0) {
					if(addLine){
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

        var HljsTip = (function() {

            function HljsTip(editor) {
				var tip = document.createElement('div');
				tip.classList.add('heather_hljs_tip');
				editor.addWidget({
					line:0,
					ch:0
				},tip)
                var state = {
                    running: false,
                    cursor: undefined
                };
				
				tip.addEventListener('click',function(e){
					if(e.target.tagName === 'TD'){
						setLanguage(e.target);
					}
				})

                var setLanguage = function(selected) {
                    hideTip();
					state.hideNext = true;
                    var lang = selected.textContent;
                    var cursor = editor.getCursor();
                    var text = editor.getLine(cursor.line);
					var startSpaceLength = text.length - text.trimStart().length;
					var index = text.indexOf('``` ');
                    editor.setSelection({
                        line: cursor.line,
                        ch: index+4
                    }, {
                        line: cursor.line,
                        ch: text.length
                    });
                    editor.replaceSelection(lang);
					if(cursor.line + 1 == editor.lineCount()){
						editor.execCommand('newlineAndIndent');
					} else {
						editor.execCommand('goLineDown');
					}
					editor.focus();
                }

                var hideTip = function() {
					tip.style.visibility = 'hidden';
                    editor.removeKeyMap(languageInputKeyMap);
                    state.running = false;
                    state.cursor = undefined;
                }

                var languageInputKeyMap = {
                    'Up': function() {
                        var current = tip.querySelector('.selected');
                        var prev = current.previousElementSibling;
                        if (prev != null) {
                            current.classList.remove('selected');
                            prev.classList.add('selected');
							tip.scrollTop = prev.offsetTop;
                        }
                    },
                    'Down': function() {
                        var current = tip.querySelector('.selected');
                        var next = current.nextElementSibling;
                        if (next != null) {
                            current.classList.remove('selected');
                            next.classList.add('selected');
							tip.scrollTop = next.offsetTop;
                        }
                    },
                    'Enter': function(editor) {
                        setLanguage(tip.querySelector('.selected'));
                    },
                    'Esc': function(editor) {
                        hideTip();
                    }
                }
                var hljsTimer;
                var hljsLanguages = hljs.listLanguages();
                hljsLanguages.push('mermaid');
                this.hideTipOnCursorChange = function(editor) {
                    if (editor.somethingSelected()) {
                        hideTip();
                        return;
                    }
                    var context = getTipContext(editor);
					if(!context.tip){
						hideTip();
					}
                }
				
				var getTipContext = function(editor){
					var cursor = editor.getCursor();
					var text = editor.getLine(cursor.line).trimStart();
					var subLeft = text.substring(0,cursor.ch);
					var context = {quoteSize:0,tip:false};
					while(subLeft.startsWith("> ")){
						context.quoteSize ++;
						subLeft = subLeft.substring(2);
					}
					if(subLeft.startsWith("``` ")){
						var lang = text.substring(4 + context.quoteSize*2, cursor.ch).trimStart();
						context.tip = lang != '';
						context.lang = lang;
					}
					return context;
				}
				
                this.tipHandler = function(editor) {
                    hideTip();
					if(state.hideNext === true) {
						state.hideNext = false;
						return ;
					}
                    if (!editor.somethingSelected()) {
                        var context = getTipContext(editor);
                        if (context.tip) {
							var lang = context.lang;
							var tips = [];
							for (var i = 0; i < hljsLanguages.length; i++) {
								var hljsLang = hljsLanguages[i];
								if (hljsLang.indexOf(lang) != -1) {
									tips.push(hljsLang);
								}
							}
							if (tips.length > 0) {
								state.running = true;
								state.cursor = editor.getCursor();
								var html = '<table style="width:100%">';
								for (var i = 0; i < tips.length; i++) {
									var clazz = i == 0 ? 'selected' : '';
									html += '<tr class="' + clazz + '"><td >' + tips[i] + '</td></tr>';
								}
								html += '</table>';
								var pos = editor.cursorCoords(true,'local');
								tip.innerHTML = html;
								var height = tip.clientHeight;
								tip.style.top = pos.top + editor.defaultTextHeight()+'px';
								tip.style.left = pos.left+'px';
								tip.style.visibility = 'visible';
								editor.addKeyMap(languageInputKeyMap);
							} else {
								hideTip();
							}
                        }
                    }
                }
				this.hideTip = hideTip;
                this.editor = editor;
            }

            HljsTip.prototype.enable = function() {
                this.editor.on('change', this.tipHandler);
                this.editor.on('cursorActivity', this.hideTipOnCursorChange);
            }

            HljsTip.prototype.disable = function() {
                this.editor.off('change', this.tipHandler);
                this.editor.off('cursorActivity', this.hideTipOnCursorChange);
            }

            return HljsTip;
        })();

        function Tooltip(editor,config) {
            this.hljsTip = new HljsTip(editor);
			if(config.tooltipEnable !== false)
				this.enable();
        }

        Tooltip.prototype.enable = function() {
            this.hljsTip.enable();
        }
        Tooltip.prototype.disable = function() {
            this.hljsTip.disable();
        }
        return Tooltip;

    })();
	
	var FileUpload = (function() {

        function FileUpload(file, heather,config) {
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
			if(this.withCredentials === true)
				xhr.withCredentials = true;
            var bar = document.createElement("div");
			var scrollInfo = editor.getScrollInfo();
			var scrollbarWidth = 0;
			if(scrollInfo.height > scrollInfo.clientHeight){
				var scroller = editor.getScrollerElement();
				scrollbarWidth = scroller.offsetWidth - scroller.clientWidth;
			}
            bar.innerHTML = '<div class="heather_progressbar"><div></div><span style="position:absolute;top:0"></span><i class="fas fa-times heather_icon" style="position: absolute;top: 0;right: '+scrollbarWidth+'px;"><i></div>'
            bar.querySelector('i').addEventListener('click', function() {
                xhr.abort();
            });
            var widget = editor.addLineWidget(editor.getCursor().line, bar, {
                coverGutter: false,
                noHScroll: true
            })
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
					formData : formData,
					start : function(){
						xhr.send(formData);
					}
				}, this.file);
				
				if(result === true){
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
		var eventHandlers = [];
		
		function triggerEvent(name,... args){
			for(var i=0;i<eventHandlers.length;i++){
				var eh = eventHandlers[i];
				if(eh.name === name){
					try{
						var handler = eh.handler;
						handler.apply(this,args);
					}catch(e){}
				}
			}	
		}

        function loadKatex(callback) {
            if (katexLoaded) {
                if (callback) callback();
                return;
            }
            if (katexLoading) return;
            katexLoading = true;

            var link = document.createElement('link');
            link.setAttribute('type', 'text/css');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', lazyRes.katex_css);
            document.head.appendChild(link);

            loadScript(lazyRes.katex_js, function() {
				triggerEvent('katex')
                katexLoaded = true;
                if (callback) callback();
            })
        }

        var mermaidLoading = false;
        var mermaidLoaded = false;

        function loadMermaid(callback) {
            if (mermaidLoaded) {
                if (callback) callback();
                return;
            }
            if (mermaidLoading) return;
            mermaidLoading = true;
            loadScript(lazyRes.mermaid_js, function() {
				triggerEvent('mermaid')
                mermaidLoaded = true;
                if (callback) callback();
            })
        }

        function loadScript(src, callback, relative) {
            var script = document.createElement('script');
            script.src = src;
            if (callback !== null) {
                script.onload = function() { // Other browsers
                    callback();
                };
            }
            document.body.appendChild(script);
        }

        return {
            loadKatex: loadKatex,
            loadMermaid: loadMermaid,
			eventHandlers : eventHandlers
        }
    })();
	
	
	var TableHelper = (function(){
		
		function TableHelper(heather){
			
			
			var commandsHandler = commands['commands'];
			
			commands['commands'] = function(heather){
				var cm = heather.editor;
				var context = getTableMenuContext(cm);
				if(context === 'no'){
					commandsHandler(heather);
					return ;
				}
				if(context === 'hide') return;
				
				var div = addCommandWidget(heather);
				
				div.appendChild(createListCommandWidget(heather,[{
					html : '插入列(前方)',
					handler : function(){
						addCol(heather,context,true);
					}
				},{
					html : '插入列(后方)',
					handler : function(){
						addCol(heather,context,false);
					}
				},{
					html : '删除列',
					handler : function(){
						delCol(heather,context);
					}
				},{
					html : '插入行(上方)',
					handler : function(){
						addRow(heather,context,true);
					}
				},{
					html : '插入行(下方)',
					handler : function(){
						addRow(heather,context,false);
					}
				},{
					html : '删除行',
					handler : function(){
						delRow(heather,context);
					}
				}]));
				
				posCommandWidget(heather,div);
			}
			
			
			var getTableMenuContext = function(cm){
				if(cm.somethingSelected()) return 'no';
				var cursor = cm.getCursor();
				var line = cursor.line;
				var nodes = heather.getNodesByLine(line);
				if(nodes.length == 0) return 'no';
				var node = nodes[nodes.length-1];
				if(node.tagName == 'P') node = nodes[nodes.length - 2];
				if(!node) return 'no';
				if(node.tagName !== 'TABLE') return 'no';
				var startLine = node.startLine;
				var endLine = node.endLine;
				
				var rowIndex = line - startLine;
				if(rowIndex == 1) return 'hide';
				if(rowIndex > 1) rowIndex --;
				
				var lineStr = cm.getLine(cursor.line);
				var lineLeft = lineStr.substring(0,cursor.ch);
				var lineRight = lineStr.substring(cursor.ch+1);
				
				var colIndex = -1;
				
				for(var i=0;i<lineLeft.length;i++){
					var ch = lineLeft.charAt(i);
					if(ch === '|' && (i == 0 || lineLeft.charAt(i - 1) != '\\')){
						colIndex ++ ;
					}
				}
				if(lineRight.indexOf('|') == -1) colIndex--;
				
				return {
					node:node,
					startLine:startLine,
					endLine : endLine,
					rowIndex : rowIndex,
					colIndex : colIndex
				}
			}
			
			var keyMap = {
				'Tab' : function(cm){
					if(!tab(heather))
						heather.editor.execCommand('indentMore');
				}
			}
			
			heather.addKeyMap(keyMap);
		}
		
		function tab(heather){
			var editor = heather.editor;
			if(!editor.somethingSelected()){
				var cursor = editor.getCursor();
				var line = cursor.line;
				var nodes = heather.getNodesByLine(line);
				var mappingElem;
				if(nodes.length > 0){
					mappingElem = nodes[nodes.length-1];
					if(mappingElem.tagName == 'P') mappingElem = nodes[nodes.length-2];
				}
				if(mappingElem && mappingElem.tagName === 'TABLE'){
					var startLine = parseInt(mappingElem.dataset.line);
					var endLine = parseInt(mappingElem.dataset.endLine) - 1;
					var setNextCursor = function(i,substr){
						if(i == startLine+1) return false;// 
						substr = i == line && substr === true;
						var lineStr = substr ? editor.getLine(i).substring(cursor.ch) : editor.getLine(i);
						var firstCh,lastCh;
						for(var j=0;j<lineStr.length;j++){
							var ch = lineStr.charAt(j);
							if(ch == '|'){
								//find prev char '\';
								var prevChar = j == 0 ? '' : lineStr.charAt(j-1);
								if(prevChar != '\\'){
									//find first
									//need to find next
									if(Util.isUndefined(firstCh)){
										firstCh = j;
									}else {
										lastCh = j;
										break;
									}
								}
							}
						}
						if(!Util.isUndefined(firstCh) && !Util.isUndefined(lastCh)){
							//set cursor at middle
							var ch = parseInt(Math.ceil((lastCh - firstCh)/2))+ firstCh + (substr ? cursor.ch : 0);
							editor.setCursor({line : i,ch : ch});
							return true;
						} else {
							return false;
						}
					}
					
					var hasNext = false;
					for(var i=line;i<=endLine;i++){
						if(setNextCursor(i,true)){
							hasNext = true;
							break;
						}
					}
					
					if(!hasNext){
						return setNextCursor(startLine);
					}
					
					return true;
				}	
			}
			return false;
		}
		
		function addCol(heather,context,before){
			var cm = heather.editor;
			var line = cm.getCursor().line;
			var array = [];
			var lineIndex = 0;
			var _ch = 0;
			
			var node = context.node;
			var startLine = context.startLine;
			var endLine = context.endLine;
			var colIndex = context.colIndex;
			
			cm.eachLine(startLine,endLine,function(handle){
				var index = -2;
				var text = handle.text;
				for(var i=0;i<text.length;i++){
					var ch = text.charAt(i);
					if(ch == '|' && (i == 0 || text.charAt(i - 1) !== '|')){
						index ++ ;
						var flag = before === true ? index == colIndex - 1 : index == colIndex;
						if(flag){
							if(lineIndex != 1)
								array.push(text.splice(i, 1, '|    |'));
							else
								array.push(text.splice(text.lastIndexOf('|'), 1, '|  --  |'));
							if(lineIndex+startLine == line){
								_ch =  i+3;
							}
							break;
						}
					}
				}
				lineIndex++;
			});
			
			cm.setSelection({line:startLine,ch:0},{line:endLine,ch:0});
			var newText = array.join('\n');
			if(endLine != cm.lineCount()-1){
				newText += '\n';
			}
			cm.replaceSelection(newText);
			cm.focus();
			cm.setCursor({
				line:line,
				ch:_ch
			})
		}
		
		
		function delCol(heather,context){
			var cm = heather.editor;
			var node = context.node;
			var startLine = context.startLine;
			var endLine = context.endLine;
			var colIndex = context.colIndex;
			
			var array = [];
			var lineIndex = 0;
			var line = cm.getCursor().line;
			var _ch = 0;
			cm.eachLine(startLine,endLine,function(handle){
				var index = -2;
				var prevIndex = -1;
				var text = handle.text;
				for(var i=0;i<text.length;i++){
					var ch = text.charAt(i);
					if(ch == '|' && (i == 0 || text.charAt(i - 1) !== '|')){
						index ++ ;
						if(index == colIndex){
							if(prevIndex == -1) {
								return false;
							}
							var newStr = text.splice(prevIndex, i-prevIndex, '');
							array.push(newStr == '|' ? '' : newStr);
							if(lineIndex+startLine == line){
								_ch = prevIndex;
							}
							break;
						}
						prevIndex = i;
					}
				}
				lineIndex++;
			});
			cm.setSelection({line:startLine,ch:0},{line:endLine,ch:0});
			var table = array.join('\n');
			cm.replaceSelection((table.trim() == '' ? '' : table)+'\n');
			cm.focus();
			cm.setCursor({
				line:line,
				ch:_ch
			})
		}
		
		function delRow(heather,context){
			var cm = heather.editor;
			var node = context.node;
			var startLine = context.startLine;
			var endLine = context.endLine;	
			var rowIndex = context.rowIndex;		
			
			if(rowIndex < 1) return ;
			var array = [];
			var lineIndex = 0;
			var line = cm.getCursor().line;
			cm.eachLine(startLine,endLine,function(handle){
				var _rowIndex = lineIndex > 1 ? lineIndex - 1 : lineIndex;
				if(rowIndex != _rowIndex || lineIndex == 1){
					array.push(handle.text);
				}
				lineIndex ++;
			});
			cm.setSelection({line:startLine,ch:0},{line:endLine,ch:0});
			var text = array.join('\n')+'\n';
			cm.replaceSelection(text);
			
			cm.focus();
			var line = line - 1;
			if(line == startLine + 1){
				line -- ;
			}
			cm.setCursor({
				line:line,
				ch:1
			})
		}
		
		function addRow(heather,context,before){
			var cm = heather.editor;
			var node = context.node;
			var startLine = context.startLine;
			var endLine = context.endLine;	
			var rowIndex = context.rowIndex;	
			
			if(rowIndex == 0 && before === true) return ;
			var lineIndex = rowIndex < 1 ? rowIndex : rowIndex+1;
			var newLine = '';
			var tr = node.querySelectorAll('tr')[rowIndex];
			var rowLine = cm.getLine(startLine+rowIndex);
			var startSpaceLength = rowLine.length - rowLine.trimStart().length;
			var quoteSize = getQuoteSize(rowLine.trimLeft());
			newLine += quoteSize>0 ? " ".repeat(Math.max(0,startSpaceLength))+"> ".repeat(quoteSize) :  " ".repeat(startSpaceLength);
			for(var i=0;i<tr.children.length;i++){
				newLine += '|    ';
				if(i == tr.children.length - 1)
					newLine += '|';
			}
			var newCh = startSpaceLength+3+quoteSize*2;
			var targetLine = startLine+lineIndex;
			if(before === true){
				if(targetLine >= cm.lineCount()) return ;
				cm.setSelection({line:targetLine,ch:0});
				cm.replaceSelection(newLine+'\n');
				cm.focus();
				cm.setCursor({
					line:startLine+lineIndex,
					ch:newCh
				});
			} else {
				if(rowIndex == 0){
					targetLine = startLine + 1;
				}
				cm.setSelection({line:targetLine,ch:cm.getLine(targetLine).length});
				cm.replaceSelection('\n'+newLine);
				cm.focus();
				cm.setCursor({
					line:targetLine+1,
					ch:newCh
				});
			}
		}
		
		return TableHelper;
	
	})();
	
	function createListCommandWidget(heather,items){
		var ul = document.createElement('ul');
		ul.classList.add('heather_command_list');
		
		for(var i=0;i<items.length;i++){
			var item = items[i];
			var li = document.createElement('li');
			li.innerHTML = item.html;
			li.setAttribute('data-index',i);
			if(i == 0)
				li.classList.add('active');
			ul.appendChild(li);
		}
		
		var execute = function(li){
			var handler = items[parseInt(li.dataset.index)].handler;
			if(handler){
				handler();
			}
			heather.editor.removeKeyMap(keyMap);
			removeCommandWidget(heather);
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
					if(lis.length > 0){
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
					if(li != null){
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
			'Esc': function(){
				heather.editor.removeKeyMap(keyMap);
				removeCommandWidget(heather);
			}
		}
		
		heather.editor.addKeyMap(keyMap);
		
		var state = heather.commandWidgetState || {};
		state.keyMap = keyMap;
		heather.commandWidgetState = state;
		
		for(const li of ul.querySelectorAll('li')){
			li.addEventListener('click',function(){
				execute(this);
			})
		}
		return ul;
	}
	
	
	function removeCommandWidget(heather){
		var cws = heather.commandWidgetState
		if(cws){
			cws.widget.remove();
			if(cws.keyMap){
				heather.editor.removeKeyMap(cws.keyMap);
			}
			heather.commandWidgetState = undefined;
			triggerEvent(heather,'commandWidgetClose',this);
		}
	}
	
	function addCommandWidget(heather){
		
		removeCommandWidget(heather);
		
		var cm = heather.editor;
		var cursor = cm.getCursor();
		var div = document.createElement('div');
		div.classList.add('heather_command_widget')
		div.setAttribute('data-widget','');
		cm.addWidget(cursor,div);
		
		function remove(){
			removeCommandWidget(heather);
			cm.off('cursorActivity',remove);
		}
		
		cm.on('cursorActivity',remove);
		var cws = heather.commandWidgetState || {};
		cws.widget = div;
		heather.commandWidgetState = cws;
		triggerEvent(heather,'commandWidgetOpen',div);
		return div;
	}
	
	function posCommandWidget(heather,div){
		var cm = heather.editor;
		var pos = cm.cursorCoords(true,'local');
		
		div.style.maxHeight = '';
		div.style.overflowY = '';
		
		var top = pos.top-cm.getScrollInfo().top-heather.top.getHeight();
		var left = parseFloat(div.style.left);
		var code = cm.display.lineDiv;
		if(left + div.clientWidth + 5 > code.clientWidth){
			div.style.left = '';
			div.style.right = '5px';
		}
		
		var distance = cm.defaultTextHeight();
		if(top > distance+div.clientHeight){
			div.style.top = (pos.top -  div.clientHeight)+'px';
		} else {
			var currentSpace = cm.getWrapperElement().clientHeight - (top + distance + heather.top.getHeight());
			if(currentSpace - div.clientHeight < 0){
				div.style.overflowY = 'auto';
				if(currentSpace > top){
					div.style.maxHeight = currentSpace+'px';
					div.style.top = (pos.top + distance)+'px';
				} else {
					div.style.maxHeight = top+'px';
					div.style.top = (pos.top -  div.clientHeight)+'px';
				}
			} else {
				div.style.top = (pos.top + distance)+'px';
			}
			
		}
	}
	
	commands['heading'] = function(heather){
		var cm = heather.editor;
		var line = cm.getCursor().line;
		var heading = 1;
		var nodes = heather.node.children;
		for(var i=nodes.length-1;i>=0;i--){
			var node = nodes[i];
			var startLine = parseInt(node.dataset.line);
			if(startLine <= line){
				var tagName = node.tagName;
				if(tagName.startsWith('H')){
					var h = parseInt(tagName.substring(1));
					if(h >= 1 && h <= 6){
						heading = h;
						break;
					}
				}
			}
		}
	
		cm.replaceSelection("#".repeat(heading)+" "+cm.getSelection());
		cm.focus();
	}
	
	commands['commands'] = function(heather){
		var div = addCommandWidget(heather);
		
		div.appendChild(createListCommandWidget(heather,[{
			html : '标题',
			handler : function(){
				heather.execCommand('heading');
			}
		},{
			html : '表格',
			handler : function(){
				heather.execCommand('table');
			}
		},{
			html : '代码块',
			handler : function(){
				heather.execCommand('codeBlock');
			}
		},{
			html : '无序列表',
			handler : function(){
				heather.execCommand('unorderedList');
			}
		},{
			html : '有序列表',
			handler : function(){
				heather.execCommand('orderedList');
			}
		},{
			html : '任务列表',
			handler : function(){
				heather.execCommand('taskList');
			}
		},{
			html : '引用',
			handler : function(){
				heather.execCommand('quote');
			}
		},{
			html : '数学公式块',
			handler : function(){
				heather.execCommand('mathBlock');
			}
		},{
			html : 'mermaid图表',
			handler : function(){
				heather.execCommand('mermaid');
			}
		}]));
		posCommandWidget(heather,div);
	}
	
	commands['table'] = function(heather){
		var cm = heather.editor;
		var cursor = cm.getCursor();
		var rows = cols = 2;
		var text = '';
		for (var i = 0; i < cols; i++) {
			text += '|    ';
		}
		text += '|'
		text += "\n";
		var prefix = createPrefix(cm,cursor);
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
		var startCh,endCh;
		
		for(var i=0;i<lineStr.length;i++){
			if(lineStr.charAt(i) == '|'){
				if(!Util.isUndefined(startCh)){
					endCh = i;
					break;
				}
				startCh = i;
			}
		}
		
		if(!Util.isUndefined(startCh) && !Util.isUndefined(endCh)){
			var ch = startCh + (endCh - startCh)/2;
			cm.focus();
			cm.setCursor({line : cursor.line,ch:ch});
		}	
	}
	
	commands['taskList'] = function(heather){
		runListCommand(heather,'taskList')
	}
	
	commands['orderedList'] = function(heather){
		runListCommand(heather,'orderedList')
	}
	
	commands['unorderedList'] = function(heather){
		runListCommand(heather,'unorderedList')
	}
	
	commands['code'] = function(heather){
		runWrapCommand(heather,'`');
	}
	
	commands['link'] = function(heather){
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
	
	commands['strikethrough'] = function(heather){
		runWrapCommand(heather,'~~');
	}
	
	commands['mermaid'] = function(heather){
		runWrapBlockCommand(heather,'``` mermaid','```');
	}
	
	commands['codeBlock'] = function(heather){
		runWrapBlockCommand(heather,'``` ','```');
	}
	
	commands['mathBlock'] = function(heather){
		runWrapBlockCommand(heather,'$$','$$');
	}
	
	commands['quote'] = function(heather){
		runBlockCommand(heather,function(line,i,startBlankLength,noSelection,singleLine){
			return '> ' + line + (noSelection || singleLine ? '' : '  ');
		})
	}
	
	commands['bold'] = function(heather){
		runWrapCommand(heather,'**');
	}
	
	commands['italic'] = function(heather){
		runWrapCommand(heather,'*');
	}
	
	commands['br'] = function(heather){
		var cm = heather.editor;
		cm.replaceSelection('<br>');
		cm.focus();
		var cursor = cm.getCursor('from');
		cursor.ch = cursor.ch + 4;
		cm.setCursor(cursor);
	}
	
	function runListCommand(heather,type){
		runBlockCommand(heather,function(line,index){
			if(type == 'orderedList'){
				return (index+1)+'. '+line;
			}
			if(type == 'unorderedList'){
				return '- '+line;
			}
			if(type == 'taskList'){
				return '- [ ] '+line;
			}
		})
	}
	
	function runWrapBlockCommand(heather,start,after){
		var last = heather.editor.getCursor('to');
		var first = heather.editor.getCursor('from');
		var resetCursor = false;
		runBlockCommand(heather,function(line,i,startBlankLength,noSelection,singleLine){
			if(noSelection){
				resetCursor = true;
				var blank = ' '.repeat(last.ch);
				return start+'\n'+blank+'\n'+blank+after;
			} else {
				if(i == 0){
					if(last.line - first.line == 0){
						return start+'\n'+' '.repeat(startBlankLength) + line+'\n'+' '.repeat(startBlankLength)+after;
					}
					return start+'\n'+' '.repeat(startBlankLength) + line;
				}
				if(i == last.line - first.line)
					return line + '\n'+' '.repeat(startBlankLength)+after;
				return line;
			}
		});
		if(resetCursor){
			heather.editor.setCursor({
				line:last.line+1,
				cursor:last.ch
			})
		}
	}

	
	function runBlockCommand(heather,lineHandler){
		var cm = heather.editor;
		cm.focus();
		if(!cm.somethingSelected()){
			cm.replaceSelection(lineHandler('',0,0,true,true));
		} else {
			var texts = cm.getSelection().split('\n');
			var replaces = [];
			var from = cm.getCursor('from');
			var singleLine = from.line == cm.getCursor('to').line;
			for(var i=0;i<texts.length;i++){
				var text = texts[i];
				if(i == 0){
					var fullLine = cm.getLine(from.line);
					var startBlankLength = fullLine.length - fullLine.trimLeft().length;
					var firstLineStartsWithBlank = fullLine.substring(0,from.ch).trimLeft() == '';
					if(!firstLineStartsWithBlank){
						replaces.push("\n"+' '.repeat(startBlankLength)+lineHandler(text,i,startBlankLength,false,singleLine));
					} else {
						from.ch = 0;
						replaces.push(' '.repeat(startBlankLength)+lineHandler(text.trimLeft(),i,startBlankLength,false,singleLine));
					}
				} else {
					var startBlankLength = text.length - text.trimLeft().length;
					replaces.push(' '.repeat(startBlankLength)+lineHandler(text.trimLeft(),i,startBlankLength,false,singleLine));
				}
			}
			cm.replaceSelection(replaces.join('\n'))
		}
	}
	
	function runWrapCommand(heather,wrap){
		var cm = heather.editor;
		cm.focus();
		if(!cm.somethingSelected()){
			cm.replaceSelection(wrap+wrap);
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
	
	function renderKatexAndMermaid(element,config) {
		LazyLoader.loadKatex(function() {
			var inlines = element.querySelectorAll(".katex-inline");
			for (var i = 0; i < inlines.length; i++) {
				var inline = inlines[i];
				var expression = inline.textContent;
				var result = parseKatex(expression, false);
				var div = document.createElement('div');
				div.innerHTML = result;
				var child = div.firstChild;
				child.setAttribute('data-inline-katex', '');
				inline.outerHTML = child.outerHTML;
			}
			var blocks = [];

			if(element.hasAttribute('data-block-katex')){
				blocks.push(element);
			} else {
				for(const elem of element.querySelectorAll(".katex-block")){
					blocks.push(elem);
				}
			}
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				var expression = block.textContent;
				var result = parseKatex(expression, true);
				var div = document.createElement('div');
				div.innerHTML = result;
				var child = div.firstChild;
				child.setAttribute('data-block-katex', '');
				block.innerHTML = child.outerHTML;
			}
		})
		LazyLoader.loadMermaid(function() {
			var mermaidElems = element.querySelectorAll('.mermaid');
			for(const mermaidElem of mermaidElems){
				if (!mermaidElem.hasAttribute("data-processed")) {
					try {
						mermaid.parse(mermaidElem.textContent);
						mermaid.init({}, mermaidElem);
					} catch (e) {
						mermaidElem.innerHTML = '<pre>' + e.str + '</pre>'
					}
				}
			}
		});
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
	
	function changeTastListStatus(heather,x,y){
		var cm = heather.editor;
		var cursor = cm.coordsChar({left:x, top:y}, 'window');
		var nodes = heather.getNodesByLine(cursor.line);
		if(nodes.length == 0) return ;
		var node = nodes[nodes.length - 1];
		if(node.tagName == 'P') node = nodes[nodes.length-2];
		if(!node) return ;
		if(node.classList.contains('task-list-item')){
			var lineStr = cm.getLine(cursor.line);
			var lineLeft = lineStr.trimLeft();
			var startBlankLength = lineStr.length - lineLeft.length;
			var quoteSize = getQuoteSize(lineLeft);
			var lft = lineLeft.substring(quoteSize*2,cursor.ch-startBlankLength).replaceAll(' ','');
			if(lft == '-[' || lft == '-[x'){
				//need change 
				var checkbox = node.querySelector('.task-list-item-checkbox');
				if(checkbox != null){
					var startCh,endCh;
						
					for(var i=0;i<lineStr.length;i++){
						var ch = lineStr.charAt(i);
						if(ch == '['){
							startCh = i;
						}
						if(ch == ']'){
							endCh = i;
							break;
						}
					}
					
					if(!Util.isUndefined(startCh) && !Util.isUndefined(endCh)){
						cm.setSelection({line:cursor.line,ch:startCh+1},{line:cursor.line,ch:endCh});
						if(checkbox.checked){
							cm.replaceSelection(" ");
						} else {
							cm.replaceSelection("x");
						}
					}
					
				}
			}
		}
	}
	
	function createUnparsedMermaidElement(expression) {
        var div = document.createElement('div');
        div.classList.add('mermaid-block');
        div.innerHTML = '<div class="mermaid"></div><textarea class="mermaid-source" style="display:none !important">' + expression + '</textarea>';
        div.querySelector('.mermaid').innerHTML = expression;
        return div;
    }
	
	function morphdomUpdate(target,source,config){
		var elem = morphdom(target, source, {
			onBeforeElUpdated: function(f, t) {
				if (f.classList.contains('mermaid-block') &&
					t.classList.contains('mermaid-block')) {
					var oldEle = f.getElementsByClassName('mermaid-source')[0];
					var nowEle = t.getElementsByClassName('mermaid-source')[0];
					if (Util.isUndefined(oldEle) || Util.isUndefined(nowEle)) {
						return true;
					}
					var old = oldEle.value;
					var now = nowEle.value;
					if (old == now) {
						//鏇存柊灞炴€�
						Util.cloneAttributes(f, t);
						return false;
					}
				}
				return true;
			}
		});
		renderKatexAndMermaid(elem);
		return elem;
	}	
	
	function getQuoteSizeAtPoint(cm,cursor){
		var left = cm.getLine(cursor.line).substring(0,cursor.ch).trimStart();
		return getQuoteSize(left);
	}
	
	function getQuoteSize(str){
		//> => 1
		//> > => 2
		//> 1 > 1 => 1
		var size = 0;
		while(str.startsWith("> ")){
			size ++;
			str = str.substring(2);
		}
		return size;
	}
	
	function createPrefix(cm,cursor){
		var prefix;
		var size = getQuoteSizeAtPoint(cm,cursor);
		if(size > 0){
			prefix = " ".repeat(Math.max(cursor.ch-2*size,0))+"> ".repeat(size);
		} else {
			prefix = " ".repeat(cursor.ch);
		}
		return prefix;
	}
	
	function registerEvents(...args){
		var unregisters = args[args.length - 1];
		var heather = args[args.length - 3];
		var handler = args[args.length - 2];
		for(var i=0;i<args.length-3;i++){
			unregisters.push(heather.on(args[i],handler))
		}
		return unregisters;
	}
	function unregisterEvents(unregisters){
		for(const reg of unregisters){
			try{
				reg.off();
			}catch(e){console.log(e)};
		}
	}	
	return {
		create : function(textarea,config){
			return new Editor(textarea,config);
		},
		commands : commands,
		lazyRes : lazyRes,
		Util : Util,
		defaultConfig : defaultConfig,
		version : '2.1.2.2'
	};
})();