var Heather = (function(){
	
	var lazyRes = {
        mermaid_js: "js/mermaid.min.js",
        katex_css: "katex/katex.min.css",
        katex_js: "katex/katex.min.js",
        mobile_style_css: "css/style_mobile.css"
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
		
		if(mobile){
			var link = document.createElement('link');
			link.setAttribute('type','text/css');
			link.setAttribute('rel','stylesheet');
			link.setAttribute('href',lazyRes.mobile_style_css);
			document.head.appendChild(link);
		}
	
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
			linkify:true
		},
		commandBarEnable : Util.mobile,
		partPreviewEnable : !Util.mobile,
		editor : {
			lineNumbers : true,
			dragDrop:true,
			extraKeys:{
				'Enter':'newlineAndIndentContinueMarkdownList'
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
	
	function Editor(textarea,config){
		config = Object.assign({}, defaultConfig, config);
		this.eventHandlers = [];
		this.editor = createEditor(textarea,config);
		this.markdownParser = new MarkdownParser(config.markdownParser);
		this.toolbar = new Toolbar(this,config);
		this.commandBar = new CommandBar(this,config);
		this.tooltip = new Tooltip(this.editor,config);
		this.rendered = true;
		this.partPreview = new PartPreview(this,config);
		this.config = config;
		initKeyMap(this);
		handleDefaultEditorEvent(this);
		
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
	/*
	是否启用了文件上传
	*/
	Editor.prototype.isFileUploadEnable = function(){
		var config = this.config.upload;
		return !Util.isUndefined(config) && !Util.isUndefined(config.url) && !Util.isUndefined(config.uploadFinish);
	}
	
	/*
	根据markdown行号获取对应的html节点
	一个行号可能对应多个节点，例如：
	0. - [ ] todo list
	1.     <div></div>
	那么行号1对应的节点应该为 [ul,li,div]
	*/
	Editor.prototype.getNodesByLine = function(line){
		if(!this.node) return [];
		var nodes = [];
		var addNode = function(node){
			for(const dataLine of node.querySelectorAll('[data-line]')){
				var _startLine = parseInt(dataLine.dataset.line);
				var _endLine = parseInt(dataLine.dataset.endLine);
				if (_startLine <= line && _endLine > line) {
					var clone = dataLine.cloneNode(true);
					clone.startLine = _startLine;
					clone.endLine = _endLine;
					nodes.push(clone);
					addNode(clone);
					break;
				}
			}
		}
		addNode(this.node);
		return nodes;
	}
	
	/*
	当前是否处于预览模式
	*/
	Editor.prototype.isPreview = function(){
		return !Util.isUndefined(this.previewState);
	}
	
	Editor.prototype.execCommand = function(name){
		var handler = commands[name];
		if(!Util.isUndefined(handler))
			handler(this);
	}
	
	/*
	设置是否预览
	*/
	Editor.prototype.setPreview = function(preview){
		if(preview === true && this.previewState) return;
		if(preview !== true && !this.previewState) return;
		if(preview === true){
			
			var elem = this.editor.getScrollerElement();
			elem.style.display = 'none';
			this.editor.setOption('readOnly',true);
			var div = document.createElement('div');
			div.classList.add('markdown-body');
			div.classList.add('heather_preview');
			div.innerHTML = this.node ? this.node.innerHTML : '';
			
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
			triggerEvent(this,'previewChange',true);
		} else {
			this.editor.getScrollerElement().style.display = '';
			this.editor.refresh();
			this.previewState.element.remove();
			this.editor.setOption('readOnly',false);
			this.editor.focus();
			this.editor.setCursor(this.previewState.cursor);
			this.previewState = undefined;
			triggerEvent(this,'previewChange',false);
		}
	}
	
	Editor.prototype.getToolbar = function(){
		return this.toolbar;
	}
	
	Editor.prototype.isFullscreen = function(){
		return this.fullscreen === true;
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
			
			var renderedHandler = function(value,html){
				var node = container.cloneNode(false);
				node.innerHTML = html;
				morphdomUpdate(container,node,me.config);
			}
			
			if(this.node)
				renderedHandler(null,this.node.innerHTML);
			
			this.on('rendered',renderedHandler);
			var sync = new Sync(this.editor,div);
			
			var scrollHandler = function(){
				sync.doSync();
			}
			
			this.editor.on('scroll',scrollHandler);
			
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
			
			var focusedHeightChange = function(h){
				div.querySelector('.heather_sync_view_container').style['paddingBottom'] = h + 'px';
			}
			
			if(this.focusedState){
				if(!Util.isUndefined(this.focusedState.height)){
					focusedHeightChange(this.focusedState.height);
				}
			}
			var stamp = createStamp();
			this.partPreview.setKeepHidden(true,stamp);
			this.on('fullscreenChange',fullscreenChangeHandler);
			this.on('previewChange',previewChangeHandler);
			this.on('focusedHeightChange',focusedHeightChange);
			this.syncViewState = {
				view : div,
				stamp : stamp,
				renderedHandler : renderedHandler,
				scrollHandler : scrollHandler,
				fullscreenChangeHandler : fullscreenChangeHandler,
				previewChangeHandler : previewChangeHandler,
				focusedHeightChange : focusedHeightChange
			}
			
		} else {
			this.partPreview.setKeepHidden(false,this.syncViewState.stamp);
			this.syncViewState.view.remove();
			this.off('rendered',this.syncViewState.renderedHandler);
			this.off('fullscreenChange',this.syncViewState.fullscreenChangeHandler);
			this.off('previewChange',this.syncViewState.previewChangeHandler);
			this.off('focusedHeightChange',this.syncViewState.focusedHeightChange);
			this.editor.off('scroll',this.scrollHandler);
			
			this.syncViewState = undefined;
			wrap.classList.remove('heather_sync_view_editor');
		}
	}
	
	Editor.prototype.setFullscreen = function(fullscreen){
		if(fullscreen === true && this.editor.getOption('fullScreen')) return;
		if(fullscreen !== true && !this.editor.getOption('fullScreen')) return;
		if(fullscreen === true){
			this.editor.setOption("fullScreen", true);
			this.fullscreen = true;
		} else {
			this.editor.setOption("fullScreen", false);
			this.fullscreen = false;
		}
		this.editor.refresh();
		this.commandBar.rePosition();
		this.partPreview.rePosition();
		triggerEvent(this,'fullscreenChange',this.fullscreen);
	}
	
	Editor.prototype.on = function(eventName, handler) {
		if(eventName.startsWith("editor.")){
			eventName = eventName.substring(eventName.indexOf('.')+1);
			this.editor.on(eventName,handler);
			return ;
		}
		this.eventHandlers.push({
			name : eventName,
			handler : handler
		});
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
		var changeAction = Util.mobile ? 'cursorActivity' : 'change';
		if(focus === true){
			var me = this;
			
			function scrollToMiddle(cm){
				if(cm.somethingSelected()) return ;
				var height = cm.getWrapperElement().clientHeight/2;
				var pos = cm.cursorCoords(true,'local');
				var space = pos.top - height + me.toolbar.getHeight();
				if(me.focusedState.height !== height){
					cm.getWrapperElement().querySelector('.CodeMirror-lines').style.paddingBottom = height+'px';
					cm.refresh();
					me.focusedState.height = height;
					triggerEvent(me,'focusedHeightChange',height);
				}
				cm.scrollTo(null, space);
			}
			
			this.focusedState = {
				changeHandler : function(cm){
					scrollToMiddle(cm);
				},
				fullscreenChange: function(fs){
					scrollToMiddle(me.editor);
				}
			}
			
			this.on('fullscreenChange',this.focusedState.fullscreenChange);
			this.editor.on(changeAction,this.focusedState.changeHandler);
			triggerEvent(this,'focusedChange',true);
			this.editor.setCursor({line:0,ch:0});
		} else {
			this.off('fullscreenChange',this.focusedState.fullscreenChange);
			this.editor.off(changeAction,this.focusedState.changeHandler);
			this.focusedState = undefined;
			this.editor.getWrapperElement().querySelector('.CodeMirror-lines').style.paddingBottom = '';
			triggerEvent(this,'focusedChange',false);
			triggerEvent(me,'focusedHeightChange',0);
		}
	}
	
	Editor.prototype.isFocused = function(){
		return !Util.isUndefined(this.focusedState);
	}
	
	Editor.prototype.openSelectionHelper = function(){
		if(Util.mobile && !this.isPreview()){
			this.closeSelectionHelper();
			this.selectionHelper = new SelectionHelper(this);
			triggerEvent(this,'selectionHelperChange',true);
		}
	}
	
	Editor.prototype.closeSelectionHelper = function(){
		if(this.selectionHelper){
			this.selectionHelper.remove();
			this.selectionHelper = undefined;
			triggerEvent(this,'selectionHelperChange',false);
		}
	}
	
	Editor.prototype.addKeyMap = function(keyMap) {
		var me = this;
		for (const key in keyMap) {
			var v = keyMap[key];
			if(typeof v === 'string'){
				var value = v;
				keyMap[key] = function(){
					me.execCommand(value);
				}
			}
		}
		this.editor.addKeyMap(keyMap);
	}	
	
	Editor.prototype.render = function(){
		var value = this.editor.getValue();
		var node = Util.parseHTML(this.markdownParser.render(value)).body;
		this.node = node;
		triggerEvent(this,'rendered',value,this.node.innerHTML);
		this.rendered = true;
	}
	
	function handleDefaultEditorEvent(heather){
		var editor = heather.editor;
		//auto render
		var doRender = function(){
			heather.render();
		}
		if(editor.getValue() != '')
			doRender();
		editor.on('change',function(cm,change){
			heather.rendered = false;
			if(heather.renderTimer){
				clearTimeout(heather.renderTimer);
			}
			heather.renderTimer = setTimeout(function(){
				doRender();
			},heather.config.autoRenderMill);	
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
	}
	
	function isWidget(target,cm){
		for(const widget of cm.getWrapperElement().querySelectorAll('[data-widget]')){
			if(widget.contains(target)) 
				return true;
		}
		return false;
	}
		
	function initKeyMap(heather) {
		var keyMap = Util.mac ? {
			"Ctrl-B": 'bold',
			"Ctrl-I": 'italic',
			"Shift-Cmd-T": 'table',
			"Ctrl-H": 'heading',
			"Ctrl-L": 'link',
			"Ctrl-Q": 'quote',
			"Shift-Cmd-B": 'codeBlock',
			"Shift-Cmd-U": 'uncheck',
			"Shift-Cmd-I": 'check',
			"Cmd-/": 'commands',
			"Cmd-Enter": function() {
				heather.setFullscreen(!heather.isFullscreen());
			},
			"Cmd-P": function() {
				heather.setPreview(!heather.isPreview())
			},
			"Tab":function(){
				if(!tab(heather)){
					heather.editor.execCommand('indentMore');
				}
			},
			"Shift-Tab":function(){
				heather.editor.execCommand('indentLess')
			}
		} : {
			"Ctrl-B": 'bold',
			"Ctrl-I": 'italic',
			"Alt-T": 'table',
			"Ctrl-H": 'heading',
			"Ctrl-L": 'link',
			"Ctrl-Q": 'quote',
			"Alt-B": 'codeBlock',
			"Alt-U": 'uncheck',
			"Alt-I": 'check',
			"Alt-/": 'commands',
			"Ctrl-Enter": function() {
				heather.setFullscreen(!heather.isFullscreen());
			},
			"Ctrl-P": function() {
				heather.setPreview(!heather.isPreview())
			},
			"Tab":function(){
				if(!tab(heather)){
					heather.editor.execCommand('indentMore');
				}
			},
			"Shift-Tab":function(){
				heather.editor.execCommand('indentLess')
			}
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
		config.inputStyle = 'contenteditable';
		config.mode = {name : 'gfm'};
		config.lineWrapping = true;
		
		config.value = textarea.value;
		
		var node = document.createElement('div');
		node.classList.add('heather_editor_wrapper');
		textarea.after(node);
		
		var editor = CodeMirror.fromTextArea(textarea, config,node);
		editor.getRootNode = function(){
			return node;
		}
		return editor;
	}
	
	var SelectionHelper = (function(){
		
		function SelectionHelper(heather){
			
			var editor = heather.editor;
			
			var html = '';
            html += '<div style="height:26.66%;text-align:center">';
            html += '<i class="fas fa-arrow-up" data-arrow="goLineUp" style="font-size:50px;cursor:pointer"></i>'
            html += '</div>';
            html += '<div style="height:26.66%">'
            html += '<i class="fas fa-arrow-left" data-arrow="goCharLeft" style="font-size:50px;float:left;cursor:pointer;margin-right:20px"></i>';
            html += '<i class="fas fa-arrow-right" data-arrow="goCharRight" style="font-size:50px;float:right;cursor:pointer"></i>';
            html += '<div style="clear:both"></div>';
            html += '</div>';
            html += '<div style="height:26.66%;text-align:center">';
            html += '<i class="fas fa-arrow-down" data-arrow="goLineDown" style="font-size:50px;cursor:pointer"></i>';
            html += '</div>';
			var div = document.createElement('div');
			div.classList.add('heather_selection_helper');
			div.style.visibility = 'hidden';
			div.setAttribute('data-widget','');
			div.innerHTML = html;
			editor.addWidget({line:0,ch:0},div);
			div.style.width = div.clientHeight+'px';
			div.style.visibility = 'visible';
			
			this.start = editor.getCursor(true);
			this.end = editor.getCursor(false);
			this.marked = editor.markText(this.start,this.end, {
				className: "heather_selection_marked"
			});
			var me = this;
			
			this.cursorActivityHandler = function(cm){
				if (me.movedByMouseOrTouch === true) {
					me.movedByMouseOrTouch = false;
					me.start = editor.getCursor();
				}
				div.style.top = (cm.cursorCoords(false,'local').top+cm.defaultTextHeight())+'px';
			};
			
			this.cursorActivityHandler(editor);
			
			this.movedHandler = function(cm,e){
				if(isWidget(e.target,cm)){
					e.codemirrorIgnore  = true;
					return ;
				}
				me.movedByMouseOrTouch = true;
				me.end = undefined;
				if(me.marked){
					me.marked.clear();
				}
			}
			editor.setOption('readOnly','nocursor');
			div.addEventListener('click',function(e){
				if(e.target.hasAttribute('data-arrow')){
					var action = e.target.dataset.arrow;
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
			});
			
			
			editor.on('cursorActivity',this.cursorActivityHandler);
			editor.on("mousedown", this.movedHandler);
            editor.on("touchstart", this.movedHandler);
			
			this.stamp = createStamp();
			
			heather.commandBar.setKeepHidden(true,this.stamp);
			heather.partPreview.setKeepHidden(true,this.stamp);
			
			this.previewChangeHandler = function(){
				me.remove();
			}
			
			heather.on('previewChange',this.previewChangeHandler);
			
			this.div = div;
			this.heather = heather;
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
		
		SelectionHelper.prototype.remove = function(){
			if (this.marked) {
				this.marked.clear();
			}
			var editor = this.heather.editor;
			if(this.end){
				var cursors = this.getCursors();
				editor.setSelection(cursors.start,cursors.end);
			}
			this.div.remove();
			editor.on('cursorActivity',this.cursorActivityHandler);
			editor.on("mousedown", this.movedHandler);
            editor.on("touchstart", this.movedHandler);
			this.heather.off('previewChange',this.previewChangeHandler);
			this.heather.commandBar.setKeepHidden(false,this.stamp);
			this.heather.partPreview.setKeepHidden(false,this.stamp);
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
			return this.element.clientHeight;
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
	
	
	var Toolbar = (function(){
		
		function Toolbar(heather,config){
			var cm = heather.editor;
			var div = document.createElement('div');
			div.classList.add('heather_toolbar_bar');
			div.setAttribute('data-widget','');
			div.style.visibility = 'hidden';
			cm.addWidget({line:0,ch:0},div);
			div.style.top = '0px';
			cm.on('scroll',function(cm){
				div.style.top = cm.getScrollInfo().top+'px';
			});
			this.heather = heather;
			this.cm = cm;
			this.bar = new Bar(div);
		}
		
		Toolbar.prototype.addElement = function(element){
			this.bar.addElement(element);
			calcMarginTop(this);
		}
		
		Toolbar.prototype.insertElement = function(element,index){
			this.bar.insertElement(element,index);
			calcMarginTop(this);
		}	
		
		Toolbar.prototype.addIcon = function(icon,handler,callback){
			this.bar.addIcon(icon,handler,callback);
			calcMarginTop(this);
		}
		
		Toolbar.prototype.insertIcon = function(clazz, handler, index, callback){
			this.bar.addIcon(clazz, handler, index, callback);
			calcMarginTop(this);
		}	
		
		Toolbar.prototype.removeElement = function(deleteChecker){
			this.bar.removeElement(deleteChecker);
			calcMarginTop(this);
		}
		
		Toolbar.prototype.clear = function(){
			this.bar.clear();
			calcMarginTop(this);
		}
	
		Toolbar.prototype.hide = function(){
			this.cm.getWrapperElement().querySelector('.CodeMirror-code').style.marginTop = '';
			this.bar.getElement().style.visibility = 'hidden';
		}
		
		Toolbar.prototype.show = function(){
			calcMarginTop(this);
		}
		
		Toolbar.prototype.getHeight = function(){
			return this.bar.length() == 0 ? 0 : this.bar.height();
		}
		
		function calcMarginTop(toolbar){
			if(toolbar.bar.length() == 0){
				toolbar.cm.getWrapperElement().querySelector('.CodeMirror-code').style.marginTop = '';
				toolbar.bar.getElement().style.visibility = 'hidden';
				return ;
			}
			toolbar.cm.getWrapperElement().querySelector('.CodeMirror-code').style.marginTop = toolbar.bar.getElement().clientHeight+'px';
			toolbar.bar.getElement().style.visibility = 'visible';
			this.heather.commandBar.rePosition();
			this.heather.partPreview.rePosition();
		}
		
		return Toolbar;
	})();
	
	var CommandBar = (function(){
		
		function CommandBar(heather,config){
			var me = this;
			this.cursorActivityListener = function(cm){
				if(!me.bar){
					me.bar = createBar(cm,heather);
					me.bar.setAttribute('data-widget','');
					cm.addWidget({line:0,ch:0},me.bar);
				}
				me.rePosition();
			}
			this.cm = heather.editor;
			this.heather = heather;
			if(config.commandBarEnable !== false)
				this.enable();
		}
		
		CommandBar.prototype.rePosition = function(){
			if(!this.bar){
				return ;
			}
			var cm = this.cm;
			var pos = cm.cursorCoords(true,'local');
			if(this.keepHidden !== true)
				this.bar.style.visibility = 'visible';
			else
				this.bar.style.visibility = 'hidden';
			var toolbarHeight = this.heather.toolbar.getHeight();
			var top = pos.top - cm.getScrollInfo().top - toolbarHeight;
			var distance = 2*cm.defaultTextHeight();
			if(top > distance+this.bar.clientHeight){
				this.bar.style.top = (pos.top - distance - this.bar.clientHeight)+'px';
			} else {
				this.bar.style.top = (pos.top + distance)+'px';
			}
		}
		
		CommandBar.prototype.enable = function(){
			this.cursorActivityListener(this.cm);
			this.cm.on('cursorActivity',this.cursorActivityListener)
		}	
		
		CommandBar.prototype.disable = function(){
			if(this.bar){
				this.bar.remove();
				this.bar = undefined;
			}
			this.cm.off('cursorActivity',this.cursorActivityListener)
		}
		
		CommandBar.prototype.setKeepHidden = function(keepHidden,stamp){
			if(Util.isUndefined(this.stamp)){
				this.stamp = stamp;
			} else {
				if(this.stamp === stamp){
					this.stamp = undefined;
				} else {
					return ;
				}
			}
			if(keepHidden === true && this.bar)
				this.bar.style.visibility = 'hidden';
			if(keepHidden !== true && this.bar)
				this.bar.style.visibility = 'visible';
			this.keepHidden = keepHidden === true;
		}	
		
		function createBar(cm,heather){
			var div = document.createElement('div');
			div.classList.add('heather_command_bar')
			var bar = new Bar(div);
			bar.addIcon('fas fa-heading heather_icon', function() {
				heather.execCommand('heading')
			});
			bar.addIcon('fas fa-bold heather_icon', function() {
				heather.execCommand('bold')
			});
			
			bar.addIcon('fas fa-italic heather_icon',function(){
				heather.execCommand('italic')
			});
			
			bar.addIcon('fas fa-quote-left heather_icon', function() {
				heather.execCommand('quote');
			})
			
			bar.addIcon('fas fa-strikethrough heather_icon', function() {
				heather.execCommand('strikethrough');
			})
			
			bar.addIcon('fas fa-link heather_icon', function() {
				heather.execCommand('link');
			})
			
			bar.addIcon('fas fa-code heather_icon', function() {
				heather.execCommand('code');
			})

			bar.addIcon('fas fa-file-code heather_icon', function() {
				heather.execCommand('codeBlock');
			})
			
			bar.addIcon('far fa-square heather_icon', function() {
				heather.execCommand('uncheck');
			})
			
			bar.addIcon('far fa-check-square heather_icon', function() {
				heather.execCommand('check');
			})
			
			bar.addIcon('fas fa-table heather_icon', function() {
				heather.execCommand('table');
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
			if(this.config.partPreviewEnable !== false){
				this.enable();
			}
		}

		PartPreview.prototype.enable = function() {
			if(this.enable === true) return ;
			var editor = this.editor;
			this.widget = new Widget(this);
			var me = this;
			var changeHandler = function(cm) {
				if(me.disable === true) return ;
				if (me.changed !== true) {
					me.changed = true;
				}
			}

			var cursorActivityHandler = function() {
				if(me.disable === true || me.keepHidden === true) return ;
				me.widget.update();
			}

			var afterRenderHandler = function() {
				if(me.disable === true || me.changed !== true) return ;
				me.changed = false;
				if(me.keepHidden !== true)
					me.widget.update();
			}
			this.editor.on('cursorActivity', cursorActivityHandler);
			this.editor.on('change', changeHandler);
			this.heather.on('rendered', afterRenderHandler);
			this.afterRenderHandler = afterRenderHandler;
			this.changeHandler = changeHandler;
			this.cursorActivityHandler = cursorActivityHandler;
			this.enable = true;
		}

		PartPreview.prototype.disable = function() {
			if(this.enable !== true) return ;
			if (this.widget) {
				this.widget.remove();
			}
			this.editor.off('cursorActivity', this.cursorActivityHandler);
			this.editor.off('change', this.changeHandler);
			this.heather.off('rendered', this.afterRenderHandler);
		}
		
		PartPreview.prototype.hidden = function(){
			if (this.widget) {
				this.widget.hide();
			}
		}
		
		PartPreview.prototype.rePosition = function(){
			if (this.widget) {
				this.widget.update();
			}
		}
		
		PartPreview.prototype.setKeepHidden = function(keepHidden,stamp){
			if(Util.isUndefined(this.stamp)){
				this.stamp = stamp;
			} else {
				if(this.stamp === stamp){
					this.stamp = undefined;
				} else {
					return ;
				}
			}
			if(keepHidden === true)
				if(this.widget)
					this.widget.hide();
			else if(this.widget)
				this.widget.update();
			this.keepHidden = keepHidden;
		}
		
		var Widget = (function() {
			
			var Widget = function(preview) {
				
				var div = document.createElement('div');
				div.classList.add('markdown-body');
				div.classList.add('heather_part_preview');
				div.style.visibility = 'hidden';
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
				var status = editor.selectionStatus();
				
				var html;
				if(status.selected == ''){
					var nodeStatus = getNodeStatus(this.preview.heather);
					if(nodeStatus == null){
						this.hide();
						return ;
					};
					html = nodeStatus.node.outerHTML;
				} else if(this.preview.config.renderSelected === true){
					html = Util.parseHTML(this.preview.heather.markdownParser.render(status.selected)).body.innerHTML;
				}
				
				if(!html){
					this.hide();
					return ;
				};
					
				var me = this;
				
				var div = this.widget.firstChild.cloneNode(false);
				div.innerHTML = html;
				div = morphdomUpdate(this.widget.firstChild,div);
				if(div === this.widget.firstChild){
					this.show();
					this.scrollContent(nodeStatus);
				}
			}
			
			Widget.prototype.hide = function() {
				this.widget.style.visibility = 'hidden';
			}

			Widget.prototype.show = function() {
				this.updatePosition();
				if(this.keepHidden !== true)
					this.widget.style.visibility = 'visible';
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
				var toolbarHeight = this.preview.heather.toolbar.getHeight();
				var top = pos.top - editor.getScrollInfo().top - toolbarHeight;
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
		
		function MarkdownParser(config){
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
			md.use(window.markdownitTaskLists);
			md.use(window.markdownitKatex);
			addLineNumberAttribute(md);
			this.md = md;
		}
		
		MarkdownParser.prototype.render = function(markdown){
			return this.md.render(markdown);
		}
		
		function addLineNumberAttribute(md){
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
                    cursor: undefined,
                    hideOnNextChange: false
                };
				
				tip.addEventListener('click',function(e){
					if(e.target.tagName === 'TD'){
						setLanguage(e.target);
					}
				})

                var setLanguage = function(selected) {
                    var lang = selected.textContent;
                    var cursor = editor.getCursor();
                    var text = editor.getLine(cursor.line);
                    editor.setSelection({
                        line: cursor.line,
                        ch: 4
                    }, {
                        line: cursor.line,
                        ch: text.length
                    });
                    editor.replaceSelection(lang);
					var line = cursor.line+1;
					if(line == editor.lineCount()){
						editor.replaceRange('\n', {
							line: cursor.line,
							ch: 4+lang.length
						});
					}
					editor.focus();
					editor.setCursor({line:line,ch:0})
                    state.hideOnNextChange = true;
                    hideTip();
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
                        }
                    },
                    'Down': function() {
                        var current = tip.querySelector('.selected');
                        var next = current.nextElementSibling;
                        if (next != null) {
                            current.classList.remove('selected');
                            next.classList.add('selected');
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
                    if (editor.getSelection() != '') {
                        hideTip();
                        return;
                    }
                    var cursor = editor.getCursor();
                    if (cursor.ch < 5) {
                        hideTip();
                        return;
                    }
                    if ((state.cursor || {
                            line: -1
                        }).line != cursor.line) {
                        hideTip();
                    }
                }
                this.hideTipOnScroll = function(cm,e) {
                    hideTip();
                }
                this.tipHandler = function(editor) {
                    hideTip();
                    if (editor.getSelection() == '') {
                        var cursor = editor.getCursor();
                        if (cursor.ch >= 5) {
                            if (hljsTimer) {
                                clearTimeout(hljsTimer);
                            }
                            hljsTimer = setTimeout(function() {
                                var text = editor.getLine(cursor.line);
                                if (text.startsWith("``` ")) {
                                    var lang = text.substring(4, cursor.ch).trimStart();
                                    var tips = [];
                                    for (var i = 0; i < hljsLanguages.length; i++) {
                                        var hljsLang = hljsLanguages[i];
                                        if (hljsLang.indexOf(lang) != -1) {
                                            tips.push(hljsLang);
                                        }
                                    }

                                    if (tips.length > 0) {
                                        if (state.hideOnNextChange) {
                                            state.hideOnNextChange = false;
                                            return;
                                        }
                                        state.running = true;
                                        state.cursor = cursor;
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
                                } else {
                                    hideTip();
                                }
                            }, 100)
                        }
                    }
                }
                this.editor = editor;
            }

            HljsTip.prototype.enable = function() {
                this.editor.on('change', this.tipHandler);
                this.editor.on('cursorActivity', this.hideTipOnCursorChange);
                this.editor.on('scroll', this.hideTipOnScroll);
            }

            HljsTip.prototype.disable = function() {
                this.editor.off('change', this.tipHandler);
                this.editor.off('cursorActivity', this.hideTipOnCursorChange);
                this.editor.off('scroll', this.hideTipOnScroll);
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
            var bar = document.createElement("div");
            bar.innerHTML = '<div class="heather_progressbar"><div></div><span style="position:absolute;top:0"></span><i class="fas fa-times middle-icon" style="position: absolute;top: 0;right: 0;"><i></div>'
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
            loadMermaid: loadMermaid
        }
    })();
	
	function removeCommandWidget(heather){
		if(heather.commandWidget){
			heather.commandWidget.remove();
			heather.commandBar.setKeepHidden(false,heather.commandWidgetStamp);
			heather.partPreview.setKeepHidden(false,heather.commandWidgetStamp);
			heather.commandWidget = undefined;
			heather.commandWidgetStamp = undefined;
		}
	}
	
	function addCommandWidget(heather){
		
		removeCommandWidget(heather);
		
		var cm = heather.editor;
		var cursor = cm.getCursor();
		var div = document.createElement('div');
		div.style['z-index'] = "99";
		div.setAttribute('data-widget','');
		cm.addWidget(cursor,div);
		
		div.style['background-color'] = window.getComputedStyle( cm.getWrapperElement() ,null).getPropertyValue('background-color');
		
		function remove(){
			removeCommandWidget(heather);
			cm.off('cursorActivity',remove);
		}
		
		cm.on('cursorActivity',remove);
		heather.commandWidgetStamp = createStamp();
		heather.commandBar.setKeepHidden(true,heather.commandWidgetStamp);
		heather.partPreview.setKeepHidden(true,heather.commandWidgetStamp);
		heather.commandWidget = div;
		return div;
	}
	
	function posCommandWidget(cm,div){
		var pos = cm.cursorCoords(true,'local');
		
		var top = pos.top-cm.getScrollInfo().top;
		var left = parseFloat(div.style.left);
		var code = cm.getWrapperElement().querySelector('.CodeMirror-code');
		if(left + div.clientWidth + 5 > code.clientWidth){
			div.style.left = '';
			div.style.right = '5px';
		}
		
		var distance = cm.defaultTextHeight();
		if(top > distance+div.clientHeight){
			div.style.top = (pos.top -  div.clientHeight)+'px';
		} else {
			div.style.top = (pos.top + distance)+'px';
		}
	}
	
	commands['heading'] = function(heather){
		var div = addCommandWidget(heather);
		
		var innerHTML = '<div class="heather_command_heading"><select class="heather_command_heading_select">';
		for(var i=1;i<=6;i++){
			innerHTML += '<option value="'+i+'">H'+i+'</option>';
		}
		innerHTML += '</select>';
		if(Util.mobile){
			innerHTML += '<button class="heather_command_heading_button">取消</button>';
			innerHTML += '<button class="heather_command_heading_button">确定</button>';
		}
		innerHTML += '</div>';
		div.innerHTML = innerHTML;	
			
		function doHeading(){
			var value = div.querySelector('select').value;
			if(value != ''){
				var cm = heather.editor;
				var v = parseInt(value);
				var status = cm.selectionStatus();
				selectionBreak(status, function(text) {
					var prefix = '';
					for (var i = 0; i < v; i++) {
						prefix += '#';
					}
					prefix += ' ';
					return prefix + text;
				});
				if (status.selected == '') {
					cm.replaceRange(status.text, cm.getCursor());
					cm.focus();
					cm.setCursor({
						line: status.startLine,
						ch: v + 1
					});
				} else {
					cm.replaceSelection(status.text);
				}
			}
		}
		var select = div.querySelector('select');
		select.addEventListener('keydown',function(e){
			if(e.key == 'Enter'){
				e.preventDefault();
				e.stopPropagation();
				doHeading();
			}
			if(e.key == 'Escape'){
				e.preventDefault();
				e.stopPropagation();
				div.remove();
				heather.editor.focus();
			}
		});
		
		if(Util.mobile){
			var buttons = div.querySelectorAll('button');
			buttons[0].addEventListener('click',function(){
				div.remove();
				heather.editor.focus();
			});
			buttons[1].addEventListener('click',function(){
				doHeading();
			});
		}
		
		
		select.size = 6;
		select.focus();
		
		posCommandWidget(heather.editor,div);
	}
	
	commands['commands'] = function(heather){
		var div = addCommandWidget(heather);
		
		var innerHTML = '<div class="heather_command_commands"><select class="heather_command_commands_select">';
		innerHTML += '<option value="heading">标题</option>';
		innerHTML += '<option value="table">表格</option>';
		innerHTML += '<option value="codeBlock">代码块</option>';
		innerHTML += '<option value="check">任务列表</option>';
		innerHTML += '<option value="quote">引用</option>';
		innerHTML += '<option value="mathBlock">数学公式块</option>';
		innerHTML += '<option value="mermaid">mermaid图表</option>';
		innerHTML += '</select>';
		if(Util.mobile){
			innerHTML += '<button class="heather_command_commands_button">取消</button>';
			innerHTML += '<button class="heather_command_commands_button">确定</button>';
		}
		innerHTML += '</div>';
		div.innerHTML = innerHTML;
		function execCommand(){
			div.remove();
			var value = div.querySelector('select').value;
			heather.execCommand(value);
		}
		div.querySelector('select').addEventListener('keydown',function(e){
			if(e.key == 'Enter'){
				e.preventDefault();
				e.stopPropagation();
				execCommand();
			}
			if(e.key == 'Escape'){
				e.preventDefault();
				e.stopPropagation();
				div.remove();
				heather.editor.focus();
			}
		});
		if(Util.mobile){
			var buttons = div.querySelectorAll('button');
			buttons[0].addEventListener('click',function(){
				div.remove();
				heather.editor.focus();
			});
			buttons[1].addEventListener('click',function(){
				execCommand();
			});
		}
		var select = div.querySelector('select');
		select.size = 7;
		select.focus();
		posCommandWidget(heather.editor,div);
	}
	
	commands['table'] = function(heather){
		var div = addCommandWidget(heather);
		var innerHTML = '<div class="heather_command_table">行：<input type="number" value="" style="width:80px">&nbsp;';
		innerHTML += '列：<input type="number" value="" style="width:80px">&nbsp;';
		innerHTML += '<button class="heather_command_table_button">确定</button></div>';
		div.innerHTML = innerHTML;
		
		var inputs = div.querySelectorAll('input');
		for(const input of inputs){
			input.addEventListener('keydown',function(e){
				if(e.key == 'Escape'){
					e.preventDefault();
					e.stopPropagation();
					div.remove();
					heather.editor.focus();
				}
			});	
		}
		div.querySelector('button').addEventListener('click',function(){
			var cm = heather.editor;
			var inputs = div.querySelectorAll('input');
			var rows;
			try{
				rows = parseInt(inputs[0].value);
			}catch(e){rows = 3}
			if(!rows || isNaN(rows)){
				rows = 3;
			}
			var cols;
			try{
				cols = parseInt(inputs[1].value);
			}catch(e){cols = 3}
			if(!cols || isNaN(cols)){
				cols = 3;
			}
			if (rows < 1)
				rows = 3;
			if (cols < 1)
				cols = 3;
			var text = '';
			for (var i = 0; i < cols; i++) {
				text += '|    ';
			}
			text += '|'
			text += "\n";
			for (var i = 0; i < cols; i++) {
				text += '|  --  ';
			}
			text += '|'
			if (rows > 1) {
				text += '\n';
				for (var i = 0; i < rows - 1; i++) {
					for (var j = 0; j < cols; j++) {
						text += '|    ';
					}
					text += '|'
					if (i < rows - 2)
						text += "\n";
				}
			}
			var cursor = cm.getCursor();
			var status = cm.selectionStatus();
			selectionBreak(status, function(selected) {
				return text;
			});
			cm.replaceSelection(status.text);
			var lineStr = cm.getLine(status.startLine);
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
				cm.setCursor({line : status.startLine,ch:ch});
			}	
		})
		div.querySelector('input').focus();
		posCommandWidget(heather.editor,div);
	}
	
	commands['uncheck'] = function(heather){
		var cm = heather.editor;
		insertTaskList(cm, false);
	}
	
	commands['check'] = function(heather){
		var cm = heather.editor;
		insertTaskList(cm, true);
	}
	
	commands['code'] = function(heather){
		var cm = heather.editor;
		var text = cm.getSelection();
		if (text == '') {
			cm.replaceRange("``", cm.getCursor());
			cm.focus();
			var start_cursor = cm.getCursor();
			var cursorLine = start_cursor.line;
			var cursorCh = start_cursor.ch;
			cm.setCursor({
				line: cursorLine,
				ch: cursorCh - 1
			});
		} else {
			cm.replaceSelection("`" + text + "`");
		}
	}
	
	commands['codeBlock'] = function(heather){
		var cm = heather.editor;
		var status = cm.selectionStatus();
		selectionBreak(status, function(text) {
			var newText = "``` ";
			newText += '\n';
			newText += text;
			newText += '\n'
			newText += "```";
			return newText;
		});
		cm.focus();
		cm.replaceSelection(status.text);
		cm.setCursor({
			line: status.startLine + 1,
			ch: 0
		});	
	}
	
	commands['link'] = function(heather){
		var cm = heather.editor;
		var text = cm.getSelection();
		if (text == '') {
			cm.replaceRange("[](https://)", cm.getCursor());
			cm.focus();
			var start_cursor = cm.getCursor();
			var cursorLine = start_cursor.line;
			var cursorCh = start_cursor.ch;
			cm.setCursor({
				line: cursorLine,
				ch: cursorCh - 11
			});
		} else {
			cm.replaceSelection("[" + text + "](https://)");
		}
	}
	
	commands['strikethrough'] = function(heather){
		var cm = heather.editor;
		var text = cm.getSelection();
		if (text == '') {
			cm.replaceRange("~~~~", cm.getCursor());
			cm.focus();
			var str = "~~";
			var mynum = str.length;
			var start_cursor = cm.getCursor();
			var cursorLine = start_cursor.line;
			var cursorCh = start_cursor.ch;
			cm.setCursor({
				line: cursorLine,
				ch: cursorCh - mynum
			});
		} else {
			cm.replaceSelection("~~" + text + "~~");
		}
	}
	
	commands['mermaid'] = function(heather){
		var cm = heather.editor;
		var status = cm.selectionStatus();
		selectionBreak(status, function(text) {
			var newText = "``` mermaid";
			newText += '\n';
			newText += text;
			newText += '\n'
			newText += "```";
			return newText;
		});
		cm.focus();
		cm.replaceSelection(status.text);
		cm.setCursor({
			line: status.startLine + 1,
			ch: 0
		});
	}
	
	commands['mathBlock'] = function(heather){
		var cm = heather.editor;
		var status = cm.selectionStatus();
		selectionBreak(status, function(text) {
			return '$$\n' + text+"\n$$";
		});
		if (status.selected == '') {
			cm.replaceRange(status.text, cm.getCursor());
			cm.focus();
			cm.setCursor({
				line: status.startLine+1,
				ch: 0
			});
		} else {
			cm.replaceSelection(status.text);
		}
	}
	
	commands['quote'] = function(heather){
		var cm = heather.editor;
		var status = cm.selectionStatus();
		selectionBreak(status, function(text) {
			var lines = [];
			for(const line of text.split('\n')){
				lines.push("> "+line);
			}
			return lines.join('\n');
		});
		if (status.selected == '') {
			cm.replaceRange(status.text, cm.getCursor());
			cm.focus();
			cm.setCursor({
				line: status.startLine,
				ch: 2
			});
		} else {
			cm.replaceSelection(status.text);
		}
	}
	
	commands['bold'] = function(heather){
		var cm = heather.editor;
		var text = cm.getSelection();
		if (text == '') {
			cm.replaceRange("****", cm.getCursor());
			cm.focus();
			var str = "**";
			var mynum = str.length;
			var start_cursor = cm.getCursor();
			var cursorLine = start_cursor.line;
			var cursorCh = start_cursor.ch;
			cm.setCursor({
				line: cursorLine,
				ch: cursorCh - mynum
			});
		} else {
			cm.replaceSelection("**" + text + "**");
		}
	}
	
	commands['italic'] = function(heather){
		var cm = heather.editor;
		var text = cm.getSelection();
		if (text == '') {
			cm.replaceRange("**", cm.getCursor());
			cm.focus();
			var str = "*";
			var mynum = str.length;
			var start_cursor = cm.getCursor();
			var cursorLine = start_cursor.line;
			var cursorCh = start_cursor.ch;
			cm.setCursor({
				line: cursorLine,
				ch: cursorCh - mynum
			});
		} else {
			cm.replaceSelection("*" + text + "*");
		}
	}
	
	CodeMirror.prototype.selectionStatus = function() {
        var status = {
            selected: '',
            startLine: -1,
            startCh: -1,
            endLine: -1,
            endCh: -1,
            prev: '',
            next: '',
            prevLine: '',
            nextLine: ''
        }
        var startCursor = this.getCursor(true);
        var endCursor = this.getCursor(false);

        status.startLine = startCursor.line;
        status.endLine = endCursor.line;
        status.startCh = startCursor.ch;
        status.endCh = endCursor.ch;
        status.prevLine = startCursor.line == 0 ? '' : this.getLine(startCursor.line - 1);
        status.nextLine = endCursor.line == this.lineCount() - 1 ? '' : this.getLine(endCursor.line + 1);

        var startLine = this.getLine(status.startLine);
        var text = this.getSelection();
        if (text == '') {
            if (startCursor.ch == 0) {
                status.next = startLine;
            } else {
                status.prev = startLine.substring(0, startCursor.ch);
                status.next = startLine.substring(startCursor.ch, startLine.length);
            }
        } else {

            var endLine = this.getLine(status.endLine);
            if (status.startCh == 0) {
                status.prev = '';
            } else {
                status.prev = startLine.substring(0, status.startCh);
            }
            if (status.endCh == endLine.length) {
                status.next = '';
            } else {
                status.next = endLine.substring(status.endCh, endLine.length);
            }
        }
        status.selected = text;
        return status;
    }
	
	
	function insertTaskList(editor, checked) {
        var status = editor.selectionStatus();
        var text = '';
        if (status.prev != '') {
            if (status.next == '') {
                if (!status.prev.startsWith("- [ ] ") && !status.prev.startsWith("- [x] ")) {
                    text += '\n\n';
                } else {
                    text += '\n';
                }
            } else {
                text += '\n\n';
            }
        } else {
            if (status.prevLine != '' && !status.prevLine.startsWith("- [ ] ") && !status.prevLine.startsWith("- [x] ")) {
                text += '\n';
            }
        }
        var prefix = checked ? '- [x]  ' : '- [ ]  ';
		
		var lines = [];
		for(const line of status.selected.split('\n')){
			lines.push(prefix + line);
		}
		text += lines.join('\n');
		
        if (status.next != '') {
            if (status.prev == '') {
                if (!status.next.startsWith("- [ ] ") && !status.next.startsWith("- [x] ")) {
                    text += '\n\n';
                } else {
                    text += '\n';
                }
            } else {
                text += '\n\n';
            }
        } else {
            if (status.nextLine != '' && !status.nextLine.startsWith("- [ ] ") && !status.nextLine.startsWith("- [x] ")) {
                text += '\n';
            }
        }
		var line = editor.getCursor(true).line;
		var ch = 0;
		for(const lineStr of text.split('\n')){
			if(lineStr == ''){
				line ++ ;
			} else {
				ch = lineStr.length;
				break;
			}
		}
        editor.replaceSelection(text);
		editor.focus();
		editor.setCursor({line:line,ch:ch});
    }
	
	function selectionBreak(status, callback) {
        var _text = '';
        if (status.prev != '') {
            _text += '\n\n';
            status.startLine += 2;
        } else {
            if (status.prevLine != '') {
                _text += '\n';
                status.startLine += 1;
            }
        }
        if (callback) {
            _text += callback(status.selected);
        }
        if (status.next != '') {
            _text += '\n\n';
            status.endLine += 2;
        } else {
            if (status.nextLine != '') {
                _text += '\n';
                status.endLine += 1;
            }
        }
        status.text = _text;
        return status;
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
		if(heather.rendered !== true) return ;
		var cm = heather.editor;
		var cursor = cm.coordsChar({left:x, top:y}, 'window');
		var nodes = heather.getNodesByLine(cursor.line);
		if(nodes.length == 0) return ;
		var node = nodes[nodes.length - 1];
		if(node.classList.contains('task-list-item')){
			var lineStr = cm.getLine(cursor.line);
			if(lineStr.substring(0,cursor.ch).replaceAll(' ','') == '-['){
				//need change 
				var checkbox = node.firstChild;
				if(checkbox != null && checkbox.type == 'checkbox'){
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
	
	function tab(heather){
		var editor = heather.editor;
		if(!editor.somethingSelected() && heather.rendered === true){
			var cursor = editor.getCursor();
			var line = cursor.line;
			var nodes = heather.getNodesByLine(line);
			var mappingElem;
			if(nodes.length > 0)
				mappingElem = nodes[0];
			if(mappingElem){
				if(mappingElem.tagName === 'TABLE'){
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
		}
		return false;
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
						//更新属性
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
	
	function createStamp(){
		return Date.now() + Math.random();
	}
	
	return {
		create : function(textarea,config){
			return new Editor(textarea,config);
		},
		commands : commands,
		lazyRes : lazyRes,
		Util : Util
	};
})();