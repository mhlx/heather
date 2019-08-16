var EditorWrapper = (function() {

    'use strict';
    CodeMirror.prototype.renderAllDoc = function(scrollToTop) {
        var editor = this;
        editor.setOption('readOnly', true);
        var viewport = editor.getViewport();
        var lastLine = editor.lineCount() - 1;
        while (viewport.to < lastLine && viewport.to > 0) {
            editor.scrollIntoView({
                line: viewport.to
            });
            viewport = editor.getViewport();
        }

        editor.scrollIntoView({
            line: lastLine
        });
        editor.scrollIntoView({
            top: scrollToTop
        });
        editor.setOption('readOnly', false);
    }
	
	CodeMirror.prototype.unfocus = function(){
		this.getInputField().blur();
	}
	
	CodeMirror.prototype.selectionStatus = function(){
		//selectionStatus
		var status = {
			selected : '',
			startLine : -1,
			startCh : -1,
			endLine : -1,
			endCh : -1,
			prev : '',
			next : '',
			prevLine : '',
			nextLine : ''
		}
		var startCursor = this.getCursor(true);
		var endCursor = this.getCursor(false);
		
		status.startLine = startCursor.line;
		status.endLine = endCursor.line;
		status.startCh = startCursor.ch;
		status.endCh = endCursor.ch;
		status.prevLine = startCursor.line == 0 ? '' :  this.getLine(startCursor.line-1);
		status.nextLine = endCursor.line == this.lineCount() - 1 ? '' : this.getLine(endCursor.line+1);
		
		var startLine = this.getLine(status.startLine);
		var text = this.getSelection();
		if(text == ''){
			if(startCursor.ch == 0){
				status.next = startLine;
			} else {
				status.prev = startLine.substring(0,startCursor.ch);
				status.next = startLine.substring(startCursor.ch,startLine.length);
			}
		} else {
			
			var endLine = this.getLine(status.endLine);
			if(status.startCh == 0){
				status.prev = '';
			} else {
				status.prev = startLine.substring(0,status.startCh);
			}
			if(status.endCh == endLine.length){
				status.next = '';
			} else {
				status.next = endLine.substring(status.endCh,endLine.length);
			}
		}
		status.selected = text;
		return status;
	}
	
	CodeMirror.prototype.getLines = function(line,endLine){
		var str = '';
		for(var i=line;i<endLine;i++){
			str += this.getLine(i);
			
			if(i < endLine - 1){
				str += '\n';
			}
		}
		return str;
	}

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
	
	var keyNames = CodeMirror.keyNames;
	var mac = CodeMirror.browser.mac;
	var mobile = CodeMirror.browser.mobile;
    var ios = CodeMirror.browser.ios;
	
	var turndownService = new window.TurndownService({
		'headingStyle': 'atx',
		'codeBlockStyle': 'fenced',
		'emDelimiter': '*',
		'bulletListMarker':'-',
		defaultReplacement: function(innerHTML, node) {
			return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML
		}
	});
	turndownService.use(window.turndownPluginGfm.gfm);

    var plainPasteHandler = function(e){
		var text = (e.originalEvent || e).clipboardData.getData('text/plain');
		document.execCommand('insertText',false,text);
		return false;
	}
    function cloneAttributes(element, sourceNode) {
        let attr;
        let attributes = Array.prototype.slice.call(sourceNode.attributes);
        while (attr = attributes.pop()) {
            element.setAttribute(attr.nodeName, attr.nodeValue);
        }
    }

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    var isUndefined = function(o) {
        return (typeof o == 'undefined')
    }

    function getDefault(o, dft) {
        return isUndefined(o) ? dft : o;
    }
	
	function parseHTML(html){
		return new DOMParser().parseFromString(html, "text/html");
	}
	
	var FileUpload = (function(){
		
		function FileUpload(file,wrapper){
			var config = wrapper.config;
			this.uploadUrl = config.upload_url;
			this.fileName = config.upload_fileName || 'file';
			this.beforeUpload = config.upload_before;
			this.file = file;
			this.fileUploadFinish = config.upload_finish;
			this.wrapper = wrapper;
		}
		
		FileUpload.prototype.start = function(){
			var me = this;
			var editor = this.wrapper.editor;
			var formData = new FormData();
			formData.append(this.fileName, this.file);
			if(this.beforeUpload){
				this.beforeUpload(formData,this.file);
			}
			var xhr = new XMLHttpRequest();
			var bar = document.createElement("div");
			bar.innerHTML = '<div class="heather_progressbar"><div></div><span style="position:absolute;top:0"></span><i class="fas fa-times middle-icon" style="position: absolute;top: 0;right: 0;"><i></div>'
			bar.querySelector('i').addEventListener('click',function(){
				xhr.abort();
			});
			var widget = editor.addLineWidget(editor.getCursor().line, bar, {coverGutter: false, noHScroll: true})
			xhr.upload.addEventListener("progress", function(e){
				if (e.lengthComputable) {
					var percentComplete = parseInt(e.loaded*100 / e.total)+"";
					var pb = bar.querySelector('.heather_progressbar').firstChild;
					$(pb).css({"width":percentComplete+"%"})
					bar.querySelector('.heather_progressbar').querySelector('span').textContent = percentComplete+"%";
				} 
			}, false);
			xhr.addEventListener('readystatechange', function(e) {
			  if(this.readyState === 4 ) {
				  editor.removeLineWidget(widget);
				  if (xhr.status !== 0) {
					  var info = me.fileUploadFinish(xhr.response);
					  if(info){
						  var type = (info.type || 'image').toLowerCase();
						  switch(type){
							case 'image':
								editor.focus();
								editor.replaceRange('![]('+info.url+')', me.cursor);
								editor.setCursor({line:me.cursor.line,ch:me.cursor.ch+2})
								break;
							case 'file':
								editor.focus();
								editor.replaceRange('[]('+info.url+')', me.cursor);
								editor.setCursor({line:me.cursor.line,ch:me.cursor.ch+1})
								break;
							case 'video':
								var video = document.createElement('video');
								video.setAttribute('controls','');
								if(info.poster){
									video.setAttribute('poster',info.poster);
								}
								var sources = info.sources || [];
								if(sources.length > 0){
									for(var i=0;i<sources.length;i++){
										var source = sources[i];
										var ele = document.createElement('source');
										ele.setAttribute('src',source.src);
										ele.setAttribute('type',source.type);
										video.appendChild(ele);
									}
								} else {
									video.setAttribute('src',info.url);
								}
								editor.replaceRange(video.outerHTML, me.cursor);
								break;
						  }
						  
					  }
				  }
			  }
			});
			xhr.open("POST", this.uploadUrl);
			xhr.send(formData);
			var cursor = editor.getCursor(true);
			this.cursor = cursor;
		}
			
		return {create:function(file,wrapper){
			return new FileUpload(file,wrapper);
		}}
	})();

    var Render = (function() {

        function MarkdownRender(config, theme) {
            var plugins = config.render_plugins || ['footnote', 'katex', 'mermaid', 'anchor', 'task-lists', 'sup', 'sub', 'abbr'];
            var hasMermaid = $.inArray('mermaid', plugins) != -1;
            this.md = createMarkdownParser({
                html: config.render_allowHtml !== false,
                plugins: plugins,
                lineNumber: true,
                highlight: function(str, lang) {
                    if (hasMermaid && lang == 'mermaid') {
                        return '<div class="mermaid-block"><div class="mermaid">' + str + '</div><div class="mermaid-source" style="display:none">' + str + '</div></div>';
                    }
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return '<pre class="hljs"><code>' +
                                hljs.highlight(lang, str, true).value +
                                '</code></pre>';
                        } catch (__) {}
                    }
                }
            });
            var md2 = createMarkdownParser({
                html: config.render_allowHtml !== false,
                plugins: plugins,
                lineNumber: false,
                highlight: function(str, lang) {
                    if (hasMermaid && lang == 'mermaid') {
                        return '<div class="mermaid">' + str + '</div>';
                    }
                }
            });
			this.md2 = md2;
            this.config = config;
            this.theme = theme;
			this.hasMermaid = hasMermaid;
			this.hasKatex = $.inArray('katex', plugins) != -1;
        }

        var mermaidLoading = false;

        function loadMermaid(theme, config) {
            if (mermaidLoading) return;
            mermaidLoading = true;
            $('<script>').appendTo('body').attr({
                src: config.res_mermaid_js || 'js/mermaid.min.js'
            });
            var t = setInterval(function() {
                try {
                    mermaid.initialize({
                        theme: theme.mermaid.theme || 'default'
                    });
                    clearInterval(t);
					
					$("#heather_out").find('.mermaid').each(function(){
						if(this.getAttribute("data-processed") == null){
							try{
								mermaid.parse(this.textContent);
								mermaid.init({}, $(this));
							}catch(e){
								this.innerHTML = '<pre>'+e.str+'</pre>'
							}
						}
					});
                } catch (__) {}
            }, 20)
        }

        var katexLoading = false;

        function loadKatex(config) {
            if (katexLoading) return;
            katexLoading = true;
            $('<link>').appendTo('head').attr({
                type: 'text/css',
                rel: 'stylesheet',
                href: config.res_katex_css || 'katex/katex.min.css'
            });
            $('<script>').appendTo('body').attr({
                src: config.res_katex_js || 'katex/katex.min.js'
            });
            var t = setInterval(function() {
                try {
                    var html = katex.renderToString("", {
                        throwOnError: false
                    })
                    clearInterval(t);
                    var katexs = document.getElementById("heather_out").querySelectorAll(".katex");
                    for (var i = 0; i < katexs.length; i++) {
                        var block = katexs[i];
						var displayMode = block.tagName != 'SPAN';
                        try {
                            block.innerHTML = katex.renderToString(block.textContent, {
                                throwOnError: false,
                                displayMode: displayMode
                            });
                        } catch (e) {
                            console.log(e);
                        }
                    }
                } catch (__) {

                }
            }, 20)
        }

        MarkdownRender.prototype.getHtml = function(markdownText) {
            return this.md2.render(markdownText);
        }

        MarkdownRender.prototype.renderAt = function(markdownText, element, patch) {
            var doc = parseHTML(this.md.render(markdownText));
            var hasMermaid = doc.querySelector('.mermaid') != null && this.hasMermaid !== false;
            if (hasMermaid) {
                loadMermaid(this.theme, this.config);
            }
            var hasKatex = doc.querySelector(".katex") != null && this.hasKatex !== false;
            if (hasKatex) {
                loadKatex(this.config)
            }
            if (this.config.render_beforeRender) {
                this.config.render_beforeRender(doc);
            }
            var innerHTML = doc.body.innerHTML;
            if (patch) {
                var div = document.createElement('div');
                cloneAttributes(div, element)
                div.innerHTML = innerHTML;
                morphdom(element, div, {
                    onBeforeElUpdated: function(f, t) {
                        if (f.isEqualNode(t)) {
                            return false;
                        }
                        if (f.classList.contains('mermaid-block') &&
                            t.classList.contains('mermaid-block')) {
                            var oldEle = f.getElementsByClassName('mermaid-source')[0];
                            var nowEle = t.getElementsByClassName('mermaid-source')[0];
							if(isUndefined(oldEle) || isUndefined(nowEle)){
								return true;
							}
							var old = oldEle.textContent;
							var now = nowEle.textContent;
                            if (old == now) {
                                //更新属性
                                cloneAttributes(f, t);
                                return false;
                            }
                        }
                        return true;
                    }
                });
            } else {
                element.innerHTML = innerHTML;
            }
		
			$("#heather_out").find('.mermaid').each(function(){
				if(this.getAttribute("data-processed") == null){
					try{
						mermaid.parse(this.textContent);
						mermaid.init({}, $(this));
					}catch(e){
						if(window.mermaid)
							this.innerHTML = '<pre>'+e.str+'</pre>'
					}
				}
			});
        }

        return {
            create: function(config, theme) {
                return new MarkdownRender(config, theme)
            }
        }
    })();


    var Bar = (function() {

        function Bar(element, config) {
            this.element = $(element);
            this.keepHidden = false;
        }

		Bar.prototype.remove = function() {
            this.element.remove();
        }

        Bar.prototype.hide = function() {
            this.element.css({
                "visibility": "hidden"
            });
            this.hidden = true;
        }

        Bar.prototype.height = function() {
            return this.element.height();
        }
		
		Bar.prototype.width = function() {
            return this.element.width();
        }

        Bar.prototype.show = function() {
            if (this.keepHidden) {
                return;
            }
            this.element.css({
                "visibility": "visible"
            });
            this.hidden = false;
        }


        Bar.prototype.addItem = function(item) {
            insertItem(this, item, this.items.length);
        }

        function createElement(icon, handler) {
            var i = document.createElement('i');
            i.setAttribute('class', icon);
            i.setAttribute('style', 'cursor: pointer;margin-right:20px');
			if(handler){
				i.addEventListener('click', function() {
					handler(i);
				})
			}
            return i;
        }


        Bar.prototype.getSize = function() {
            return this.element.find('i').length;
        }


        Bar.prototype.insertIcon = function(clazz, handler, index, callback) {
            var newIcon = createElement(clazz, handler);
            if (callback) callback(newIcon);
            var toolbar = this.element[0];
            if (index >= this.getSize()) {
                toolbar.appendChild(newIcon);
            } else {
                if (index <= 0) {
                    toolbar.insertBefore(newIcon, toolbar.childNodes[0])
                } else {
                    toolbar.insertBefore(newIcon, toolbar.childNodes[index])
                }
            }
        }
		
		Bar.prototype.insertElement = function(element, index) {
            var toolbar = this.element[0];
            if (index >= this.getSize()) {
                toolbar.appendChild(element);
            } else {
                if (index <= 0) {
                    toolbar.insertBefore(element, toolbar.childNodes[0])
                } else {
                    toolbar.insertBefore(element, toolbar.childNodes[index])
                }
            }
        }

        Bar.prototype.addIcon = function(clazz, handler, callback) {
            this.insertIcon(clazz, handler, this.getSize(), callback);
        }
		
		Bar.prototype.addElement = function(element) {
            this.insertElement(element, this.getSize());
        }

        Bar.prototype.removeIcon = function(deleteChecker) {
            var icons = this.element[0].querySelectorAll("i");
            for (var i = icons.length - 1; i >= 0; i--) {
                var icon = icons[i];
                if (deleteChecker(icon)) {
                    this.element[0].removeChild(icon);
                }
            }
        }

        return {
            create: function(element) {
                return new Bar(element);
            }
        };
    })();


    var Sync = (function(editor) {


        function Sync(editor, scrollElement, config) {
            this.editor = editor;
            this.scrollElement = scrollElement;
            this.config = config;
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
                lines.push(parseInt(ele.getAttribute('data-line')));
            });
            var currentPosition = editor.getScrollInfo().top
            let lastMarker
            let nextMarker
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const height = editor.heightAtLine(line, 'local')
                if (height < currentPosition) {
                    lastMarker = line
                } else {
                    nextMarker = line
                    break
                }
            }
            if (!isUndefined(lastMarker) && isUndefined(nextMarker)) {
                nextMarker = parseInt(lineMarkers[lineMarkers.length - 1].getAttribute('data-end-line'));
            }
            let percentage = 0
            if (!isUndefined(lastMarker) && !isUndefined(nextMarker) && lastMarker !== nextMarker) {
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
            let lastPosition = 0
            var o = $(this.scrollElement);
            let nextPosition = o.outerHeight();
            var last;
            if (!isUndefined(editorScroll.lastMarker)) {
                last = getElementByLine(this.scrollElement, editorScroll.lastMarker);
                if (!isUndefined(last)) {
                    lastPosition = last.offsetTop - 10
                }
            }
            var next;
            if (!isUndefined(editorScroll.nextMarker)) {
                next = getElementByLine(this.scrollElement, editorScroll.nextMarker) || getElementByEndLine(this.scrollElement, editorScroll.nextMarker)
                if (!isUndefined(next)) {
                    nextPosition = next.offsetTop - 10
                }
            }
            var pos = nextPosition - lastPosition;
            if (!isUndefined(last) && !isUndefined(next) && last === next) {
                pos = last.clientHeight;
            }
            var ms = this.config.sync_animateMs || 0;
            const scrollTop = lastPosition + pos * editorScroll.percentage;
            o.stop(true);
            o.animate({
                scrollTop: scrollTop
            }, ms);
        }

        return {
            create: function(editor, scrollElement, config) {
                return new Sync(editor, scrollElement, config);
            }
        }
    })();
	
	
	var Tooltip = (function(){
		
		var HljsTip = (function(){
				
			function HljsTip(editor){
				$('<div id="heather_hljs_tip" style="visibility:hidden;position:absolute;z-index:99;overflow:auto;background-color:#fff"></div>').appendTo($("#heather_in"));				
				var state = {running:false,cursor:undefined,hideOnNextChange:false};
				var tip = $("#heather_hljs_tip");
				
				tip.on('click','tr',function(){
					setLanguage($(this));
				})
				
				var setLanguage = function(selected){
					var lang = selected.text();
					var cursor = editor.getCursor();
					var text = editor.getLine(cursor.line);
					editor.setSelection({line:cursor.line,ch:4},{line:cursor.line,ch:text.length});
					editor.replaceSelection(lang);
					hideTip();
					state.hideOnNextChange = true;
				}
				
				var hideTip = function(){
					tip.css({'visibility':'hidden'});
					if(!mobile){
						editor.removeKeyMap(languageSelectKeyMap);
					}
					state.running = false;
					state.cursor = undefined;
				}
				
				var languageSelectKeyMap = {
					'Up':function(){
						var current = tip.find('.selected');
						var prev = current.prev('tr');
						if(prev.length > 0){
							current.removeClass('selected');
							prev.addClass('selected');
							prev[0].scrollIntoView();
						}
					},
					'Down':function(){
						var current = tip.find('.selected');
						var next = current.next('tr');
						if(next.length > 0){
							current.removeClass('selected');
							next.addClass('selected');
							next[0].scrollIntoView();
						}
					},
					'Enter':function(editor){
						setLanguage(tip.find('.selected'));
					},
					'Esc':function(editor){
						hideTip();
					}
				}
				var hljsTimer ;
				var hljsLanguages = hljs.listLanguages();
				this.hideTipOnCursorChange = function(editor){
					if(editor.getSelection() != ''){
						hideTip();
						return ;
					}
					var cursor = editor.getCursor();
					if(cursor.ch < 5){
						hideTip();
						return ;
					}
					if((state.cursor || {line:-1}).line != cursor.line){
						hideTip();
					}
				}
				this.hideTipOnScroll = function(){
					hideTip();
				}
				this.tipHandler = function(editor){
					if(editor.getSelection() == ''){
						var cursor = editor.getCursor();
						///``` j
						if(cursor.ch >= 5){
							if(hljsTimer){
								clearTimeout(hljsTimer);
							}
							hljsTimer = setTimeout(function(){
								var text = editor.getLine(cursor.line);
								if(text.startsWith("``` ")){
									var lang = text.substring(4,cursor.ch).trimStart();
									var tips = [];
									for(var i=0;i<hljsLanguages.length;i++){
										var hljsLang = hljsLanguages[i];
										if(hljsLang.indexOf(lang) != -1){
											tips.push(hljsLang);
										}
									}
									
									if(tips.length > 0){
										if(state.hideOnNextChange){
											state.hideOnNextChange = false;
											return ;
										}
										state.running = true;
										state.cursor = cursor;
										var html = '<table style="width:100%">';
										for(var i=0;i<tips.length;i++){
											var clazz = i == 0 ? 'selected' : '';
											html += '<tr class="'+clazz+'"><td >'+tips[i]+'</td></tr>';
										}
										html += '</table>';
										var pos = editor.cursorCoords(true);
										tip.html(html);
										var height = tip.height();
										if($("#heather_in").height() - pos.top < height+editor.defaultTextHeight()){
											tip.css({'top':pos.top - height,'left':pos.left,'visibility':'visible'});
										} else {
											tip.css({'top':pos.top+editor.defaultTextHeight(),'left':pos.left,'visibility':'visible'})
										}
										if(!mobile){
											editor.addKeyMap(languageSelectKeyMap);
										}
									} else{
										hideTip();
									}
								} else {
										hideTip();
								}
							},100)
						}
					} else {
						hideTip();
					}
				}
				this.editor = editor;
			}
			
			HljsTip.prototype.enable = function(){
				this.editor.on('change',this.tipHandler);
				this.editor.on('cursorActivity',this.hideTipOnCursorChange);
				this.editor.on('scroll',this.hideTipOnScroll);
				this.editor.on('touchmove',this.hideTipOnScroll);
			}
			
			HljsTip.prototype.disable = function(){
				this.editor.off('change',this.tipHandler);
				this.editor.off('cursorActivity',this.hideTipOnCursorChange);
				this.editor.off('scroll',this.hideTipOnScroll);
				this.editor.off('touchmove',this.hideTipOnScroll);
			}
			
			return {create:function(editor){return new HljsTip(editor)}}
		})();
		
		function Tooltip(editor){
			this.hljsTip = HljsTip.create(editor);
		}
		
		Tooltip.prototype.enable = function(){
			this.hljsTip.enable();
		}
		
		return {create : function(editor){return new Tooltip(editor)}}
		
	})();
	
	
	//TODO
	var Backup = (function() {
		function Backup(wrapper) {
			this.wrapper = wrapper;
			this.key = wrapper.config.backup_key || 'heather-documents';
			var me = this;
			wrapper.editor.on('change', function() {
				if (me.autoSaveTimer) {
					clearTimeout(me.autoSaveTimer);
				}
				me.autoSaveTimer = setTimeout(function() {
					var value = wrapper.getValue();
					if(value == ''){
						return ;
					}
					if (me.docName) {
						me.addDocument(me.docName, value);
					} else {
						me.addDocument('default', value);
					}
				}, getDefault(wrapper.config.backup_autoSaveMs, 500));
			});
			wrapper.onRemove(function() {
				me.wrapper = null;
				if (me.autoSaveTimer) {
					clearTimeout(me.autoSaveTimer);
				}
			});
			wrapper.eventHandlers.push({
				name: 'load',
				handler: function() {
					setTimeout(function() {
						me.loadLastDocument();
					}, 100)
				}
			});
		}

		Backup.prototype.addDocument = function(title, content) {
			var documents = this.getDocuments();
			deleteDocumentByTitle(documents, title);
			documents.push({
				title: title,
				content: content,
				time: $.now()
			});
			storeDocuments(this.key, documents);
		}

		Backup.prototype.deleteDocument = function(title) {
			var doc = this.getDocument(title);
			if (doc != null && this.docName == doc.title) {
				this.newDocument();
			}
			var documents = this.getDocuments();
			deleteDocumentByTitle(documents, title);
			storeDocuments(this.key, documents);
		}

		Backup.prototype.getDocument = function(title) {
			var documents = this.getDocuments();
			for (var i = documents.length - 1; i >= 0; i--) {
				if (documents[i].title == title) {
					return documents[i];
				}
			}
			return null;
		}

		Backup.prototype.getDocuments = function() {
			var content = localStorage.getItem(this.key);
			if (content == null) {
				return [];
			}
			return $.parseJSON(content);
		}

		Backup.prototype.getLastDocument = function() {
			var documents = this.getDocuments();
			documents.sort(function(a, b) {
				var ta = a.time;
				var tb = b.time;
				return ta > tb ? -1 : ta == tb ? 0 : 1;
			});
			return documents.length > 0 ? documents[0] : null;
		}

		Backup.prototype.loadLastDocument = function() {
			var doc = this.getLastDocument();
			loadDocument(this, doc);
		}

		Backup.prototype.loadDocument = function(title) {
			var doc = this.getDocument(title);
			loadDocument(this, doc);
		}

		function loadDocument(backup, doc) {
			if (doc != null) {
				if (doc.title != 'default')
					backup.docName = doc.title;
				else
					backup.docName = undefined;
				var wrapper = backup.wrapper;
				wrapper.setValue(doc.content);
				//代码高亮的同步预览中，由于codemirror只渲染当前视窗，因此会出现不同步的现象
				//可以调用CodeMirror.renderAllDoc，但是这个方法在大文本中速度很慢，可以选择关闭
				if (wrapper.syncEnable !== false && wrapper.config.renderAllDocEnable !== false) {
					wrapper.editor.renderAllDoc(0);
				}
			}
		}

		Backup.prototype.newDocument = function() {
			this.docName = undefined;
			this.wrapper.setValue("");
		}

		Backup.prototype.backup = function() {
			if (this.docName) {
				this.addDocument(this.docName, this.wrapper.getValue());
				this.deleteDocument('default');
				swal('保存成功');
			} else {
				var me = this;
				async function requestName() {
					const {
						value: name
					} = await Swal.fire({
						title: '标题',
						input: 'text',
						showCancelButton: true
					})
					if (name) {
						me.addDocument(name, me.wrapper.getValue());
						me.docName = name;
						me.deleteDocument('default');
						swal('保存成功');
					}
				}
				requestName();
			}
		}

		function deleteDocumentByTitle(documents, title) {
			for (var i = documents.length - 1; i >= 0; i--) {
				if (documents[i].title == title) {
					documents.splice(i, 1);
					break;
				}
			}
		}

		function storeDocuments(key, documents) {
			var json = JSON.stringify(documents);
			localStorage.setItem(key, json);
		}

		return {
			create: function(key) {
				return new Backup(key);
			}
		}
	})();
	
	 var ThemeHandler = (function() {
		function ThemeHandler(config){
			this.key = config.theme_key || "heather-theme";
			this.store = {
				save : function(key,json){
					localStorage.setItem(key, json);
				},
				get : function(key){
					return localStorage.getItem(key);
				}
			};
			this.config = config;
			this.timer = undefined;
		}
		
		ThemeHandler.prototype.saveTheme = function(theme){
			if (this.timer) {
				clearTimeout(this.timer);
			}
			var handler = this;
			this.timer = setTimeout(function() {
				var json = JSON.stringify(theme);
				handler.store.save(handler.key,json);
			}, 500)
		}
		
		ThemeHandler.prototype.reset = function() {
			var theme = new Theme(this.config);
			this.store.save(this.key,JSON.stringify(theme));
			theme.render();
			return theme;
		}
		
		ThemeHandler.prototype.getTheme = function(){
			var json = this.store.get(this.key);
			if(json == null){
				return new Theme(this.config);
			} else {
				var current = $.parseJSON(json);
				var theme = new Theme(this.config);
				theme.toolbar = current.toolbar || {};
				theme.bar = current.bar || {};
				theme.stat = current.stat || {};
				theme.editor = current.editor || {};
				theme.inCss = current.inCss;
				theme.searchHelper = current.searchHelper || {};
				theme.cursorHelper = current.cursorHelper || {};
				theme.mermaid = current.mermaid || {};
				theme.customCss = current.customCss;
				return theme;
			}
		}
		
		function Theme(config) {
			this.toolbar = {};
			this.bar = {};
			this.stat = {};
			this.editor = {};
			this.inCss = {};
			this.searchHelper = {};
			this.cursorHelper = {};
			this.mermaid = {};
			this.hljs = {
				theme: 'github'
			};
			this.customCss = undefined;
			this.timer = undefined;
			this.config = config;
		}

		Theme.prototype.clone = function() {
			var copy = JSON.parse(JSON.stringify(this));
			var theme = new Theme(this.config);
			theme.toolbar = copy.toolbar || {};
			theme.bar = copy.bar || {};
			theme.stat = copy.stat || {};
			theme.editor = copy.editor  || {};
			theme.inCss = copy.inCss;
			theme.editor = copy.editor || {};
			theme.searchHelper = copy.searchHelper || {};
			theme.cursorHelper = copy.cursorHelper || {};
			theme.mermaid = copy.mermaid || {};
			theme.customCss = copy.customCss;
			return theme;
		}
		
		Theme.prototype.setEditorTheme = function(editor,name,callback){
			this.editor.theme = name;
			var me = this;
			loadEditorTheme(this,function(){
				var div =  document.createElement('div');
				div.classList.add('cm-s-'+name);
				document.body.appendChild(div);
				var bgColor = window.getComputedStyle(div, null).getPropertyValue('background-color');
				document.body.removeChild(div);
				editor.setOption("theme", name);
				me.inCss.background = bgColor;
				if(callback) callback();
			})
		}

		Theme.prototype.render = function() {
			loadEditorTheme(this);
			loadHljsTheme(this);
			var css = "";
			css += "#heather_toolbar{color:" + (this.toolbar.color || 'inherit') + "}\n";
			css += "#heather_innerBar{color:" + (this.bar.color || 'inherit') + "}\n"
			css += "#heather_stat{color:" + (this.stat.color || 'inherit') + "}\n";
			css += "#heather_in{background:" + (this.inCss.background || 'inherit') + "}\n";
			css += "#heather_cursorHelper{color:" + (this.cursorHelper.color || 'inherit') + "}\n";
			var searchHelperColor = (this.searchHelper.color || 'inherit');
			css += "#heather_searchHelper{color:" + searchHelperColor + "}\n#heather_searchHelper .form-control{color:" + searchHelperColor + "}\n#heather_searchHelper .input-group-text{color:" + searchHelperColor + "}\n#heather_searchHelper .form-control::placeholder {color: " + searchHelperColor + ";opacity: 1;}\n#heather_searchHelper .form-control::-ms-input-placeholder {color: " + searchHelperColor + ";}\n#heather_searchHelper .form-control::-ms-input-placeholder {color: " + searchHelperColor + ";}";

			$("#custom_theme").remove();
			if ($.trim(css) != '') {
				$("head").append("<style type='text/css' id='custom_theme'>" + css + "</style>");
			}
			$("#custom_css").remove();
			$("head").append("<style type='text/css' id='custom_css'>" + (this.customCss || '') + "</style>");
		}
		
		
		function loadHljsTheme(theme) {
			if (theme.hljs.theme) {
				var hljsTheme = theme.hljs.theme;
				var hljsThemeFunction = theme.config.res_hljsTheme || function(hljsTheme) {
					return 'highlight/styles/' + hljsTheme + '.css';
				}
				if ($('#hljs-theme-' + hljsTheme + '').length == 0) {
					$('<link id="hljs-theme-' + hljsTheme + '" >').appendTo('head').attr({
						type: 'text/css',
						rel: 'stylesheet',
						href: hljsThemeFunction(hljsTheme)
					})
				}
			}
		}
		
		function loadEditorTheme(theme, callback) {
			if (theme.editor.theme) {
				var editorTheme = theme.editor.theme;
				var editorThemeFunction = theme.config.res_editorTheme || function(editorTheme) {
					return 'codemirror/theme/' + editorTheme + '.css';
				}
				if ($('#codemirror-theme-' + editorTheme + '').length == 0) {
					$('<link id="codemirror-theme-' + editorTheme + '" >').appendTo('head').attr({
						type: 'text/css',
						rel: 'stylesheet',
						onload: function() {
							if (callback) {
								callback(editorTheme)
							}
						},
						href: editorThemeFunction(editorTheme)
					})
				} else {
					if (callback) {
						callback(editorTheme)
					}
				}
			}
		}

		return {
			create: function(config) {
				return new ThemeHandler(config);
			}
		};
	})();
	
	
	var TaskListHelper = (function(){
		
		function TaskListHelper(wrapper){
			$("#heather_out").on('click','.task-list-item',function(e){
				var root = e.target;
				while(!root.classList.contains('contains-task-list')){
					root = root.parentElement;
				}
				
				var li = e.target;
				while(!li.classList.contains('task-list-item')){
					li = li.parentElement;
				}
				
				wrapper.editor.setOption('readOnly',true);
				var line = parseInt(root.getAttribute('data-line'));
				var endLine = parseInt(root.getAttribute('data-end-line'));
				var str = wrapper.editor.getLines(line,endLine);
				
				var body = parseHTML(str).body;
				if(body.querySelector('.contains-task-list') != null){
					wrapper.editor.setOption('readOnly',false);
					return ;
				}
				
				var node = parseHTML(wrapper.render.getHtml(str)).body.firstChild;
				cloneAttributes(node,root);
				if(node.isEqualNode(root)){
					var checkbox = li.querySelector('input[type="checkbox"]');
					if(checkbox.checked){
						checkbox.removeAttribute('checked');
					}else{
						checkbox.setAttribute('checked','checked');
					}
					//html to markdown
					var element = parseHTML(root.outerHTML).body.firstChild;
					var markdown = turndownService.turndown(element.outerHTML);
					wrapper.editor.replaceRange(markdown, {line: line, ch: 0}, {line: endLine-1});
					wrapper.doRender(true);
				}
				
				wrapper.editor.setOption('readOnly',false);
			})
		}
		
		return {create : function(wrapper){
			return new TaskListHelper(wrapper);
		}}
	})();
	
	var ContenteditableBar = (function(){
		function ContenteditableBar(wrapper,element){
			var me = this;
			this.composing = false;
			var bar = document.createElement('div');
			bar.setAttribute('class','heather_contenteditable_bar');
			document.body.appendChild(bar);
			bar = Bar.create(bar);
			var clazz = "heather_status_on";
			bar.addIcon('fas fa-bold middle-icon',undefined,function(ele){
				var event = mobile ? 'touchstart' : 'mousedown';
				ele.addEventListener(event,function(){
					document.execCommand('bold');
					document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				})
				me.boldBtn = ele;
			});
			bar.addIcon('fas fa-italic middle-icon',undefined,function(ele){
				var event = mobile ? 'touchstart' : 'mousedown';
				ele.addEventListener(event,function(){
					document.execCommand('italic');
					document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				})
				me.italicBtn = ele;
			});
			bar.addIcon('fas fa-strikethrough middle-icon',undefined,function(ele){
				var event = mobile ? 'touchstart' : 'mousedown';
				ele.addEventListener(event,function(){
					document.execCommand('strikeThrough');
					document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				})
				me.strikeThroughBtn = ele;
			});
			bar.addIcon('fas fa-code middle-icon',undefined,function(ele){
				var event = mobile ? 'touchstart' : 'mousedown';
				ele.addEventListener(event,function(){
					var selection = window.getSelection().toString();
					if(selection.length > 0){
						document.execCommand("insertHTML",false,'<code>'+selection+'</code>');
					}
				})
			});
			bar.addIcon('fas fa-eraser middle-icon',undefined,function(ele){
				var event = mobile ? 'touchstart' : 'mousedown';
				ele.addEventListener(event,function(){
					var selection = window.getSelection().toString();
					if(selection.length > 0){
						document.execCommand('removeFormat');
					}
				})
			});
			var startHandler = function(e){
				me.composing = true;
			};
			var endHandler = function(e){
				me.composing = false;
			};
			
			var selectionChangeListener = function(){
				var sel = window.getSelection();
				if(me.composing == false && sel.type == 'Range' && sel.rangeCount > 0){
					var elem = sel.getRangeAt(0);
					var node = elem.commonAncestorContainer;
					while(node != null ){
						if(node == element){
							var coords = getCoords();
							var top = coords.top - 80 - bar.height() - $(window).scrollTop();
							bar.element.css({'top':top < 0 ? coords.top + coords.height+30 : top+$(window).scrollTop()+"px"});
							if(!mobile){
								if(bar.width() + coords.left > $(window).width()){
									bar.element.css({'right':30+"px"})
								} else {
									bar.element.css({'left':coords.left+"px"})
								}
							}
							bar.show();
							break;
						}
						node = node.parentElement;
					}
				} else {
					bar.hide();
				}
				document.queryCommandState('bold') ? me.boldBtn.classList.add(clazz) : me.boldBtn.classList.remove(clazz);
				document.queryCommandState('italic') ? me.italicBtn.classList.add(clazz) : me.italicBtn.classList.remove(clazz);				
				document.queryCommandState('strikeThrough') ? me.strikeThroughBtn.classList.add(clazz) : me.strikeThroughBtn.classList.remove(clazz);			
			}
			wrapper.selectionChangeListeners.push(selectionChangeListener);
			element.addEventListener('compositionstart',startHandler);
			element.addEventListener('compositionend',endHandler);
			this.startHandler = startHandler;
			this.endHandler = endHandler;
			this.bar = bar;
			this.selectionChangeListener = selectionChangeListener;
			this.element = element;
			this.wrapper = wrapper;
		}
		
		ContenteditableBar.prototype.remove = function(){
			var listeners = this.wrapper.selectionChangeListeners;
			for(var i=0;i<listeners.length;i++){
				if(listeners[i] == this.selectionChangeListener){
					listeners.splice(i,1);
					break;
				}
			}
			this.bar.remove();
			this.element.removeEventListener('compositionstart',this.startHandler);
			this.element.removeEventListener('compositionend',this.endHandler);
		}
		
		function getCoords() {
			var sel = window.getSelection();
			var elem = sel.getRangeAt(0);
			var box = elem.getBoundingClientRect();
			var body = document.body;
			var docEl = document.documentElement;
			var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
			var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;
			var clientTop = docEl.clientTop || body.clientTop || 0;
			var clientLeft = docEl.clientLeft || body.clientLeft || 0;
			var top  = box.top +  scrollTop - clientTop;
			var left = box.left + scrollLeft - clientLeft;
			return { top: Math.round(top), left: Math.round(left),height:Math.round(box.height) };
		}
		
		return {create:function(wrapper,element){
			return new ContenteditableBar(wrapper,element);
		}}
	})();
	
	var TableHelper = (function(){
		
		function TableHelper(wrapper){
			var me = this;
			this.oneTimeHandlers = [];
			$("#heather_out").on('click','table',function(e){
				var root = e.target;
				while(root != null && root.tagName != 'TABLE'){
					root = root.parentElement;
				}
				if(root == null){
					return ;
				}
				var line = parseInt(root.getAttribute('data-line'));
				var endLine = parseInt(root.getAttribute('data-end-line'));
				var str = wrapper.editor.getLines(line,endLine);
				
				var body = parseHTML(str).body;
				if(body.querySelector('table') != null){
					wrapper.editor.setOption('readOnly',false);
					return ;
				}
				
				if(isUndefined(this.tableSession) || this.tableSession.closed === true){
					var node = parseHTML(wrapper.render.getHtml(str)).body.firstChild;
					cloneAttributes(node,root);
					if(node.isEqualNode(root)){
						this.tableSession = new TableSession(wrapper,root,line,endLine);
						this.tableSession.start();
					}
				}
				
			})
		}
		
		function TableSession(wrapper,table,line,endLine){
			this.wrapper = wrapper;
			this.table = table;
			this.line = line;
			this.endLine = endLine;
		}
		
		TableSession.prototype.start = function(){
			var me = this;
			this.wrapper.editor.setOption('readOnly',true);
			this.wrapper.disableRender = true;
			
			this.clickHandler = function(e){
				var td = getTd(e.target);
				if(!td.isContentEditable){
					if(me.contenteditableBar){
						me.contenteditableBar.remove();
					}
					$(me.table).find('[contenteditable]').each(function(){
						this.removeEventListener('paste',plainPasteHandler);
						this.removeAttribute('contenteditable');
					});
					td.addEventListener('paste',plainPasteHandler);
					td.setAttribute('contenteditable',true);
					me.contenteditableBar = ContenteditableBar.create(me.wrapper,td);
				}
				me.td = td;
			}
			$(this.table).on('click','th,td',this.clickHandler);
			
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			this.table.before(toolbar);
			toolbar = Bar.create(toolbar);
			toolbar.addIcon('fas fa-trash middle-icon',function(){
				Swal.fire({
					title: '确定要删除表格?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						$(me.table).remove();
						me.close();
					}
				})
			});
			toolbar.addIcon('fas fa-plus middle-icon',function(){
				if(!me.td){
					return ;
				}
				var td = $(me.td);
				var table = $(me.table);
				var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
				var html = '';
				html += '<div><button style="'+style+'" >向右添加列</button></div>';
				html += '<div><button style="'+style+'" >向左添加列</button></div>';
				html += '<div><button style="'+style+'" >向上添加行</button></div>';
				html += '<div><button style="'+style+'" >向下添加行</button></div>';
				Swal({
					animation:false,
					html : html
				});
				var buttons = $(Swal.getContent()).find('button');
				buttons.eq(0).click(function(){
					addCol(table,td,true);
					Swal.close();
				});
				buttons.eq(1).click(function(){
					addCol(table,td,false);
					Swal.close();
				});
				buttons.eq(2).click(function(){
					addRow(table,td,false);
					Swal.close();
				});
				buttons.eq(3).click(function(){
					addRow(table,td,true);
					Swal.close();
				});
			});
			toolbar.addIcon('fas fa-minus middle-icon',function(){
				if(!me.td){
					return ;
				}
				var td = $(me.td);
				var table = $(me.table);
				var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
				var html = '';
				html += '<div><button style="'+style+'" >删除当前行</button></div>';
				html += '<div><button style="'+style+'" >删除当前列</button></div>';
				Swal({
					animation:false,
					html : html
				});
				var buttons = $(Swal.getContent()).find('button');
				buttons.eq(0).click(function(){
					deleteRow(table,td);
					Swal.close();
				});
				buttons.eq(1).click(function(){
					deleteCol(table,td);
					Swal.close();
				});
			});
			toolbar.addIcon('fas fa-align-left middle-icon',function(){
				if(!me.td){
					return ;
				}
				doAlign($(me.table),$(me.td),'left')
			});
			toolbar.addIcon('fas fa-align-center middle-icon',function(){
				if(!me.td){
					return ;
				}
				doAlign($(me.table),$(me.td),'center')
			});
			
			toolbar.addIcon('fas fa-align-right middle-icon',function(){
				if(!me.td){
					return ;
				}
				doAlign($(me.table),$(me.td),'right')
			});
			
			toolbar.addIcon('fas fa-check middle-icon',function(){
				me.close();
			});
			this.toolbar = toolbar;
		}
		
		TableSession.prototype.close = function(){
			var table = $(this.table);
			table.off('click','th,td',this.clickHandler);
			this.toolbar.remove();
			table.find('[contenteditable]').each(function(){
				this.removeEventListener('paste',plainPasteHandler);
				this.removeAttribute('contenteditable');
			});
			if(this.contentEditableBar){
				this.contentEditableBar.remove();
			}
			this.wrapper.editor.setOption('readOnly',false);
			this.wrapper.disableRender = false;
			var markdown = '';
			if(table.index() != -1){
				var element = parseHTML(table[0].outerHTML).body.firstChild;
				markdown = toMarkdown($(element));
			}
			this.wrapper.editor.replaceRange(markdown, {line: this.line, ch: 0}, {line: this.endLine-1});
			if(mobile){
				this.wrapper.doRender(true);
			}
			this.closed = true;
		}
		
		function doAlign(table,td,align){
			var index = td.index();
			table.find('tr').each(function(){
				var tr = $(this);
				tr.children().eq(index).css({'text-align':align})
			})
		}
		
		function addCol(table,td,after){
			var index = td.index();
			table.find('tr').each(function(){
				var tr = $(this);
				var td = tr.find('td').eq(index);
				var th = tr.find('th').eq(index);
				if(after){
					th.after('<th></th>');
					td.after('<td></td>');
				} else {
					th.before('<th></th>');
					td.before('<td></td>');
				}
			});
		}
		
		function addRow(table,td,after){
			if(td[0].tagName == 'TH' && !after) return ;
			var tr = td.parent();
			var tdSize = tr.find('td').length;
			if(tdSize == 0){
				tdSize = tr.find('th').length;
			}
			var html = '<tr>';
			for(var i=0;i<tdSize;i++){
				html += '<td></td>';
			}
			html += '</tr>';
			if(after){
				tr.after(html);
			}else{
				tr.before(html);
			}
		}
		
		function deleteRow(table,td){
			if(td[0].tagName == 'TH') return ;
			if(table.find('tr').length == 2){
				return ;
			}
			var tr = td.parent();
			tr.remove();
		}
		
		function deleteCol(table,td){
			var ths = table.find('tr').eq(0).find('th');
			if(ths.length == 1) return ;
			var index = td.index();
			table.find('tr').each(function(){
				var tr = $(this);
				var td = tr.find('td').eq(index);
				if(td.length > 0){
					td.remove();
				}
				var th = tr.find('th').eq(index);
				if(th.length > 0){
					th.remove();
				}
			});
		}
		
		function getTd(ele){
			if(ele==null){
				return null;
			} 
			if(ele.tagName == 'TD' || ele.tagName == 'TH'){
				return ele;
			}
			return getTd(ele.parentElement);
		}
		
		var alignMap = {
			'' : ' -- ',
			'left' : ' :-- ',
			'center' : ' :--: ',
			'right' : ' --: '
		}
		
		function toMarkdown(table) {
			var markdown = '';
			var trs = table.find('tr');
			for (var i = 0; i < trs.length; i++) {
				var tr = trs.eq(i);
				var ths = tr.find('th');
				var headingRow = ths.length > 0;
				if (headingRow) {
					markdown += getRowMarkdown(ths);
					markdown += '\n';
					for (var j = 0; j < ths.length; j++) {
						var align = ths[j].style['text-align'];
						markdown += "|" + alignMap[align];
					}
					markdown += "|";
				} else {
					markdown += getRowMarkdown(tr.find('td'));
				}
				if (i < trs.length - 1) {
					markdown += '\n';
				}
			}
			return markdown;
		}

		function getRowMarkdown(tds) {
			var markdown = '';
			for (var j = 0; j < tds.length; j++) {
				var td = tds.eq(j);
				markdown += "|";
				var md = turndownService.turndown(td.html());
				md = md.trim().replace(/\n\r/g, '<br>').replace(/\n/g, "<br>")
				markdown += md.length < 3 ? "  " + md : md;
			}
			markdown += "|";
			return markdown;
		}

		
		return {create : function(wrapper){
			return new TableHelper(wrapper);
		}}
	})();
	
	
	var SearchHelper = (function() {
		var SearchUtil = (function(){
			function SearchUtil(cm){
				this.cm = cm;
			}
			
			SearchUtil.prototype.startSearch = function(query,callback){
				var cm = this.cm;
				this.clearSearch();
				var state = getSearchState(cm);
				state.queryText = query;
				state.query = parseQuery(query);
				cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
				this.findNext(false, callback);
			}
			
			SearchUtil.prototype.clearSearch = function(){
				var cm = this.cm;
				var ranges = cm.getAllMarks();
				for (var i = 0; i < ranges.length; i++) ranges[i].clear();
				cm.operation(function() {
					var state = getSearchState(cm);
					state.lastQuery = state.query;
					if (!state.query) return;
					state.query = state.queryText = null;
				   cm.removeOverlay(state.overlay);
					if (state.annotate) {
						state.annotate.clear();
						state.annotate = null;
					}
				});
			}
			
			SearchUtil.prototype.findNext = function(rev, callback) {
				var cm = this.cm;
				var state = getSearchState(cm);
				if (!state.query) {
					return;
				}
				cm.operation(function() {
					var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
					if (!cursor.find(rev)) {
						cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
						if (!cursor.find(rev)) {
							if (callback)
								callback(null);
							return;
						}
					}
					cm.setSelection(cursor.from(), cursor.to());

					var ranges = cm.getAllMarks();
					for (var i = 0; i < ranges.length; i++) ranges[i].clear();

					cm.markText(cursor.from(), cursor.to(), {
						className: "styled-background"
					});

					var coords = cm.cursorCoords(cursor.from(), 'local');
					cm.scrollTo(0, coords.top);
					state.posFrom = cursor.from();
					state.posTo = cursor.to();
					if (callback) callback({
						from: cursor.from(),
						to: cursor.to()
					})
				});
			}
			
			SearchUtil.prototype.replace = function(text){
				var cm = this.cm;
				var state = getSearchState(cm);
				if (!state.query) {
					return;
				}
				var cursor = getSearchCursor(cm, state.query, cm.getCursor("from"));
				var advance = function() {
					var start = cursor.from(),
						match;
					if (!(match = cursor.findNext())) {
						cursor = getSearchCursor(cm, state.query);
						if (!(match = cursor.findNext()) || (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
					}
					cm.setSelection(cursor.from(), cursor.to());

					var coords = cm.cursorCoords(cursor.from(), 'local');
					cm.scrollTo(0, coords.top);
					cursor.replace(typeof query == "string" ? text : text.replace(/\$(\d)/g,
						function(_, i) {}));
				};
				advance();
			}
			
			SearchUtil.prototype.replaceAll = function(text){
				var cm = this.cm;
				var state = getSearchState(cm);
				if (!state.query) {
					return;
				}
				var query = state.query;
				cm.operation(function() {
					for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
						if (typeof query != "string") {
							var match = cm.getRange(cursor.from(), cursor.to()).match(query);
							cursor.replace(text.replace(/\$(\d)/g,
								function(_, i) {
									return match[i];
								}));
						} else cursor.replace(text);
					}
				});
			}

			function getSearchState(cm) {
				return cm.state.search || (cm.state.search = new SearchState());
			}

			function queryCaseInsensitive(query) {
				return typeof query == "string" && query == query.toLowerCase();
			}

			function getSearchCursor(cm, query, pos) {
				return cm.getSearchCursor(query, pos, {
					caseFold: queryCaseInsensitive(query),
					multiline: true
				});
			}

			function parseString(string) {
				return string.replace(/\\([nrt\\])/g, function(match, ch) {
					if (ch == "n") return "\n"
					if (ch == "r") return "\r"
					if (ch == "t") return "\t"
					if (ch == "\\") return "\\"
					return match
				})
			}

			function parseQuery(query) {
				if (query == '') return query;
				var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
				if (isRE) {
					try {
						query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i");
					} catch (e) {} // Not a regular expression after all, do a string search
				} else {
					query = parseString(query)
				}
				if (typeof query == "string" ? query == "" : query.test("")) query = /x^/;
				return query;
			}

			function SearchState() {
				this.posFrom = this.posTo = this.lastQuery = this.query = null;
				this.overlay = null;
			}
			
			return {create : function(editor){return new SearchUtil(editor)}}
			
		})();
		
		function SearchHelper(editor){
			var html = '';
			html += '<div id="heather_searchHelper" style="position:absolute;bottom:10px;width:100%;z-index:99;display:none;padding:20px;padding-bottom:5px">';
			html += '<div style="width:100%;text-align:right;margin-bottom:5px"><i class="fas fa-times icon"  style="cursor:pointer;margin-right:0px"></i></div>';
			html += ' <form>';
			html += '<div class="input-group mb-3">';
			html += '<input type="text" style="border:none" class="form-control" placeholder="查找内容" >';
			html += '<div class="input-group-append" data-search>';
			html += ' <span class="input-group-text" ><i class="fas fa-search " style="cursor:pointer"></i></span>';
			html += ' </div>';
			html += '</div>';
			html += '<div class="input-group mb-3" style="display:none">';
			html += '<input type="text" style="border:none" class="form-control" placeholder="替换内容" >';
			html += '<div class="input-group-append" data-replace style="cursor:pointer">';
			html += ' <span class="input-group-text" ><i class="fas fa-exchange-alt" ></i></span>';
			html += ' </div>';
			html += '<div class="input-group-append" data-replace-all style="cursor:pointer">';
			html += ' <span class="input-group-text" ><i class="fas fa-sync-alt" ></i></span>';
			html += ' </div>';
			html += '<div class="input-group-append" data-up style="cursor:pointer">';
			html += ' <span class="input-group-text" ><i class="fas fa-arrow-up" ></i></span>';
			html += ' </div>';
			html += '<div class="input-group-append" data-down style="cursor:pointer">';
			html += ' <span class="input-group-text" ><i class="fas fa-arrow-down" ></i></span>';
			html += ' </div>';
			html += '</div>';
			html += '</form>';
			html += '</div>';
			
			var ele = $(html);
			$("#heather_in").append(ele);
			
			var searchUtil = SearchUtil.create(editor);
			
			var nextHandler =  function() {
				searchUtil.findNext(false);
			}
			
			var previousHandler = function(){
				searchUtil.findNext(true)
			}
			
			this.keyMap = {
				'Up' : previousHandler,
				'Down' : nextHandler
			}
			
			var startSearchHandler = function() {
				var query = ele.find('input').eq(0).val();
				if ($.trim(query) == '') {
					swal('搜索内容不能为空');
					return;
				}
				searchUtil.startSearch(query,function(cursor) {
					if (cursor == null) {
						swal('没有找到符合条件的搜索内容');
					} else {
						ele.find(".input-group").eq(0).hide();
						ele.find(".input-group").eq(1).show();
						editor.focus();
					}
				});
			};
			
			
			var replaceHandler = function() {
				var text = ele.find('input').eq(1).val();
				searchUtil.replace(text);
			}
			
			var replaceAllHandler = function() {
				Swal.fire({
					title: '确定要替换全部吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						var text = ele.find('input').eq(1).val();
						searchUtil.replaceAll(text);
					}
				})
			}
			
			ele.find('.form-control').eq(0).on('keydown',function(event){
				if (keyNames[event.keyCode] == 'Enter') {
					startSearchHandler();
					event.preventDefault();
				}
			});
			
			ele.find('.form-control').eq(1).on('keydown',function(event){
				if (keyNames[event.keyCode] == 'Enter') {
					replaceHandler();
					event.preventDefault();
				}
			});
			
			ele.on('click', '[data-search]',startSearchHandler );
			ele.on('click', '[data-down]',nextHandler);
			ele.on('click', '[data-up]', previousHandler);
			ele.on('click', '[data-replace]', replaceHandler);
			ele.on('click', '[data-replace-all]', replaceAllHandler);
			var me = this;
			ele.on('click', '.fa-times', function(){
				me.close();
			});
			
			this.ele = ele;
			this.visible = false;
			this.editor = editor;
			this.searchUtil = searchUtil;
		}
		
		SearchHelper.prototype.open = function(){
			this.editor.setOption('readOnly', true);
			this.ele.show();
			this.ele.find('.form-control').focus();
			this.visible = true;
			this.editor.addKeyMap(this.keyMap);
		}
		
		SearchHelper.prototype.close = function(){
			this.searchUtil.clearSearch();
			this.ele.hide();
			this.ele.find('input').val('');
			this.ele.find(".input-group").eq(0).show();
			this.ele.find(".input-group").eq(1).hide();
			this.editor.setOption('readOnly', false)
			this.visible = false;
			this.editor.removeKeyMap(this.keyMap);
		}
		
		SearchHelper.prototype.isVisible = function(){
			return this.visible;
		}

		return {create:function(editor){return new SearchHelper(editor)}}

	})();
	
	
	///手机端辅助选中
	var CursorHelper = (function(){
		'use strict';
		
		var CursorUtil = (function(){
			function CursorUtil(editor){
				this.from = editor.getCursor('from');
				this.to = editor.getCursor('to');
				this.movedByMouseOrTouch = false;
				var me = this;
				this.cursorActivityHandler = function () {
					if (me.movedByMouseOrTouch) {
						if(me.mark){
							me.mark.clear();
						}
						me.movedByMouseOrTouch = false;
						me.from = editor.getCursor('from');
						me.to = editor.getCursor('to');
					}
				};
				this.movedHandler = function(){
					me.movedByMouseOrTouch = true;
				};
				this.editor = editor;
			}
			
			CursorUtil.prototype.init = function(){
				if(this.mark){
					this.mark.clear();
				}
				this.editor.on("cursorActivity",this.cursorActivityHandler);
				this.editor.on("mousedown",this.movedHandler );
				this.editor.on("touchstart",this.movedHandler);
			}
			
			CursorUtil.prototype.move = function(action){
				var editor = this.editor;
				editor.setCursor(this.to);
				editor.execCommand(action);
				this.to = editor.getCursor('from');
				if(this.mark){
					this.mark.clear();
				}
				if(this.from.line > this.to.line || (this.from.line == this.to.line && this.from.ch > this.to.ch)){
					this.mark = editor.markText(this.to,this.from, {className: "styled-background"});
				}else{
					this.mark = editor.markText(this.from,this.to, {className: "styled-background"});
				}
			}
			
			CursorUtil.prototype.end = function(){
				if(this.mark){
					this.mark.clear();
				}
				var editor = this.editor;
				editor.on("cursorActivity",this.cursorActivityHandler);
				editor.on("mousedown",this.movedHandler );
				editor.on("touchstart",this.movedHandler);
				if(this.from.line > this.to.line || (this.from.line == this.to.line && this.from.ch > this.to.ch)){
					editor.setSelection(this.to,this.from);
				}else{
					editor.setSelection(this.from,this.to);
				}
				editor.focus(); 			
			}
			
			return {create:function(editor){return new CursorUtil(editor)}}
		})();
		
		function CursorHelper(editor){
			var html = '<div id="heather_cursorHelper" style="position:absolute;bottom:5px;width:150px;left:calc(50% - 75px);display:none;z-index:9999" class="alpha30" >'		
			html += '<div style="height:26.66%;padding:5px;cursor:pointer">';
			html += '<i class="fas fa-times"  style="font-size:35px" title="关闭"></i>';		
			html += '<div style="clear:both"></div>';
			html += '</div>';
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
			html += '</div>';
			var ele = $(html);
			$("#heather_in").append(ele);
			var cursorUtil = CursorUtil.create(editor);
			ele.on('click','[data-arrow]',function(){
				var action = $(this).data('arrow');
				cursorUtil.move(action);
			});
			var me = this;
			ele.on('click','.fa-times',function(){
				me.close();
			});
			this.editor = editor;
			this.ele = ele;
			this.cursorUtil = cursorUtil;
		}
		
		CursorHelper.prototype.open = function(){
			this.editor.setOption('readOnly',true);
			this.cursorUtil.init();
			this.ele.show();
		} 
		
		CursorHelper.prototype.close = function(){
			this.ele.hide();
			this.editor.setOption('readOnly',false);
			this.cursorUtil.end();
		} 
		return {create:function(editor){return new CursorHelper(editor)}};
	})();


    var _EditorWrapper = (function() {
		function _EditorWrapper(){
			this.wrapperInstance = {};
			this.commands = {
				emoji : function(wrapper) {
					var editor = wrapper.editor;
					var emojiArray = $.trim("😀 😁 😂 🤣 😃 😄 😅 😆 😉 😊 😋 😎 😍 😘 😗 😙 😚 ☺️ 🙂 🤗 🤔 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🤑 😲 ☹️ 🙁 😖 😞 😟 😤 😢 😭 😦 😧 😨 😩 😬 😰 😱 😳 😵 😡 😠 😷 🤒 🤕 🤢 🤧 😇 🤠 🤡 🤥 🤓 😈 👿 👹 👺 💀 👻 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾").split(' ');
					var html = '';
					for (var i = 0; i < emojiArray.length; i++) {
						html += '<span data-emoji style="cursor:pointer">' + emojiArray[i] +
							'</span>';
					}
					swal({
						html: html
					})
					$(Swal.getContent()).find('[data-emoji]').click(function() {
						var emoji = $(this).text();
						var text = editor.getSelection();
						if (text == '') {
							editor.replaceRange(emoji, editor.getCursor());
						} else {
							editor.replaceSelection(emoji);
						}
						Swal.close();
					})
				},
				heading : function(wrapper) {
					var editor = wrapper.editor;
					async function getHeading() {
						const {
							value: heading
						} = await Swal.fire({
							input: 'select',
							inputValue: '1',
							inputOptions: {
								'1': 'H1',
								'2': 'H2',
								'3': 'H3',
								'4': 'H4',
								'5': 'H5',
								'6': 'H6'
							},
							inputPlaceholder: '',
							showCancelButton: true
						});
						if (heading) {
							var v = parseInt(heading);
							var status = editor.selectionStatus();
							selectionBreak(status,function(text){
								var prefix = '';
								for (var i = 0; i < v; i++) {
									prefix += '#';
								}
								prefix += ' ';
								return prefix + text;
							});
							if (status.selected == '') {
								editor.replaceRange(status.text, editor.getCursor());
								editor.focus();
								editor.setCursor({
									line: status.startLine,
									ch: v+1
								});
							} else {
								editor.replaceSelection(status.text);
							}
						}
					}
					getHeading();
				},
				bold :  function(wrapper) {
					var editor = wrapper.editor;
					var text = editor.getSelection();
					if (text == '') {
						editor.replaceRange("****", editor.getCursor());
						editor.focus();
						var str = "**";
						var mynum = str.length;
						var start_cursor = editor.getCursor();
						var cursorLine = start_cursor.line;
						var cursorCh = start_cursor.ch;
						editor.setCursor({
							line: cursorLine,
							ch: cursorCh - mynum
						});
					} else {
						editor.replaceSelection("**" + text + "**");
					}
				},

				italic : function(wrapper) {
					var editor = wrapper.editor;
					var text = editor.getSelection();
					if (text == '') {
						editor.replaceRange("**", editor.getCursor());
						editor.focus();
						var str = "*";
						var mynum = str.length;
						var start_cursor = editor.getCursor();
						var cursorLine = start_cursor.line;
						var cursorCh = start_cursor.ch;
						editor.setCursor({
							line: cursorLine,
							ch: cursorCh - mynum
						});
					} else {
						editor.replaceSelection("*" + text + "*");
					}
				},

				quote : function(wrapper) {
					var editor = wrapper.editor;
					var status = editor.selectionStatus();
					selectionBreak(status,function(text){
						return '> '+text;
					});
					if (status.selected == '') {
						editor.replaceRange(status.text, editor.getCursor());
						editor.focus();
						editor.setCursor({
							line: status.startLine,
							ch: 2
						});
					} else {
						editor.replaceSelection(status.text);
					}
				},

				strikethrough : function(wrapper) {
					var editor = wrapper.editor;
					var text = editor.getSelection();
					if (text == '') {
						editor.replaceRange("~~~~", editor.getCursor());
						editor.focus();
						var str = "~~";
						var mynum = str.length;
						var start_cursor = editor.getCursor();
						var cursorLine = start_cursor.line;
						var cursorCh = start_cursor.ch;
						editor.setCursor({
							line: cursorLine,
							ch: cursorCh - mynum
						});
					} else {
						editor.replaceSelection("~~" + text + "~~");
					}
				},


				link : function(wrapper) {
					var editor = wrapper.editor;
					var text = editor.getSelection();
					if (text == '') {
						editor.replaceRange("[](https://)", editor.getCursor());
						editor.focus();
						var start_cursor = editor.getCursor();
						var cursorLine = start_cursor.line;
						var cursorCh = start_cursor.ch;
						editor.setCursor({
							line: cursorLine,
							ch: cursorCh - 11
						});
					} else {
						editor.replaceSelection("[" + text + "](https://)");
					}
				},

				codeBlock : function(wrapper) {
					var editor = wrapper.editor;
					var status = editor.selectionStatus();
					selectionBreak(status,function(text){
						var newText = "``` ";
						newText += '\n';
						newText += text ;
						newText += '\n'
						newText += "```";
						return newText;
					});
					editor.focus();
					editor.replaceSelection(status.text);
					editor.setCursor({
						line: status.startLine+1,
						ch: 0
					});
				},

				code : function(wrapper) {
					var editor = wrapper.editor;
					var text = editor.getSelection();
					if (text == '') {
						editor.replaceRange("``", editor.getCursor());
						editor.focus();
						var start_cursor = editor.getCursor();
						var cursorLine = start_cursor.line;
						var cursorCh = start_cursor.ch;
						editor.setCursor({
							line: cursorLine,
							ch: cursorCh - 1
						});
					} else {
						editor.replaceSelection("`" + text + "`");
					}
				},

				uncheck :  function(wrapper) {
					var editor = wrapper.editor;
					insertTaskList(editor,false);
				},

				check : function(wrapper) {
					var editor = wrapper.editor;
					insertTaskList(editor,true);
				},

				table : function(wrapper) {
					var editor = wrapper.editor;
					swal({
						html: '<input class="swal2-input" placeholder="行">' +
							'<input class="swal2-input" placeholder="列">',
						preConfirm: function() {
							return new Promise(function(resolve) {
								var inputs = $(Swal.getContent()).find('input');
								resolve([
									inputs.eq(0).val(),
									inputs.eq(1).val()
								])
							})
						}
					}).then(function(result) {
						var value = result.value;
						var cols = parseInt(value[0]) || 3;
						var rows = parseInt(value[1]) || 3;
						if (rows < 1)
							rows = 3;
						if (cols < 1)
							cols = 3;
						var text = '';
						for (var i = 0; i <= cols; i++) {
							text += '|    ';
						}
						text += "\n";
						for (var i = 0; i < cols; i++) {
							text += '|  -  ';
						}
						text += '|'
						if (rows > 1) {
							text += '\n';
							for (var i = 0; i < rows - 1; i++) {
								for (var j = 0; j <= cols; j++) {
									text += '|    ';
								}
								if(i < rows - 2)
									text += "\n";
							}
						}
						var status = editor.selectionStatus();
						selectionBreak(status,function(selected){
							return text;
						});
						editor.replaceSelection(status.text);
					}).catch(swal.noop)
				},
				
				search : function(wrapper) {
					if(wrapper.searchHelper.isVisible()){
						wrapper.searchHelper.close();
					} else {
						wrapper.searchHelper.open();
					}
				}
			}
		}
		
		_EditorWrapper.prototype.create = function(config){
			var me = this;
			if (this.wrapperInstance.wrapper) {
				this.wrapperInstance.wrapper.remove();
			}
			var wrapper = new EditorWrapper(config);
			wrapper.eventHandlers.push({
				name:'remove',
				handler : function(){
					delete me.wrapperInstance.wrapper;
				}
			})
			this.wrapperInstance.wrapper = wrapper;
			return wrapper;
		}
		
		_EditorWrapper.prototype.getEditor = function(o){
			return o.doc ? o : o.editor;
		}
		
		_EditorWrapper.prototype.getWrapper = function(o){
			return o.doc ? o.state.wrapper : o;
		}
		
		function insertTaskList(editor,checked){
			var status = editor.selectionStatus();
			var text = '';
			if(status.prev != ''){
				if(status.next == ''){
					if(!status.prev.startsWith("- [ ] ") && !status.prev.startsWith("- [x] ")){
						text += '\n\n';
					} else {
						text += '\n';
					}
				} else {
					text += '\n\n';
				}
			}else{
				if(status.prevLine != '' && !status.prevLine.startsWith("- [ ] ") && !status.prevLine.startsWith("- [x] ")){
					text += '\n';
				}
			}
			var prefix = checked ? '- [x]  ' : '- [ ]  '
			text += prefix+status.selected;
			if(status.next != ''){
				if(status.prev == ''){
					if(!status.next.startsWith("- [ ] ") && !status.next.startsWith("- [x] ")){
						text += '\n\n';
					} else {
						text += '\n';
					}
				} else {
					text += '\n\n';
				}
			} else {
				if(status.nextLine != '' && !status.nextLine.startsWith("- [ ] ") && !status.nextLine.startsWith("- [x] ")){
					text += '\n';
				}
			}
			editor.replaceSelection(text);
		}
		
		function selectionBreak(status,callback){
			var _text = '';
			if(status.prev != ''){
				_text += '\n\n';
				status.startLine += 2;
			} else {
				if(status.prevLine != ''){
					_text += '\n';
					status.startLine += 1;
				}
			}
			if(callback){
				_text += callback(status.selected);
			}
			if(status.next != ''){
				_text += '\n\n';
				status.endLine += 2;
			} else {
				if(status.nextLine != ''){
					_text += '\n';
					status.endLine += 1;
				}
			}
			status.text = _text;
			return status;
		}
		
		
		
		var _EditorWrapper = new _EditorWrapper(); 

        function EditorWrapper(config) {
            var html = '<div id="heather_wrapper">';
            html += '<div id="heather_toc">';
            html += '</div>';
            html += '<div id="heather_in">';
            html += '<div id="heather_toolbar"></div>';
            html += '<textarea  style="width: 100%; height: 100%"></textarea>';
            html += '<div id="heather_stat"></div>';
            html += '<div id="heather_innerBar"></div>';
            html += '</div>';
            html += '<div class="markdown-body" id="heather_out"></div>';
            html += '</div>';
			
			
            var $wrapperElement = $(html);
            $('body').append($wrapperElement);
            this.scrollTop = $(window).scrollTop();
            $('body').addClass('heather_noscroll');
            $('html').addClass('heather_noscroll');
            this.wrapperElement = $wrapperElement[0];
			this.selectionChangeListeners = [];
			var me = this;
			document.onselectionchange = function(){
				for(var i=0;i<me.selectionChangeListeners.length;i++){
					try{
						me.selectionChangeListeners[i].call()
					}catch(e){console.log(e)};
				}
			}
			
            if (!mobile) {
                $("#heather_in").show();
                $("#heather_out").css({
                    'visibility': 'visible'
                });
            }
            $("#heather_wrapper").animate({
                scrollLeft: $("#heather_toc").outerWidth()
            }, 0);
            this.eventHandlers = [];
			this.themeHandler = ThemeHandler.create(config);
            var theme = this.themeHandler.getTheme();
            theme.render();
			this.theme = theme;
            var scrollBarStyle = mobile ? 'native' : 'overlay';
            var editor = CodeMirror.fromTextArea(document.getElementById('heather_wrapper').querySelector('textarea'), {
                mode: {name: "gfm"},
                lineNumbers: false,
                matchBrackets: true,
                lineWrapping: true,
                dragDrop: true,
                scrollbarStyle: scrollBarStyle,
                theme: theme.editor.theme || 'default',
                styleSelectedText: true,
                extraKeys: {
                    "Enter": "newlineAndIndentContinueMarkdownList"
                }
            });
			
			editor.setOption('dropContentHandler', function(fileName, content) {
				var ext = fileName.split(".").pop().toLowerCase();
				if (ext == "md") {
					return content;
				} else if (ext == "html" || ext == 'htm') {
					return turndownService.turndown(content);
				} else return "";
			});
			
			editor.setOption('dropContentHandler', function(fileName, content) {
				var ext = fileName.split(".").pop().toLowerCase();
				if (ext == "md") {
					return content;
				} else if (ext == "html" || ext == 'htm') {
					return turndownService.turndown(content);
				} else return "";
			});
			
            this.theme = theme;
            this.sync = Sync.create(editor, $("#heather_out")[0], config);
            this.render = Render.create(config, theme);
			this.searchHelper = SearchHelper.create(editor);
			this.cursorHelper = CursorHelper.create(editor);
			this.tooltip = Tooltip.create(editor);
			this.tooltip.enable();
            this.toolbar = Bar.create($("#heather_toolbar")[0]);
            var innerBar = Bar.create($("#heather_innerBar")[0]);
            innerBar.hide();
            this.innerBar = innerBar;
			this.taskListHelper = TaskListHelper.create(this);
			this.tableHelper = TableHelper.create(this);
            //sync 
            var wrapper = this;
            if (!mobile) {
                //auto render
                var ms = getDefault(config.render_ms, 500);
                var autoRenderTimer;
                var stat_timer;
                wrapper.onRemove(function() {
                    if (autoRenderTimer) {
                        clearTimeout(autoRenderTimer);
                    }
                    if (stat_timer) {
                        clearTimeout(stat_timer);
                    }
                })
                editor.on('change', function() {
                    if (autoRenderTimer) {
                        clearTimeout(autoRenderTimer);
                    }
                    autoRenderTimer = setTimeout(function() {
                        wrapper.doRender(true);
                    }, ms)
                    var statEnable = config.stat_enable !== false;
                    if (statEnable) {
                        var formatter = config.stat_formatter || function(wrapper) {
                            return "当前字数：" + wrapper.getValue().length
                        }
                        $("#heather_stat").html(formatter(wrapper)).show();
                        if (stat_timer) {
                            clearTimeout(stat_timer);
                        }
                        stat_timer = setTimeout(function() {
                            $("#heather_stat").hide();
                        }, 1000);
                    }

                });
                //sync
                var scrollHandler = function() {
                    wrapper.doSync();
                };
                var syncEnable = config.sync_enable !== false;
                if (syncEnable) {
                    editor.on('scroll', scrollHandler);
                }
                this.syncEnable = syncEnable;
                this.scrollHandler = scrollHandler;
            }

            if (mobile) {
                //swipe
                $("#heather_toc").touchwipe({
                    wipeLeft: function() {
                        wrapper.toEditor()
                    },
                    min_move_x: 10,
                    max_move_y: 5
                });
                $(editor.getScrollerElement()).touchwipe({
                    wipeLeft: function() {
                        wrapper.toPreview()
                    },
                    wipeRight: function(e) {
                        wrapper.toToc();
                    },
                    min_move_x: 10,
                    max_move_y: 5
                });

                function hasXScrollBar(element) {
                    var overflowX = window.getComputedStyle(element)['overflow-x'];
                    return (overflowX === 'scroll' || overflowX === 'auto') && element.scrollWidth > element.clientWidth;
                }

                //if an element has a x scrollbar and scrollLeft > 0 then can not wipe
                function canWipe(element) {
                    if (isUndefined(element) || element == null) {
                        return true;
                    }
                    if (hasXScrollBar(element) && $(element).scrollLeft() > 0) {
                        return false;
                    }
                    return canWipe(element.parentElement);
                }

                $("#heather_out").touchwipe({
                    wipeRight: function(e) {
                        if (canWipe(e.target)) {
                            wrapper.toEditor()
                        }
                    },
                    min_move_x: 10,
                    max_move_y: 5
                });
            }

            var tocClickTimer;
            wrapper.onRemove(function() {
                if (tocClickTimer) {
                    clearTimeout(tocClickTimer);
                }
            });

            $("#heather_toc").on('click', '[data-line]', function() {
                var line = parseInt($(this).data('line'));

                editor.scrollIntoView({
                    line: line
                });
                tocClickTimer = setTimeout(function() {
                    var top = editor.charCoords({
                        line: line,
                        ch: 0
                    }, "local").top;
                    editor.scrollTo(null, top);
                    if (mobile || wrapper.fullscreen) {
                        wrapper.toEditor();
                        //wrapper.editor.focus();
                    }
                }, 500)
            })
            this.editor = editor;
            this.config = config;
			this.doRender(false);
			if(this.config.backup_enable !== false){
				this.backup = Backup.create(this);
			}
			initKeyMap(this);
            initInnerBar(this);
            initToolbar(this);
            this.fullscreen = false;
            if (screenfull.enabled) {
                var screenFullChangeHandler = function() {
                    wrapper.fullscreen = screenfull.isFullscreen;
                    changeWhenFullScreenChange(wrapper, screenfull.isFullscreen);
                }
                wrapper.onRemove(function() {
                    screenfull.off('change', screenFullChangeHandler);
                });
                screenfull.on('change', screenFullChangeHandler);
            }
			
			if(this.fileUploadEnable()){
				editor.on('paste', function(editor, evt) {
					var clipboardData, pastedData;
					clipboardData = evt.clipboardData || window.clipboardData;
					var files = clipboardData.files;
					if (files.length > 0) {
						var f = files[0];
						var type = f.type;
						if (type.indexOf('image/') == -1) {
							swal("请上传图片文件");
							return;
						}
						FileUpload.create(f,wrapper).start();
					}
				});
			}
			
			

            triggerEvent(this, 'load');
        }
		
		function initKeyMap(wrapper){
			var keyMap = mac ? {
				"Ctrl-B" : 'bold',
				"Ctrl-I" : 'italic',
				"Shift-Cmd-T" : 'table',
				"Ctrl-H" : 'heading',
				"Ctrl-L" : 'link',
				"Ctrl-Q" : 'quote',
				"Shift-Cmd-B" :  'codeBlock',
				"Shift-Cmd-U" : 'uncheck',
				"Shift-Cmd-I" : 'check',
				'Ctrl-S' : 'search',
				"Cmd-Enter":function(){
					wrapper.requestFullScreen();
				}
			} : {
				"Ctrl-B" : 'bold',
				"Ctrl-I" : 'italic',
				"Alt-T" : 'table',
				"Ctrl-H" : 'heading',
				"Ctrl-L" : 'link',
				"Ctrl-Q" : 'quote',
				"Alt-B" :  'codeBlock',
				"Alt-U" : 'uncheck',
				"Alt-I" : 'check',
				'Alt-S' : 'search',
				"Ctrl-Enter":function(){
					wrapper.requestFullScreen();
				}
			}
			wrapper.bindKey(keyMap);
		}
		

        function triggerEvent(wrapper, name, args) {
            for (var i = 0; i < wrapper.eventHandlers.length; i++) {
                var evtHandler = wrapper.eventHandlers[i];
                if (evtHandler.name == name) {
                    try {
                        evtHandler.handler.call(wrapper, args);
                    } catch (e) {}
                }
            }
        }

        function changeWhenFullScreenChange(wrapper, isFullscreen) {
            if (!CodeMirror.browser.mobile) {
                var cm = wrapper.editor;
                var wrap = cm.getWrapperElement();
                var outToEditorHandler = function(e) {
                    var keyCode = e.which || e.keyCode;
                    if ((e.ctrlKey || e.metaKey) && keyCode == 37) {
                        $("#heather_out").removeAttr("tabindex");
                        wrapper.toEditor(function() {
							cm.focus();
							var info = cm.state.fullScreenRestore;
							window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }

                var tocToEditorHandler = function(e) {
                    var keyCode = e.which || e.keyCode;
                    if ((e.ctrlKey|| e.metaKey) && keyCode == 39) {
                        $("#heather_toc").removeAttr("tabindex");
                        wrapper.toEditor(function() {
							cm.focus();
							var info = cm.state.fullScreenRestore;
							window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }
				
				var toPreviewHandler = function(){
					wrapper.toPreview(function() {
						$("#heather_out").prop('tabindex', 0);
						$("#heather_out").focus();
					});
				};
				
				var toTocHandler = function(){
					wrapper.toToc(function() {
						$("#heather_toc").prop('tabindex', 0);
						$("#heather_toc").focus();
					});
				};
				
				var keyMap = mac ? {
					'Cmd-Right': toPreviewHandler,
					'Cmd-Left' : toTocHandler
				} : {
					'Ctrl-Right': toPreviewHandler,
					'Ctrl-Left' : toTocHandler
				} 

                if (isFullscreen) {
					wrapper.editor.addKeyMap(keyMap);

                    $("#heather_out").on('keydown', outToEditorHandler);
                    $("#heather_toc").on('keydown', tocToEditorHandler);

                    $(wrapper.getFullScreenElement()).addClass('heather_fullscreen');

                    //from CodeMirror display fullscreen.js
                    cm.state.fullScreenRestore = {
                        scrollTop: window.pageYOffset,
                        scrollLeft: window.pageXOffset,
                        width: wrap.style.width,
                        height: wrap.style.height
                    };
                    wrap.style.width = "";
                    wrap.style.height = "auto";
                    wrap.className += " CodeMirror-fullscreen";
                    document.documentElement.style.overflow = "hidden";
                    cm.refresh();

                } else {

					wrapper.editor.removeKeyMap(keyMap);
                    $("#heather_out").off('keydown', outToEditorHandler);
                    $("#heather_toc").off('keydown', tocToEditorHandler);

                    $(wrapper.getFullScreenElement()).removeClass('heather_fullscreen');
                    wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
                    document.documentElement.style.overflow = "";
                    var info = cm.state.fullScreenRestore;
                    wrap.style.width = info.width;
                    wrap.style.height = info.height;
                    window.scrollTo(info.scrollLeft, info.scrollTop);
                    cm.refresh();

                }
                wrapper.toEditor(function() {
					wrapper.doRender(false);
				}, 0);
            }
        }
		
		EditorWrapper.prototype.fileUploadEnable = function(){
			return !isUndefined(this.config.upload_url) && !isUndefined(this.config.upload_finish);
		}
		
		EditorWrapper.prototype.execCommand = function(name) {
           var handler = _EditorWrapper.commands[name];
		   if(!isUndefined(handler)){
			   handler.call(null,this);
		   }
        }

        EditorWrapper.prototype.doRender = function(patch) {
			if(this.disableRender === true){
				return ;
			}
            this.render.renderAt(this.editor.getValue(), $("#heather_out")[0], patch);
            renderToc();
        }

        EditorWrapper.prototype.remove = function() {
            var me = this;
            var removeHandler = function() {
                Swal.close();
                triggerEvent(me, 'remove');
                $(me.getFullScreenElement()).removeClass('heather_fullscreen');
                $('body').removeClass('heather_noscroll');
                $('html').removeClass('heather_noscroll');
                $('html,body').scrollTop(me.scrollTop);
                me.wrapperElement.parentNode.removeChild(me.wrapperElement);
            }
            if (this.fullscreen) {
                this.exitFullScreen().then(function() {
                    removeHandler();
                });
            } else {
                removeHandler();
            }
        }

        EditorWrapper.prototype.doSync = function() {
            this.sync.doSync();
        }

        EditorWrapper.prototype.requestFullScreen = function() {
            if (!mobile) {
                if (screenfull.enabled) {
                    screenfull.request(this.getFullScreenElement());
                } else {
                    swal("当前浏览器不支持全屏模式")
                }
            }
        }

        EditorWrapper.prototype.getFullScreenElement = function() {
            return document.body;
        }

        EditorWrapper.prototype.exitFullScreen = function() {
            if (!mobile && screenfull.enabled) {
                return screenfull.exit();
            }
        }

        EditorWrapper.prototype.enableSync = function() {
            if (!this.syncEnable) {
                editor.on('scroll', this.scrollHandler)
                this.syncEnable = true;
            }
        }

        EditorWrapper.prototype.getHtml = function() {
            return this.render.getHtml(this.editor.getValue());
        }

        EditorWrapper.prototype.getValue = function() {
            return this.editor.getValue();
        }

        EditorWrapper.prototype.setValue = function(text) {
            return this.editor.setValue(text);
        }

        EditorWrapper.prototype.disableSync = function() {
            if (this.syncEnable) {
                editor.off('scroll', this.scrollHandler);
                this.syncEnable = false;
            }
        }

        EditorWrapper.prototype.on = function(name, handler) {
            this.eventHandlers.push({
                name: name,
                handler: handler
            })
        }

        EditorWrapper.prototype.off = function(name, handler) {
            for (var i = 0; i < this.eventHandlers.length; i++) {
                var handler = this.eventHandlers[i];
                if (handler.name == name && handler.handler == handler) {
                    this.eventHandlers.splice(i, 1);
                    break;
                }
            }
        }

        EditorWrapper.prototype.onRemove = function(fun) {
            this.on('remove', fun)
        }

        EditorWrapper.prototype.offRemove = function(fun) {
            this.off('remove', fun);
        }

        EditorWrapper.prototype.toEditor = function(callback, _ms) {
            var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
             $("#heather_wrapper").animate({
				scrollLeft: $("#heather_in").width()
			}, ms, function() {
				if (callback) callback();
			});
        }


        EditorWrapper.prototype.toToc = function(callback, _ms) {
            this.editor.unfocus();
            if (mobile) {
                this.doRender(true);
            }
            var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
            $("#heather_wrapper").animate({
                scrollLeft: 0
            }, ms, function() {
                if (callback) callback();
            });
        }

        EditorWrapper.prototype.toPreview = function(callback, _ms) {
            var me = this;
            if (mobile || me.fullscreen) {
                this.editor.unfocus();
                if (mobile) {
                    this.doRender(true);
                    this.doSync();
                }
                var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
                $("#heather_wrapper").animate({
                    scrollLeft: $("#heather_out")[0].offsetLeft
                }, ms, function() {
                    if (callback) callback();
                });
            }
        }
		
		EditorWrapper.prototype.saveTheme = function() {
           this.themeHandler.saveTheme(this.theme);
        }
		
		EditorWrapper.prototype.resetTheme = function() {
		   this.editor.setOption('theme','default');
           this.theme = this.themeHandler.reset();
		   this.theme.render();
        }
		
		EditorWrapper.prototype.bindKey = function(map) {
			var keyMap = {};
			var me = this;
			Object.keys(map).forEach(function(key,index) {
				var o = map[key];
				if(typeof o === 'string'){
					var handler = _EditorWrapper.commands[o];
					if(!isUndefined(handler)){
						var newHandler = function(){
							handler.call(null,me);
						}
						keyMap[key] = newHandler;
					}
				} else {
					keyMap[key] = o;
				}
				
			});
			this.editor.addKeyMap(keyMap);
        }
		
		EditorWrapper.prototype.unbindKey = function(keys) {
			var keyMaps = this.editor.state.keyMaps;
			for(var i=0;i<keys.length;i++){
				for(var j=0;j<keyMaps.length;j++){
					delete keyMaps[j][keys[i]];
				}
			}
        }

        function initInnerBar(wrapper) {
            var innerBar = wrapper.innerBar;
            var editor = wrapper.editor;
            var config = wrapper.config;

            var innerBarElement = $("#heather_innerBar");
			
            var icons = config.innerBar_icons || ['emoji','upload', 'heading', 'bold', 'italic', 'quote', 'strikethrough', 'link', 'code', 'code-block', 'uncheck', 'check', 'table','move', 'undo', 'redo', 'close'];
            for (var i = 0; i < icons.length; i++) {
                var icon = icons[i];
				if(icon == 'upload' && wrapper.fileUploadEnable()){
					var label = document.createElement('label');
					label.setAttribute('class','icon fas fa-upload');
					label.setAttribute('style','display: inline-block;')
					label.innerHTML = '<input type="file" accept="image/*" style="display:none"/>';
					label.querySelector('input[type="file"]').addEventListener('change',function(){
						var file = this.files[0];
						FileUpload.create(file,wrapper).start();
					})
					innerBar.addElement(label,0);
				}
                if(icon == 'emoji'){
					innerBar.addIcon('far fa-grin-alt icon',function(){
						wrapper.execCommand('emoji');
					})
				}
				
				if(icon == 'heading'){
					innerBar.addIcon('fas fa-heading icon',function(){
						wrapper.execCommand('heading');
					})
				}
				if(icon == 'bold'){
					innerBar.addIcon('fas fa-bold icon',function(){
						wrapper.execCommand('bold');
					})
				}
				if(icon == 'italic'){
					innerBar.addIcon('fas fa-italic icon',function(){
						wrapper.execCommand('italic');
					})
				}
				if(icon == 'quote'){
					innerBar.addIcon('fas fa-quote-left icon',function(){
						wrapper.execCommand('quote');
					})
				}
				
				if(icon == 'strikethrough'){
					innerBar.addIcon('fas fa-strikethrough icon',function(){
						wrapper.execCommand('strikethrough');
					})
				}
				
				if(icon == 'link'){
					innerBar.addIcon('fas fa-link icon',function(){
						wrapper.execCommand('link');
					})
				}
				
				if(icon == 'code'){
					innerBar.addIcon('fas fa-code icon',function(){
						wrapper.execCommand('code');
					})
				}
				
				if(icon == 'code-block'){
					innerBar.addIcon('fas fa-file-code icon',function(){
						wrapper.execCommand('codeBlock');
					})
				}
				
				if(icon == 'uncheck'){
					innerBar.addIcon('far fa-square icon',function(){
						wrapper.execCommand('uncheck');
					})
				}
				
				if(icon == 'check'){
					innerBar.addIcon('far fa-check-square icon',function(){
						wrapper.execCommand('check');
					})
				}
				
				if(icon == 'table'){
					innerBar.addIcon('fas fa-table icon',function(){
						wrapper.execCommand('table');
					})
				}
				
				if(icon == 'undo'){
					innerBar.addIcon('fas fa-undo icon',function(){
						wrapper.editor.execCommand('undo');
					})
				}
				
				if(icon == 'redo'){
					innerBar.addIcon('fas fa-redo icon',function(){
						wrapper.editor.execCommand('redo');
					})
				}
				
				if(icon == 'move'){
					innerBar.addIcon('fas fa-arrows-alt icon pc-hide',function(){
						wrapper.cursorHelper.open();
					})
				}
				
				if(icon == 'close'){
					innerBar.addIcon('fas fa-times icon',function(){
						innerBar.hide();
					})
				}
            }
			
            var mobileCursorActivityHandler = function(bar) {
                var lh = editor.defaultTextHeight();
                var top = editor.cursorCoords(true, 'local').top;
                var scrollTo = top -
                    bar.height() - 2 * lh;
                if (scrollTo < 0) {
                    innerBarElement.css({
                        "top": (editor.cursorCoords(true).top + 2 * lh) + "px"
                    });
                    bar.show();
                } else {
                    var scrollElement = editor.getScrollerElement();
                    var elem = $(scrollElement);
                    if (elem[0].scrollHeight - elem.scrollTop() -
                        elem.outerHeight() < 0) {
                        var top = editor.cursorCoords(true).top - 2 * lh -
                            bar.height() - $("#heather_toolbar").height();
                        if (top > 0) {
                            innerBarElement.css({
                                "top": (editor.cursorCoords(true).top - 2 *
                                    lh - bar.height()) + "px"
                            });

                            bar.show();
                        } else {
                            innerBarElement.css({
                                "top": (editor.cursorCoords(true).top + 2 * lh) + "px"
                            });
                            bar.show();
                        }

                    } else {
                        var _top = editor.cursorCoords(true).top;
                        var showBar = function() {
                            editor.scrollTo(0, scrollTo);
                            setTimeout(function() {
                                var h = editor.cursorCoords(true).top;
                                var top = h > bar.height() + 2 * lh;
                                innerBarElement.css({
                                    "top": top ? (h - 2 * lh - bar.height()) + "px" : (h + 2 * lh) + "px"
                                });
                                bar.show();
                            }, 50)
                        }

                        showBar();
                    }
                }
            }

            if (!CodeMirror.browser.mobile) {
				var posBar = function(){
					var lh = editor.defaultTextHeight();
					innerBarElement.css({
						"top": (editor.cursorCoords(true).top + 2 * lh) + "px",
					});
					innerBar.show();
				}
                editor.on('cursorActivity', posBar);
				var lastScrollTo;
				var changeHandler = function(){
					var lh = editor.defaultTextHeight();
					var top = editor.cursorCoords(true, 'local').top;
					var scrollTo = top  - 301;
					if((!lastScrollTo && scrollTo > 0) || scrollTo > lastScrollTo+2*lh){
						$(editor.getScrollerElement()).stop(true).animate({ scrollTop: scrollTo }, 500,function(){	
							posBar();
						});
						lastScrollTo = scrollTo;
					}
				}
			
				editor.on('change',changeHandler);
                editor.getScrollerElement().addEventListener('touchmove', function(evt) {
                    innerBar.hide();
                });
                editor.on('scroll', function() {
					innerBar.hide();
                })
            } else {

                editor.on('cursorActivity', function() {
                    mobileCursorActivityHandler(innerBar);
                });

                editor.getScrollerElement().addEventListener('touchmove', function(evt) {
                    innerBar.hide();
                });
            }
        }

        function initToolbar(wrapper) {
            var editor = wrapper.editor;
            var theme = wrapper.theme;
            var cm = editor;
            var config = wrapper.config;
            var themeMode = (function() {
                var toolbarHandler = function(e) {
                    if ($(e.target).hasClass('fa-cog')) {
                        return;
                    }
                    colorPicker(theme.toolbar.color, function(color) {
                        theme.toolbar.color = color;
                        theme.render();
                        wrapper.saveTheme();
                    });
                }
                var statHandler = function() {
                    colorPicker(theme.stat.color, function(color) {
                        theme.stat.color = color;
                        theme.render();
                        wrapper.saveTheme();
                    });
                }
                var searchHelprHandler = function() {
                    colorPicker(theme.searchHelper.color, function(color) {
                        theme.searchHelper.color = color;
                        theme.render();
                        wrapper.saveTheme();
                    });
                }
				
				var cursorHelprHandler = function() {
                    colorPicker(theme.cursorHelper.color, function(color) {
                        theme.cursorHelper.color = color;
                        theme.render();
                        wrapper.saveTheme();
                    });
                }
                var barHandler = function() {
                    colorPicker(theme.bar.color, function(color) {
                        theme.bar.color = color;
                        theme.render();
                        wrapper.saveTheme();
                    });
                }
                var cloneBar;
                var setTheme = false;
                var changeThemeHandler = function() {
                    async function getTheme() {
                        setTheme = true;
                        const {
                            value: _theme
                        } = await Swal.fire({
                            input: 'select',
                            inputValue: theme.editor.theme || '',
                            inputOptions: {
                                '3024-day': '3024-day',
                                '3024-night': '3024-night',
                                'abcdef': 'abcdef',
                                'ambiance-mobile': 'ambiance-mobile',
                                'ambiance': 'ambiance',
                                'base16-dark': 'base16-dark',
                                'base16-light': 'base16-light',
                                'bespin': 'bespin',
                                'blackboard': 'blackboard',
                                'cobalt': 'cobalt',
                                'colorforth': 'colorforth',
                                'darcula': 'darcula',
                                'dracula': 'dracula',
                                'duotone-dark': 'duotone-dark',
                                'duotone-light': 'duotone-light',
                                'eclipse': 'eclipse',
                                'elegant': 'elegant',
                                'erlang-dark': 'erlang-dark',
                                'gruvbox-dark': 'gruvbox-dark',
                                'hopscotch': 'hopscotch',
                                'icecoder': 'icecoder',
                                'idea': 'idea',
                                'isotope': 'isotope',
                                'lesser-dark': 'lesser-dark',
                                'liquibyte': 'liquibyte',
                                'lucario': 'lucario',
                                'material': 'material',
                                'mbo': 'mbo',
                                'mdn-like': 'mdn-like',
                                'midnight': 'midnight',
                                'monokai': 'monokai',
                                'neat': 'neat',
                                'neo': 'neo',
                                'night': 'night',
                                'oceanic-next': 'oceanic-next',
                                'panda-syntax': 'panda-syntax',
                                'paraiso-dark': 'paraiso-dark',
                                'paraiso-light': 'paraiso-light',
                                'pastel-on-dark': 'pastel-on-dark',
                                'railscasts': 'railscasts',
                                'rubyblue': 'rubyblue',
                                'seti': 'seti',
                                'shadowfox': 'shadowfox',
                                'solarized': 'solarized',
                                'ssms': 'ssms',
                                'the-matrix': 'the-matrix',
                                'tomorrow-night-bright': 'tomorrow-night-bright',
                                'tomorrow-night-eighties': 'tomorrow-night-eighties',
                                'ttcn': 'ttcn',
                                'twilight': 'twilight',
                                'vibrant-ink': 'vibrant-ink',
                                'xq-dark': 'xq-dark',
                                'xq-light': 'xq-light',
                                'yeti': 'yeti',
                                'zenburn': 'zenburn'
                            },
                            inputPlaceholder: '选择主题',
                            showCancelButton: true
                        });
                        if (_theme) {
							theme.setEditorTheme(editor,_theme,function(){
								theme.render();
								wrapper.saveTheme();
							});
                        }
                        setTimeout(function() {
                            setTheme = false;
                        }, 1000)
                    }
                    if (!setTheme) {
                        getTheme();
                    }
                }
                var changeMemaidThemeHandler = function() {
                    async function getTheme() {
                        const {
                            value: _theme
                        } = await Swal.fire({
                            input: 'select',
                            inputValue: theme.mermaid.theme || '',
                            inputOptions: {
                                'default': 'default',
                                'forest': 'forest',
                                'dark': 'dark',
                                'neutral': 'neutral'
                            },
                            inputPlaceholder: '选择主题',
                            showCancelButton: true
                        });
                        if (_theme) {
                            theme.mermaid.theme = _theme;
							wrapper.saveTheme();
                            wrapper.doRender(false);
                            wrapper.doSync();
                        }
                    }
                    getTheme();
                }


                var clonedTheme;
                var isThemeMode = false;

                function inThemeMode() {
                    isThemeMode = true;
                    clonedTheme = theme.clone();
                    $('<link>').appendTo('head').attr({
                        id: 'colorpicker-css',
                        type: 'text/css',
                        rel: 'stylesheet',
                        href: config.res_colorpickerCss || 'colorpicker/dist/css/bootstrap-colorpicker.min.css'
                    });
                    $('<script>').appendTo('body').attr({
                        id: 'colorpicker-js',
                        src: config.res_colorpickerJs || 'colorpicker/dist/js/bootstrap-colorpicker.min.js'
                    });
                    editor.setOption('readOnly', true);
                    $("#heather_searchHelper input").attr('value', '点击设置字体颜色');
                    $("#heather_searchHelper").children().addClass('noclick');
					$("#heather_cursorHelper").children().addClass('noclick');
                    wrapper.searchHelper.open();
                    wrapper.cursorHelper.open();
                    $("#heather_searchHelper").on('click', searchHelprHandler);
                    $("#heather_cursorHelper").on('click', cursorHelprHandler);
                    $("#heather_toolbar").children().addClass('noclick');
                    $(configIcon).removeClass('noclick');
                    $("#heather_toolbar").on('click', toolbarHandler);
                    $("#heather_stat").text("点击设置字体颜色").show();
                    $("#heather_stat").on('click', statHandler);
                    editor.on('cursorActivity', changeThemeHandler);
                    $("#heather_out").on('click', '.mermaid', changeMemaidThemeHandler);
                    cloneBar = $("#heather_innerBar").clone();
                    cloneBar.css({
                        'visibility': 'visible',
                        'top': '100px'
                    });
                    cloneBar.children().addClass('noclick');
                    $("#heather_in").append(cloneBar);
                    cloneBar.on('click', barHandler);
                }

                function outThemeMode() {
                    isThemeMode = false;
                    cloneBar.off('click', barHandler);
                    cloneBar.remove();
                    $("#heather_searchHelper").off('click', searchHelprHandler);
                    $("#heather_cursorHelper").off('click', cursorHelprHandler);
                    $("#heather_searchHelper input").removeAttr('value');
                    editor.off('cursorActivity', changeThemeHandler);
                    $("#heather_toolbar").off('click', toolbarHandler);
                    $("#heather_stat").off('click', statHandler);
                    $("#heather_out").off('click', '.mermaid', changeMemaidThemeHandler);
                    $("#heather_stat").text("").hide();
                    $('.noclick').removeClass('noclick');
                    editor.setOption('readOnly', false);
                    wrapper.searchHelper.close();
                    wrapper.cursorHelper.close();
                }


                var colorPicker = function(currentColor, callback) {
                    async function getColor() {
                        const {
                            value: color
                        } = await Swal.fire({
                            html: '<div class="_colorpicker"></div>',
                            showCancelButton: true
                        });
                    }
                    getColor();
                    var colorpickerElement = $(Swal.getContent()).find('._colorpicker');
                    colorpickerElement.colorpicker({
                        inline: true,
                        container: true,
                        template: '<div class="colorpicker">' +
                            '<div class="colorpicker-saturation"><i class="colorpicker-guide"></i></div>' +
                            '<div class="colorpicker-hue"><i class="colorpicker-guide"></i></div>' +
                            '<div class="colorpicker-alpha">' +
                            '   <div class="colorpicker-alpha-color"></div>' +
                            '   <i class="colorpicker-guide"></i>' +
                            '</div>' +
                            '</div>'
                    });
                    if (currentColor) {
                        colorpickerElement.colorpicker('setValue', currentColor);
                    }
                    colorpickerElement.on('colorpickerChange', function(event) {
                        if (event.color && callback) {
                            callback(event.color.toString());
                        }
                    });
                }

                return {
                    toggle: function() {
                        if (isThemeMode) {
                            outThemeMode();
                        } else {
                            inThemeMode();
                        }
                        return isThemeMode;
                    },
                    isThemeMode: function() {
                        return isThemeMode;
                    }
                }
            })();

            var configIcon;
            var icons = config.toolbar_icons || ['toc', 'innerBar', 'backup', 'search', 'config', 'expand'];
            
			

			for (var i = 0; i < icons.length; i++) {
                var icon = icons[i];
                if (icon == 'toc') {
                    wrapper.toolbar.addIcon('fas fa-book icon mobile-hide nofullscreen', function() {
                        toggleToc();
                    });
                }

                if (icon == 'innerBar') {
                    wrapper.innerBar.keepHidden = true;
                    wrapper.innerBar.hide();
                    wrapper.toolbar.addIcon('far icon fa-square', function(ele) {
                        toggleInnerbar(ele);
                    });
                }
				
                if (icon == 'search') {
                    wrapper.toolbar.addIcon('fas fa-search icon', function(){
						wrapper.execCommand('search');
					});
                }

                if (icon == 'backup' && wrapper.config.backupEnable !== false) {
                    wrapper.toolbar.addIcon('fas icon fa-upload ', function(ele) {
                        wrapper.backup.backup();
                    });
                    wrapper.toolbar.addIcon('fas icon fa-download ', function(ele) {
                        selectDocuments(wrapper.backup);
                    });
					var newDocumentHandler = function(ele) {
                        newDocument(wrapper.backup);
                    };
                    wrapper.toolbar.addIcon('far fa-file icon',newDocumentHandler);
                }

                if (icon == 'config') {
                    wrapper.toolbar.addIcon('fas icon fa-cog nofullscreen', function() {
                        swal({
                            html: '<input type="checkbox"  />主题编辑模式 <p style="margin-top:0.5rem"><button style="margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;">自定义css</button><button style="margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #dc3545;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;">重置主题</button></p>'
                        });
                        var cb = $(Swal.getContent().querySelector('input'));
                        cb.prop('checked', themeMode.isThemeMode);
                        cb.change(function() {
                            var isThemeMode = themeMode.toggle();
                        });
						var buttons = Swal.getContent().querySelectorAll('button');
                        $(buttons[0]).click(function() {
                            writeCustomCss();
                        });
						$(buttons[1]).click(function() {
                             Swal.fire({
								title: '确定要重置主题吗?',
								type: 'warning',
								showCancelButton: true,
								confirmButtonColor: '#3085d6',
								cancelButtonColor: '#d33'
							}).then((result) => {
								if (result.value) {
									wrapper.resetTheme();
								}
							})
                        });
                    }, function(ele) {
                        configIcon = ele;
                    })
                }

                if (icon == 'expand') {
                    wrapper.toolbar.addIcon('fas fa-expand icon mobile-hide', function(ele) {
                        if ($(ele).hasClass('fa-expand')) {
                            wrapper.requestFullScreen();
                        } else {
                            wrapper.exitFullScreen();
                        }
                    }, function(ele) {
                        if (screenfull.enabled) {

                            var toggleHandler = function() {
                                if (screenfull.isFullscreen) {
                                    $(ele).removeClass('fa-expand').addClass('fa-compress');
                                } else {
                                    $(ele).removeClass('fa-compress').addClass('fa-expand');
                                }
                            };
                            wrapper.onRemove(function() {
                                screenfull.off('change', toggleHandler);
                            })
                            screenfull.on('change', toggleHandler);
                        }
                    });
                }
            }

            var isToc = false;

            function toggleToc() {
                if (isToc) {
                    wrapper.toEditor(function() {
                        isToc = false
                    });
                } else {
                    wrapper.toToc(function() {
                        isToc = true
                    });
                }
            }

            var innerBar = wrapper.innerBar;

            function toggleInnerbar(ele) {
                innerBar.keepHidden = !innerBar.keepHidden;
                if (innerBar.keepHidden) {
                    innerBar.hide();
                    $(ele).addClass("fa-square").removeClass("fa-check-square");
                } else {
                    $(ele).addClass("fa-check-square").removeClass("fa-square");
                }
            }

            function selectDocuments(backup) {
                var documents = backup.getDocuments();
                for (var i = documents.length - 1; i >= 0; i--) {
                    if (documents[i].title == 'default') {
                        documents.splice(i, 1);
                        break;
                    }
                }
                if (documents.length == 0) {
                    swal('没有保存的文档');
                } else {
                    var html = '<table style="width:100%">';
                    for (var i = 0; i < documents.length; i++) {
                        var doc = documents[i];
                        html += '<tr><td>' + doc.title + '</td><td><i class="fas fa-times" data-title="' + doc.title + '" style="margin-right:20px;cursor:pointer"></i><i data-title="' + doc.title + '" class="fas fa-arrow-down" style=";cursor:pointer"></i></td><tr>';
                    }
                    html += '</table>';
                    swal({
                        html: html
                    });
                    $(Swal.getContent()).find('.fa-times').click(function() {
                        var title = $(this).data('title');
                        Swal.fire({
                            title: '确定要删除吗?',
                            type: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33'
                        }).then((result) => {
                            if (result.value) {
                                backup.deleteDocument(title);
                                selectDocuments(backup);
                            }
                        })
                    })

                    $(Swal.getContent()).find('.fa-arrow-down').click(function() {
                        var title = $(this).data('title');
                        Swal.fire({
                            title: '确定要加载吗?',
                            type: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33'
                        }).then((result) => {
                            if (result.value) {
                                backup.loadDocument(title);
                            }
                        })
                    })
                }
            }

            function newDocument(backup) {
                Swal.fire({
                    title: '要打开一篇新文档吗?',
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33'
                }).then((result) => {
                    if (result.value) {
                        backup.newDocument();
                    }
                })
            }

            function writeCustomCss() {
                async function write() {
                    const {
                        value: css
                    } = await Swal.fire({
                        input: 'textarea',
                        inputPlaceholder: 'css',
                        inputValue: theme.customCss || '',
                        showCancelButton: true
                    })
                    if (css) {
                        theme.customCss = css;
                        theme.render();
                        wrapper.saveTheme();
                    }
                }
                write();
            }

        }

        function renderToc() {
            var headings = $("#heather_out").children('h1,h2,h3,h4,h5,h6');
            var toc = [];
			
            for (var i = 0; i < headings.length; i++) {
                var head = headings[i];
                var index = head.tagName.substring(1);
                var line = head.getAttribute('data-line');
                if (toc.length == 0) {
                    toc.push([{
                        indent: index,
                        name: head.textContent,
                        line: line
                    }]);
                } else {
                    var last = toc[toc.length - 1];
                    var first = last[0];
                    if (index > first.indent) {
                        last.push({
                            indent: index,
                            name: head.textContent,
                            line: line
                        });
                    } else {
                        toc.push([{
                            indent: index,
                            name: head.textContent,
                            line: line
                        }]);
                    }
                }
            }

            var html = '<h1>TOC</h1><hr>';
            if (toc.length > 0) {
                for (var i = 0; i < toc.length; i++) {
                    var block = toc[i];
                    for (var j = 0; j < block.length; j++) {
                        var item = block[j];
                        var indent = item.indent;
                        html += '<h' + indent + ' data-line="' + item.line + '">' + item.name + '</h' + indent + '>';
                    }
                }
            }
            try {
                var div = document.createElement("div");
                div.setAttribute('id', "heather_toc");
                div.innerHTML = html;
                morphdom($("#heather_toc")[0], div);
            } catch (e) {
                $("#heather_toc").html(html)
            };
        }

        return _EditorWrapper;
    })();

    return _EditorWrapper;

})();