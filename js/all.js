var EditorWrapper = (function() {

    'use strict';
	
    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
	
	Node.prototype.blockDefault = function(){
		return this.nodeType == 1 && "block" == window.getComputedStyle(this, "").display;
	}
	
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
	var veryThinHtml = '&#8203;';
    var veryThinChar = '​';
    var tabSpace = "	";
	var chrome = CodeMirror.browser.chrome;
		
	var turndown = (function(){
		
		var alignMap = {
			'': ' -- ',
			'left': ' :-- ',
			'center': ' :--: ',
			'right': ' --: '
		}
		
		var createTurndownservice = function(){
			var turndownService = new window.TurndownService({
				'headingStyle': 'atx',
				'codeBlockStyle': 'fenced',
				'emDelimiter': '*',
				'bulletListMarker': '-',
				defaultReplacement: function(innerHTML, node) {
					return node.blockDefault() ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML
				}
			});
			turndownService.use(window.turndownPluginGfm.gfm);
			turndownService.addRule('paragraph', {
				filter: ['p'],
				replacement: function(content) {
					var lines = content.replaceAll('\r', '').split('\n');
					var rst = '';
					for (var i = 0; i < lines.length; i++) {
						var line = lines[i];
						if (line == '  ') {
							rst += '<br>';
						} else {
							rst += line;
						}
						if (i < lines.length - 1)
							rst += '\n'
					}
					return '\n\n' + rst + '\n\n';
				}
			});
			
			turndownService.addRule('fenceblock', {
				filter: function(node, options) {
					return (
						options.codeBlockStyle === 'fenced' &&
						node.nodeName === 'PRE' &&
						node.firstChild &&
						node.firstChild.nodeName === 'CODE'
					)
				},

				replacement: function(content, node, options) {
					var className = node.firstChild.className || '';
					var language = (className.match(/language-(\S+)/) || [null, ''])[1];

					var textContent = node.firstChild.textContent;
					var lines = textContent.split('\n');
					var lastLine = lines[lines.length - 1];
					var lineBreaker = lastLine.replaceAll('\n', '') == '' ? '' : '\n';
					return '\n\n' + options.fence + " "+language + '\n' + textContent + lineBreaker + options.fence + '\n\n';
				}
			});

			turndownService.addRule('table', {
				filter: function(node) {
					return node.nodeName === 'TABLE'
				},
				replacement: function(content, node, options) {
					return toMarkdown($(node));
				}
			});

			turndownService.addRule('list', {
				filter: ['ul', 'ol'],
				replacement: function(content, node, options) {
					node.innerHTML = cleanHtml(node.innerHTML);
					return listToMarkdown(node, options, 2);
				}
			});
			
			function listToMarkdown(node, options, indent) {
				var ol = node.tagName == 'OL';
				var childNodes = node.childNodes;
				var rootContent = '';
				for (var i = 0; i < childNodes.length; i++) {
					var child = childNodes[i];
					if (child.nodeType != 1 && child.tagName != 'LI') {
						return  node.outerHTML;
					}
					var prefix = options.bulletListMarker;
					if (ol) {
						prefix = (i + 1) + '.';
					}
					var content = '';
					var subChildNodes = child.childNodes;
					var checkbox = getCheckbox(child);
					var taskList = checkbox != null;
					if (taskList) {
						subChildNodes = child.childNodes;
						if (checkbox.checked) {
							prefix = options.bulletListMarker + ' [x]';
						} else {
							prefix = options.bulletListMarker + ' [ ]';
						}
						//check second is paragraph or text node
						var secondChild = subChildNodes[1];
						var appendEmptyNode = true;
						if (secondChild != null) {
							if (secondChild.nodeType == 3) {
								appendEmptyNode = false;
							} else {
								if (secondChild.nodeType == 1 && secondChild.tagName == 'P') {
									if(secondChild.innerHTML.trim() != ''){
										appendEmptyNode = false;
									} else {
										$(secondChild).remove();
									}
								}
							}
						}
						//insert very thin character node
						if (appendEmptyNode) {
							var firstSubChild = subChildNodes[0];
							$(firstSubChild).after(document.createTextNode(veryThinChar));
						}
					}
					var start = taskList ? 1 : 0;
					for (var j = start; j < subChildNodes.length; j++) {
						var subChild = subChildNodes[j];
						var markdown;
						if (subChild.nodeType == 1 && (subChild.tagName == 'OL' || subChild.tagName == 'LI')) {
							markdown = listToMarkdown(subChild, options, indent + 2);
						} else {
							var outerHTML = '';
							if (subChild.nodeType == 3) {
								var value = subChild.nodeValue;
								if(value != veryThinChar && isEmptyText(value)){
									continue;
								}
								outerHTML = '<p>' + value + '</p>';
							} else {
								outerHTML = subChild.outerHTML;
							}
							markdown = turndownService.turndown(outerHTML);
							var firstLineSpaces = getSpaces(indent - 1);
							var spaces = firstLineSpaces + getSpaces(taskList ? 2 : prefix.length);
							var lines = markdown.split('\n');
							var rst = '';
							var needToDeleteStartLines = true;
							for (var k = 0; k < lines.length; k++) {
								var _spaces = ((taskList ? j == 1 : j == 0) && k == 0) ? firstLineSpaces : spaces;
								if (needToDeleteStartLines) {
									if (!lines[k].replaceAll("\n", '') == '') {
										rst += _spaces + lines[k];
										if (k < lines.length - 1) {
											rst += '\n'
										}
										needToDeleteStartLines = false;
									}
								} else {
									rst += _spaces + lines[k];
									if (k < lines.length - 1) {
										rst += '\n'
									}
								}
							}
							markdown = rst;
						}
						content += markdown;
						if (j < subChildNodes.length - 1) {
							content += '\n\n';
						}
					}
					rootContent += prefix + content;
					if (i < childNodes.length - 1) {
						rootContent += '\n';
					}
				}
				return '\n\n' + rootContent + '\n\n';
			}

			function getSpaces(indent) {
				var spaces = '';
				for (var k = 0; k < indent; k++) {
					spaces += ' ';
				}
				return spaces;
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
			return turndownService;
		}
		
		return {create:function(){
			return createTurndownservice();
		}};
	})();
	
	var getCheckbox = function(li) {
		var firstChild = li.childNodes[0];
		if (firstChild == null) {
			return null;
		}
		if (firstChild.nodeType != 1) {
			if(firstChild.nodeType == 3){
				//get next element if exists
				var elem = firstChild;
				var removes = [];
				while(elem != null){
					if(elem.nodeType == 1){
						break;
					}
					if(elem.nodeValue.trim() != ''){
						return null;
					}
					removes.push(elem);
					elem = elem.nextSibling;
				}
				for(var i=0;i<removes.length;i++){
					$(removes[i]).remove();
				}
				if(elem == null){
					return null;
				}
				firstChild = elem;
			}
		}
		if (firstChild.type == 'checkbox') {
			return firstChild;
		}
		if (firstChild.hasAttribute('data-toolbar')) {
			firstChild = firstChild.nextSibling;
		}
		if (firstChild != null && firstChild.nodeType == 1 && firstChild.tagName == 'P') {
			var firstChildFirstChild = firstChild.firstChild;
			if (firstChildFirstChild != null && firstChildFirstChild.nodeType == 1 &&
				firstChildFirstChild.type == 'checkbox') {
				//move checkbox to first	
				var clone = firstChildFirstChild.cloneNode(true);
				$(li).prepend(clone);
				$(firstChildFirstChild).remove();
				return clone;
			}
		}
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
			
		return FileUpload;
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
						return createUnparsedMermaidElement(str).outerHTML;
                    }
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return '<pre class="hljs"><code class="language-'+lang+'">' +
                                hljs.highlight(lang, str, true).value +
                                '</code></pre>';
                        } catch (__) {}
                    }
                }
            });
			this.md.renderer.rules.html_inline = function (tokens, idx /*, options, env */) {
				var token = tokens[idx];
				var content = token.content;
				var document = parseHTML(content);
				for(var child of document.body.children){
					child.setAttribute('data-inline-html','');
				}
				return document.body.innerHTML;
			};
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
       

        MarkdownRender.prototype.getHtml = function(markdownText) {
            return this.md2.render(markdownText);
        }

        MarkdownRender.prototype.renderAt = function(markdownText, element, patch) {
			var me = this;
            var doc = parseHTML(this.md.render(markdownText));
            var hasMermaid = doc.querySelector('.mermaid') != null && this.hasMermaid !== false;
            if (hasMermaid) {
				var theme = this.theme;
                loadMermaid(function(){
					mermaid.initialize({
                        theme: theme.mermaid.theme || 'default'
                    });
					$(element).find('.mermaid').each(function(){
						if(this.getAttribute("data-processed") == null){
							try{
								mermaid.parse(this.textContent);
								mermaid.init({}, $(this));
							}catch(e){
								this.innerHTML = '<pre>'+e.str+'</pre>'
							}
						}
					});
				});
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
		
            var hasKatex = (element.querySelector(".katex-inline") != null 
							|| element.querySelector(".katex-block") != null) && this.hasKatex !== false;
            if (hasKatex) {
                loadKatex(function(){
					var inlines = element.querySelectorAll(".katex-inline");
					for (var i = 0; i < inlines.length; i++) {
						var inline = inlines[i];
						var expression = inline.textContent;
						var result = parseKatex(expression,false);
						var div = document.createElement('div');
						div.innerHTML = result;
						var child = div.firstChild;
						child.setAttribute('data-inline-katex','');
						inline.outerHTML = child.outerHTML;
					}
					var blocks = element.querySelectorAll(".katex-block");
					for (var i = 0; i < blocks.length; i++) {
						var block = blocks[i];
						var expression = block.textContent;
						var result = parseKatex(expression,true);
						var div = document.createElement('div');
						div.innerHTML = result;
						var child = div.firstChild;
						child.setAttribute('data-block-katex','');
						if(block.classList.contains('line')){
							child.classList.add('line');
							child.setAttribute('data-line',block.getAttribute('data-line'))
							child.setAttribute('data-end-line',block.getAttribute('data-end-line'))
						}
						block.outerHTML = child.outerHTML;
					}
				})
            }
			$(element).find('.mermaid').each(function(){
				if(!this.hasAttribute("data-processed")){
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

        return MarkdownRender;
    })();


    var Bar = (function() {

        function Bar(element) {
            element.setAttribute('data-toolbar', '');
            this.element = $(element);
            this.keepHidden = false;
        }


        Bar.prototype.hide = function() {
            this.element.css({
                "visibility": "hidden"
            });
            this.hidden = true;
        }

        Bar.prototype.remove = function() {
            this.element.remove();
        }

        Bar.prototype.height = function() {
            return this.element.height();
        }

        Bar.prototype.width = function() {
            return this.element.width();
        }

        Bar.prototype.length = function() {
            return this.element[0].childNodes.length;
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

        Bar.prototype.clear = function() {
            $(this.element).html('');
        }

        function createElement(icon, handler) {
            var i = document.createElement('i');
            i.setAttribute('class', icon);
            i.setAttribute('style', 'cursor: pointer;margin-right:20px');
            if (handler) {
				var defaultEvent = mobile ? 'click' : 'mousedown';
				var isFunction = typeof handler === "function";
				var event = isFunction ? defaultEvent :  (handler.event || defaultEvent);
				
                i.addEventListener(event, function(e) {
					if (e.cancelable) {
						e.preventDefault();
					}
					
					if(isFunction){
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
            var toolbar = this.element[0];
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
            var elements = this.element[0].childNodes;
            for (var i = elements.length - 1; i >= 0; i--) {
                var element = elements[i];
                if (deleteChecker(element)) {
                    this.element[0].removeChild(element);
                }
            }
        }

        return Bar;
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

        return Sync;
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
						editor.removeKeyMap(languageInputKeyMap);
					}
					state.running = false;
					state.cursor = undefined;
				}
				
				var languageInputKeyMap = {
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
				hljsLanguages.push('mermaid');
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
											editor.addKeyMap(languageInputKeyMap);
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
			
			return HljsTip;
		})();
		
		function Tooltip(editor){
			this.hljsTip = new HljsTip(editor);
		}
		
		Tooltip.prototype.enable = function(){
			this.hljsTip.enable();
		}
		
		return Tooltip;
		
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

		return Backup;
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

		return ThemeHandler;
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
					//cm.scrollTo(0, coords.top);
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
			
			return SearchUtil;
			
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
			
			var searchUtil = new SearchUtil(editor);
			
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

		return SearchHelper;

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
			
			return CursorUtil;
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
			var cursorUtil = new CursorUtil(editor);
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
		return CursorHelper;
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
						Swal.getCloseButton().click();
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
		
		_EditorWrapper.prototype.registerWysiwygEditorFactory = function(config){
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
            var wrapper = this;
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
			this.turndownService = turndown.create();
			this.themeHandler = new ThemeHandler(config);
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
					return wrapper.turndownService.turndown(content);
				} else return "";
			});
			
            if (!mobile) {
                var stat_timer;
                wrapper.onRemove(function() {
                    if (stat_timer) {
                        clearTimeout(stat_timer);
                    }
                });
                editor.on('change', function() {
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
				
				var changeHandler = function(){
					wrapper.getExtraEditorSpace();
				}
			
				editor.on('change',changeHandler);
				
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
                    if (mobile || wrapper.inFullscreen()) {
                        wrapper.toEditor();
                        //wrapper.editor.focus();
                    }
                }, 500)
            })
			
            this.theme = theme;
            this.sync = new Sync(editor, $("#heather_out")[0], config);
            this.render = new Render(config, theme);
			this.searchHelper = new SearchHelper(editor);
			this.cursorHelper = new CursorHelper(editor);
			this.tooltip = new Tooltip(editor);
			this.tooltip.enable();
            this.toolbar = new Bar($("#heather_toolbar")[0]);
            this.editor = editor;
            this.config = config;
			this.doRender(false);
			if(this.config.backup_enable !== false){
				this.backup = new Backup(this);
			}
            this.innerBar = new InnerBar(this);
			this.inlinePreview = new InlinePreview(this);
			initKeyMap(this);
            initToolbar(this);
            this.fullscreenMode = new FullscreenMode(this);
			this.nearWysiwyg = new NearWysiwyg(this);
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
						new FileUpload(f,wrapper).start();
					}
				});
			}
			if(!mobile){
				this.enableAutoRender();
			}

            triggerEvent(this, 'load');
        }
		
		var InlinePreview = (function(){
			function InlinePreview(wrapper){
				this.wrapper = wrapper;
				this.editor = wrapper.editor;
				this.widget = undefined;
				this.started = false;
			}
			
			InlinePreview.prototype.start = function(){
				if(this.started) return ;
				var editor = this.editor;
				var me = this;
				
				var changeHandler = function(){
					if(me.disableCursorActivity !== true){
						me.disableCursorActivity = true;
						me.widget.update();
					}
				}
			
				var cursorActivityHandler = function(){
					if(me.disableCursorActivity === true){
						return ;
					}
					me.widget.update();
				}
				
				this.widget = new Widget(this);
				
				var afterRenderHandler = function(){
					me.disableCursorActivity = false;
					me.widget.update();
				}
				this.editor.on('cursorActivity',cursorActivityHandler);
				this.editor.on('change',changeHandler);
				this.wrapper.on('afterRender',afterRenderHandler);
				this.afterRenderHandler = afterRenderHandler;
				this.changeHandler = changeHandler;
				this.cursorActivityHandler = cursorActivityHandler;
				this.started = true;
				
				toast('预览开启')
			}
			
			
			
			InlinePreview.prototype.stop = function(){
				if(!this.started) return ;
				if(this.widget){
					this.widget.remove();
				}
				this.editor.off('cursorActivity',this.cursorActivityHandler);
				this.editor.off('change',this.changeHandler);
				this.wrapper.off('afterRender',this.afterRenderHandler);
				this.started = false;
				
				toast('预览关闭')
			}
			
			InlinePreview.prototype.isStarted = function(){
				return this.started;
			}
			
			var Widget = (function(){
				var Widget = function(preview){
					this.preview = preview;
					this.create();
				}
				
				Widget.prototype.create = function(){
					var editor = this.preview.editor;
					if(!editor.somethingSelected()){
						var nodeStatus = getNodeStatus(editor);
						var node = nodeStatus.node;
						if(node){
							//create wrap node
							var div = document.createElement('div');
							div.classList.add('markdown-body');
							div.classList.add('inline-preview');
							div.setAttribute('style','visibility:hidden;width:'+editor.getWrapperElement().querySelector('.CodeMirror-code').clientWidth+'px');
							div.appendChild(node);
							var close = document.createElement('i');
							close.classList.add('fas');
							close.classList.add('fa-times');
							close.classList.add('close');
							div.appendChild(close);
							var me = this;
							close.addEventListener('click',function(){
								me.remove();
							});
							this.startLine = nodeStatus.startLine;
							this.endLine = nodeStatus.endLine;
							var cursor = editor.getCursor();
							editor.addWidget({line:0,ch:0}, div);
							$(div).css({top:getWidgetTop(editor)+'px',visibility:'visible'});
							this.preview.wrapper.getExtraEditorSpace();
							this.widget = div;
						}
					}
				}
				
				Widget.prototype.update = function(){
					var me = this;
					if(!this.widget){
						this.create();
					} else {
						var editor = this.preview.editor;
						if(!$.contains(editor.getWrapperElement(),this.widget)){
							this.remove();
							this.create();
						} else {
							if(editor.somethingSelected()){
								this.hide();
							} else {
								var nodeStatus = getNodeStatus(editor);
								var node = nodeStatus.node;
								if(!node){
									this.hide();
								} else {
									this.hide();
									var rootNode = this.widget.firstChild;
									morphdom(rootNode,node);
									this.show();
								}
							}
						}
					}
				}
				
				Widget.prototype.hide = function(){
					if(this.widget)
						$(this.widget).css({'visibility':'hidden'});
				}
				
				Widget.prototype.show = function(){
					if(this.widget){
						var top = getWidgetTop(this.preview.editor);
						$(this.widget).css({'top':top+'px','visibility':'visible'});
					}
				}
				
				Widget.prototype.remove = function(){
					var me = this;
					if(this.widget){
						$(me.widget).remove();
						me.widget == undefined;
					}
				}
				
				var getNodeStatus = function(editor){
					var line = editor.getCursor().line;
					var node ;
					var endLine;
					var startLine;
					$("#heather_out").find('[data-line]').each(function(){
						var _startLine = parseInt(this.getAttribute('data-line'));
						var _endLine = parseInt(this.getAttribute('data-end-line')) - 1;
						if(_startLine <= line && _endLine >=line){
							node = this;
							endLine = _endLine;
							startLine = _startLine;
							return false;
						}
						if(_startLine > line){
							return false;
						}
					});
					return {
						node : node ? node.cloneNode(true) : node,
						endLine : endLine,
						startLine : startLine,
					};
				}
				
				function getWidgetTop(editor){
					var lh = editor.defaultTextHeight();
					return editor.charCoords(editor.getCursor(), "local").top+lh*3.5;
				}
				
				return Widget;
			})();
			
			return InlinePreview;
		})();
		
		var InnerBar = (function(){
			function InnerBar(wrapper){
				var bar = new Bar($("#heather_innerBar")[0]);
				bar.hide();
				this.bar = bar;
				this.wrapper = wrapper;
				init(this);
			}
			
			function init(bar){
				var config = bar.wrapper.config;
				var innerBar = bar.bar;
				var wrapper = bar.wrapper;
				var editor = wrapper.editor;
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
							this.value = null;
							if(file.name)
								new FileUpload(file,wrapper).start();
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
					var innerBarElement = bar.element
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

				editor.getScrollerElement().addEventListener('touchmove', function(evt) {
					innerBar.hide();
				});
				
				if (!mobile) {
					editor.on('cursorActivity', function(){
						bar.pos();
					});
					editor.on('scroll', function() {
						innerBar.hide();
					})
				} else {
					editor.on('cursorActivity', function() {
						mobileCursorActivityHandler(innerBar);
					});
				}
			
			}
			
			InnerBar.prototype.pos = function(){
				if(!mobile){
					var editor = this.wrapper.editor;
					var lh = editor.defaultTextHeight();
					this.bar.element.css({
						"top": (editor.cursorCoords(true).top + 2 * lh) + "px",
					});
					this.bar.show();
				}
			}
			
			InnerBar.prototype.isKeepHidden = function(){
				return this.bar.keepHidden;
			}
			
			InnerBar.prototype.keepHidden = function(){
				this.bar.keepHidden = true;
				this.bar.hide();
			}
			
			InnerBar.prototype.unkeepHidden = function(){
				this.bar.keepHidden = false;
			}
			
			InnerBar.prototype.show = function(){
				this.bar.show();
			}
			
			InnerBar.prototype.hide = function(){
				this.bar.hide();
			}
			
			return InnerBar;
		})();
		
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
					if(wrapper.inFullscreen()){
						wrapper.exitFullScreen();
					} else {
						wrapper.requestFullScreen();
					}
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
					if(wrapper.inFullscreen()){
						wrapper.exitFullScreen();
					} else {
						wrapper.requestFullScreen();
					}
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
		
		EditorWrapper.prototype.enableAutoRender = function(){
			if(this.autoRenderEnable === true) return ;
			var me = this;
            var ms = getDefault(this.config.render_ms, 500);
			var autoRenderHandler = function() {
				if (me.autoRenderTimer) {
					clearTimeout(me.autoRenderTimer);
				}
				me.autoRenderTimer = setTimeout(function() {
					me.doRender(true);
				}, ms)
			};
			this.editor.on('change',autoRenderHandler);
			this.autoRenderHandler = autoRenderHandler;
			this.autoRenderEnable = true;
		}
		
		EditorWrapper.prototype.disableAutoRender = function(){
			if(this.autoRenderEnable  === true){
				this.autoRenderEnable  = false;
				this.editor.off('change',this.autoRenderHandler);
				if (this.autoRenderTimer) {
					clearTimeout(this.autoRenderTimer);
				}
			}
		}
		
		EditorWrapper.prototype.getExtraEditorSpace = function(){
			if(this.disableExtraEditorSpace === true) return;
			var timer = this.extraEditorSpaceTimer;
			if(timer){
				clearTimeout(timer);
			}
			var me = this;
			this.extraEditorSpaceTimer = setTimeout(function(){
				var min = me.config.minLine ||7;
				var length = me.config.lineLength || 15;
				var editor = me.editor;
				var lh = editor.defaultTextHeight();
				editor.focus();
				var cursor = editor.getCursor();
				var bottom = $(window).height()-editor.charCoords(cursor).top;
				if(bottom < min*lh){
					var space = length*lh;
					$('.CodeMirror-code').css({'margin-bottom': space+'px'});
					$('#heather_out').css({'padding-bottom': space+'px'})
					var elem = editor.getScrollerElement();
					var scrollTo = editor.charCoords(cursor,'local').top - space;
					var bar = me.innerBar;
					var keepHidden = !bar.isKeepHidden();
					if(keepHidden)
						bar.keepHidden();
					$(editor.getScrollerElement()).stop(true).animate({ scrollTop: scrollTo }, 'slow',function(){	
						if(keepHidden){
							bar.unkeepHidden();
							bar.pos();
						}
					});
				}
			},200)
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
            this.render.renderAt(this.editor.getValue(), $("#heather_out")[0], patch);
            renderToc();
            triggerEvent(this, 'afterRender');
        }

        EditorWrapper.prototype.remove = function() {
            var me = this;
            var removeHandler = function() {
				Swal.getCloseButton().click();
                triggerEvent(me, 'remove');
                $(me.getFullScreenElement()).removeClass('heather_fullscreen');
                $('body').removeClass('heather_noscroll');
                $('html').removeClass('heather_noscroll');
                $('html,body').scrollTop(me.scrollTop);
                me.wrapperElement.parentNode.removeChild(me.wrapperElement);
            }
            this.fullscreenMode.off();
			removeHandler();
        }

        EditorWrapper.prototype.doSync = function() {
            this.sync.doSync();
        }
		
		var FullscreenMode = (function(){
			function FullscreenMode(wrapper){
				this.fullscreen = false;
				this.keyMap = createKeyMap(wrapper);
				this.wrapper = wrapper;
				var editor = this.wrapper.editor;
				this.outToEditorHandler = function(e) {
                    var keyCode = e.which || e.keyCode;
                    if ((e.ctrlKey || e.metaKey) && keyCode == 37) {
                        $("#heather_out").removeAttr("tabindex");
                        wrapper.toEditor(function() {
							editor.focus();
							var info = editor.state.fullScreenRestore;
							window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }
				this.tocToEditorHandler = function(e) {
                    var keyCode = e.which || e.keyCode;
                    if ((e.ctrlKey|| e.metaKey) && keyCode == 39) {
                        $("#heather_toc").removeAttr("tabindex");
                        wrapper.toEditor(function() {
							editor.focus();
							var info = editor.state.fullScreenRestore;
							window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }
			}
			
			FullscreenMode.prototype.on = function(){
				if(this.fullscreen) return ;
				var wrapper = this.wrapper;
				var editor = wrapper.editor;
				editor.addKeyMap(this.keyMap);

				$("#heather_out").on('keydown', this.outToEditorHandler);
				$("#heather_toc").on('keydown', this.tocToEditorHandler);

				$(wrapper.getFullScreenElement()).addClass('heather_fullscreen');

				var wrap = editor.getWrapperElement();
				//from CodeMirror display fullscreen.js
				editor.state.fullScreenRestore = {
					scrollTop: window.pageYOffset,
					scrollLeft: window.pageXOffset,
					width: wrap.style.width,
					height: wrap.style.height
				};
				
				wrap.style.width = "";
				wrap.style.height = "auto";
				wrap.className += " CodeMirror-fullscreen";
				document.documentElement.style.overflow = "hidden";
				editor.refresh();
				wrapper.toEditor(function() {
					wrapper.doRender(false);
				}, 0);
				this.fullscreen = true;
			}
			
			FullscreenMode.prototype.isFullscreen = function(){
				return this.fullscreen;
			}
			
			FullscreenMode.prototype.off = function(){
				if(!this.fullscreen) return ;
				var wrapper = this.wrapper;
				wrapper.inlinePreview.stop();
				var editor = this.wrapper.editor;
				editor.removeKeyMap(this.keyMap);
				$("#heather_out").off('keydown', this.outToEditorHandler);
				$("#heather_toc").off('keydown', this.tocToEditorHandler);
				$(this.wrapper.getFullScreenElement()).removeClass('heather_fullscreen');
				var wrap = editor.getWrapperElement();
				wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
				document.documentElement.style.overflow = "";
				var info = editor.state.fullScreenRestore;
				wrap.style.width = info.width;
				wrap.style.height = info.height;
				window.scrollTo(info.scrollLeft, info.scrollTop);
				editor.refresh();
				wrapper.toEditor(function() {
					wrapper.doRender(false);
				}, 0);
				this.fullscreen = false;
			}
			
			function createKeyMap(wrapper){
				var cm = wrapper.editor;
                var wrap = cm.getWrapperElement();
				
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
				
				var toggleInlinePreviewHandler = function(){
					var inlinePreview = wrapper.inlinePreview;
					if(inlinePreview.isStarted()){
						inlinePreview.stop();
					}else{
						inlinePreview.start();
					}
				}
				
				
				return mac ? {
					'Cmd-Right': toPreviewHandler,
					'Cmd-Left' : toTocHandler,
					'Cmd-P':toggleInlinePreviewHandler
				} : {
					'Ctrl-Right': toPreviewHandler,
					'Ctrl-Left' : toTocHandler,
					'Ctrl-P':toggleInlinePreviewHandler
				} 
			}
			
			return FullscreenMode;
			
		})();

        EditorWrapper.prototype.requestFullScreen = function() {
            if (!mobile){
				this.fullscreenMode.on();
			}
        }
		
		EditorWrapper.prototype.inFullscreen = function() {
            return this.fullscreenMode.isFullscreen();
        }

        EditorWrapper.prototype.getFullScreenElement = function() {
            return document.body;
        }

        EditorWrapper.prototype.exitFullScreen = function() {
            if (!mobile) {
               this.fullscreenMode.off();
            }
        }

        EditorWrapper.prototype.enableSync = function() {
            if (!this.syncEnable) {
                editor.on('scroll', this.scrollHandler)
                this.syncEnable = true;
            }
        }
		
		EditorWrapper.prototype.getHtml = function(markdown) {
            return this.render.getHtml(markdown || this.editor.getValue());
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
                var eventHandler = this.eventHandlers[i];
                if (eventHandler.name === name && eventHandler.handler === handler) {
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
			this.nearWysiwyg.disable();
			var me = this;
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
			this.nearWysiwyg.disable();
			var me = this;
            var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
            $("#heather_wrapper").animate({
                scrollLeft: 0
            }, ms, function() {
				
                if (callback) callback();
            });
        }

        EditorWrapper.prototype.toPreview = function(callback, _ms) {
            var me = this;
            if (mobile || me.inFullscreen()) {
                this.editor.unfocus();
                if (mobile) {
                    this.doRender(true);
                    this.doSync();
                }
                var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
                $("#heather_wrapper").animate({
                    scrollLeft: $("#heather_out")[0].offsetLeft
                }, ms, function() {
					if(me.config.disableWysiwyg !== true){
						me.nearWysiwyg.enable();
					}
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
            var icons = config.toolbar_icons || ['toc', 'innerBar', 'backup', 'search', 'config'];
            
			

			for (var i = 0; i < icons.length; i++) {
                var icon = icons[i];
                if (icon == 'toc') {
                    wrapper.toolbar.addIcon('fas fa-book icon mobile-hide nofullscreen', function() {
                        toggleToc();
                    });
                }

                if (icon == 'innerBar') {
                    wrapper.innerBar.keepHidden();
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
                if (!innerBar.isKeepHidden()) {
                    innerBar.keepHidden();
					$(ele).addClass("fa-square").removeClass("fa-check-square");
                } else {
					innerBar.unkeepHidden();
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
	
		
	
	//======================================== 2.0
	var NearWysiwyg = (function(){
		
		var editorFactories = [];
		
		function NearWysiwyg(wrapper){
			this.wrapper = wrapper;
			this.editor = wrapper.editor;
			this.rootElem = document.getElementById('heather_out');
			this.inlineMath = new InlineMath(this.wrapper);
			this.wrapper.turndownService.addRule('mermaid', {
				filter: function (node) {
					return node.tagName == 'DIV' && node.classList.contains('mermaid-block');
				},
				  replacement: function (content,node,options) {
					var expression = getMermaidExpression(node);
					var lines = expression.split('\n');
					var lastLine = lines[lines.length - 1];
					var lineBreaker = lastLine.replaceAll('\n', '') == '' ? '' : '\n';
					return '\n\n' + options.fence + " mermaid" + '\n' + expression + lineBreaker + options.fence + '\n\n';
				  }
			});	
			
			this.wrapper.turndownService.addRule('katex-inline', {
				filter: function (node) {
					return node.hasAttribute('data-inline-katex');
				},

				  replacement: function (content,node) {
					 return '$'+getKatexExpression(node)+'$';
				  }
			});		
			this.wrapper.turndownService.addRule('katex-block', {
				filter: function (node) {
					return node.hasAttribute('data-block-katex');
				},

				  replacement: function (content,node) {
					 return '\n$$\n'+getKatexExpression(node)+'\n$$\n';
				  }
			});	
			this.wrapper.turndownService.addRule('html-inline', {
				filter: function (node) {
					return node.hasAttribute('data-inline-html');
				},

				replacement: function (content,node) {
					node.removeAttribute('data-inline-html');
					return node.outerHTML;
				}
			});	
			this.mediaHelper = new MediaHelper(this);
		}
		
		NearWysiwyg.prototype.disable = function(){
			if(this.isEnable !== true) return ;
			this.bar.remove();
			this.stopCurrentEditor();
			this.wrapper.disableExtraEditorSpace = false;
			this.wrapper.enableAutoRender();
			this.rootElem.classList.remove('heather_wysiwyg');
			$(this.rootElem).off('click','[data-line]',this.clickHandler);
			this.isEnable = false;
			toast('所见即所得模式关闭');
		}
		
		NearWysiwyg.prototype.enable = function(){
			if(this.isEnable === true) return ;
			this.rootElem.classList.add('heather_wysiwyg');
			this.wrapper.doRender(true);
			this.wrapper.disableExtraEditorSpace = true;
			this.wrapper.disableAutoRender();
			
			var me = this;
			
			var clickHandler = function(e){
				var elem = e.target;
				while(elem != null){
					if(elem.hasAttribute('data-line')){
						break;
					}
					elem = elem.parentElement;
				}
				if(me.currentEditor){
					if(me.currentEditor.element != elem){
						me.stopCurrentEditor();
					} else {
						return ;
					}
				}
				if(elem.hasAttribute('data-html')){
					toast('无法编辑由原生html生成的块','error');
					return ;
				}
				var factory = getEditorFactoryByElement(elem);
				if(factory != null){
					var editor = factory.create(elem,me.wrapper);
					if(editor != null){
						startEdit(me,editor,elem);
						me.currentEditor = editor;
					}
				} else {
					toast('没有找到合适的编辑器','error')
				}
			}
			$(this.rootElem).on('click','[data-line]',clickHandler);
			
			//add toolbar 
			var toolbar = document.createElement('div');
			toolbar.classList.add('heather_wysiwyg_toolbar');
			$("#heather_wrapper").append(toolbar);
			var bar = new Bar(toolbar);
			
			var ElementInsert = (function(){
				var started = false;
				var start = function(){
					var rootElem = me.rootElem;
					if(started === true) return;
					me.stopCurrentEditor();
					$(rootElem).off('click','[data-line]',clickHandler);
					rootElem.classList.add('heather_opacity-5');
					var children = $(rootElem).children('[data-line]');
					$.each(children, function() {
						var p = document.createElement('div');
						p.classList.add('heather_p');
						p.innerHTML = '<i class="fas fa-plus middle-icon"></i>';
						p.querySelector('i').addEventListener('click', function() {
							var p = this.parentElement;
							var prev = p.previousElementSibling;
							showEditorFactoryDialog(function(factory){
								var element = factory.createElement();
								if(prev == null){
									$(rootElem).prepend(element);
								} else {
									$(prev).after(element);
								}
								var editor = factory.create(element,me.wrapper);
								startEdit(me,editor,element);
								stop();
							})
						});
						$(this).before(p);
					})
					started = true;
				}
				var stop = function(){
					if(started !== true) return;
					me.rootElem.classList.remove('heather_opacity-5');
					$(me.rootElem).find('.heather_p').remove();
					$(me.rootElem).on('click','[data-line]',clickHandler);
					started = false;
				}
				
				return {
					start : start,
					stop : stop,
					isStarted : function(){return started}
				}
			})();
			
			bar.addIcon('fas fa-align-justify middle-icon', function() {
				if(ElementInsert.isStarted()){
					ElementInsert.stop();
				} else {
					ElementInsert.start();
				}
			});
			
			bar.addIcon('fas fa-plus middle-icon',function(){
				ElementInsert.stop();
				showEditorFactoryDialog(function(factory){
					me.stopCurrentEditor();
					var element = factory.createElement();
					me.rootElem.appendChild(element);
					var editor = factory.create(element,me.wrapper);
					startEdit(me,editor,element);
				})
			});
			
			
			this.clickHandler = clickHandler;
			this.isEnable = true;
			this.bar = bar;
			toast('所见即所得模式开启');
		}
		
		NearWysiwyg.prototype.stopCurrentEditor = function(){
			if(this.currentEditor){
				this.currentEditor.stop();
				this.currentEditor = undefined;
			}
		}
		
		NearWysiwyg.prototype.cancelCurrentEditor = function(){
			if(this.currentEditor){
				this.currentEditor.cancel();
				this.currentEditor = undefined;
			}
		}
		
		function updateElementToMarkdownSource(wysiwyg,hasLine,startLine,endLine,elem){
			var rootElem = wysiwyg.rootElem;
			var cm = wysiwyg.editor;
			var wrapper = wysiwyg.wrapper;
			if($.contains(rootElem,elem)){
				var markdown = wrapper.turndownService.turndown(cleanHtml(elem.outerHTML));
				var next = elem.nextElementSibling;
				if(hasLine){
					if(next != null){
						if(parseInt(next.getAttribute('data-line')) == endLine){
							markdown += '\n\n';
						} else {
							markdown += '\n';
						}
					}
					cm.replaceRange(markdown, {line: startLine, ch: 0}, {line: endLine,ch:0});
				} else {
					if(next == null){
						var prev = elem.previousElementSibling;
						if(prev == null){
							cm.replaceRange(markdown, CodeMirror.Pos(cm.lineCount()-1));
						} else {
							var prevLine = cm.getLine(cm.lineCount()-1);
							if(prevLine.replaceAll('\n','') == ''){
								markdown = '\n' + markdown;
							} else {
								markdown = "\n\n" + markdown;
							}
							cm.replaceRange(markdown, CodeMirror.Pos(cm.lineCount()-1));
						}
					} else {
						var line = parseInt(next.getAttribute('data-line'));
						if(line > 0){
							var prevLine = cm.getLine(line-1);
							if(prevLine.replaceAll('\n','') == ''){
								markdown =  markdown;
							} else {
								markdown = "\n" + markdown;
							}
						}
						var currentLine = cm.getLine(line);
						if(currentLine != null){
							if(currentLine.replaceAll('\n','') != ''){
								markdown =  markdown+'\n\n';
							} else {
								markdown =  markdown+'\n';
							}
						} else {
							markdown =  markdown+'\n\n';
						}
						cm.replaceRange(markdown, {line: line,ch:0});
					}
					
				}
				wrapper.doRender(true);
			} else {
				//TODO
				if(hasLine){
					if(endLine < cm.lineCount()){
						var nextLine = cm.getLine(endLine);
						if(nextLine != veryThinChar && isEmptyText(nextLine)){
							endLine++;
						}
					} else {
						endLine ++;
					}
					cm.replaceRange("", CodeMirror.Pos(startLine, 0), CodeMirror.Pos(endLine, 0))
					wrapper.doRender(true);
				}
			}
		}
		
		function startEdit(wysiwyg,editor,elem){
			var hasLine = elem.hasAttribute('data-line');
			var startLine = hasLine ? parseInt(elem.getAttribute('data-line')) : undefined;
			var endLine = hasLine ? parseInt(elem.getAttribute('data-end-line')) : undefined;
			editor.on('stop',function(elem){
				updateElementToMarkdownSource(wysiwyg,hasLine,startLine,endLine,elem);
				wysiwyg.currentEditor = undefined;
			});
			
			editor.start();
			editor.focus();
			wysiwyg.currentEditor = editor;
		}
		
		function triggerEvent(name,editor){
			//embed editor should not trigger event;
			if(editor.embed === true){
				return ;
			}
			var eventHandlers = editor.eventHandlers;
			$.each(eventHandlers,function(){
				if(this.name === name){
					try{
						this.handler.call(this,editor.getElement(),editor);
					}catch(e){console.log(e)}
				}
			})
		}
		var ContenteditableBar = (function() {

			function ContenteditableBar(element) {
				var me = this;
				this.composing = false;
				var bar = document.createElement('div');
				bar.setAttribute('class', 'heather_contenteditable_bar');
				document.body.appendChild(bar);
				bar = new Bar(bar);
				var clazz = "heather_status_on";
				bar.addIcon('fas fa-bold middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						document.execCommand('bold');
						document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
					}
				}, function(ele) {
					me.boldBtn = ele;
				});
				bar.addIcon('fas fa-italic middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						document.execCommand('italic');
						document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
					}
				}, function(ele) {
					me.italicBtn = ele;
				});
				bar.addIcon('fas fa-strikethrough middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						document.execCommand('strikeThrough');
						document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
					}
				}, function(ele) {
					me.strikeThroughBtn = ele;
				});
				bar.addIcon('fas fa-code middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						var sel = window.getSelection();
						 if(sel.type == 'Range')
							document.execCommand("insertHTML", false, '<code>' + sel.toString() + '</code>');
					}
				});
				bar.addIcon('fas fa-link middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						var range = getRange(element);
						var startContainerParent = range.startContainer.parentElement;
						var isLink = startContainerParent.tagName == 'A';
						var href = '';
						if (startContainerParent == range.endContainer.parentElement && isLink) {
							href = startContainerParent.getAttribute('href');
						}
						var href = prompt("请输入链接地址", href);
						if (href != null) {
							href = href.trim();
							if (href == '') {
								if (isLink) {
									$(startContainerParent).contents().unwrap();
								}
							} else {
								document.execCommand('createLink', false, href);
							}
						}
					}
				}, function(ele) {
					me.linkBtn = ele;
				});
				bar.addIcon('fas fa-eraser middle-icon', {
					event:mobile ? 'touchstart' : 'mousedown',
					handler : function(ele) {
						 document.execCommand('removeFormat');
					}
				});

				var startHandler = function(e) {
					me.composing = true;
				};
				var endHandler = function(e) {
					me.composing = false;
				};
				//chrome 通过退格键删除选中内容时不触发 selectionChange 事件
				var inputHandler = function(e) {
					if (window.getSelection().type != 'Range') {
						bar.hide();
					}
				};

				var selectionChangeListener = function() {
					var sel = window.getSelection();
					var range = getRange(element);
					if(range == null){
						bar.hide();
						return ;
					}
					if (me.composing == false && sel.type == 'Range') {
						posContenteditableBar(bar, range);
					} else {
						bar.hide();
					}
					document.queryCommandState('bold') ? me.boldBtn.classList.add(clazz) : me.boldBtn.classList.remove(clazz);
					document.queryCommandState('italic') ? me.italicBtn.classList.add(clazz) : me.italicBtn.classList.remove(clazz);
					document.queryCommandState('strikeThrough') ? me.strikeThroughBtn.classList.add(clazz) : me.strikeThroughBtn.classList.remove(clazz);
				}
				registerSelectionChangeListener(selectionChangeListener);
				element.addEventListener('compositionstart', startHandler);
				element.addEventListener('compositionend', endHandler);
				element.addEventListener('input', inputHandler);
				this.startHandler = startHandler;
				this.endHandler = endHandler;
				this.inputHandler = inputHandler;
				this.bar = bar;
				this.selectionChangeListener = selectionChangeListener;
				this.element = element;
			}

			ContenteditableBar.prototype.remove = function() {
				var me = this;
				unregisterSelectionChangeListener(this.selectionChangeListener);
				me.bar.remove();
				me.element.removeEventListener('compositionstart', me.startHandler);
				me.element.removeEventListener('compositionend', me.endHandler);
				me.element.removeEventListener('input', me.inputHandler);
			}

			function posContenteditableBar(bar, range) {
				var coords = getCoords(range);
				var top = coords.top - 80 - bar.height() - $(window).scrollTop();
				bar.element.css({
					'top': top < 0 ? coords.top + coords.height + 30 : top + $(window).scrollTop() + "px"
				});
				if (!mobile) {
					if (bar.width() + coords.left > $(window).width()) {
						bar.element.css({
							'right': 30 + "px"
						})
					} else {
						bar.element.css({
							'left': coords.left + "px"
						})
					}
				}
				bar.show();
			}

			return ContenteditableBar;
		})();
		
		var InlineMath = (function(){
		
			function InlineMath(wrapper){
				this.wrapper = wrapper;
				this.rootElem = document.getElementById("#heather_out");
				var katexPreview = document.createElement('div');
				katexPreview.classList.add('katex-inline-preview');
				document.getElementById("heather_wrapper").appendChild(katexPreview);
				this.katexPreview = katexPreview;
			}
			
			InlineMath.prototype.createSession = function(element){
				return new InlineMathSession(element,this);
			}
			
			var InlineMathSession = (function(){
				
				function InlineMathSession(element,inlineMath){
					this.element = element;
					this.rootElem = inlineMath.rootElem;
					this.katexPreview = inlineMath.katexPreview;
				}
				
				InlineMathSession.prototype.start = function(){
					var me = this;
					var ignore = false;
					var katexPreview = this.katexPreview;
					var keyDownHandler = function(e){
						if(keyNames[e.keyCode] == 'Backspace'){
							ignore = true;
							selectionChangeListener(true);
						}
					}
					var blurHandler = function(){
						$(katexPreview).css({'visibility':'hidden'});
					}
					var selectionChangeListener = function(backspace){
						if(ignore && backspace !== true){
							ignore = false;
							return ;
						}
						var sel = window.getSelection();
						if(sel.type != 'Caret') return ;
						me.element.normalize();
						var range = getRange(me.element);
						if(range == null) return ;
						var ancestor = range.commonAncestorContainer;
						var container = ancestor;
						var inKatex = false;
						var katexElem = ancestor;
						while(container != null){
							if(container == me.element){
								break;
							}
							if(!inKatex && katexElem.nodeType == 1 && katexElem.hasAttribute('data-inline-katex')){
								inKatex = true;
							}
							if(!inKatex){
								katexElem = katexElem.parentElement;
							}
							container = container.parentElement;
						}
						if(container == null){return;}
						if(inKatex){
							var expression = getKatexExpression(katexElem);
							var nodeValue = backspace === true ? '$'+expression : '$'+expression+'$';
							var textNode = document.createTextNode(nodeValue);
							$(katexElem).remove();
							range.insertNode(textNode);
							// if ancestor.parentElement is encoding="application/x-tex"
							// the set cursor first 
							if(ancestor.parentElement.getAttribute('encoding') == 'application/x-tex'){
								range.setStart(textNode, 1);
								range.setEnd(textNode, 1);
							} else {
								//set last 
								range.setStart(textNode, textNode.length-1);
								range.setEnd(textNode, textNode.length-1);
							}
							return ;
						}
						if(ancestor.nodeType == 3){
							var text = ancestor.nodeValue;
							var mathInlineBlocks = getMathInlineBlocks(text);
							if(mathInlineBlocks.length < 1) {$(katexPreview).css({'visibility':'hidden'});return} ;
							var offset = range.startOffset;
							for(var i=0;i<mathInlineBlocks.length;i++){
								var block = mathInlineBlocks[i];
								if(offset > block.start && offset <= block.end){
									//get math text;
									var math = text.substring(block.start+1,block.end);
									//parse with katex
									loadKatex(function(){
										var rst;
										try{
											rst = katex.renderToString(math, {
												throwOnError: true,
												displayMode: false
											});
										} catch(e) {
											 if (e instanceof katex.ParseError) {
												rst = '<pre>'+e.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")+'</pre>';
											} else {
												throw e;  // other error
											}
										}
										if(rst){
											var coords = getCoords(range);
											katexPreview.innerHTML = rst;
											$(katexPreview).css({'width':$(me.rootElem).width()+'px'});
											var height = katexPreview.clientHeight;
											var width = katexPreview.clientWidth;
											var top = coords.top - 32 - height - $(window).scrollTop();
											$(katexPreview).css({'top':(top > 0 ? top : coords.top + 32)+'px'});
											var left = coords.left-width/2;
											if(left + width > $(window).width() - 20){
												$(katexPreview).css({'right':'0px','left':'','visibility':'visible'})
											} else {
												$(katexPreview).css({'right':'','left':(Math.max(coords.left-width/2,10))+'px','visibility':'visible'})
											}
										}
									})
									return;
								}
							}
							$(katexPreview).css({'visibility':'hidden'});
							me.renderInlineKatex(function(nodes){
								for(var i=0;i<nodes.length;i++){
									var node = nodes[i];
									if(offset == node.end + 1){
										var katexNode = node.node;
										var next = katexNode.nextSibling;
										if(next != null && next.nodeType == 3){
											if(next.nodeValue ==  veryThinChar){
												range.setStartAfter(next);
											} else {
												range.setStart(next,1);
												range.setEnd(next,1);
											}
										} else {
											range.setStartAfter(katexNode);
										}
										break;
									}
								}
							});
						}
					}
					selectionChangeListener();
					registerSelectionChangeListener(selectionChangeListener);
					this.element.addEventListener('keydown',keyDownHandler);
					this.element.addEventListener('blur',blurHandler);
					this.selectionChangeListener = selectionChangeListener;
					this.keyDownHandler = keyDownHandler;
					this.blurHandler = blurHandler;
				}
				
				InlineMathSession.prototype.stop = function(){
					this.renderInlineKatex();
					$(this.katexPreview).css({'visibility':'hidden'});
					unregisterSelectionChangeListener(this.selectionChangeListener);
					this.element.removeEventListener('keydown',this.keyDownHandler);
					this.element.removeEventListener('blur',this.blurHandler);
				}
				
				InlineMathSession.prototype.renderInlineKatex = function(callback){
					var me = this;
					//replace all rendered katex element with expression
					var katexElems = this.element.querySelectorAll('[data-inline-katex]');
					for(var i=0;i<katexElems.length;i++){
						var katexElem = katexElems[i];
						var expression = getKatexExpression(katexElem);
						var textNode = document.createTextNode('$'+expression+'$');
						var prev = katexElem.previousSibling;
						while(prev != null && prev.nodeType == 3){
							if(prev.nodeValue == veryThinChar){
								$(prev).remove();
								prev = prev.previousSibling;
							} else {
								break;
							}
						}
						
						var next = katexElem.nextSibling;
						while(next != null && next.nodeType == 3){
							if(next.nodeValue == veryThinChar){
								$(next).remove();
								next = next.nextSibling;
							} else {
								break;
							}
						}
						
						$(katexElem).after(textNode).remove();
					}
					
					loadKatex(function(){
						me.element.normalize();
						var nodes = textNodesUnder(me.element);
						var katexNodes = [];
						for(var i=0;i<nodes.length;i++){
							var node = nodes[i];
							var text = node.nodeValue;
							var mathInlineBlocks = getMathInlineBlocks(text);
							var previousEnd;
							for(var j=0;j<mathInlineBlocks.length;j++){
								var mathInlineBlock = mathInlineBlocks[j];
								var start = mathInlineBlock.start;
								var end = mathInlineBlock.end;
								if(previousEnd){
									end = end - previousEnd;
									start = start - previousEnd;
								}
								node = node.splitText(start).splitText(end-start+1);
								var mathNode = node.previousSibling;
								previousEnd = text.length - node.nodeValue.length;
								var expression = mathNode.nodeValue;
								expression = expression.substring(1,expression.length-1).replaceAll(veryThinChar,'');
								if(expression.trim() == ''){
									continue;
								}
								var div = document.createElement('div');
								var result = parseKatex(expression,false);
								div.innerHTML = result;
								var newNode = div.firstChild;
								newNode.setAttribute('data-inline-katex','');
								$(mathNode).after(newNode).remove();
								var next = newNode.nextSibling;
								if(next == null || next.nodeType != 3 || !next.nodeValue.startsWith(veryThinChar)){
									$(newNode).after(veryThinHtml);
								}
								var prev = newNode.previousSibling;
								if(prev == null || prev.nodeType != 3 || !prev.nodeValue.startsWith(veryThinChar)){
									$(newNode).before(veryThinHtml);
								}
								katexNodes.push({
									start : start,
									end : end,
									node : newNode
								});
							}
							previousEnd = undefined;
						}
						if(callback) callback(katexNodes);
					})
				}
				
				return InlineMathSession;
			})();
			
			function textNodesUnder(node){
			  var all = [];
			  for (node=node.firstChild;node;node=node.nextSibling){
				if (node.nodeType==3) all.push(node);
				else all = all.concat(textNodesUnder(node));
			  }
			  return all;
			}
			
			
			function getMathInlineBlocks(text){
				var indices = [];
				for(var i=0; i<text.length;i++) {
					if (text[i] === "$") indices.push(i);
				}
				if(indices.length < 2) return [];
				var mathInlineBlocks = [];
				//1,3,5,7 => 1,3 3,5 5,7
				var ignoreIndex;
				for(var i=1;i<indices.length;i++){
					//first will be 0 1
					var start = indices[i-1];
					if(start === ignoreIndex) continue;
					var end = indices[i];
					var startNext = text.charAt(start+1);
					var endPrev = text.charAt(end-1);
					if(startNext.trim() == '' || endPrev.trim() == '') continue;
					var endNext = end < text.length - 1 ? text.charAt(end+1) : '';
					if(endNext == veryThinChar){
						if(end + 1 < text.length - 1){
							endNext = text.charAt(end+2);
						} else {
							endNext = '';
						}
					}
					if(endNext >= '0' && endNext <= '9') continue;
					
					mathInlineBlocks.push({
						start : start,
						end : end
					})
					
					ignoreIndex = end;
				}
				return mathInlineBlocks;
			}

			
			return InlineMath;
		})();
		
		var FileUploadMgr = (function() {

			var FileUpload = (function() {
				var index = 0;

				function FileUpload(file, range, config) {
					this.fileName = 'file'
					this.file = file;
					this.index = ++index;
					this.range = range;
					this.uploadUrl = config.upload_url;
					this.beforeUpload = config.upload_before;
					this.afterUpload = config.upload_finish;
				}

				FileUpload.prototype.start = function() {
					var me = this;
					pasteHtmlAtRange(this.range, '<div class="heather_file_upload_waiting_' + this.index + '" style="display:inline-block;position:relative"><div  style="position:absolute;left:calc(50% - 14px);top:calc(50% - 14px);font-size:14p;x"></div><img src="loading.gif"/></div>' + veryThinHtml);

					var x = new MutationObserver(function(e) {
						if (e[0].removedNodes) {
							me.remove()
						};
					});

					x.observe($('.heather_file_upload_waiting_' + this.index)[0], {
						childList: true
					});

					var formData = new FormData();
					formData.append(this.fileName, this.file);
					if (this.beforeUpload) {
						this.beforeUpload(formData, this.file);
					}
					var xhr = new XMLHttpRequest();
					xhr.upload.addEventListener("progress", function(e) {
						if (e.lengthComputable) {
							var percentComplete = parseInt(e.loaded * 100 / e.total) + "";
							var progressRoot = $('.heather_file_upload_waiting_' + me.index);
							if (progressRoot.length == 0) {
								//removed by user
								//abort 
								xhr.abort();
							} else {
								var progressBar = progressRoot[0].firstChild;
								progressBar.textContent = percentComplete + '%';
							}
						}
					}, false);
					xhr.addEventListener('readystatechange', function(e) {
						if (this.readyState === 4) {
							if (xhr.status !== 0) {
								me.completed = true;
								var progressRoot = $('.heather_file_upload_waiting_' + me.index);
								if (progressRoot.length == 1) {
									var info = me.afterUpload(xhr.response);
									var type = (info.type || 'image').toLowerCase();


									var nextSibling = progressRoot[0].nextSibling;
									if (nextSibling != null && nextSibling.nodeType == 3) {
										if (nextSibling.nodeValue == veryThinChar) {
											$(nextSibling).remove();
										}
									}

									switch (type) {
										case 'image':
											progressRoot[0].outerHTML = '<img alt="' + me.file.name + '" src="' + info.url + '"/>';
											break;
										case 'file':
											progressRoot[0].outerHTML = '<a href="' + info.url + '">' + me.file.name + '</a>';
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
											progressRoot[0].outerHTML = video.outerHTML;
											break;
									}
								}
							} else {
								me.remove();
							}
						}
					});
					xhr.open("POST", this.uploadUrl);
					xhr.send(formData);
					this.xhr = xhr;
				}

				FileUpload.prototype.remove = function() {
					if (this.completed !== true) {
						this.xhr.abort();
					}
					var root = $('.heather_file_upload_waiting_' + this.index);
					if (root.length > 0) {
						var nextSibling = root[0].nextSibling;
						if (nextSibling != null && nextSibling.nodeType == 3) {
							if (nextSibling.nodeValue == veryThinChar) {
								$(nextSibling).remove();
							}
						}
						root.remove();
					}
				}

				return FileUpload;
			})();

			function FileUploadMgr(element, config) {
				var me = this;
				this.selectionChangeListener = function() {
					var range = getRange(element);
					if (range != null) {
						me.range = range;
					}
				}
				registerSelectionChangeListener(this.selectionChangeListener)
				this.config = config;
				this.uploads = [];
				this.element = element;
			}


			FileUploadMgr.prototype.upload = function() {
				var me = this;
				var range = this.range;
				if (isUndefined(range)) {
					placeCaretAtEnd(this.element);
					range = getRange(this.element);
				}
				if (!isUndefined(range) && range != null) {
					swal({
						title: '选择文件',
						input: 'file',
						inputAttributes: {
							'aria-label': 'Upload your profile picture'
						}
					}).then(function(rst) {
						if (rst.value != null) {
							var upload = new FileUpload(rst.value, range, me.config);
							me.uploads.push(upload);
							upload.start();
						}
					});
				}
			}

			FileUploadMgr.prototype.remove = function() {
				unregisterSelectionChangeListener(this.selectionChangeListener);
				this.stopUpload();
			}

			FileUploadMgr.prototype.stopUpload = function() {
				for (var i = 0; i < this.uploads.length; i++) {
					this.uploads[i].remove();
				}
			}

			return FileUploadMgr;
		})();
		
		
		 var TableEditorFactory = (function() {
			 
			 var TdEditor = (function(){
				function TdEditor(table,td, wrapper,embed) {
					this.table = table;
					this.td = td;
					this.wrapper = wrapper;
					this.embed = embed;
				}
				TdEditor.prototype.start = function(){
					this.td.addEventListener('paste', plainPasteHandler);
					this.td.setAttribute('contenteditable', true);
					this.contenteditableBar = new ContenteditableBar(this.td);
					this.fileUploadMgr = new FileUploadMgr(this.td, this.wrapper.config);
					var inlineMath = createInlineMathSession(this.wrapper,this.td);
					inlineMath.start();
					this.inlineMath = inlineMath;
				} 
				
				TdEditor.prototype.stop = function(){
					this.td.removeEventListener('paste', plainPasteHandler);
					this.td.removeAttribute('contenteditable');
					this.contenteditableBar.remove();
					this.fileUploadMgr.remove();
					this.inlineMath.stop();
				} 
				
				TdEditor.prototype.addCol = function(right){
					addCol($(this.table),$(this.td),right);
				} 
				
				TdEditor.prototype.addRow = function(next){
					addCol($(this.table),$(this.td),next);
				} 
				
				TdEditor.prototype.deleteCol = function(){
					deleteCol($(this.table),$(this.td));
				} 
				
				TdEditor.prototype.deleteRow = function(){
					deleteRow($(this.table),$(this.td));
				} 
				
				TdEditor.prototype.align = function(pos){
					doAlign($(this.table),$(this.td),pos);
				} 
				
				TdEditor.prototype.upload = function(){
					this.fileUploadMgr.upload();
				} 
				
				TdEditor.prototype.focus = function(){
					this.td.focus();
				} 
				
				function doAlign(table, td, align) {
					var index = td.index();
					table.find('tr').each(function() {
						var tr = $(this);
						tr.children().eq(index).css({
							'text-align': align
						})
					})
				}

				function addCol(table, td, after) {
					var index = td.index();
					table.find('tr').each(function() {
						var tr = $(this);
						var td = tr.find('td').eq(index);
						var th = tr.find('th').eq(index);
						if (after) {
							th.after('<th></th>');
							td.after('<td></td>');
						} else {
							th.before('<th></th>');
							td.before('<td></td>');
						}
					});
				}

				function addRow(table, td, after) {
					if (td[0].tagName == 'TH' && !after) return;
					var tr = td.parent();
					var tdSize = tr.find('td').length;
					if (tdSize == 0) {
						tdSize = tr.find('th').length;
					}
					var html = '<tr>';
					for (var i = 0; i < tdSize; i++) {
						html += '<td></td>';
					}
					html += '</tr>';
					if (after) {
						tr.after(html);
					} else {
						tr.before(html);
					}
				}

				function deleteRow(table, td) {
					if (td[0].tagName == 'TH') return;
					if (table.find('tr').length == 2) {
						return;
					}
					var tr = td.parent();
					tr.remove();
				}

				function deleteCol(table, td) {
					var ths = table.find('tr').eq(0).find('th');
					if (ths.length == 1) return;
					var index = td.index();
					table.find('tr').each(function() {
						var tr = $(this);
						var td = tr.find('td').eq(index);
						if (td.length > 0) {
							td.remove();
						}
						var th = tr.find('th').eq(index);
						if (th.length > 0) {
							th.remove();
						}
					});
				}
				
				return {create:function(table,td, wrapper,embed){
					return new TdEditor(table,td, wrapper,embed);
				}}
			 })();
			 
            function TableEditor(element, wrapper,embed) {
                this.element = element;
                this.wrapper = wrapper;
				this.embed = embed;
                this.eventHandlers = [];
				this.copy = element.cloneNode(true);
            }
			
			TableEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}

            TableEditor.prototype.start = function(_target) {
                var me = this;
                this.element.classList.add("heather_edit_table");
                var editTd = function(td) {
                    if (td != null) {
                        if (!td.isContentEditable) {
							if(me.tdEditor){
								me.tdEditor.stop();
								me.tdEditor = undefined;
							}
							var tdEditor = TdEditor.create(me.element,td,me.wrapper);
							tdEditor.start();
							tdEditor.focus();
							me.tdEditor = tdEditor;
                        }
                    }
                }
                if (_target) {
                    editTd(getTd(_target, this.element));
                }
                var tdHandler = function(e) {
                    var td = getTd(e.target, me.element);
                    editTd(td);
                }
                var table = $(this.element);
                table.on('click', 'th,td', tdHandler);
                var toolbar = document.createElement('div');
                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                table.before(toolbar);
                toolbar = new Bar(toolbar);
                toolbar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            table.remove();
                            me.stop();
                        }
                    })
                });
				toolbar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            me.cancel();
                        }
                    })
                });
                toolbar.addIcon('fas fa-plus middle-icon', function() {
                    if(!me.tdEditor) return ;
                    var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
                    var html = '';
                    html += '<div><button style="' + style + '" >向右添加列</button></div>';
                    html += '<div><button style="' + style + '" >向左添加列</button></div>';
                    html += '<div><button style="' + style + '" >向上添加行</button></div>';
                    html += '<div><button style="' + style + '" >向下添加行</button></div>';
                    Swal({
                        animation: false,
                        html: html
                    });
                    var buttons = $(Swal.getContent()).find('button');
                    buttons.eq(0).click(function() {
                        me.tdEditor.addCol(true);
						Swal.getCloseButton().click();
                    });
                    buttons.eq(1).click(function() {
                        me.tdEditor.addCol(false);
						Swal.getCloseButton().click();
                    });
                    buttons.eq(2).click(function() {
                        me.tdEditor.addRow(false);
						Swal.getCloseButton().click();
                    });
                    buttons.eq(3).click(function() {
                        me.tdEditor.addRow(true);
						Swal.getCloseButton().click();
                    });
                });
                toolbar.addIcon('fas fa-minus middle-icon', function() {
                    if(!me.tdEditor) return ;
                    var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
                    var html = '';
                    html += '<div><button style="' + style + '" >删除当前行</button></div>';
                    html += '<div><button style="' + style + '" >删除当前列</button></div>';
                    Swal({
                        animation: false,
                        html: html
                    });
                    var buttons = $(Swal.getContent()).find('button');
                    buttons.eq(0).click(function() {
						me.tdEditor.deleteRow();
						Swal.getCloseButton().click();
                    });
                    buttons.eq(1).click(function() {
						me.tdEditor.deleteCol();
						Swal.getCloseButton().click();
                    });
                });
                toolbar.addIcon('fas fa-align-left middle-icon', function() {
                    if(!me.tdEditor) return ;
					me.tdEditor.align('left');
                });
                toolbar.addIcon('fas fa-align-center middle-icon', function() {
                    if(!me.tdEditor) return ;
					me.tdEditor.align('center');
                });

                toolbar.addIcon('fas fa-align-right middle-icon', function() {
                    if(!me.tdEditor) return ;
					me.tdEditor.align('right');
                });
				if(this.wrapper.fileUploadEnable()){
					toolbar.addIcon('fas fa-upload middle-icon', function() {
						if(!me.tdEditor) return ;
						me.tdEditor.upload();
					});	
				}


                toolbar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
                this.toolbar = toolbar;
                this.tdHandler = tdHandler;
				triggerEvent('start',this);
            }

            TableEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.toolbar.remove();
                var ele = $(this.element);
                ele.off('click', 'th,td', this.tdHandler);
				if(this.tdEditor){
				   this.tdEditor.stop();
				}
				triggerEvent('stop',this);
            }
			
			  TableEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.toolbar.remove();
				if(this.tdEditor){
				   this.tdEditor.stop();
				}
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
            }
			TableEditor.prototype.getElement = function() {
                return this.element;
            }
            TableEditor.prototype.focus = function() {
				if(this.tdEditor){
				   this.tdEditor.focus();
			   }
            }

            function getTd(_target, root) {
                var target = _target;
                while (target != null) {
                    if (target.tagName == 'TD' || target.tagName == 'TH') {
                        return target;
                    }
                    target = target.parentElement;
                    if (!$.contains(root, target)) {
                        return null;
                    }
                }
                return null;
            }

            return {
                create: function(element, wrapper,embed) {
                    return new TableEditor(element, wrapper,embed);
                },
				name: 'TableEditorFactory',
				match:function(element){
					return element.tagName == 'TABLE';
				},
				order:0,
				createElement: function() {
					var table = document.createElement('table');
					table.innerHTML = '<tr><th></th><th></th></tr><tr><td></td><td></td></tr>'
					return table;
				}
            }
        })();
		
		
		
		var HeadingEditorFactory = (function() {
			
			var tagNameArray = ['H1','H2','H3','H4','H5','H6'];
			
			function HeadingEditor(element,wrapper,embed) {
				this.element = element;
				this.wrapper = wrapper;
				this.eventHandlers = [];
				this.embed = embed;
				this.copy = element.cloneNode(true);
			}

			HeadingEditor.prototype.start = function() {
				var me = this;
				var heading = this.element;
				heading.setAttribute('contenteditable', 'true');
				var keyDownHandler = function(e) {
					if (CodeMirror.keyNames[e.keyCode] == 'Enter') {
						e.preventDefault();
						e.stopPropagation();
						me.stop();
						return false;
					}
					return true;
				};
				
				heading.addEventListener('paste', plainPasteHandler);
				heading.addEventListener('keydown', keyDownHandler);
				this.keyDownHandler = keyDownHandler;
				var toolbar = document.createElement('div');
				toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
				$(heading).after(toolbar);

				this.bar = new Bar(toolbar);
				this.bar.addIcon('fas fa-trash middle-icon', function() {
					Swal.fire({
						title: '确定要删除吗?',
						type: 'warning',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#d33'
					}).then((result) => {
						if (result.value) {
							$(me.element).remove();
							me.stop();
						}
					})
				});
				this.bar.addIcon('fas fa-times middle-icon', function() {
					Swal.fire({
						title: '确定要取消吗?',
						type: 'warning',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#d33'
					}).then((result) => {
						if (result.value) {
							me.cancel();
						}
					})
				});
				var tip;
				var showTip = function(index) {
					if (tip) {
						me.bar.removeElement(function(ele) {
							return ele === tip;
						})
					}
					tip = document.createElement('i');
					tip.setAttribute('class', 'fas');
					tip.setAttribute('style', 'color:#70B7FD');
					tip.innerHTML = 'H' + index;
					me.bar.addElement(tip);
				}
				this.bar.addIcon('fas fa-arrow-up middle-icon', function() {
					var heading = me.element;
					var index = parseInt(heading.tagName.substring(1));
					if (index == 1) {
						return;
					}
					index--;
					var h = document.createElement("H" + index);
					cloneAttributes(h,heading);
					h.setAttribute('contenteditable', true);
					h.innerHTML = heading.innerHTML;
					$(heading).after(h).remove();
					replace(me,h);
					showTip(index);
					return;
				});
				this.bar.addIcon('fas fa-arrow-down middle-icon', function() {
					var heading = me.element;
					var index = parseInt(heading.tagName.substring(1));
					if (index == 6) {
						return;
					}
					index++;
					var h = document.createElement("H" + index);
					cloneAttributes(h,heading);
					h.setAttribute('contenteditable', true);
					h.innerHTML = heading.innerHTML;
					$(heading).after(h).remove();
					replace(me,h);
					showTip(index);
					return;
				});

				this.bar.addIcon('fas fa-check middle-icon', function() {
					me.stop();
				});
				showTip($(me.element)[0].tagName.substring(1));
				var inlineMath = createInlineMathSession(this.wrapper,this.element);
				inlineMath.start();
				this.inlineMath = inlineMath;
				triggerEvent('start',this);
			}

			HeadingEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				this.inlineMath.stop();
				this.element.removeAttribute('contenteditable');
				triggerEvent('stop',this);
			}
			
			HeadingEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				this.inlineMath.stop();
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
			}
			
			HeadingEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
			HeadingEditor.prototype.getElement = function() {
                return this.element;
            }
			HeadingEditor.prototype.focus = function() {
				this.element.focus();
			}
			
			function replace(editor,node){
				node.addEventListener('paste', plainPasteHandler);
				node.addEventListener('keydown', editor.keyDownHandler);
				editor.element = node;
				editor.inlineMath.stop();
				editor.inlineMath = createInlineMathSession(editor.wrapper,editor.element);
				editor.inlineMath.start();
			}

			return {
				create: function(element,wrapper,embed) {
					return new HeadingEditor(element,wrapper,embed);
				},
				createElement: function() {
					return document.createElement('H1');
				},
				name: 'HeadingEditorFactory',
				match:function(element){
					var tagName = element.tagName;
					for(var headingTagName of tagNameArray){
						if(headingTagName === tagName)
							return true;
					}
					return false;
				},
				order:0
			}
		})();
		
		var HREditorFactory = (function() {

			function HREditor(element,wrapper,embed) {
				this.element = element;
				this.wrapper = wrapper;
				this.embed = embed;
				this.eventHandlers = [];
			}

			HREditor.prototype.start = function() {
				var me = this;
				var toolbar = document.createElement('div');
				toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
				$(this.element).after(toolbar);
				this.bar = new Bar(toolbar);
				this.bar.addIcon('fas fa-trash middle-icon', function() {
					Swal.fire({
						title: '确定要删除吗?',
						type: 'warning',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#d33'
					}).then((result) => {
						if (result.value) {
							$(me.element).remove();
							me.stop();
						}
					})
				});
				this.bar.addIcon('fas fa-check middle-icon', function() {
					me.stop();
				});
				triggerEvent('start',this);
			}
			
			HREditor.prototype.cancel = function(){
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				triggerEvent('cancel',this);
			}

			HREditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				triggerEvent('stop',this);
			}
			
			HREditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
			HREditor.prototype.getElement = function() {
                return this.element;
            }
			HREditor.prototype.focus = function() {}

			return {
				create: function(element,wrapper,embed) {
					return new HREditor(element,wrapper,embed);
				},
				createElement: function() {
					return document.createElement('hr');
				},
				name: 'HREditorFactory',
				match:function(element){
					return element.tagName === 'HR';
				},
				order:0
			}
		})();
		
		
		var ParagraphEditorFactory = (function() {
			function ParagraphEditor(element,wrapper,embed) {
				this.element = element;
				this.wrapper = wrapper;
				this.eventHandlers = [];
				this.embed = embed;
				this.copy = element.cloneNode(true);
			}

            ParagraphEditor.prototype.start = function() {
                var me = this;
                var paragraph = this.element;
                paragraph.setAttribute('contenteditable', 'true');
                paragraph.addEventListener('paste', plainPasteHandler);
                var fileUploadMgr = new FileUploadMgr(paragraph, this.wrapper.config);
                var toolbar = document.createElement('div');
                $(paragraph).before(toolbar);
                this.bar = new Bar(toolbar);
                this.bar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            $(paragraph).remove();
							me.stop();
                        }
                    })
                });
				
				this.bar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
							me.cancel();
                        }
                    })
                });
				
				if(this.wrapper.fileUploadEnable()){
					this.bar.addIcon('fas fa-upload middle-icon', function() {
						fileUploadMgr.upload();
					});
				}



                this.bar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
                this.fileUploadMgr = fileUploadMgr;
                this.contenteditableBar = new ContenteditableBar(this.element);
				var inlineMath = createInlineMathSession(this.wrapper,this.element);
				inlineMath.start();
				this.inlineMath = inlineMath;
				triggerEvent('start',this);
            }

            ParagraphEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.fileUploadMgr.remove();
                this.contenteditableBar.remove();
                this.bar.remove();
                var p = this.element;
                if (isEmptyText(p.innerHTML)) {
                    p.remove();
                } else {
                    p.removeAttribute('contenteditable');
                    p.removeEventListener('paste', plainPasteHandler);
                    divToBr($(p));
                    p.innerHTML = cleanHtml(p.innerHTML);
                }
				this.inlineMath.stop();
				triggerEvent('stop',this);
            }
			
			ParagraphEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.fileUploadMgr.remove();
                this.contenteditableBar.remove();
                this.bar.remove();
				this.inlineMath.stop();
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
            }

            ParagraphEditor.prototype.focus = function() {
                this.element.focus();
            }
			ParagraphEditor.prototype.getElement = function() {
                return this.element;
            }
			ParagraphEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
            return {
                create: function(element, wrapper,embed) {
                    return new ParagraphEditor(element, wrapper,embed);
                },
				createElement: function() {
					return document.createElement('p');
				},
				name: 'ParagraphEditorFactory',
				match:function(element){
					//if only have a block katex
					//should use katex block editor;
					if(element.tagName == "P"){
						var nodes = element.childNodes;
						if(nodes.length == 1 && nodes[0].nodeType == 1 && nodes[0].hasAttribute('data-block-katex')){
							return false;
						}
						return true;
					}
					return false;
				},
				order:0
            }
        })();
		
		
		
		 var KatexBlockEditorFactory = (function() {
			 
			function KatexBlockEditor(element,wrapper,embed) {
				this.element = element;
				this.wrapper = wrapper;
				this.eventHandlers = [];
				this.embed = embed;
				this.copy = element.cloneNode(true);
			}

            KatexBlockEditor.prototype.start = function() {
                var me = this;
				var expression = getKatexExpression(this.element);
				var pre = document.createElement('pre');
				pre.innerHTML = expression;
				var preview = document.createElement('div');
				preview.classList.add('katex-preview');
				
				var updatePreview = function(){
					var expression = pre.textContent.trimEnd();
					if(isEmptyText(expression)){
						$(preview).css({'visibility':'hidden'});
						return ;
					}
					loadKatex(function(){
						var rst;
						try{
							rst = katex.renderToString(expression, {
								throwOnError: true,
								displayMode: true
							});
						} catch(e) {
							 if (e instanceof katex.ParseError) {
								rst = '<pre>'+e.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")+'</pre>';
							} else {
								throw e;  // other error
							}
						}
						preview.innerHTML = rst;
						$(preview).css({'visibility':'visible'});
					})
				};
                pre.setAttribute('contenteditable', 'true');
				pre.addEventListener('input',updatePreview);
				this.preHelper = new PreHelper(pre);
				$(this.element).after(pre).remove();
				this.element = pre;
				
                var toolbar = document.createElement('div');
                $(pre).before(toolbar);
                $(pre).after(preview);
				this.preview = preview;
                this.bar = new Bar(toolbar);
                this.bar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            $(pre).remove();
							me.stop();
                        }
                    })
                });
				this.bar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
							me.cancel();
                        }
                    })
                });

                this.bar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
				
				updatePreview();
				triggerEvent('start',this);
            }

            KatexBlockEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				this.preHelper.unbind();
				$(this.preview).remove();
				var expression = this.element.textContent.replaceAll(veryThinChar,'').trimEnd();
				if(isEmptyText(expression)){
					$(this.element).remove();
					triggerEvent('stop',this);
				} else {
					var me = this;
					loadKatex(function(){
						var html = parseKatex(expression,true);
						var div = document.createElement('div');
						div.innerHTML = html;
						var katexNode = div.firstChild;
						katexNode.setAttribute('data-block-katex','');
						$(me.element).after(katexNode).remove();
						me.element = katexNode;
						triggerEvent('stop',me);
					})
				}
            }
			
			 KatexBlockEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				this.preHelper.unbind();
				$(this.preview).remove();
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',me);
            }

            KatexBlockEditor.prototype.focus = function() {
                this.element.focus();
            }
			
			KatexBlockEditor.prototype.getElement = function() {
                return this.element;
            }
			
			KatexBlockEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
            return {
                create: function(element, wrapper,embed) {
                    return new KatexBlockEditor(element, wrapper,embed);
                },
				createElement: function() {
					var span =  document.createElement('span');
					span.setAttribute('data-block-katex','');
					span.classList.add('katex-display');
					span.innerHTML = '<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>e</mi><mi>d</mi><mi>i</mi><mi>t</mi><mi>m</mi><mi>e</mi></mrow><annotation encoding="application/x-tex"></annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.69444em;vertical-align:0em;"></span><span class="mord mathdefault">e</span><span class="mord mathdefault">d</span><span class="mord mathdefault">i</span><span class="mord mathdefault">t</span><span class="mord mathdefault">m</span><span class="mord mathdefault">e</span></span></span></span>';
					return span;
				},
				name: 'KatexBlockEditorFactory',
				match:function(element){
					if(element.tagName == "P"){
						var nodes = element.childNodes;
						if(nodes.length == 1 && nodes[0].nodeType == 1 && nodes[0].hasAttribute('data-block-katex')){
							return true;
						}
						return false;
					}
					return element.hasAttribute('data-block-katex');
				},
				order:0
            }
        })();

		var MermaidEditorFactory = (function() {
			 
			function MermaidEditor(element,wrapper,embed) {
				this.element = element;
				this.wrapper = wrapper;
				this.eventHandlers = [];
				this.embed = embed;
				this.copy = element.cloneNode(true);
			}

             MermaidEditor.prototype.start = function() {
                var me = this;
				var expression = getMermaidExpression(this.element);
				var textarea = document.createElement('textarea');
				textarea.classList.add('heather_textarea_editor');
				textarea.value = expression;
				var preview = document.createElement('div');
				preview.classList.add('mermaid-preview');
				preview.classList.add('mermaid');
				
				var updatePreview = function(){
					var expression = textarea.value;
					if(isEmptyText(expression)){
						$(preview).hide();
						return ;
					}
					loadMermaid(function(){
						preview.removeAttribute('data-processed')
						preview.innerHTML = expression;
						$(preview).show();
						try{
							mermaid.parse(preview.textContent);
							mermaid.init({}, $(preview));
						}catch(e){
							preview.innerHTML = '<pre>'+e.str+'</pre>'
						}
					})
				};
				textarea.addEventListener('input',function(){
					updatePreview();
					this.style.height = "";
					this.style.height = this.scrollHeight + 'px'
				});
				$(this.element).after(textarea).remove();
				textarea.style.height = textarea.scrollHeight + 'px'
				this.element = textarea;
				
                var toolbar = document.createElement('div');
                $(textarea).before(toolbar);
                $(textarea).after(preview);
				this.preview = preview;
                this.bar = new Bar(toolbar);
                this.bar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            $(textarea).remove();
							me.stop();
                        }
                    })
                });
				
				 this.bar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
							me.cancel();
                        }
                    })
                });

                this.bar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
				
				updatePreview();
				triggerEvent('start',this);
            }

            MermaidEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				$(this.preview).remove();
				var expression = this.element.value;
				if(isEmptyText(expression)){
					$(this.element).remove();
					triggerEvent('stop',this);
				} else {
					var me = this;
					loadMermaid(function(){
						var div = createUnparsedMermaidElement(expression);
						$(me.element).after(div).remove();
						var mermaidNode = div.querySelector('.mermaid');
						try{
							mermaid.parse(mermaidNode.textContent);
							mermaid.init({}, $(mermaidNode));
						}catch(e){
							mermaidNode.innerHTML = '<pre>'+e.str+'</pre>'
						}
						
						me.element = div;
						triggerEvent('stop',me);
					});
				}
            }
			
			
			 MermaidEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.bar.remove();
				$(this.preview).remove();
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',me);
            }

            MermaidEditor.prototype.focus = function() {
                this.element.focus();
            }
			
			MermaidEditor.prototype.getElement = function() {
                return this.element;
            }
			
			MermaidEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
            return {
                create: function(element, wrapper,embed) {
                    return new MermaidEditor(element, wrapper,embed);
                },
				createElement: function() {
					var element = createUnparsedMermaidElement("graph TD\nA --> B\n");
					element.querySelector('.mermaid-source').value = '';
					return element;
				},
				name: 'MermaidEditorFactory',
				match:function(element){
					return element.tagName == 'DIV' && element.classList.contains('mermaid-block');
				},
				order:0
            }
        })();
		
		var ListEditorFactory = (function() {
			
			var LiEditor = (function(){
				function LiEditor(list,li,wrapper,target,embed){
					this.list = list;
					this.li = li;
					this.wrapper = wrapper;	
					this.checkbox = getCheckbox(li);
					this.target = target;
					this.embed = embed;
				}
				
				LiEditor.prototype.start = function(){
					var li = this.li;
					wrapToParagraph(li,this.checkbox);
					this.compositeEditor = CompositeEditorFactory.create(li, this.wrapper);
					this.compositeEditor.start(this.target);
					if(this.checkbox != null){
						li.setAttribute('data-task-list','');
						if(this.checkbox.checked){
							li.setAttribute('data-checked','');
						} else {
							li.setAttribute('data-unchecked','');
						}
						var clickHandler = function(e){
							 if (e.offsetX < 0) {
								 if(li.hasAttribute('data-checked')){
									li.removeAttribute('data-checked');
									li.setAttribute('data-unchecked','');
								 } else {
									li.removeAttribute('data-unchecked');
									li.setAttribute('data-checked','');
								 }
							 }
						}
						li.addEventListener('click',clickHandler);
						var checkbox = this.checkbox.cloneNode(true);
						$(this.checkbox).remove();
						var me = this;
						this.compositeEditor.on('stop',function(){
							checkbox.checked = li.hasAttribute('data-checked');
							if(checkbox.checked){
								checkbox.setAttribute('checked','')
							}else{
								checkbox.removeAttribute('checked')
							}
							$(li).prepend(checkbox);
							li.removeAttribute('data-checked');
							li.removeAttribute('data-unchecked');
							li.removeAttribute('data-task-list');
							li.removeEventListener('click',clickHandler);
						})	
					}
				}
				
				LiEditor.prototype.stop = function(){
					if (this.compositeEditor) {
						this.compositeEditor.stop();
					}
				}
				
				LiEditor.prototype.isTaskList = function(){
					return this.checkbox != null;
				}
				
				LiEditor.prototype.focus = function(){
					return this.li.focus();
				}
				
				LiEditor.prototype.append = function(after){
					if(after){
						if(this.isTaskList()){
							$(this.li).after('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
						} else {
							$(this.li).after('<li></li>');
						}
					} else {
						if(this.isTaskList()){
							$(this.li).before('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
						} else {
							$(this.li).before('<li></li>');
						}
					}
				}
				
				return {create : function(list,li,wrapper,target,embed){
					return new LiEditor(list,li,wrapper,target,embed)
				}}
			})();
			
            function ListEditor(element, wrapper,embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.eventHandlers = [];
				this.embed = embed;
				this.copy = element.cloneNode(true);
            }
				
			ListEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}

            ListEditor.prototype.start = function(_target) {
                var me = this;
                var ele = $(this.element);
                var toolbar = document.createElement('div');
                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                ele.before(toolbar);
                toolbar = new Bar(toolbar);
                toolbar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            ele.remove();
                            me.stop();
                        }
                    })
                });
				toolbar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            me.cancel();
                        }
                    })
                });

                toolbar.addIcon('fas fa-plus middle-icon', function() {
                    if(!me.liEditor) return;
                    var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
                    var html = '';
                    html += '<div><button style="' + style + '" >向上添加</button></div>';
                    html += '<div><button style="' + style + '" >向下添加</button></div>';
                    Swal({
                        animation: false,
                        html: html
                    });
                    var buttons = $(Swal.getContent()).find('button');
                    buttons.eq(0).click(function() {
                        me.liEditor.append(false);
						Swal.getCloseButton().click();
                    });
                    buttons.eq(1).click(function() {
                        me.liEditor.append(true);
						Swal.getCloseButton().click();
                    });
                });
				toolbar.addIcon('fas fa-exchange-alt middle-icon', function() {
					//TODO loop detect is task list
					var children = me.element.children;
					for(var i=0;i<children.length;i++){
						var child = children[i];
						if(child.nodeType == 1 && child.tagName == 'LI'){
							var checkbox = getCheckbox(child);
							if(checkbox != null){
								return ;
							}
						}
					}
					_stop(me);
					var tagName = me.element.tagName == 'OL' ? "ul" : 'ol';
					var replace = document.createElement(tagName);
					replace.innerHTML = me.element.innerHTML;
					cloneAttributes(replace,me.element);
					$(me.element).after(replace).remove();
					me.element = replace;
					me.stop();
				},function(ele){
					me.exchangeIcon = ele;
				});	

                toolbar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
				
				
                var editLi = function(li, target) {
                    if (li != null) {
						
                        if (!li.isContentEditable) {
							 if(me.liEditor){
								me.liEditor.stop();
								me.liEditor = undefined;
							}
							var liEditor = LiEditor.create(me.element,li,me.wrapper,target,me.embed);
							liEditor.start();
							liEditor.focus();
							me.liEditor = liEditor;
						}
                    }
                }
                if (_target) {
                    editLi(getLi(_target, this.element), _target);
                }
                var clickHandler = function(e) {
                    var li = getLi(e.target, me.element);
                    editLi(li, e.target);
                }

                ele.on('click', 'li', clickHandler);
                this.clickHandler = clickHandler;
                this.toolbar = toolbar;
				triggerEvent('start',this);
            }


            ListEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.toolbar.remove();
				_stop(this);
				triggerEvent('stop',this);
            }
			
			ListEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.toolbar.remove();
				if (this.liEditor) {
                    this.liEditor.stop();
                }
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
            }
			
			ListEditor.prototype.getElement = function() {
                return this.element;
            }			
            ListEditor.prototype.focus = function() {
				if(this.liEditor)
					this.liEditor.focus();
            }
						
			function _stop(editor){
				if (editor.liEditor) {
                    editor.liEditor.stop();
                }
				var ele = $(editor.element);
				ele.find('li').each(function(){
					var checkbox = getCheckbox(this);
					wrapToParagraph(this,checkbox);
				})
                ele.off('click', 'li', editor.clickHandler);
                ele.find('[contenteditable]').each(function() {
                    editor.removeEventListener('paste', plainPasteHandler);
                    editor.removeAttribute('contenteditable');
                });
			}
			
			function wrapToParagraph(li,checkbox){
				li.normalize();
				var array = [];
				//wrap inline|text nodes to paragraph
				var childNodes = li.childNodes;
				if(childNodes.length > 0){
					for(var i=0;i<childNodes.length;i++){
						var childNode = childNodes[i];
						if(childNode == checkbox){
							continue;
						}
						if(childNode.nodeType == 1){
							if(childNode.blockDefault()){
								break;
							}
							//detech is katex display
							if(childNode.hasAttribute('data-block-katex')){
								break;
							}
							array.push(childNode);
						} else {
							array.push(childNode);
						}
					}
				}
				if(array.length > 0){
					var paragraph = document.createElement('p');
					$(array[array.length-1]).after(paragraph);
					for(var i=0;i<array.length;i++){
						paragraph.appendChild(array[i].cloneNode(true));
						$(array[i]).remove();
					}
				}
			}

            function getLi(_target, root) {
                var target = _target;
                while (target != null) {
                    if (target.tagName == 'LI') {
                        return target;
                    }
                    target = target.parentElement;
                    if (!$.contains(root, target)) {
                        return null;
                    }
                }
                return null;
            }

            return {
                create: function(element, wrapper,embed) {
                    return new ListEditor(element, wrapper,embed);
                },
				createElement: function() {
					var ul = document.createElement('ul');
					ul.innerHTML = '<li></li>';
					return ul;
				},
				name: 'ListEditorFactory',
				match:function(element){
					var tagName = element.tagName;
					return tagName == 'OL' || tagName == 'UL';
				},
				order:0
            }
        })();
		
		//TODO history missing
		 var PreEditorFactory = (function() {
            function PreEditor(element,wrapper,embed) {
                this.eventHandlers = [];
                this.element = element;
				this.wrapper = wrapper;
				this.embed = embed;
				this.copy = element.cloneNode(true);
            }
            PreEditor.prototype.start = function() {
                var me = this;
                var pre = this.element;
                var code = pre.querySelector('code');
                this.language = code == null ? '' : getLanguage(code) || '';
                if (code != null) {
                    pre.innerHTML = code.innerHTML;
                }
                pre.setAttribute('contenteditable', 'true');


                var timer;
                this.inputHandler = function() {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
						if(me.composing === true) return;
                        updateEditor(pre, function() {
                            highlight(pre, me.language);
                        })
                    }, 500)
                }
				
				this.startHandler = function(e) {
					me.composing = true;
				};
				this.endHandler = function(e) {
					me.composing = false;
				};
				
				pre.addEventListener('compositionstart', this.startHandler);
				pre.addEventListener('compositionend', this.endHandler);
                pre.addEventListener('input', this.inputHandler);
				this.preHelper = new PreHelper(pre);

                var toolbar = document.createElement('div');
                pre.before(toolbar);

                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
				var languageWrap = document.createElement('span');
                var languageInput = document.createElement('input');
                languageInput.classList.add('heather_language_input');
                languageInput.classList.add('fas');
                languageInput.classList.add('middle-icon');
                languageInput.setAttribute('placeholder','输入语言');
				languageInput.addEventListener('keydown',function(e){
					if(keyNames[e.keyCode] == 'Enter'){
						e.preventDefault();
						e.stopPropagation();
						var language = this.value;
						if(hljs.getLanguage(language)){
							languageInput.classList.remove('heather_language_error');
							me.language = language;
						} else {
							languageInput.classList.add('heather_language_error');
							me.language = '';
						}
						highlight(pre, me.language);
						pre.focus();
						return false;
					}
				});
                if (this.language == 'html') this.language = 'xml';
				if(this.language.trim() != ''){
					languageInput.value = this.language.trim();
					if(hljs.getLanguage(languageInput.value)){
						languageInput.classList.remove('heather_language_error');
					} else {
						languageInput.classList.add('heather_language_error');
					}
				}
                highlight(pre, me.language);
                this.bar = new Bar(toolbar);
				var languageSelector = document.createElement('i');
				languageSelector.setAttribute('class','fas fa-bars middle-icon');
				languageWrap.appendChild(languageInput);
				languageWrap.appendChild(languageSelector);
				languageSelector.addEventListener(mobile ? 'touchstart' : 'mousedown',function(e){
					e.preventDefault();
					e.stopPropagation();
					var inputOptions = {};
                    var languages = hljs.listLanguages();
                    for (var i = 0; i < languages.length; i++) {
                        var language = languages[i];
                        inputOptions[language] = language;
                    }
                    Swal.fire({
                        title: '选择语言',
                        input: 'select',
						animation:false,
						inputValue:me.language,
                        inputOptions: inputOptions
                    }).then((result) => {
                        if (result.value) {
                            var lang = result.value;
							languageInput.value = lang;
							languageInput.classList.remove('heather_language_error');
                            me.language = lang;
							highlight(pre, me.language);
							pre.focus();
                        }
                    })
				})
				this.bar.addElement(languageWrap);
				languageSelector.setAttribute('style','margin-left:-'+$(languageSelector).width()+'px')
                this.bar.addIcon('fas fa-trash middle-icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            pre.remove();
							me.stop();
                        }
                    })
                });
				this.bar.addIcon('fas fa-times middle-icon', function() {
                    Swal.fire({
                        title: '确定要取消吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
							me.cancel();
                        }
                    })
                });
                this.bar.addIcon('fas fa-check middle-icon', function() {
                    me.stop();
                });
				triggerEvent('start',this);
            }

            PreEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                var pre = this.element;
				
				pre.removeEventListener('compositionstart', this.startHandler);
				pre.removeEventListener('compositionend', this.endHandler);
                pre.removeEventListener('input', this.inputHandler);
				this.preHelper.unbind();
                $(pre).removeAttr('contenteditable');
                highlight(pre, this.language);
                var code = document.createElement('code');
                if (this.language != '') {
                    code.classList.add('language-' + this.language);
                }
                code.innerHTML = pre.innerHTML;
                pre.innerHTML = code.outerHTML;
                this.bar.remove();
				triggerEvent('stop',this);
            }
			
			PreEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				this.preHelper.unbind();
                this.bar.remove();
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
            }

			PreEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
			PreEditor.prototype.getElement = function() {
                return this.element;
            }
            PreEditor.prototype.focus = function() {
                this.element.focus();
            }

            function getLanguage(code) {
                var language = code.getAttribute('class');
                if (language && language.startsWith("language-")) {
                    return language.split('-')[1];
                }
            }

            function highlight(pre, language) {
                if (hljs.getLanguage(language)) {
					var html = hljs.highlight(language, pre.textContent, true).value;
					var _pre = document.createElement('pre');
					_pre.innerHTML = html;
					cloneAttributes(_pre,pre);
                    morphdom(pre,_pre);
                }
            }
            //code from https://codepen.io/brianmearns/pen/YVjZWw
            function getTextSegments(element) {
                var textSegments = [];
                for (var i = 0; i < element.childNodes.length; i++) {
                    var node = element.childNodes[i];
                    var nodeType = node.nodeType;
                    if (nodeType == 1) {
                        textSegments.splice(textSegments.length, 0, ...(getTextSegments(node)));
                    }
                    if (nodeType == 3) {
                        textSegments.push({
                            text: node.nodeValue,
                            node
                        });
                    }
                }
                return textSegments;
            }

            function updateEditor(code, callback) {
                var sel = window.getSelection();
                var textSegments = getTextSegments(code);
                var textContent = textSegments.map(({
                    text
                }) => text).join('');
                var anchorIndex = null;
                var focusIndex = null;
                var currentIndex = 0;
                for (var i = 0; i < textSegments.length; i++) {
                    var seg = textSegments[i];
                    var text = seg.text;
                    var node = seg.node;
                    if (node === sel.anchorNode) {
                        anchorIndex = currentIndex + sel.anchorOffset;
                    }
                    if (node === sel.focusNode) {
                        focusIndex = currentIndex + sel.focusOffset;
                    }
                    currentIndex += text.length;
                }
                if (callback) callback();
                restoreSelection(code, anchorIndex, focusIndex);
            }

            function restoreSelection(code, absoluteAnchorIndex, absoluteFocusIndex) {
                var sel = window.getSelection();
                var textSegments = getTextSegments(code);
                var anchorNode = code;
                var anchorIndex = 0;
                var focusNode = code;
                var focusIndex = 0;
                var currentIndex = 0;
                for (var i = 0; i < textSegments.length; i++) {
                    var seg = textSegments[i];
                    var text = seg.text;
                    var node = seg.node;
                    var startIndexOfNode = currentIndex;
                    var endIndexOfNode = startIndexOfNode + text.length;
                    if (startIndexOfNode <= absoluteAnchorIndex && absoluteAnchorIndex <= endIndexOfNode) {
                        anchorNode = node;
                        anchorIndex = absoluteAnchorIndex - startIndexOfNode;
                    }
                    if (startIndexOfNode <= absoluteFocusIndex && absoluteFocusIndex <= endIndexOfNode) {
                        focusNode = node;
                        focusIndex = absoluteFocusIndex - startIndexOfNode;
                    }
                    currentIndex += text.length;
                }
                sel.setBaseAndExtent(anchorNode, anchorIndex, focusNode, focusIndex);
            }

            return {
                create: function(element,wrapper,embed) {
                    return new PreEditor(element,wrapper,embed);
                },
				createElement: function() {
					return document.createElement('pre');
				},
				name: 'PreEditorFactory',
				match:function(element){
					var tagName = element.tagName;
					return tagName == 'PRE';
				},
				order:0
            }
        })();
		
		var TaskListEditorFactory = (function() {
			return {
				create: function(element, wrapper,embed) {
					return ListEditorFactory.create(element, wrapper,embed)
				},
				createElement: function() {
					var ul = document.createElement('ul');
					ul.classList.add('contains-task-list');
					ul.innerHTML = '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" type="checkbox"></li>';
					return ul;
				},
				name: 'TaskListEditorFactory',
				match:function(element){
					return ListEditorFactory.match(element);
				},
				order:0
			}
		})();
		
		var BlockquoteEditorFactory = (function() {
			return {
				create: function(element, wrapper) {
					return CompositeEditorFactory.create(element, wrapper)
				},
				createElement: function() {
					return document.createElement('blockquote');
				},
				name: 'BlockquoteEditorFactory',
				match:function(element){
					return element.tagName == 'BLOCKQUOTE';
				},
				order:0
			}
		})();
		
		 var CompositeEditorFactory = (function() {
			function CompositeEditor(element, wrapper) {
				this.element = element;
				this.wrapper = wrapper;
				this.eventHandlers = [];
				this.copy = element.cloneNode(true);
			}

			CompositeEditor.prototype.start = function(_target) {
				var me = this;
				var editTarget = function(_target) {
					var target = _target;
					while (target != null) {
						if (target.hasAttribute('data-toolbar')) {
							return;
						}
						if (target.parentElement == me.element) {
							break;
						}
						target = target.parentElement;
					}
					if (target == null) {
					   return ;
					}
					if (me.embedEditor && me.embedEditor.getElement() === target) return;
					createEditor(target, me, _target);
				}
				if (_target) {
					editTarget(_target);
				}
				var clickHandler = function(e) {
					e.preventDefault();
					e.stopPropagation();
					var target = e.target;
					editTarget(target);
				}
				this.element.addEventListener('click', clickHandler);
				var toolbar = document.createElement('div');
				toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
				$(this.element).before(toolbar);
				toolbar = new Bar(toolbar);
				toolbar.addIcon('fas fa-trash middle-icon', function() {
					Swal.fire({
						title: '确定要删除吗?',
						type: 'warning',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#d33'
					}).then((result) => {
						if (result.value) {
							$(me.element).remove();
							me.stop()
						}
					})
				});
				
				toolbar.addIcon('fas fa-times middle-icon', function() {
					Swal.fire({
						title: '确定要取消吗?',
						type: 'warning',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#d33'
					}).then((result) => {
						if (result.value) {
							me.cancel()
						}
					})
				});

				toolbar.addIcon('fas fa-bars middle-icon', function() {
					createEmbedEditorDialog(me, function(element) {
						me.element.appendChild(element);
					});
				});
				
				
				var ElementInsert = (function(){
					var started = false;
					var start = function(){
						if(started === true) return;
						if (me.embedEditor) {
							me.embedEditor.stop();
							delete me.embedEditor;
						}
						me.element.removeEventListener('click', me.clickHandler);
						me.element.classList.add('heather_opacity-5');
						var children = $(me.element).children();
						$.each(children, function() {
							var p = document.createElement('div');
							p.classList.add('heather_p');
							p.innerHTML = '<i class="fas fa-plus middle-icon"></i>';
							p.querySelector('i').addEventListener('click', function() {
								var p = this.parentElement;
								var prev = p.previousElementSibling;
								createEmbedEditorDialog(me, function(element) {
									if (prev == null) {
										$(me.element).prepend(element);
									} else {
										$(prev).after(element)
									}
								})
								stop();
							});
							$(this).before(p);
						})
						started = true;
					}
					
					var stop = function(){
						if(started !== true) return;
						me.element.classList.remove('heather_opacity-5');
						$(me.element).find('.heather_p').remove();
						me.element.addEventListener('click', me.clickHandler);
						started = false;
					}
					
					return {
						start : start,
						stop : stop,
						isStarted : function(){return started}
					}
				})();
								
				toolbar.addIcon('fas fa-align-justify middle-icon', function() {
					if(ElementInsert.isStarted()){
						ElementInsert.stop();
					} else {
						ElementInsert.start();
					}
				});

				toolbar.addIcon('fas fa-check middle-icon', function() {
					me.stop();
				});

				this.toolbar = toolbar;
				this.clickHandler = clickHandler;
				triggerEvent('start',this);
			}

			CompositeEditor.prototype.on = function(name,handler) {
				this.eventHandlers.push({
					name : name,
					handler : handler
				})
			}
			CompositeEditor.prototype.getElement = function() {
                return this.element;
            }
			CompositeEditor.prototype.focus = function() {

			}

			CompositeEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				if (this.embedEditor) {
					this.embedEditor.stop();
				}
				if (this.element.childNodes.length == 0) {
					$(this.element).remove();
				} else {
					this.element.removeEventListener('click', this.clickHandler);
				}
				this.toolbar.remove();
				this.element.classList.remove('heather_opacity-5');
				$(this.element).find('.heather_p').remove();
				triggerEvent('stop',this);
			}
			
			CompositeEditor.prototype.cancel = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
				if (this.embedEditor) {
					this.embedEditor.cancel();
				}
				this.element.replaceWith(this.copy);
				triggerEvent('cancel',this);
			}
			
			function createEmbedEditorDialog(editor, handler) {
				if (editor.embedEditor) {
					editor.embedEditor.stop();
					editor.embedEditor = undefined;
				}

				showEditorFactoryDialog(function(factory) {
					var element = factory.createElement();
					handler(element);
					createEditor(element, editor);
				})
			}

			function createEditor(element, editor, _target) {
				var factory = getEditorFactoryByElement(element);
				var embedEditor;
				if (factory != null) {
					embedEditor = factory.create(element, editor.wrapper,true);
				}
				if (editor.embedEditor) {
					editor.embedEditor.stop();
					editor.embedEditor = undefined;
				}
				delete editor.embedEditor;
				if (embedEditor) {
					embedEditor.on('stop',function() {
						delete editor.embedEditor;
					})
					embedEditor.start(_target);
					embedEditor.focus();
					editor.embedEditor = embedEditor;
				}
			}

			return {
				create: function(element, wrapper) {
					return new CompositeEditor(element, wrapper);
				}
			}
		})();
		
		editorFactories.push(KatexBlockEditorFactory);
		editorFactories.push(MermaidEditorFactory);
		editorFactories.push(ListEditorFactory);
		editorFactories.push(PreEditorFactory);
		editorFactories.push(TaskListEditorFactory);
		editorFactories.push(BlockquoteEditorFactory);
		editorFactories.push(TableEditorFactory);
		editorFactories.push(HeadingEditorFactory);
		editorFactories.push(HREditorFactory);
		editorFactories.push(ParagraphEditorFactory);
		
		editorFactories.sort(function(a,b){
			return a.order > b.order ? -1 : a.order == b.order ? 0 : 1;
		});
		
		var MediaHelper = (function(){
			function MediaHelper(wysiwyg){
				var root = document.getElementById('heather_out');
				
				var getLinkElement = function(element){
					var linkElement = element;
					while(linkElement != null){
						if(linkElement.hasAttribute('data-line')){
							break;
						}
						linkElement = linkElement.parentElement;
					}
					return linkElement;
				}
				var updateMarkdownSourceIfNeed = function(linkElement){
					//need update markdown source code
					//find data-line parent if exists
					var currentEditor = wysiwyg.currentEditor;
					if(currentEditor){
						if(currentEditor.getElement() === linkElement){
							//let currentEditor stop and update 
							return ;
						}
						//need to close currentEditor
						wysiwyg.stopCurrentEditor();
					}
					//update markdown source
					updateElementToMarkdownSource(wysiwyg,true,
						parseInt(linkElement.getAttribute('data-line')),
						parseInt(linkElement.getAttribute('data-end-line')),
						linkElement)
				}
				
				$(root).on('click','img',function(e){
					e.preventDefault();
					e.stopPropagation();//prevent start a editor;
					var element = this;
					var linkElement = getLinkElement(element);
					if(linkElement == null){
						return ;
					}
					var src = element.getAttribute('src');
					var alt = element.getAttribute("alt");
					var title = element.getAttribute("title");
					Swal.fire({
						html: '<label>图片地址</label><input id="heather-media-helper-img-src" class="swal2-input">' +
							'<label>图片alt</label><input id="heather-media-helper-img-alt" class="swal2-input">' +
							'<label>图片标题</label><input id="heather-media-helper-img-title" class="swal2-input">',
						focusConfirm: false,
						onBeforeOpen: function() {
							document.getElementById("heather-media-helper-img-src").value = src;
							document.getElementById("heather-media-helper-img-alt").value = alt;
							document.getElementById("heather-media-helper-img-title").value = title;
						},
						preConfirm: () => {
							return [
								document.getElementById("heather-media-helper-img-src").value,
								document.getElementById("heather-media-helper-img-alt").value,
								document.getElementById("heather-media-helper-img-title").value
							]
						},
						showCancelButton:true
					}).then((formValues) => {
						formValues = formValues.value;
						if(!formValues){
							return ;
						}
						var src = formValues[0];
						var alt = formValues[1];
						var title = formValues[2];

						if (src.trim() != '') {
							if (src != element.getAttribute('src')) {
								element.setAttribute('src', src.trim());
							}
							if (alt == '') {
								element.removeAttribute('alt');
							} else {
								element.setAttribute('alt', alt);
							}
							if (title == '') {
								element.removeAttribute('title');
							} else {
								element.setAttribute('title', title);
							}
							updateMarkdownSourceIfNeed(linkElement);
						}
					});
				});
			}
			
			return MediaHelper;
		})();
			
		var PreHelper = (function(){
			function PreHelper(pre){
				this.pre = pre;
				this.keyDownHandler = function(e) {
					//TODO chrome || ios need enter twice
					if (keyNames[e.keyCode] == 'Enter') {
						document.execCommand('insertHTML', false, '\r\n');
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
					if (e.shiftKey && keyNames[e.keyCode] == 'Tab') {
						var sel = window.getSelection();
						var range = getRange(pre);
						if(range != null){
							 var text = window.getSelection().toString().replaceAll("\r", "");
							if (text.endsWith("\n")) {
								text = text.substring(0, text.length - 1);
							}
							var lines = text.split('\n');
							var rst = "";
							for (var i = 0; i < lines.length; i++) {
								var line = lines[i];
								line = deleteStartWhiteSpace(line, 4);
								rst += line;
								if (i < lines.length - 1) {
									rst += '\n';
								}
							}
							range.deleteContents();
							var node = document.createTextNode(rst);
							range.insertNode(node);
							sel.removeAllRanges();
							sel.addRange(range);
						}
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
					if (keyNames[e.keyCode] == 'Tab') {
						var sel = window.getSelection();
						if (sel.type == 'Caret') {
							document.execCommand('insertText', false, '    ');
						} else {
							var range = getRange(pre);
							if(range != null){
								var lines = sel.toString().replaceAll("\r", "").split('\n');
								var rst = "";
								for (var i = 0; i < lines.length; i++) {
									var line = lines[i];
									rst += '    ' + line;
									if (i < lines.length - 1) {
										rst += '\n'
									}
								}
								range.deleteContents();
								range.insertNode(document.createTextNode(rst));
							}
						}
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
				}
				
				this.pasteHandler = function(e) {
					var cpdata = (e.originalEvent || e).clipboardData;
					var data = cpdata.getData('text/plain');
					var sel = window.getSelection();
					var range = getRange(pre);
					if(range != null){
						range.deleteContents();
						range.insertNode(document.createTextNode(data.replaceAll('<br>', '\n').replaceAll(tabSpace, "    ")));
					}
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
				
				this.pre.addEventListener('keydown', this.keyDownHandler);
				this.pre.addEventListener('paste', this.pasteHandler);
			}
			
			PreHelper.prototype.unbind = function(){
				this.pre.removeEventListener('keydown', this.keyDownHandler);
				this.pre.removeEventListener('paste', this.pasteHandler);
			}
			
			function deleteStartWhiteSpace(str, count) {
				var rst = str;
				for (var i = 0; i < count; i++) {
					if (rst.startsWith(" ")) {
						rst = rst.substring(1);
					} else {
						return rst;
					}
				}
				return rst;
			}
			
			return PreHelper;
		})();
		
		function showEditorFactoryDialog(callback) {
			var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
			var html = '';
			html += '<div><button style="' + style + '" data-editor="HeadingEditorFactory">插入标题</button></div>';
			html += '<div><button style="' + style + '" data-editor="ParagraphEditorFactory">插入段落</button></div>';
			html += '<div><button style="' + style + '" data-editor="PreEditorFactory">插入代码块</button></div>';
			html += '<div><button style="' + style + '" data-editor="BlockquoteEditorFactory">插入引用</button></div>';
			html += '<div><button style="' + style + '" data-editor="TableEditorFactory">插入表格</button></div>';
			html += '<div><button style="' + style + '" data-editor="ListEditorFactory">插入列表</button></div>';
			html += '<div><button style="' + style + '" data-editor="TaskListEditorFactory">插入任务列表</button></div>';
			html += '<div><button style="' + style + '" data-editor="HREditorFactory">水平线</button></div>';
			html += '<div><button style="' + style + '" data-editor="KatexBlockEditorFactory">数学公式块</button></div>';
			html += '<div><button style="' + style + '" data-editor="MermaidEditorFactory">mermaid图表块</button></div>';
			var editor;
			Swal({
				animation: false,
				html: html,
				onAfterClose:function(){
					if(editor) callback(editor);
				}
			});
			var buttons = Swal.getContent().querySelectorAll('[data-editor]');
			for(var button of buttons){
				button.addEventListener('click',function(){
					var editorName = this.getAttribute('data-editor');
					editor = getEditorFactoryByName(editorName);
					Swal.getCloseButton().click();
				})
			}
		}
		
		function createInlineMathSession(wrapper,element){
			return wrapper.nearWysiwyg.inlineMath.createSession(element)
		}
			
		function getKatexExpression(elem){
			return elem.querySelector('[encoding="application/x-tex"]').textContent;
		}

		function getMermaidExpression(elem){
			return elem.querySelector('.mermaid-source').value;
		}		
		
		function getEditorFactoryByName(name){
			for(var factory of editorFactories){
				if(factory.name === name) 
					return factory;
			}
		}
		
		function getEditorFactoryByElement(element){
			for(var factory of editorFactories){
				if(factory.match(element)) 
					return factory;
			}
		}
		
		return NearWysiwyg;
	})();


	function cleanHtml(html) {
		return html.replaceAll(veryThinChar,'');
    }
	
	var selectionChangeListeners = [];
	document.onselectionchange = function(){
		for(var i=0;i<selectionChangeListeners.length;i++){
			try{
				selectionChangeListeners[i].call()
			}catch(e){console.log(e)};
		}
	}		
	var registerSelectionChangeListener = function(selectionChangeListener) {
		selectionChangeListeners.push(selectionChangeListener);
	}

	var unregisterSelectionChangeListener = function(selectionChangeListener) {
		var listeners = selectionChangeListeners;
		for (var i = 0; i < listeners.length; i++) {
			if (listeners[i] == selectionChangeListener) {
				listeners.splice(i, 1);
				break;
			}
		}
	}
	
	function getRange(element) {
        var sel = window.getSelection();
        if (sel.rangeCount > 0) {
            var range = sel.getRangeAt(0);
            var node = range.commonAncestorContainer;
            while (node != null) {
                if (node == element) {
                    break;
                }
                node = node.parentElement;
            }
            return node == null ? null : range;
        }
        return null;
    }
	
	
	function getCoords(range) {
		var box = range.getBoundingClientRect();
		range = range.cloneRange();
		var rects,rect,left,top;
		if (range.getClientRects) {
			range.collapse(true);
			rects = range.getClientRects();
			if (rects.length > 0) {
				rect = rects[0];
				left = rect.left;
				top = rect.top;
			}
		}
		if (left == 0 && top == 0 || !left || !top) {
			var span = document.createElement("span");
			if (span.getClientRects) {
				span.appendChild(document.createTextNode(veryThinChar));
				range.insertNode(span);
				rect = span.getClientRects()[0];
				if(rect){
					left = rect.left;
					top = rect.top;
				}
				var spanParent = span.parentNode;
				spanParent.removeChild(span);
				spanParent.normalize();
			}
		}
		var body = document.body;
		var docEl = document.documentElement;
		var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
		var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;
		var clientTop = docEl.clientTop || body.clientTop || 0;
		var clientLeft = docEl.clientLeft || body.clientLeft || 0;
		top = top + scrollTop - clientTop;
		left = left + scrollLeft - clientLeft;
		return {
			top: Math.round(top),
			left: Math.round(left),
			height: Math.round(box.height)
		};
	}
	
	var katexLoading = false;
	var katexLoaded = false;

	function loadKatex(callback) {
		if(katexLoaded){
			if(callback) callback();
			return;
		}
		if (katexLoading) return;
		katexLoading = true;
		$('<link>').appendTo('head').attr({
			type: 'text/css',
			rel: 'stylesheet',
			href: _EditorWrapper.res_katex_css || 'katex/katex.min.css'
		});
		$('<script>').appendTo('body').attr({
			src: _EditorWrapper.res_katex_js || 'katex/katex.min.js'
		});
		var t = setInterval(function() {
			try {
				var html = katex.renderToString("", {
					throwOnError: false
				})
				clearInterval(t);
				katexLoaded = true;
				if(callback) callback();
			} catch (__) {

			}
		}, 20)
	}
	
	var mermaidLoading = false;
	var mermaidLoaded = false;

	function loadMermaid(callback) {
		if(mermaidLoaded){
			if(callback) callback();
			return;
		}
		if (mermaidLoading) return;
		mermaidLoading = true;
		$('<script>').appendTo('body').attr({
			src: _EditorWrapper.res_mermaid_js || 'js/mermaid.min.js'
		});
		var t = setInterval(function() {
			try {
				mermaid.initialize({
					theme: 'default'
				});
				clearInterval(t);
				mermaidLoaded = true;
				if(callback) callback();
			} catch (__) {}
		}, 20)
	}
		

    var plainPasteHandler = function(e){
		var text = (e.originalEvent || e).clipboardData.getData('text/plain');
		document.execCommand('insertText',false,text);
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	
    function cloneAttributes(element, sourceNode,filter) {
		filter = filter || function(){
			return true;
		}
        let attr;
        let attributes = Array.prototype.slice.call(sourceNode.attributes);
        while (attr = attributes.pop()) {
			if(filter(attr.nodeName)){
				element.setAttribute(attr.nodeName, attr.nodeValue);
			}
        }
    }

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

	function isUndefined(o) {
        return (typeof o == 'undefined')
    }

    function getDefault(o, dft) {
        return isUndefined(o) ? dft : o;
    }
	
	function parseHTML(html){
		return new DOMParser().parseFromString(html, "text/html");
	}
	
	function pasteHtmlAtRange(range, html) {
        range.deleteContents();
        var el = document.createElement("div");
        el.innerHTML = html;
        var frag = document.createDocumentFragment(),
            node, lastNode;
        while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
            range = range.cloneRange();
            range.setEndBefore(lastNode);
            range.setStartAfter(lastNode);
            range.collapse(true);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
	
	function placeCaretAtEnd(el) {
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function divToBr($element) {
        var divs = $element.find('div');
        for (var i = 0; i < divs.length; i++) {
            var div = divs[i];
            var prevBr = false;
            var prev = div.previousSibling;
            while (prev != null && prev.nodeType == 3 && prev.textContent.trim() == '') {
                prev = prev.previousSibling;
            }
            if (prev != null) {
                var nodeType = prev.nodeType;
                if (nodeType == 3) {
                    //text node need add br
                    $(div).before('<br>');
                    prevBr = true;
                } else if (nodeType == 1) {
                    //element node 
                    if (!prev.blockDefault() && prev.tagName != 'BR') {
                        $(div).before('<br>');
                        prevBr = true;
                    }
                }
            }
            var childNodes = div.childNodes;
            var last = childNodes[childNodes.length - 1];
            if (last == null) {
                if (!prevBr) {
                    $(div).before('<br>');
                }
                $(div).remove();
            } else {
                var nodeType = last.nodeType;
                if (nodeType == 3 || (nodeType == 1 && !last.blockDefault() && last.tagName != 'BR')) {
                    var next = div.nextSibling;
                    while (next != null && next.nodeType == 3 && next.textContent.trim() == '') {
                        next = next.nextSibling;
                    }
                    if (next != null) {
                        var nodeType = next.nodeType;
                        if (nodeType == 3) {
                            $(div).after('<br>');
                        } else if (nodeType == 1) {
                            if (!next.blockDefault() && next.tagName != 'BR') {
                                $(div).after('<br>');
                            }
                        }
                    }
                }
                $(div).after(div.innerHTML);
                $(div).remove();
            }
        }
    }
	
	function isEmptyText(text){
		return text.replaceAll(veryThinChar,'').replaceAll('&nbsp;', '').replaceAll('<br>', '').trim() == ''
	}
	
	function toast(title,type,timer){
		timer = timer || 3000;
		type = type || 'success';
		var Toast = Swal.mixin({
		  toast: true,
		  position: 'top-end',
		  showConfirmButton: false,
		  timer: timer
		})

		Toast.fire({
		  type: type,
		  title: title
		})
	}
				
	/**
	this method must be called within loadKatex
	*/
	function parseKatex(expression,displayMode){
		try{
			return katex.renderToString(expression, {
				throwOnError: true,
				displayMode: displayMode
			});
		}catch(e){
			if (e instanceof katex.ParseError) {
				var attr = displayMode ? 'data-block-katex' : 'data-inline-katex'
				return '<span class="katex-mathml" data-error title="'+e.message+'" '+attr+' style="color:red"><math><semantics><annotation encoding="application/x-tex">'+expression+'</annotation></semantics></math>'+expression+'</span>';
			} else {
				throw e;
			}
		}
	}
	
	function createUnparsedMermaidElement(expression){
		var div = document.createElement('div');
		div.classList.add('mermaid-block');
		div.innerHTML = '<div class="mermaid"></div><textarea class="mermaid-source" style="display:none !important">' + expression + '</textarea>';
		div.querySelector('.mermaid').innerHTML = expression;
		return div;
	}

	
    return _EditorWrapper;

})();