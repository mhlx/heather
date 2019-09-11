var Wysiwyg = (function() {

    'use strict';

    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

  
    //from turndown js..
    var blockElements = [
        'address', 'article', 'aside', 'audio', 'blockquote', 'body', 'canvas',
        'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
        'figure', 'footer', 'form', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'header', 'hgroup', 'hr', 'html', 'isindex', 'li', 'main', 'menu', 'nav',
        'noframes', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table',
        'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
    ];

    Node.prototype.blockDefault = function() {
        if (this.nodeType == 1) {
            var tag = this.tagName.toLowerCase();
            for (const blockElementName of blockElements) {
                if (blockElementName == tag) {
                    return true;
                }
            }
        }
        return false;
    }
	//from CodeMirror/util/browser.js
	var platform = navigator.platform;
	var userAgent = navigator.userAgent;
	var edge = /Edge\/(\d+)/.exec(userAgent);
	var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
	var android = /Android/.test(userAgent);
    var mac = ios || /Mac/.test(platform);
    var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
	
    var veryThinHtml = '&#8203;';
    var veryThinChar = '​';
	var tabSpace = '	';
	

    var selectionChangeListeners = [];
    var selectionChangeTimer;
    var selectionChangeTimerMill = 100;

    document.onselectionchange = function() {
        if (selectionChangeTimer) {
            clearTimeout(selectionChangeTimer);
        }
        selectionChangeTimer = setTimeout(function() {
            for (var i = 0; i < selectionChangeListeners.length; i++) {
                try {
                    selectionChangeListeners[i].call()
                } catch (e) {
                    console.log(e)
                };
            }
        }, selectionChangeTimerMill)
    }
	
	
    var lazyRes = {
        mermaid_js: "js/mermaid.min.js",
        katex_css: "katex/katex.min.css",
        katex_js: "katex/katex.min.js"
    }
	
	var markdownParser = createMarkdownParser({
		html: true,
		linkify:false,
		plugins: ['footnote', 'katex', 'mermaid', 'anchor', 'task-lists', 'sup', 'sub', 'abbr'],
		lineNumber: false,
			highlight: function(str, lang) {
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
	});
	
    var turndownService = (function() {
	
		var alignMap = {
			'': ' -- ',
			'left': ' :-- ',
			'center': ' :--: ',
			'right': ' --: '
		}

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
		
		turndownService.addRule('html-block', {
			filter: function(node){
				return node.nodeType == 1  && node.tagName == 'DIV' && node.hasAttribute('data-html');
			},
			replacement: function(content,node) {
				return '\n\n' + node.innerHTML + '\n\n';
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
				return '\n\n' + options.fence + " " + language + '\n' + textContent + lineBreaker + options.fence + '\n\n';
			}
		});

		turndownService.addRule('table', {
			filter: function(node) {
				return node.nodeName === 'TABLE'
			},
			replacement: function(content, node, options) {
				return '\n\n' + tableToMarkdown($(node)) + '\n\n';
			}
		});

		turndownService.addRule('list', {
			filter: ['ul', 'ol'],
			replacement: function(content, node, options) {
				node.innerHTML = cleanHtml(node.innerHTML);
				return '\n\n' + listToMarkdown(node, options, 0) + '\n\n';
			}
		});
		
		
		turndownService.addRule('mermaid', {
			filter: function(node) {
				return node.tagName == 'DIV' && node.classList.contains('mermaid-block');
			},
			replacement: function(content, node, options) {
				var expression = getMermaidExpression(node);
				var lines = expression.split('\n');
				var lastLine = lines[lines.length - 1];
				var lineBreaker = lastLine.replaceAll('\n', '') == '' ? '' : '\n';
				return '\n\n' + options.fence + " mermaid" + '\n' + expression + lineBreaker + options.fence + '\n\n';
			}
		});

	   turndownService.addRule('katex-inline', {
			filter: function(node) {
				return node.hasAttribute('data-inline-katex');
			},

			replacement: function(content, node) {
				return '$' + getKatexExpression(node) + '$';
			}
		});
		
		turndownService.addRule('katex-block', {
			filter: function(node) {
				return node.hasAttribute('data-block-katex');
			},

			replacement: function(content, node) {
				var expression = getKatexExpression(node);
				if (!expression.startsWith('\n')) {
					expression = '\n' + expression;
				}
				if (!expression.endsWith('\n')) {
					expression += '\n';
				}
				return '\n\n$$' + expression + '$$\n\n';
			}
		});
		turndownService.addRule('html-inline', {
			filter: function(node) {
				return node.hasAttribute('data-inline-html');
			},

			replacement: function(content, node) {
				node.removeAttribute('data-inline-html');
				return node.outerHTML;
			}
		});

		function listToMarkdown(node, options, indent) {
			var ol = node.tagName == 'OL';
			var index = 1;
			var markdown = '';
			for (const li of node.children) {
				var liMarkdowns = [];
				var checkbox = getCheckbox(li);
				wrapToParagraph(li, checkbox);
				var taskList = checkbox != null;
				var prefix = '';
				if (taskList) {
					if (checkbox.checked) {
						prefix = options.bulletListMarker + ' [x]';
					} else {
						prefix = options.bulletListMarker + ' [ ]';
					}
				} else {
					prefix = ol ? index + '.' : options.bulletListMarker;
				}
				var spaces = taskList ? getSpaces(2) : getSpaces(prefix.length + 1);
				var j = 0;
				for (const child of li.children) {
					if (child === checkbox) continue;
					if (child.tagName == 'OL' || child.tagName == 'UL') {
						liMarkdowns.push(listToMarkdown(child, options, taskList ? 2 : prefix.length + 1));
					} else {
						var str = turndownService.turndown(child.outerHTML);
						var strs = [];
						for (const line of str.split('\n')) {
							strs.push(spaces + line);
						}
						liMarkdowns.push(strs.join('\n'));
					}
					j++;
				}
				var liMarkdown = liMarkdowns.join('\n\n');
				liMarkdown = liMarkdown.substring(taskList ? ' ' : prefix.length);
				markdown += prefix + liMarkdown + '\n';
				index++;
			}
			var indentMarkdown = [];
			for (const line of markdown.split('\n')) {
				indentMarkdown.push(getSpaces(indent) + line);
			}
			return indentMarkdown.join('\n');
		}

		function getSpaces(indent) {
			var spaces = '';
			for (var k = 0; k < indent; k++) {
				spaces += ' ';
			}
			return spaces;
		}

		function tableToMarkdown(table) {

			//if td|th has colspan | rowspan attribute
			//can not parsed to markdown
			//return raw html
			if (table.find('[colspan][rowspan]').length > 0) {
				return table.outerHTML;
			}

			var markdown = '';
			var trs = table.find('tr');

			for (var i = 0; i < trs.length; i++) {
				var tr = trs.eq(i);
				var headingRow = i == 0;
				if (headingRow) {

					var ths = tr.find('th');
					if (ths.length == 0) {
						ths = tr.find('td');
					}
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
				// need to convert all '|' to '\|';
				var newMd = '';
				for (var i = 0; i < md.length; i++) {
					var ch = md.charAt(i);
					if (ch == '|') {
						var prevCh = i == 0 ? '' : md.charAt(i - 1);
						if (prevCh == '\\') {
							newMd += ch;
						} else {
							newMd += '\\' + ch;
						}
					} else {
						newMd += ch;
					}
				}
				newMd = newMd.trim().replace(/\n\r/g, '<br>').replace(/\n/g, "<br>");
				markdown += newMd.length < 3 ? "  " + newMd : newMd;
			}
			markdown += "|";
			return markdown;
		}
		return turndownService;
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
        Bar.prototype.getElement = function() {
            return this.element[0];
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
                var event = isFunction ? defaultEvent : (handler.event || defaultEvent);

                i.addEventListener(event, function(e) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }

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


    //======================================== 2.0
    var Wysiwyg = (function() {

        var editorFactories = [];
        var commands = [];

        //TODO need more ? 
        var keyAlias = {
            'Ctrl': 'Control'
        }


        var HtmlPasteHelper = (function() {

            var attributeRule = {
                'img': ['src', 'title', 'alt'],
                'a': ['href', 'title']
            }

            var unwrapSet = new Set(['DIV', 'ARTICLE']);
            var nodeHandler = {
                'p': {
                    remove: function(node) {
                        //remove <p><br></p> node
                        var childNodes = node.childNodes;
                        return childNodes.length == 1 && childNodes[0].nodeType == 1 && childNodes[0].tagName == 'BR';
                    }
                },
                'svg': {
                    remove: true
                },
                'span': {
                    remove: function(node) {
                        if (node.innerHTML == '&nbsp;') {
                            $(node).after(' ');
                        }
                        var parent = node.parentNode;
                        while (node.firstChild) parent.insertBefore(node.firstChild, node);
                        return true;
                    }
                },
                '*': {
                    remove: function(node) {
                        if (!node.hasChildNodes()) {
                            if (node.blockDefault()) return node.tagName != 'TD' && node.tagName != 'TH';
                            var tagName = node.tagName;
                            return tagName == 'A'; //TODO need more
                        }

                        return false;
                    }
                }
            }

            var cleanAttribute = function(node) {
                removeAttributes(node, function(n, attr) {
                    var attributes = (attributeRule[n.tagName.toLowerCase()] || attributeRule['*']) || [];
                    for (const _attr of attributes) {
                        if (_attr === attr.name) {
                            return false;
                        }
                    }
                    return true;
                })
            }

            var cleanNode = function(root, node) {
                var remove = false;
                var nodeType = node.nodeType;
                if (nodeType != 1) {
                    if (nodeType != 3)
                        remove = true;
                } else {
                    var handler = nodeHandler[node.tagName.toLowerCase()] || nodeHandler['*'];

                    if (!isUndefined(handler)) {
                        if (handler.ignore === true) return;
                        if (typeof handler.remove === 'function') {
                            remove = handler.remove(node) === true;
                        } else {
                            remove = handler.remove === true;
                        }
                    }
                }

                if (remove) {
                    var parent = node.parentNode;
                    //need to check parent node again;
                    node.remove();
                    if (parent != null) {
                        cleanNode(root, parent);
                    }
                }

                if (!root.contains(node)) return;
                var childNodes = node.childNodes;
                for (const node of childNodes) {
                    cleanNode(root, node);
                }
            }

            var getNodesFromPasteHTML = function(html) {
                var root = parseHTML(html).body;
                unwrapNode(unwrapSet, root);
                var childNodes = root.childNodes;
                var nodes = [];
				var textWrap = false;
                for (const childNode of childNodes) {
                    var _nodes = [];
                    var node = childNode;
                    var nodeType = node.nodeType;
                    if (nodeType != 1 && nodeType != 3) continue;
                    _nodes.push(node);
                    for (const _node of _nodes) {
                        var n = _node;
						if(n.nodeType == 3){
							if(textWrap){
								var p = document.createElement('p');
								p.appendChild(n);
								nodes.push(p);
							} else {
								nodes.push(n);
							}
							continue;
						}
						textWrap = true;
                        var factory = getEditorFactoryByElement(n);
                        if (factory != null && hasMethod(factory, 'processPasteNode')) {
                            n = factory.processPasteNode(n);
                            cleanAttribute(n);
                        } else {
                            cleanNode(root, n);
                            if (!root.contains(n)) continue;
                            cleanAttribute(n);
                            if (factory == null) {
                                n.setAttribute('data-html', '')
                            }
                        }
                        nodes.push(n);
                    }
                }
                return nodes;
            }

            function unwrapNode(tagNames, node) {
                if (tagNames.has(node.tagName)) {
                    node.normalize();
                    var array = [];
                    var array2 = [];
                    var childNodes = node.childNodes;
                    if (childNodes.length > 0) {
                        for (var i = 0; i < childNodes.length; i++) {
                            var childNode = childNodes[i];
                            if (childNode.nodeType == 1) {
                                if (childNode.blockDefault()) {

                                    if (array.length > 0) {
                                        array2.push(array);
                                        array = [];
                                    }

                                } else {
                                    array.push(childNode);
                                }
                            } else {
                                array.push(childNode);
                            }
                        }
                        if (array.length > 0) {
                            array2.push(array);
                        }
                    }
                    for (const array of array2) {
                        var paragraph = document.createElement('p');
                        $(array[array.length - 1]).after(paragraph);
                        for (var i = 0; i < array.length; i++) {
                            paragraph.appendChild(array[i].cloneNode(true));
                            array[i].remove();
                        }
                    }

                    var childNodes = node.childNodes;
                    var nodes = [];
                    var parent = node.parentNode;
                    while (node.firstChild) {
                        var first = node.firstChild;
                        parent.insertBefore(first, node);
                        nodes.push(first);
                    };
                    parent.removeChild(node);
                    for (const _node of nodes) {
                        unwrapNode(tagNames, _node);
                    }
                } else {
                    var children = node.children;
                    for (const child of node.children) {
                        unwrapNode(tagNames, child);
                    }
                }
            }

            function removeAttributes(element, checker) {
                var attrs = element.attributes;
                for (var i = attrs.length - 1; i >= 0; i--) {
                    if (checker(element, attrs[i]) === true) {
                        element.removeAttribute(attrs[i].name);
                    }
                }
                for (const child of element.children) {
                    removeAttributes(child, checker);
                }
            }

            return {
                getNodesFromPasteHTML: getNodesFromPasteHTML,
                attributeRule: attributeRule,
                nodeHandler: nodeHandler
            }

        })();

        var htmlPasteEventListener = function(e) {
            var editor = this;
            var isRoot = isUndefined(editor.parent);
            if (!isRoot) {
                plainPasteHandler(e);
                return;
            }
            var html = (e.originalEvent || e).clipboardData.getData('text/html');
			if(html == ''){
				 plainPasteHandler(e);
                return;
			}
            e.preventDefault();
            e.stopPropagation();
			
			
			var nodes = HtmlPasteHelper.getNodesFromPasteHTML(html);
			
			
			if(nodes.length > 0){
				
				
				var rangeInfo = getRangeInfo(editor.getElement());
				for(const node of nodes){
					if(node.nodeType == 1)
						break;
					var range = rangeInfo.range;
					if(range != null){
						var text = document.createTextNode(node.wholeText);
						range.insertNode(text);
						range.setStartAfter(text);
					}
				}
				
				nodes = nodes.filter(function(el) {
					return el.nodeType == 1;
				});
				
				if(nodes.length > 0){
					var next = editor.getElement().nextElementSibling;
					editor.stop();
					if(next == null){
						editor.wysiwyg.rootElem.appendChild(nodes[0]);
						next = nodes[0];
						nodes.shift();
					}
					nodes.reverse();
					for(const node of nodes){
						$(next).before(node);
						update(node,this.wysiwyg);
						next = node;
					}
				}
	
			}
        }


        function Wysiwyg(rootElem,config) {
            this.inlineMath = new InlineMath(rootElem);
            this.keyMap = [];
			this.eventHandlers = [];
            initDefaultKey(this);
            var me = this;
            this.observer = new MutationObserver(function(records) {
                //detect need update 
                //TODO need more check at editor's level
                me.currentEditor.needUpdate = true;
            });

            this.on('editor.start', function(editor) {
                me.currentEditNextElement = getNextEditElement(editor.getElement(), me);
                me.currentEditPrevElement = getPrevEditElement(editor.getElement(), me);
                me.currentEditor = editor;
                me.observer.observe(editor.getElement(), {
                    childList: true,
                    subtree: true,
                    attribute: true,
                    characterData: true
                });
                markOnEdit(me, editor);
            });
            this.on('editor.embed.start', function(editor) {
                markOnEdit(me, editor);
            });

            this.on('editor.embed.stop', function(edt) {
                markOnEdit(me, edt.parent);
				var editor = me.currentEditor;
				//only update markdown source
				if(me.currentEditor.needUpdate === true){
					update(editor.getElement(),me,true);
					saveHistory(me);
					//TODO need to update element
				}
				this.rootElem.focus();
            });
			
            this.on('editor.stop', function(editor) {
                me.observer.disconnect();
                me.currentEditor = undefined;
                markOnEdit(me);
				if(editor.needUpdate === true){
					update(editor.getElement(),me);
					saveHistory(me);
				}
				this.rootElem.focus();
            });
			this.rootElem = rootElem;
			this.config = config;
			this.markdownCache = {};
			this.history = new History();
			saveHistory(this);
			this.enable();
        }

		Wysiwyg.prototype.getMarkdown = function() {
		   this.stopEdit();
           var markdown = [];
		   for(const child of this.rootElem.children){
			   if(child.hasAttribute('data-markdown-id') && !isUndefined(this.markdownCache[child.getAttribute('data-markdown-id')])){
				   markdown.push(this.markdownCache[child.getAttribute('data-markdown-id')])
			   } else {
					markdown.push(turndownService.turndown(child.outerHTML));
			   }
		   }
		   return markdown.join('\n\n');
        }
		
		Wysiwyg.prototype.loadMarkdown = function(markdown) {
            var html = markdownParser.render(markdown);
			this.rootElem.innerHTML = html;
			$(this.rootElem).find('img').one('error',function(){
				this.classList.add('heather_img_error');
			})
			this.markdownCache = {};
        }
		
        Wysiwyg.prototype.on = function(name, handler) {
            this.eventHandlers.push({
                name: name,
                handler: handler
            })
        }

        Wysiwyg.prototype.off = function(name, handler) {
            for (var i = 0; i < this.eventHandlers.length; i++) {
                var eventHandler = this.eventHandlers[i];
                if (eventHandler.name === name && eventHandler.handler === handler) {
                    this.eventHandlers.splice(i, 1);
                    break;
                }
            }
        }

        Wysiwyg.prototype.undo = function() {
            if (this.currentEditor) {
                if (hasMethod(this.currentEditor, 'undo')) {
                    this.currentEditor.undo();
                }
            } else {
				var html = this.history.undo();
				if(html != null){
					this.saveHistory = false;
					setHtml(this,html);
				}
			}
        }

        Wysiwyg.prototype.redo = function() {
            if (this.currentEditor) {
                if (hasMethod(this.currentEditor, 'redo')) {
                    this.currentEditor.redo();
                }
            } else {
				var html = this.history.redo();
				if(html != null){
					this.saveHistory = false;
					setHtml(this,html);
				}
			}
        }

        Wysiwyg.prototype.disable = function() {
            if (this.isEnable !== true) return;
            this.stopEdit();
			this.rootElem.removeAttribute('tabindex');
            this.rootElem.classList.remove('heather_wysiwyg');
            this.rootElem.removeEventListener('click', this.clickHandler);
            this.rootElem.removeEventListener('keydown', this.keydownHandler);
            this.rootElem.removeEventListener('keyup', this.keyupHandler);
            this.isEnable = false;
        }

        Wysiwyg.prototype.enable = function() {
            if (this.isEnable === true) return;
            this.rootElem.classList.add('heather_wysiwyg');
            var me = this;
            var clickHandler = function(e) {
                //check is range select
                var rangeInfo = getRangeInfo(me.rootElem);
                var range = rangeInfo.range;
                var sel = rangeInfo.sel;
                if (range != null && sel.type == 'Range') return;
                var elem = e.target;
                while (elem != null) {
                    if (elem.parentElement === me.rootElem) {
                        break;
                    }
                    elem = elem.parentElement;
                }
				if(elem == null) return ;
                if (me.currentEditor) {
                    if (me.currentEditor.getElement() != elem) {
                        me.stopEdit();
                    } else {
                        return;
                    }
                }
                var factory = getEditorFactoryByElement(elem);
                if (factory != null) {
                    startEdit(me, elem, e.target);
                } else {
                    toast('没有找到合适的编辑器', 'error')
                }
            }
            this.rootElem.addEventListener('click', clickHandler);

          
            var catchMap = {};
            var keyMap = this.keyMap;
            var keydownTimer;

            var keydownHandler = function(e) {
                var key = e.key.toLowerCase();
                catchMap[key] = true;
                var kms = [];
                out: for (const km of keyMap) {
                    var keys = km.keys;
                    for (const key of keys) {
                        if (catchMap[key] !== true) {
                            continue out;
                        }
                    }
                    kms.push(km);
                }
                if (kms.length > 0) {

                    kms.sort(function(a, b) {
                        var la = a.keys.length;
                        var lb = b.keys.length;
                        return la > lb ? -1 : la == lb ? 0 : 1;
                    });
                    try {
                        kms[0].handler.call(me, e);
                    } catch (e) {
                        console.log(e);
                    }
                    catchMap = {};
                }
            }

            var keyupHandler = function(e) {
                delete catchMap[e.key.toLowerCase()];
            }

            this.rootElem.addEventListener('keydown', keydownHandler);
            this.rootElem.addEventListener('keyup', keyupHandler);
			this.rootElem.setAttribute('tabindex','0');
			this.rootElem.focus();
			
            this.keydownHandler = keydownHandler;
            this.keyupHandler = keyupHandler;
            this.clickHandler = clickHandler;
            this.isEnable = true;
        }
		
		 Wysiwyg.prototype.delete = function() {
            if (this.isEnable !== true) return;
            if (this.currentEditor) return;
            var rangeInfo = getRangeInfo(this.rootElem);
            var range = rangeInfo.range;
            var sel = rangeInfo.sel;
            if (range != null) {
                if (sel.type != 'Range') return;
                range.deleteContents();
				var markdown = this.getMarkdown();
				this.rootElem.innerHTML = markdownParser.render(markdown);
				this.markdownCache = {};
            }
        }

        Wysiwyg.prototype.unbindKey = function(keys) {
            for (const key of keys) {
                var newKeys = renameKeys(key.split('-'));
                for (var i = 0; i < this.keyMap.length; i++) {
                    var _key = this.keyMap[i];
                    if (JSON.stringify(_key.keys) == JSON.stringify(newKeys)) {
                        this.keyMap.splice(i, 1);
                        break;
                    }
                }
            }
        }

        Wysiwyg.prototype.bindKey = function(keymap) {
            var me = this;
            Object.keys(keymap).forEach(function(key, index) {
                var keys = key.split('-');
                if (keys.length > 0) {
                    var newKeys = renameKeys(keys);
                    var o = keymap[key];
                    var handler;
                    if (typeof o === 'string') {
                        var newHandler = function(e) {
                            me.execCommand(o);
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        handler = newHandler;
                    } else {
                        handler = o;
                    }

                    for (var i = 0; i < me.keyMap.length; i++) {
                        var key = me.keyMap[i];
                        if (JSON.stringify(key.keys) == JSON.stringify(newKeys)) {
                            me.keyMap.splice(i, 1);
                            break;
                        }
                    }

                    me.keyMap.push({
                        keys: newKeys,
                        handler: handler
                    })

                }
            });
        }

        Wysiwyg.prototype.execCommand = function(name) {
            if (this.isEnable !== true) return;
            var command = commands[name];
            if (command) {
                command.call(this);
            }
        }

        Wysiwyg.prototype.stopEdit = function(embed) {
            if (this.currentEditor) {
                if (embed === true) {
                    var depthestChild = getDepthestChild(this);
                    if (depthestChild != null) {
                        depthestChild.stop();
                        return;
                    }
                }
                this.currentEditor.stop();
            }
        }

        Wysiwyg.prototype.insertFile = function(info) {
            var depthestChild = getDepthestChild(this);
            if (depthestChild != null) {
                if (hasMethod(depthestChild, 'insertFile')) {
                    depthestChild.insertFile(info);
                }
            } else {
                var editor = this.currentEditor;
                if (editor != null && hasMethod(editor, 'insertFile')) {
                    editor.insertFile(info);
                }
            }
        }

        //edit next element
        //if there's no current editor
        //editor first element
        //if there's no element
        //do nothing
        Wysiwyg.prototype.editNext = function(embed) {
            if (this.currentEditor) {
                if (embed === true &&
                    hasMethod(this.currentEditor, 'editNextEmbed') &&
                    this.currentEditor.editNextEmbed() === true) {
                    return
                }
                var editor = this.currentEditor;
                this.stopEdit();
            }
            if (this.currentEditNextElement != null) {
                startEdit(this, this.currentEditNextElement);
            } else {
                var elem = getNextEditElement(null, this);
                if (elem != null) {
                    startEdit(this, elem);
                }
            }
        }

        Wysiwyg.prototype.editPrev = function(embed) {
            if (this.currentEditor) {
                if (embed === true &&
                    hasMethod(this.currentEditor, 'editPrevEmbed') &&
                    this.currentEditor.editPrevEmbed() === true) {
                    return
                }
                var editor = this.currentEditor;
                this.stopEdit();
            }

            if (this.currentEditPrevElement != null) {
                startEdit(this, this.currentEditPrevElement);
            } else {
                var elem = getPrevEditElement(null, this);
                if (elem != null) {
                    startEdit(this, elem);
                }
            }
        }
		
		Wysiwyg.prototype.fileUploadEnable = function() {
            return !isUndefined(this.config.upload_url) && !isUndefined(this.config.upload_finish);
        }
		
		
		function setHtml(wysiwyg,html){
			var ele = document.createElement('div');
			cloneAttributes(ele,wysiwyg.rootElem);
			ele.innerHTML = html;
			morphdomUpdate(wysiwyg.rootElem,ele);
			wysiwyg.markdownCache = {};
		}
		
		function saveHistory(wysiwyg){
			if (wysiwyg.saveHistory === false) {
				wysiwyg.saveHistory = true;
			} else {
				wysiwyg.history.save(wysiwyg.rootElem.innerHTML);
			}
		}
		
		function update(elem,wysiwyg,markdownOnly){
			if(!wysiwyg.rootElem.contains(elem)){
				delete wysiwyg.markdownCache[elem.getAttribute('data-markdown-id')];
				return ;
			}
			var markdown = turndownService.turndown(cleanHtml(elem.outerHTML));
			
			var id;
			if(!elem.hasAttribute('data-markdown-id')){
				id = createUniqueId();
				elem.setAttribute('data-markdown-id',id);
			} else {
				id = elem.getAttribute('data-markdown-id');
			}
			wysiwyg.markdownCache[id] = markdown;
			if(markdownOnly === true) return ;
			var html = markdownParser.render(markdown);
			var dom = parseHTML(html).body;
			var child = dom.firstChild;
			if(child == null){
				//invalid maybe
				return ;
			}
			if(child.tagName === elem.tagName){
				cloneAttributes(child,elem);
				morphdomUpdate(elem, dom.firstChild);
			} else {
				var element = document.createElement(elem.tagName);
				cloneAttributes(element,elem);
				element.innerHTML = child.outerHTML;
				morphdomUpdate(elem, element);
			}
		}

        function getNextEditElement(element, wysiwyg) {
            var next = element == null ? null : element.nextElementSibling;
            while (next != null) {
                if (getEditorFactoryByElement(next) != null) {
                    return next;
                }
                next = next.nextElementSibling;
            }
            if (next == null) {
                for (const child of wysiwyg.rootElem.children) {
                    if (getEditorFactoryByElement(child) != null) {
                        return child;
                    }
                }
            }
            return null;
        }

        function getPrevEditElement(element, wysiwyg) {
            var prev = element == null ? null : element.previousElementSibling;
            while (prev != null) {
                if (getEditorFactoryByElement(prev) != null) {
                    return prev;
                }
                prev = prev.previousElementSibling;
            }
            if (prev == null) {
                var children = wysiwyg.rootElem.children;
                for (var i = children.length - 1; i >= 0; i--) {
                    if (getEditorFactoryByElement(children[i]) != null) {
                        return children[i];
                    }
                }
            }
            return null;
        }

        function markOnEdit(wysiwyg, editor) {
            var old = wysiwyg.rootElem.querySelector('[data-edit]');
            if (old != null)
                old.removeAttribute('data-edit');
            if (editor)
                editor.getElement().setAttribute('data-edit', '');
        }

        function getDepthestChild(wysiwyg) {
            if (!wysiwyg.currentEditor) return null;
            var child = wysiwyg.currentEditor.child;
            if (!isUndefined(child)) {
                //find nested child
                var depthestChild = child;
                while (true) {
                    var chd = depthestChild.child;
                    if (isUndefined(chd)) {
                        break;
                    }
                    depthestChild = chd;
                }
                return depthestChild;
            }
            return null;
        }

        //TODO need more test
        function initDefaultKey(wysiwyg) {
            //I do not have a mac ...
            var keyMap = mac ? {

            } : {
                'Alt-/': 'factories',
                'Alt-O': 'contextmenu',
                "Ctrl-B": 'bold',
                "Ctrl-I": 'italic',
                "Ctrl-L": 'link',
                "Ctrl-R": 'removeFormat',
                "Ctrl-D": 'code',
                'Tab': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.editNext(true);
                },
                'Shift-Tab': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.editNext();
                },
                'Ctrl-ArrowUp': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.editPrev(true);
                },
                'Ctrl-S': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.stopEdit();
                },
                'Ctrl-Z': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.undo();
                },
                'Ctrl-Y': function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    wysiwyg.redo();
                },
                'Backspace': function(e) {
                    if (!wysiwyg.currentEditor) {
                        e.preventDefault();
                        e.stopPropagation();
                        wysiwyg.delete();
                    }
                }
            }
            wysiwyg.bindKey(keyMap);
        }

        function renameKeys(keys) {
            var newKeys = [];
            for (const key of keys) {
                var alias = keyAlias[key];
                var newKey = (alias ? alias : key).toLowerCase();
                newKeys.push(newKey);
            }
            return newKeys;
        }

        function startEdit(wysiwyg, elem, target) {
            var editorFactory = getEditorFactoryByElement(elem);
            if (editorFactory == null) {
                toast('没有找到合适的编辑器', 'error');
                return;
            }
            var editor = editorFactory.create(elem, wysiwyg);
            editor.start(target);
        }

        var DocumentCommandHelper = (function() {

            var set = new Set(['code', 'kbd']); //need more 


            var inlineBackspaceListener = function(e) {
                if (e.key == 'Backspace') {
                    var rangeInfo = getRangeInfo(this);
                    var range = rangeInfo.range;
                    if (range == null) {
                        return;
                    }
                    var ancestor = range.commonAncestorContainer;
                    var parent = ancestor;
                    var deleteable = false;
                    var sel = rangeInfo.sel;
                    while (parent != null) {
                        if (parent === this) {
                            return;
                        }
                        if (parent.nodeType == 1 && set.has(parent.tagName.toLowerCase())) {
                            var textContent = parent.textContent;
                            if (textContent.length == 1) {
                                e.preventDefault();
                                e.stopPropagation();
                                sel.removeAllRanges();
                                range.setStartBefore(parent);
                                range.setEndAfter(parent);
                                sel.addRange(range);
                                document.execCommand('removeFormat');
                                range.deleteContents();
                            }
                            return;
                        }
                        parent = parent.parentElement;
                    }

                }
            }

            function inlineTagHandler(tagName, range, sel) {
                tagName = tagName.toUpperCase();
                var ancestor = range.commonAncestorContainer;
                var parent = ancestor.parentElement;
                if (parent != null && parent.tagName == tagName) {
                    var next = parent.nextSibling;
                    if (next == null || next.nodeType != 3 || !next.nodeValue.startsWith(veryThinChar)) {
                        var veryThinNode = document.createTextNode(veryThinChar);
                        if (next == null) {
                            $(parent).after(veryThinNode);
                        } else {
                            $(next).before(veryThinNode);
                        }
                        next = veryThinNode;
                    }
                    range.setStart(next, 1);
                    range.setEnd(next, 1);
                    return;
                }
                var node = document.createElement(tagName);
                var content = veryThinChar + sel.toString();
                node.innerHTML = content;
                range.deleteContents();
                range.insertNode(node);
                range.setStart(node, 1);
                range.setEnd(node, 1);
            }

            return {
                'bold': function() {
                    document.execCommand('bold');
                },
                'italic': function() {
                    document.execCommand('italic');
                },
                'strikethrough': function() {
                    document.execCommand('strikethrough');
                },
                'link': function(range, sel) {
                    if (sel.type != 'Range') return;
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
                },
                'removeFormat': function() {
                    document.execCommand('removeFormat');
                },
                'inlineTagHandler': inlineTagHandler,
                'bindInlineBackspaceListener': function(element) {
                    set.forEach(function(v) {
                        for (const node of element.querySelectorAll(v)) {
                            $(node).prepend(document.createTextNode(veryThinChar));
                        }
                    })
                    element.addEventListener('keydown', inlineBackspaceListener)
                },
                'unbindInlineBackspaceListener': function(element) {
                    element.removeEventListener('keydown', inlineBackspaceListener)
                },
                inlineTagSet: set
            }
        })();

        var ContenteditableBar = (function() {

            var clazz = "heather_status_on";

            var defaultBarElements = [];

            var bold = {
                createElement: function() {
                    var bold = document.createElement('i');
                    bold.setAttribute('class', 'fas fa-bold heather_middle_icon');
                    return bold;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.bold();
                    document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                onSelectionChange: function(ele, range, sel) {
                    document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                type: 'range'
            }

            var italic = {
                createElement: function() {
                    var italic = document.createElement('i');
                    italic.setAttribute('class', 'fas fa-italic heather_middle_icon');
                    return italic;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.italic();
                    document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                onSelectionChange: function(ele, range, sel) {
                    document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                type: 'range'
            }

            var strikethrough = {
                createElement: function() {
                    var strikeThrough = document.createElement('i');
                    strikeThrough.setAttribute('class', 'fas fa-strikethrough heather_middle_icon');
                    return strikeThrough;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.strikethrough();
                    document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                onSelectionChange: function(ele, range, sel) {
                    document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
                },
                type: 'range'
            }


            var link = {
                createElement: function() {
                    var link = document.createElement('i');
                    link.setAttribute('class', 'fas fa-link heather_middle_icon');
                    return link;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.link(range, sel);
                },
                type: 'range'
            }

            var code = {
                createElement: function() {
                    var bold = document.createElement('i');
                    bold.setAttribute('class', 'fas fa-code heather_middle_icon');
                    return bold;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.inlineTagHandler('CODE', range, sel);
                }
            }

            var eraser = {
                createElement: function() {
                    var eraser = document.createElement('i');
                    eraser.setAttribute('class', 'fas fa-eraser heather_middle_icon');
                    return eraser;
                },
                handler: function(ele, range, sel) {
                    DocumentCommandHelper.removeFormat();
                },
                type: 'range'
            }

            defaultBarElements.push(bold);
            defaultBarElements.push(italic);
            defaultBarElements.push(link);
            defaultBarElements.push(strikethrough);
            defaultBarElements.push(code);
            defaultBarElements.push(eraser);

            function ContenteditableBar(element) {
                var me = this;
                this.composing = false;
                var bar = document.createElement('div');
                bar.setAttribute('class', 'heather_contenteditable_bar');
                document.body.appendChild(bar);
                bar = new Bar(bar);

                var eventType = mobile ? 'touchstart' : 'mousedown';
                for (const ele of defaultBarElements) {
                    const barElement = ele.createElement();
                    barElement.setAttribute('data-type', ele.type);
                    barElement.setAttribute('style', 'cursor: pointer;margin-right:20px');
                    barElement.addEventListener(eventType, function(e) {
                        e.preventDefault();
                        var rangeInfo = getRangeInfo(element);
                        var range = rangeInfo.range;
                        var sel = rangeInfo.sel;
                        if (range != null) {
                            ele.handler.call(me, barElement, range, sel);
                        }
                    })
                    bar.addElement(barElement);
                    ele.element = barElement;
                }
                var startHandler = function(e) {
                    me.composing = true;
                };
                var endHandler = function(e) {
                    me.composing = false;
                };
                //chrome 通过退格键删除选中内容时不触发 selectionChange 事件??
                var inputHandler = function(e) {
                    if (window.getSelection().type != 'Range') {
                        bar.hide();
                    }
                };

                var selectionChangeListener = function() {
                    var rangeInfo = getRangeInfo(element);
                    var range = rangeInfo.range;
                    var sel = rangeInfo.sel;
                    if (range == null) {
                        bar.hide();
                        return;
                    }
                    if (me.composing == false && sel.type == 'Range') {
                        posContenteditableBar(bar, range);
                    } else {
                        bar.hide();
                    }
                    for (const ele of defaultBarElements) {
                        if (hasMethod(ele, 'onSelectionChange')) {
                            try {
                                ele['onSelectionChange'].call(this, ele.element, range, sel)
                            } catch (e) {
                                console.log(e)
                            };
                        }
                    }
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
                //if (!mobile) {
					var left = coords.left - bar.width() / 2 + coords.width / 2;
                    if (bar.width() + left > $(window).width()) {
                        bar.element.css({
                            'right': 30 + "px",
							left : ''
                        })
                    } else {
                        bar.element.css({
                            'left': Math.max(10,left) + "px",
							
                            'right': '',
                        })
                    }
               // }
                bar.show();
            }

            return {
                create: function(element) {
                    return new ContenteditableBar(element);
                },
                defaultBarElements: defaultBarElements
            };
        })();
		


        var InlineMath = (function() {

            function InlineMath(rootElem) {
				this.rootElem = rootElem;
                var katexPreview = document.createElement('div');
                katexPreview.classList.add('katex-inline-preview');
				document.body.appendChild(katexPreview);
                this.katexPreview = katexPreview;
            }

            InlineMath.prototype.createSession = function(element) {
                return new InlineMathSession(element, this);
            }

            var InlineMathSession = (function() {

                function InlineMathSession(element, inlineMath) {
                    this.element = element;
                    this.rootElem = inlineMath.rootElem;
                    this.katexPreview = inlineMath.katexPreview;
                }

                InlineMathSession.prototype.start = function() {
                    var me = this;
                    var ignore = false;
                    var katexPreview = this.katexPreview;
                    var keyDownHandler = function(e) {
                        if (e.key == 'Backspace') {
                            ignore = true;
                            selectionChangeListener(true);
                        }
                    }
                    var blurHandler = function() {
                        $(katexPreview).css({
                            'visibility': 'hidden'
                        });
                    }
                    var selectionChangeListener = function(backspace) {
                        if (ignore && backspace !== true) {
                            ignore = false;
                            return;
                        }
                        var sel = window.getSelection();
                        if (sel.type != 'Caret') return;
                        me.element.normalize();
                        var rangeInfo = getRangeInfo(me.element);
                        var range = rangeInfo.range;
                        if (range == null) return;
                        var ancestor = range.commonAncestorContainer;
                        var container = ancestor;
                        var inKatex = false;
                        var katexElem = ancestor;
                        while (container != null) {
                            if (container == me.element) {
                                break;
                            }
                            if (!inKatex && katexElem.nodeType == 1 && katexElem.hasAttribute('data-inline-katex')) {
                                inKatex = true;
                            }
                            if (!inKatex) {
                                katexElem = katexElem.parentElement;
                            }
                            container = container.parentElement;
                        }
                        if (container == null) {
                            return;
                        }
                        if (inKatex) {
                            var expression = getKatexExpression(katexElem);
                            var nodeValue = backspace === true ? '$' + expression : '$' + expression + '$';
                            var textNode = document.createTextNode(nodeValue);
                            katexElem.remove();
                            range.insertNode(textNode);
                            // if ancestor.parentElement is encoding="application/x-tex"
                            // the set cursor first 
                            if (ancestor.parentElement.getAttribute('encoding') == 'application/x-tex') {
                                range.setStart(textNode, 1);
                                range.setEnd(textNode, 1);
                            } else {
                                //set last 
                                range.setStart(textNode, textNode.length - 1);
                                range.setEnd(textNode, textNode.length - 1);
                            }
                            return;
                        }
                        if (ancestor.nodeType == 3) {
                            var text = ancestor.nodeValue;
                            var mathInlineBlocks = getMathInlineBlocks(text);
                            if (mathInlineBlocks.length < 1) {
                                $(katexPreview).css({
                                    'visibility': 'hidden'
                                });
                                return
                            };
                            var offset = range.startOffset;
                            for (var i = 0; i < mathInlineBlocks.length; i++) {
                                var block = mathInlineBlocks[i];
                                if (offset > block.start && offset <= block.end) {
                                    //get math text;
                                    var math = text.substring(block.start + 1, block.end);
                                    //parse with katex
                                    loadKatex(function() {
                                        var rst;
                                        try {
                                            rst = katex.renderToString(math, {
                                                throwOnError: true,
                                                displayMode: false
                                            });
                                        } catch (e) {
                                            if (e instanceof katex.ParseError) {
                                                rst = '<pre>' + e.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</pre>';
                                            } else {
                                                throw e; // other error
                                            }
                                        }
                                        if (rst) {
                                            var coords = getCoords(range);
                                            katexPreview.innerHTML = rst;
                                            var height = katexPreview.clientHeight;
                                            var width = katexPreview.clientWidth;
                                            var top = coords.top - 32 - height - $(window).scrollTop();
                                            $(katexPreview).css({
                                                'top': (top > 0 ? top : coords.top + 32) + 'px'
                                            });
                                            var left = coords.left - width / 2 +
                                                parseFloat(window.getComputedStyle(katexPreview, null).getPropertyValue('padding-left'));
                                            if (left + width > $(window).width() - 20) {
                                                $(katexPreview).css({
                                                    'right': '0px',
                                                    'left': '',
                                                    'visibility': 'visible'
                                                })
                                            } else {
                                                $(katexPreview).css({
                                                    'right': '',
                                                    'left': left + 'px',
                                                    'visibility': 'visible'
                                                })
                                            }
                                        }
                                    })
                                    return;
                                }
                            }
                            $(katexPreview).css({
                                'visibility': 'hidden'
                            });
                            me.renderInlineKatex(function(nodes) {
                                for (var i = 0; i < nodes.length; i++) {
                                    var node = nodes[i];
                                    if (offset == node.end + 1) {
                                        var katexNode = node.node;
                                        var next = katexNode.nextSibling;
                                        if (next != null && next.nodeType == 3) {
                                            if (next.nodeValue == veryThinChar) {
                                                range.setStartAfter(next);
                                            } else {
                                                range.setStart(next, 1);
                                                range.setEnd(next, 1);
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
                    this.element.addEventListener('keydown', keyDownHandler);
                    this.element.addEventListener('blur', blurHandler);
                    this.selectionChangeListener = selectionChangeListener;
                    this.keyDownHandler = keyDownHandler;
                    this.blurHandler = blurHandler;
                }

                InlineMathSession.prototype.stop = function() {
                    this.renderInlineKatex();
                    $(this.katexPreview).css({
                        'visibility': 'hidden'
                    });
                    unregisterSelectionChangeListener(this.selectionChangeListener);
                    this.element.removeEventListener('keydown', this.keyDownHandler);
                    this.element.removeEventListener('blur', this.blurHandler);
                }

                InlineMathSession.prototype.renderInlineKatex = function(callback) {
                    var me = this;
                    //replace all rendered katex element with expression
                    var katexElems = this.element.querySelectorAll('[data-inline-katex]');
                    for (var i = 0; i < katexElems.length; i++) {
                        var katexElem = katexElems[i];
                        var expression = getKatexExpression(katexElem);
                        var textNode = document.createTextNode('$' + expression + '$');
                        var prev = katexElem.previousSibling;
                        while (prev != null && prev.nodeType == 3) {
                            if (prev.nodeValue == veryThinChar) {
                                prev.remove();
                                prev = prev.previousSibling;
                            } else {
                                break;
                            }
                        }

                        var next = katexElem.nextSibling;
                        while (next != null && next.nodeType == 3) {
                            if (next.nodeValue == veryThinChar) {
                                next.remove();
                                next = next.nextSibling;
                            } else {
                                break;
                            }
                        }

                        $(katexElem).after(textNode).remove();
                    }

                    loadKatex(function() {
                        me.element.normalize();
                        var nodes = textNodesUnder(me.element);
                        var katexNodes = [];
                        for (var i = 0; i < nodes.length; i++) {
                            var node = nodes[i];
                            var text = node.nodeValue;
                            var mathInlineBlocks = getMathInlineBlocks(text);
                            var previousEnd;
                            for (var j = 0; j < mathInlineBlocks.length; j++) {
                                var mathInlineBlock = mathInlineBlocks[j];
                                var start = mathInlineBlock.start;
                                var end = mathInlineBlock.end;
                                if (previousEnd) {
                                    end = end - previousEnd;
                                    start = start - previousEnd;
                                }
                                node = node.splitText(start).splitText(end - start + 1);
                                var mathNode = node.previousSibling;
                                previousEnd = text.length - node.nodeValue.length;
                                var expression = mathNode.nodeValue;
                                expression = expression.substring(1, expression.length - 1).replaceAll(veryThinChar, '');
                                if (expression.trim() == '') {
                                    continue;
                                }
                                var div = document.createElement('div');
                                var result = parseKatex(expression, false);
                                div.innerHTML = result;
                                var newNode = div.firstChild;
                                newNode.setAttribute('data-inline-katex', '');
                                $(mathNode).after(newNode).remove();
                                var next = newNode.nextSibling;
                                if (next == null || next.nodeType != 3 || !next.nodeValue.startsWith(veryThinChar)) {
                                    $(newNode).after(veryThinHtml);
                                }
                                var prev = newNode.previousSibling;
                                if (prev == null || prev.nodeType != 3 || !prev.nodeValue.startsWith(veryThinChar)) {
                                    $(newNode).before(veryThinHtml);
                                }
                                katexNodes.push({
                                    start: start,
                                    end: end,
                                    node: newNode
                                });
                            }
                            previousEnd = undefined;
                        }
                        if (callback) callback(katexNodes);
                    })
                }

                return InlineMathSession;
            })();

            function textNodesUnder(node) {
                var all = [];
                for (node = node.firstChild; node; node = node.nextSibling) {
                    if (node.nodeType == 3) all.push(node);
                    else all = all.concat(textNodesUnder(node));
                }
                return all;
            }


            function getMathInlineBlocks(text) {
                var indices = [];
                for (var i = 0; i < text.length; i++) {
                    if (text[i] === "$") indices.push(i);
                }
                if (indices.length < 2) return [];
                var mathInlineBlocks = [];
                //1,3,5,7 => 1,3 3,5 5,7
                var ignoreIndex;
                for (var i = 1; i < indices.length; i++) {
                    //first will be 0 1
                    var start = indices[i - 1];
                    if (start === ignoreIndex) continue;
                    var end = indices[i];
                    var startNext = text.charAt(start + 1);
                    var endPrev = text.charAt(end - 1);
                    if (startNext.trim() == '' || endPrev.trim() == '') continue;
                    var endNext = end < text.length - 1 ? text.charAt(end + 1) : '';
                    if (endNext == veryThinChar) {
                        if (end + 1 < text.length - 1) {
                            endNext = text.charAt(end + 2);
                        } else {
                            endNext = '';
                        }
                    }
                    if (endNext >= '0' && endNext <= '9') continue;

                    mathInlineBlocks.push({
                        start: start,
                        end: end
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
                                    info.name = info.name || me.file.name;
                                    var nextSibling = progressRoot[0].nextSibling;
                                    if (nextSibling != null && nextSibling.nodeType == 3) {
                                        if (nextSibling.nodeValue == veryThinChar) {
                                            nextSibling.remove();
                                        }
                                    }
                                    var element = fileToElement(info);
                                    if (element == null) {
                                        toast('无效的文件信息', 'error');
                                    } else {
                                        progressRoot[0].replaceWith(element);
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
                                nextSibling.remove();
                            }
                        }
                        root.remove();
                    }
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

                return FileUpload;
            })();

            function FileUploadMgr(element, config) {
                var me = this;
                this.selectionChangeListener = function() {
                    var rangeInfo = getRangeInfo(element);
                    var range = rangeInfo.range;
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
                    this.element.focus();
                    var range = document.createRange();
                    range.selectNodeContents(this.element);
                    range.collapse(false);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);

                    range = getRangeInfo(this.element).range;
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


        var History = (function() {
            function History() {
                this.records = [];
                this.index = 0;
            }

            History.prototype.save = function(record) {
                if (isUndefined(record)) return false;
				if(this.records[this.index] === record) return false;
                if (this.index < this.records.length - 1) {
                    this.records = this.records.slice(0, this.index + 1);
                    this.index++;
                }
                this.records.push(record);
                this.index = this.records.length - 1;
            }

            History.prototype.undo = function() {
                if (this.index > 0) {
                    var record = this.records[this.index - 1];
                    this.index--;
                    return record;
                }
                return null;
            }

            History.prototype.redo = function() {
                if (this.records[this.index + 1]) {
                    var record = this.records[this.index + 1];
                    this.index++;
                    return record;
                }
                return null;
            }
			
            History.prototype.clear = function() {
               this.index = 0;
			   this.records = [];
            }
            return History;
        })();


        var TableEditorFactory = (function() {

            var TdEditor = (function() {

                function TdEditor(table, td, wysiwyg, embed) {
                    this.table = table;
                    this.td = td;
                    this.wysiwyg = wysiwyg;
                    this.embed = true;
					this.history = new History();
					var timer;
					var me = this;
					this.observer = new MutationObserver(function(records) {
						if(timer){
							clearTimeout(timer);
						}
						timer = setTimeout(function(){
							saveHistory(me);
						},300)
					});
                    triggerEditorEvent('create', this);
                }

                TdEditor.prototype.start = function() {
                    this.mediaHelper = new MediaHelper(this.td);
                    DocumentCommandHelper.bindInlineBackspaceListener(this.td);
                    this.td.addEventListener('paste', plainPasteHandler);
                    this.td.setAttribute('contenteditable', true);
                    this.contenteditableBar = ContenteditableBar.create(this.td);
                    this.fileUploadMgr = new FileUploadMgr(this.td, this.wysiwyg.config);
                    var inlineMath = createInlineMathSession(this.wysiwyg, this.td);
                    inlineMath.start();
                    this.inlineMath = inlineMath;
					saveHistory(this);
					this.observer.observe(this.td, {
						childList: true,
						subtree: true,
						attribute:true,
						characterData:true
					});
                    triggerEditorEvent('start', this);
                }

                TdEditor.prototype.stop = function() {
                    DocumentCommandHelper.unbindInlineBackspaceListener(this.td);
                    this.td.removeEventListener('paste', plainPasteHandler);
                    this.td.removeAttribute('contenteditable');
                    this.contenteditableBar.remove();
                    this.fileUploadMgr.remove();
                    this.mediaHelper.remove();
                    this.inlineMath.stop();
					this.observer.disconnect();
					this.history.clear();
                    triggerEditorEvent('stop', this);
                }
				
				TdEditor.prototype.undo = function() {
					var record = this.history.undo();
					if(record != null){
					   this.td.innerHTML = record;
					   this.saveHistory = false;
					}
				}
				
				TdEditor.prototype.redo = function() {
					var record = this.history.redo();
					if(record != null){
					   this.td.innerHTML = record;
					   this.saveHistory = false;
					}               
				}

                TdEditor.prototype.getContextMenus = function() {
					var select = '<select id="heather_table_expand_num" style="border: none;outline: none;background:none;text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none;">';
					for(var i=1;i<=10;i++){
						select +='<option value="'+i+'">'+i+'</option>';
					}
					select += '</select>';
					
					var keydownHandler = function(e){
						var key = parseInt(e.key);
						if(+key == +key){
							if(1<=key && key <= 9){
								e.preventDefault();
								e.stopPropagation();
								this.querySelector('select').value = key;
							}
						}
					}
					
					var getSelectValue = function(nodes){
						var value = 1;
						for(const node of nodes){
							if(node.nodeType == 1 && node.tagName == 'SELECT'){
								value = node.value;
								break;
							}
						}
						return value;
					}
                    var me = this;
                    var menus = [{
                        html: '<i class="fas fa-check"></i>完成',
                        handler: function() {
                            me.stop();
                        }
                    }, {
                        html: '<i class="fas fa-file"></i>插入文件',
                        handler: function(rangeInfo) {
                            createInsertFileDialog(rangeInfo);
                        }
                    }, {
                        html: '<i class="fas fa-upload"></i>上传文件',
                        handler: function() {
                            me.fileUploadMgr.upload();
                        },
                        condition: function() {
                            return me.wysiwyg.fileUploadEnable();
                        }
                    }, {
                        html: '<i class="fas fa-arrow-right"></i>向右添加'+select+'列',
                        handler: function() {
                            addCol($(me.table), $(me.td),getSelectValue(this), true);
                        },
						onActive:function(li){
							li.addEventListener('keydown',keydownHandler);
						},
						onInActive:function(li){
							li.removeEventListener('keydown',keydownHandler);
						}
                    }, {
                        html: '<i class="fas fa-arrow-left"></i>向左添加'+select+'列',
                        handler: function() {
                            addCol($(me.table), $(me.td),getSelectValue(this), false);
                        },
						onActive:function(li){
							li.addEventListener('keydown',keydownHandler);
						},
						onInActive:function(li){
							li.removeEventListener('keydown',keydownHandler);
						}
                    }, {
                        html: '<i class="fas fa-arrow-up"></i>向上添加'+select+'行',
                        handler: function() {
                            addRow($(me.table), $(me.td),getSelectValue(this), false);
                        },
						onActive:function(li){
							li.addEventListener('keydown',keydownHandler);
						},
						onInActive:function(li){
							li.removeEventListener('keydown',keydownHandler);
						}
                    }, {
                        html: '<i class="fas fa-arrow-down"></i>向下添加'+select+'行',
                        handler: function() {
                            addRow($(me.table), $(me.td),getSelectValue(this), true);
                        },
						onActive:function(li){
							li.addEventListener('keydown',keydownHandler);
						},
						onInActive:function(li){
							li.removeEventListener('keydown',keydownHandler);
						}
                    }, {
                        html: '<i class="fas fa-minus"></i>删除列',
                        handler: function() {
                            deleteCol($(me.table), $(me.td));
                        }
                    }, {
                        html: '<i class="fas fa-minus"></i>删除行',
                        handler: function() {
                            deleteRow($(me.table), $(me.td));
                        }
                    }, {
                        html: '<i class="fas fa-align-left"></i>左对齐',
                        handler: function() {
                            doAlign($(me.table), $(me.td), 'left');
                        }
                    }, {
                        html: '<i class="fas fa-align-center"></i>居中对齐',
                        handler: function() {
                            doAlign($(me.table), $(me.td), 'center');
                        }
                    }, {
                        html: '<i class="fas fa-align-right"></i>右对齐',
                        handler: function() {
                            doAlign($(me.table), $(me.td), 'right');
                        }
                    }];
                    return menus;
                }

                TdEditor.prototype.getElement = function() {
                    return this.td;
                }

                TdEditor.prototype.insertFile = function(info) {
                    insertFileAtElement(info, this.td);
                }
				
				function saveHistory(editor) {
					if (editor.saveHistory === false) {
						editor.saveHistory = true;
					} else {
						editor.history.save(editor.td.innerHTML);
					}
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

                function addCol(table, td, num,after) {
                    var index = td.index();
                    table.find('tr').each(function() {
                        var tr = $(this);
                        var td = tr.find('td').eq(index);
                        var th = tr.find('th').eq(index);
                        if (after) {
							for(var i=1;i<=num;i++){
								th.after('<th></th>');
								td.after('<td></td>');
							}
                        } else {
							for(var i=1;i<=num;i++){
								th.before('<th></th>');
								td.before('<td></td>');
							}
                        }
                    });
                }

                function addRow(table, td,num, after) {
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
						for(var i=1;i<=num;i++){
							tr.after(html);
						}
                    } else {
                       for(var i=1;i<=num;i++){
							tr.before(html);
						}
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

                return TdEditor;
            })();

            function TableEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            TableEditor.prototype.insertFile = function(info) {
                if (this.child) {
                    this.child.insertFile(info);
                }
            }
            TableEditor.prototype.notifyEmbedStopped = function() {
                this.child = undefined;
            }
            TableEditor.prototype.start = function(_target) {
                var me = this;
                this.element.classList.add("heather_edit_table");
                var editTd = function(td) {
                    if (td != null) {
                        if (!td.isContentEditable) {
                            if (me.child) {
                                me.child.stop();
                            }
                            var tdEditor = new TdEditor(me.element, td, me.wysiwyg);
                            tdEditor.parent = me;
                            tdEditor.start();
                            td.focus();
                            me.child = tdEditor;
                        }
                    }
                }
                var tdHandler = function(e) {
                    var td = getTd(e.target, me.element);
                    editTd(td);
                }
                var table = $(this.element);
                table.on('click', 'th,td', tdHandler);

                var keyDownHandler = function(e) {
                    if (e.key == 'Tab') {
                        if (me.child) {
                            //find next td|th
                            var $td = $(me.child.td);
                            var next = $td.next();
                            if (next.length == 0) {
                                //find next tr
                                var nextTr = $td.parent().next();
                                if (nextTr.length == 0) {
                                    //go to first tr
                                    //check is th
                                    if ($td[0].tagName == 'TH') {
                                        nextTr = $(me.element).find('tr').eq(1);
                                    } else {
                                        //let other tab key do it's work
                                        return;
                                    }
                                }
                                //go to first cell
                                next = nextTr.find('td,th').eq(0);
                            }
                            me.child.stop();
                            var tdEditor = new TdEditor(me.element, next[0], me.wysiwyg);
                            tdEditor.start();
                            next.focus();
                            me.child = tdEditor;
                        }
                        e.preventDefault();
                        return false;
                    }
                }

                table.on('keydown', keyDownHandler);

                this.tdHandler = tdHandler;
                this.keyDownHandler = keyDownHandler;
                triggerEditorEvent('start', this);

                if (_target) {
                    editTd(getTd(_target, this.element));
                } else {
                    editTd(this.element.querySelector('th,td'));
                }
            }

            TableEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            TableEditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }

            TableEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                var ele = $(this.element);
                ele.off('click', 'th,td', this.tdHandler);
                ele.off('keydown', this.keyDownHandler);
                if (this.child) {
                    this.child.stop();
                }
                triggerEditorEvent('stop', this);
            }

            TableEditor.prototype.getElement = function() {
                return this.element;
            }
			
			TableEditor.prototype.undo = function() {
				if (this.child) {
                    this.child.undo();
                }
			}
			
			TableEditor.prototype.redo = function() {
				if (this.child) {
                    this.child.redo();
                }      
			}
            function getTd(_target, root) {
                var target = _target;
                while (target != null) {
                    if (target.tagName == 'TD' || target.tagName == 'TH') {
                        return target;
                    }
                    target = target.parentElement;
                    if (!root.contains(target)) {
                        return null;
                    }
                }
                return null;
            }

            return {
                processPasteNode: function(node) {
                    return node;
                },
                create: function(element, wysiwyg, embed) {
                    return new TableEditor(element, wysiwyg, embed);
                },
                name: 'TableEditorFactory',
                match: function(element) {
                    return element.tagName == 'TABLE';
                },
                order: 0
            }
        })();

        var HeadingEditorFactory = (function() {

            var tagNameArray = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

            function HeadingEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
				this.history = new History();
				var timer;
				var me = this;
				this.observer = new MutationObserver(function(records) {
					if(timer){
						clearTimeout(timer);
					}
					timer = setTimeout(function(){
						saveHistory(me);
					},300)
				});
                triggerEditorEvent('create', this);
            }

            HeadingEditor.prototype.start = function() {
                var me = this;
                var heading = this.element;
                heading.setAttribute('contenteditable', 'true');
                var keyDownHandler = function(e) {
                    if (e.key == 'Enter') {
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

                var inlineMath = createInlineMathSession(this.wysiwyg, this.element);
                inlineMath.start();
                this.inlineMath = inlineMath;
                this.contenteditableBar = ContenteditableBar.create(this.element);
                me.element.focus();
				saveHistory(this);
				this.observer.observe(this.element, {
                    childList: true,
                    subtree: true,
					attribute:true,
					characterData:true
                });
                triggerEditorEvent('start', this);
            }

            HeadingEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.inlineMath.stop();
				this.history.clear();
                this.contenteditableBar.remove();
                this.element.removeAttribute('contenteditable');
				
				if(isEmptyText(this.element.innerHTML)){
					this.element.remove();
				}
				
                triggerEditorEvent('stop', this);
            }

            HeadingEditor.prototype.getElement = function() {
                return this.element;
            }

            HeadingEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }
            HeadingEditor.prototype.undo = function() {
                var record = this.history.undo();
			    if(record != null){
				   this.element.innerHTML = record;
				   this.saveHistory = false;
			    }
            }
			
            HeadingEditor.prototype.redo = function() {
                var record = this.history.redo();
			    if(record != null){
				   this.element.innerHTML = record;
				   this.saveHistory = false;
			    }               
            }
            HeadingEditor.prototype.getContextMenus = function() {

                var editor = this;

                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }];

                var index = parseInt(this.element.tagName.substring(1));

                for (var i = 1; i <= 6; i++) {
                    if (i != index) {
                        menus.push({
                            html: '<i class="fas fa-heading" data-heading="' + i + '"></i>H' + i,
                            handler: function() {
                                var index = parseInt(this[0].getAttribute('data-heading'));
                                var heading = editor.element;
                                var h = document.createElement("H" + index);
                                cloneAttributes(h, heading);
                                h.setAttribute('contenteditable', true);
                                h.innerHTML = heading.innerHTML;
                                $(heading).after(h).remove();
                                editor.element = h;
                                editor.needUpdate = true;
                                editor.stop();

                                startEdit(editor.wysiwyg, editor.element);
                            }
                        });
                    }
                }

                menus.push({
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                });

                return menus
            }
            function saveHistory(editor) {
                if (editor.saveHistory === false) {
                    editor.saveHistory = true;
                } else {
                    editor.history.save(editor.element.innerHTML);
                }
            }
            return {
                create: function(element, wysiwyg, embed) {
                    return new HeadingEditor(element, wysiwyg, embed);
                },
                name: 'HeadingEditorFactory',
                match: function(element) {
                    var tagName = element.tagName;
                    for (const headingTagName of tagNameArray) {
                        if (headingTagName === tagName)
                            return true;
                    }
                    return false;
                },
                order: 0
            }
        })();

        var HREditorFactory = (function() {

            function HREditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            HREditor.prototype.start = function() {
                var me = this;
                triggerEditorEvent('start', this);
            }

            HREditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }
            HREditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }

            HREditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                triggerEditorEvent('stop', this);
            }

            HREditor.prototype.getElement = function() {
                return this.element;
            }

            return {
                create: function(element, wysiwyg, embed) {
                    return new HREditor(element, wysiwyg, embed);
                },
                name: 'HREditorFactory',
                match: function(element) {
                    return element.tagName === 'HR';
                },
                order: 0
            }
        })();


        var ParagraphEditorFactory = (function() {

            function ParagraphEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
				this.history = new History();
				var timer;
				var me = this;
				this.observer = new MutationObserver(function(records) {
					if(timer){
						clearTimeout(timer);
					}
					timer = setTimeout(function(){
						saveHistory(me);
					},300)
				});
                triggerEditorEvent('create', this);
            }

            ParagraphEditor.prototype.start = function() {
                var me = this;
                var paragraph = this.element;
                paragraph.setAttribute('contenteditable', 'true');
                this.pasteHandler = function(e) {
                    htmlPasteEventListener.call(me, e)
                }
				
				var newEdit = function(element,target){
					$(me.element).after(element);
					me.element.remove();
					me.stop();
					if(me.parent){
						if(hasMethod(me.parent,'insertBlock')){
							me.parent.insertBlock(element);
						}
					} else {
						startEdit(me.wysiwyg,element,target);
					}
				}
				
                paragraph.addEventListener('paste', this.pasteHandler);
                var fileUploadMgr = new FileUploadMgr(paragraph, this.wysiwyg.config);
                this.mediaHelper = new MediaHelper(paragraph);
                this.fileUploadMgr = fileUploadMgr;
                this.contenteditableBar = ContenteditableBar.create(this.element);
                var inlineMath = createInlineMathSession(this.wysiwyg, this.element);
                inlineMath.start();
                this.inlineMath = inlineMath;
                DocumentCommandHelper.bindInlineBackspaceListener(this.element);
                this.element.focus();
				saveHistory(me);
				this.observer.observe(this.element, {
                    childList: true,
                    subtree: true,
					attribute:true,
					characterData:true
                });
                triggerEditorEvent('start', this);
            }

            ParagraphEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.fileUploadMgr.remove();
                this.contenteditableBar.remove();
                this.mediaHelper.remove();
                DocumentCommandHelper.unbindInlineBackspaceListener(this.element);
                var p = this.element;
                if (isEmptyText(p.innerHTML)) {
                    p.remove();
                } else {
                    p.removeAttribute('contenteditable');
                    p.removeEventListener('paste', this.pasteHandler);
                    divToBr($(p));
                }
                this.inlineMath.stop();
				this.history.clear();
				this.observer.disconnect();
                triggerEditorEvent('stop', this);
            }


            ParagraphEditor.prototype.insertFile = function(info) {
                insertFileAtElement(info, this.element);
            }

            ParagraphEditor.prototype.getElement = function() {
                return this.element;
            }

            ParagraphEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }
			
            ParagraphEditor.prototype.undo = function() {
                var record = this.history.undo();
			    if(record != null){
				   this.element.innerHTML = record;
				   this.saveHistory = false;
			    }
            }
			
            ParagraphEditor.prototype.redo = function() {
                var record = this.history.redo();
			    if(record != null){
				   this.element.innerHTML = record;
				   this.saveHistory = false;
			    }               
            }

            ParagraphEditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }, {
					html: '<i class="fas fa-file"></i>插入文件',
					handler: function(rangeInfo) {
						createInsertFileDialog(rangeInfo);
					}
				},{
                    html: '<i class="fas fa-upload"></i>上传文件',
                    handler: function() {
                        editor.fileUploadMgr.upload();
                    },
                    condition: function() {
                        return editor.wysiwyg.fileUploadEnable();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }
			
			
            function saveHistory(editor) {
                if (editor.saveHistory === false) {
                    editor.saveHistory = true;
                } else {
                    editor.history.save(editor.element.innerHTML);
                }
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
                        div.remove();
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
                        div.remove();
                    }
                }
            }

            return {
                create: function(element, wysiwyg, embed) {
                    return new ParagraphEditor(element, wysiwyg, embed);
                },
                name: 'ParagraphEditorFactory',
                match: function(element) {
                    //if only have a block katex
                    //should use katex block editor;
                    if (element.tagName == "P") {
                        var nodes = element.childNodes;
                        if (nodes.length == 1 && nodes[0].nodeType == 1 && nodes[0].hasAttribute('data-block-katex')) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                },
                order: 0
            }
        })();



        var KatexBlockEditorFactory = (function() {

            function KatexBlockEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                this.history = new History();
                triggerEditorEvent('create', this);
            }

            KatexBlockEditor.prototype.start = function() {
                var me = this;
                var expression = getKatexExpression(this.element);
                var pre = document.createElement('pre');
                pre.innerHTML = expression;
                var preview = document.createElement('div');
                preview.classList.add('katex-preview');

                var timer;
                var updatePreview = function() {
                    var expression = pre.textContent.trimEnd();
                    if (isEmptyText(expression)) {
                        $(preview).css({
                            'visibility': 'hidden'
                        });
                        return;
                    }
                    loadKatex(function() {
                        var rst;
                        try {
                            rst = katex.renderToString(expression, {
                                throwOnError: true,
                                displayMode: true
                            });
                        } catch (e) {
                            if (e instanceof katex.ParseError) {
                                rst = '<pre>' + e.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</pre>';
                            } else {
                                throw e; // other error
                            }
                        }
                        preview.innerHTML = rst;
                        $(preview).css({
                            'visibility': 'visible'
                        });
                    });

                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
                        saveHistory(me);
                    }, 300)
                };
                pre.setAttribute('contenteditable', 'true');
                pre.addEventListener('input', updatePreview);
                this.preHelper = new PreHelper(pre);
                $(this.element).after(pre).remove();
                this.element = pre;

                $(pre).after(preview);
                this.preview = preview;
                updatePreview();
                saveHistory(this);
                this.element.focus();
                triggerEditorEvent('start', this);
            }

            KatexBlockEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.preHelper.unbind();
                this.preview.remove();
				this.history.clear();
                var expression = this.element.textContent.replaceAll(veryThinChar, '').trimEnd();
                if (isEmptyText(expression)) {
                    this.element.remove();
                    triggerEditorEvent('stop', this);
                } else {
                    var me = this;
                    loadKatex(function() {
                        var html = parseKatex(expression, true);
                        var div = document.createElement('div');
                        div.innerHTML = html;
                        var katexNode = div.firstChild;
                        katexNode.setAttribute('data-block-katex', '');
                        $(me.element).after(katexNode).remove();
                        me.element = katexNode;
                        triggerEditorEvent('stop', me);
                    })
                }
            }

            KatexBlockEditor.prototype.undo = function() {
                var record = this.history.undo();
                if (record != null) {
                    this.saveHistory = false;
                    this.element.innerHTML = record;
                    this.element.dispatchEvent(new Event("input"));
                }
            }

            KatexBlockEditor.prototype.redo = function() {
                var record = this.history.redo();
                if (record != null) {
                    this.saveHistory = false;
                    this.element.innerHTML = record;
                    this.element.dispatchEvent(new Event("input"));
                }
            }

            KatexBlockEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            KatexBlockEditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }

            KatexBlockEditor.prototype.getElement = function() {
                return this.element;
            }


            function saveHistory(editor) {
                if (editor.saveHistory === false) {
                    editor.saveHistory = true;
                } else {
                    editor.history.save(editor.element.textContent.trimEnd());
                }
            }

            return {
                create: function(element, wysiwyg, embed) {
                    return new KatexBlockEditor(element, wysiwyg, embed);
                },
                name: 'KatexBlockEditorFactory',
                match: function(element) {
                    if (element.tagName == "P") {
                        var nodes = element.childNodes;
                        if (nodes.length == 1 && nodes[0].nodeType == 1 && nodes[0].hasAttribute('data-block-katex')) {
                            return true;
                        }
                        return false;
                    }
                    return element.hasAttribute('data-block-katex');
                },
                order: 0
            }
        })();

        var MermaidEditorFactory = (function() {

            function MermaidEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                this.history = new History();
                triggerEditorEvent('create', this);
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

                var timer;
                var updatePreview = function() {
                    var expression = textarea.value;
                    if (isEmptyText(expression)) {
                        $(preview).hide();
                        return;
                    }
                    loadMermaid(function() {
                        preview.removeAttribute('data-processed')
                        preview.innerHTML = expression;
                        $(preview).show();
                        try {
                            mermaid.parse(preview.textContent);
                            mermaid.init({}, $(preview));
                        } catch (e) {
                            preview.innerHTML = '<pre>' + e.str + '</pre>'
                        }
                    });

                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
                        saveHistory(me);
                    }, 300)
                };
                textarea.addEventListener('input', function() {
                    updatePreview();
                    this.style.height = "";
                    this.style.height = this.scrollHeight + 'px'
                });
                $(this.element).after(textarea).remove();
                textarea.style.height = textarea.scrollHeight + 'px'
                this.element = textarea;

                $(textarea).after(preview);
                this.preview = preview;

                updatePreview();
                saveHistory(this);
                this.element.focus();
                triggerEditorEvent('start', this);
            }

            MermaidEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.preview.remove();
				this.history.clear();
                var expression = this.element.value;
                if (isEmptyText(expression)) {
                    this.element.remove();
                    triggerEditorEvent('stop', this);
                } else {
                    var me = this;
                    loadMermaid(function() {
                        var div = createUnparsedMermaidElement(expression);
                        $(me.element).after(div).remove();
                        var mermaidNode = div.querySelector('.mermaid');
                        try {
                            mermaid.parse(mermaidNode.textContent);
                            mermaid.init({}, $(mermaidNode));
                        } catch (e) {
                            mermaidNode.innerHTML = '<pre>' + e.str + '</pre>'
                        }

                        me.element = div;
                        triggerEditorEvent('stop', me);
                    });
                }
            }
            MermaidEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            MermaidEditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        editor.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }
            MermaidEditor.prototype.getElement = function() {
                return this.element;
            }
            MermaidEditor.prototype.undo = function() {
                var record = this.history.undo();
                if (record != null) {
                    this.saveHistory = false;
                    this.element.value = record;
                    this.element.dispatchEvent(new Event("input"));
                }
            }

            MermaidEditor.prototype.redo = function() {
                var record = this.history.redo();
                if (record != null) {
                    this.saveHistory = false;
                    this.element.value = record;
                    this.element.dispatchEvent(new Event("input"));
                }
            }

            function saveHistory(editor) {
                if (editor.saveHistory === false) {
                    editor.saveHistory = true;
                } else {
                    editor.history.save(editor.element.value);
                }
            }
            return {
                create: function(element, wysiwyg, embed) {
                    return new MermaidEditor(element, wysiwyg, embed);
                },
                name: 'MermaidEditorFactory',
                match: function(element) {
                    return element.tagName == 'DIV' && element.classList.contains('mermaid-block');
                },
                order: 0
            }
        })();
		
		
		 var HtmlBlockEditorFactory = (function() {

            function HtmlBlockEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            HtmlBlockEditor.prototype.start = function() {
				var innerHTML = this.element.innerHTML;
				var pre = document.createElement('pre');
				var textNode = document.createTextNode(innerHTML);
				pre.appendChild(textNode);
				pre.setAttribute('contenteditable','true');
				$(this.element).after(pre).remove();
				this.preHelper = new PreHelper(pre);
				this.element = pre;
                triggerEditorEvent('start', this);
            }

            HtmlBlockEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
				this.preHelper.unbind();
				var textContent = this.element.textContent;
				if(isEmptyText(textContent)){
					this.element.remove();
				} else {
					var div = document.createElement('div');
					div.setAttribute('data-html','');
					div.innerHTML = textContent;
					console.log(textContent);
					$(this.element).after(div).remove();
					this.element = div;
				}
                triggerEditorEvent('stop', this);
            }


            HtmlBlockEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            HtmlBlockEditor.prototype.getContextMenus = function() {
                var editor = this;
                var menus = [{
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        editor.delete();
                    }
                }];
                return menus;
            }

            HtmlBlockEditor.prototype.getElement = function() {
                return this.element;
            }

            return {
                create: function(element, wysiwyg, embed) {
                    return new HtmlBlockEditor(element, wysiwyg, embed);
                },
                name: 'HtmlBlockEditorFactory',
                match: function(element) {
                    return element.tagName == 'DIV' && element.hasAttribute('data-html');
                },
                order: 0
            }
        })();

        var ListEditorFactory = (function() {

            var LiEditor = (function() {
                function LiEditor(listEditor, li, target) {
                    this.listEditor = listEditor;
                    this.li = li;
                    this.wysiwyg = listEditor.wysiwyg;
                    this.checkbox = getCheckbox(li);
                    this.target = target;
                    this.embed = true; //always true
                    this.compositeEditorHelper = new CompositeEditorHelper(this);
                    triggerEditorEvent('create', this);
                }

                LiEditor.prototype.insertBlock = function(block) {
                    this.compositeEditorHelper.insertBlock(block);
                }

                LiEditor.prototype.getElement = function(block) {
                    return this.li;
                }

                LiEditor.prototype.getContextMenus = function() {
                    var me = this;
                    var menus = [{
                        html: '<i class="fas fa-check"></i>完成',
                        handler: function() {
                            editor.stop();
                        }
                    }, {
                        html: '<i class="fas fa-arrow-up"></i>向上添加',
                        handler: function() {
                            me.append(false);

                        }
                    }, {
                        html: '<i class="fas fa-arrow-down"></i>向下添加',
                        handler: function() {
                            var li = me.append(true);
                            me.stop();
                            editLi(me.listEditor, li, li.querySelector('p'));
                        }
                    }, {
                        html: '<i class="fas fa-times"></i>删除',
                        handler: function() {
                            me.li.remove();
                            me.stop();
                        }
                    }];

                    return menus;
                }

                LiEditor.prototype.start = function() {
                    var li = this.li;
                    wrapToParagraph(li, this.checkbox);
                    this.compositeEditorHelper.start();
                    if (this.checkbox != null) {
                        li.setAttribute('data-task-list', '');
                        if (this.checkbox.checked) {
                            li.setAttribute('data-checked', '');
                        } else {
                            li.setAttribute('data-unchecked', '');
                        }
                        this.clickHandler = function(e) {
                            if (e.offsetX < 0) {
                                if (li.hasAttribute('data-checked')) {
                                    li.removeAttribute('data-checked');
                                    li.setAttribute('data-unchecked', '');
                                } else {
                                    li.removeAttribute('data-unchecked');
                                    li.setAttribute('data-checked', '');
                                }
                            }
                        }
                        li.addEventListener('click', this.clickHandler);
                        var checkbox = this.checkbox.cloneNode(true);
                        this.checkbox.remove();
                    }
                    triggerEditorEvent('start', this);
                    //
                    this.compositeEditorHelper.edit(this.target);
                }

                LiEditor.prototype.stop = function() {
                    var li = this.li;
                    var checkbox = this.checkbox;
                    if (checkbox != null) {
                        checkbox.checked = li.hasAttribute('data-checked');
                        if (checkbox.checked) {
                            checkbox.setAttribute('checked', '')
                        } else {
                            checkbox.removeAttribute('checked')
                        }
                        $(li).prepend(checkbox);
                        li.removeAttribute('data-checked');
                        li.removeAttribute('data-unchecked');
                        li.removeAttribute('data-task-list');
                        li.removeEventListener('click', this.clickHandler);
                    }
                    this.compositeEditorHelper.stop();
                    triggerEditorEvent('stop', this);
                }

                LiEditor.prototype.notifyEmbedStopped = function() {
                    this.child = undefined;
                }

                LiEditor.prototype.isTaskList = function() {
                    return this.checkbox != null;
                }

                LiEditor.prototype.editNextEmbed = function() {
                    return this.compositeEditorHelper.editNextEmbed();
                }

                LiEditor.prototype.editPrevEmbed = function() {
                    return this.compositeEditorHelper.editPrevEmbed();
                }

                LiEditor.prototype.insertBefore = function() {
                    this.compositeEditorHelper.insertBefore();
                }

                LiEditor.prototype.insertAfter = function() {
                    this.compositeEditorHelper.insertAfter();
                }
				
				LiEditor.prototype.undo = function() {
					this.compositeEditorHelper.undo();
				}
				
				LiEditor.prototype.redo = function() {
					this.compositeEditorHelper.redo();
				}

                LiEditor.prototype.append = function(after) {
                    if (after) {
                        if (this.isTaskList()) {
                            $(this.li).after('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/><p></p></li>');
                        } else {
                            $(this.li).after('<li><p></p></li>');
                        }
                        return this.li.nextElementSibling;
                    } else {
                        if (this.isTaskList()) {
                            $(this.li).before('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/><p></p></li>');
                        } else {
                            $(this.li).before('<li><p></p></li>');
                        }
                        return this.li.previousElementSibling;
                    }
                }

                return LiEditor;
            })();

            function ListEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            ListEditor.prototype.notifyEmbedStopped = function() {
                this.child = undefined;
            }

            ListEditor.prototype.start = function(_target) {
                var me = this;
                var ele = $(this.element);
                var clickHandler = function(e) {
                    var li = getLi(e.target, me.element);
                    editLi(me, li, e.target);
                }

                ele.on('click', 'li', clickHandler);
                this.clickHandler = clickHandler;
                triggerEditorEvent('start', this);

                if (_target) {
                    editLi(this, getLi(_target, this.element), _target);
                } else {
                    //start edit first li
                    var li = this.element.querySelector('li');
                    if (li != null) {
                        editLi(this, li);
                    } else {
                        //add a new li and edit it
                        var li = document.createElement('li');
                        li.appendChild(document.createElement('p'));
                        this.element.appendChild(li);
                        editLi(this, li);
                    }
                }
            }

            ListEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            ListEditor.prototype.getContextMenus = function() {
                var me = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        me.stop();
                    }
                }, {
                    html: '<i class="fas fa-exchange-alt"></i>转化',
                    handler: function() {
                        var children = me.element.children;
                        for (var i = 0; i < children.length; i++) {
                            var child = children[i];
                            if (child.nodeType == 1 && child.tagName == 'LI') {
                                var checkbox = getCheckbox(child);
                                if (checkbox != null) {
                                    return;
                                }
                            }
                        }
                        _stop(me);
                        var tagName = me.element.tagName == 'OL' ? "ul" : 'ol';
                        var replace = document.createElement(tagName);
                        replace.innerHTML = me.element.innerHTML;
                        cloneAttributes(replace, me.element);
                        $(me.element).after(replace).remove();
                        me.element = replace;
                        me.needUpdate = true;
                        me.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        me.delete();
                    }
                }];
                return menus;
            }

            ListEditor.prototype.insertBlock = function(block) {
                if (this.child) {
                    this.child.insertBlock(block);
                } else {
                    //find li in this list 
                    var li = this.element.querySelector('li');
                    if (li == null) {
                        //add li 
                        var li = document.createElement('li');
                        this.element.appendChild(li);
                        editLi(this, li);
                        this.child.insertBlock(block);
                    } else {
                        //find last li 
                        var lis = this.element.querySelectorAll('li');
                        var li = lis[lis.length - 1];
                        editLi(this, li);
                        this.child.insertBlock(block);
                    }
                }
            }
            ListEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                _stop(this);
                triggerEditorEvent('stop', this);
            }

            ListEditor.prototype.editNextEmbed = function() {
                if (this.child) {
                    if (this.child.editNextEmbed() !== true) {
                        var editor = this.child;
                        this.child.stop();
                        var next = editor.li.nextElementSibling;
                        if (next != null) {
                            editLi(this, next);
                            return true;
                        }
                        return false;
                    }
                    return true;
                } else {
                    var li = this.element.querySelector('li');
                    if (li != null) {
                        var liEditor = new LiEditor(this, li);
                        liEditor.start();
                        this.child = liEditor;
                        return true;
                    }
                }
                return false;
            }

            ListEditor.prototype.editPrevEmbed = function() {
                if (this.child) {
                    if (this.child.editPrevEmbed() !== true) {
                        var editor = this.child;
                        this.child.stop();
                        var prev = editor.li.previousElementSibling;
                        if (prev != null) {
                            editLi(this, prev);
                            return true;
                        }
                        return false;
                    }
                    return true;
                }
                return false;
            }

            ListEditor.prototype.getElement = function() {
                return this.element;
            }

            ListEditor.prototype.insertBefore = function() {
                if (this.child) {
                    this.child.insertBefore();
                }
            }

            ListEditor.prototype.insertAfter = function() {
                if (this.child) {
                    this.child.insertAfter();
                }
            }
			
			ListEditor.prototype.undo = function() {
				if (this.child) 
					this.child.undo();
			}
			
			ListEditor.prototype.redo = function() {
				if (this.child) 
					this.child.redo();
			}

            var editLi = function(editor, li, target) {
                if (li != null && !li.isContentEditable) {
                    if (editor.child) {
                        editor.child.stop();
                    }
                    if (!target) {
                        var checkbox = getCheckbox(li);
                        var first = li.firstChild;
                        if (first != null) {
                            if (first !== checkbox) {
                                target = first;
                            } else {
                                first = first.nextElementSibling;

                                if (first == null) {
                                    var p = document.createElement('p');
                                    li.appendChild(p);
                                    first = p;
                                }
                            }
                        } else {
                            var p = document.createElement('p');
                            li.appendChild(p);
                            first = p;
                        }
                        target = first;
                    }
                    var liEditor = new LiEditor(editor, li, target);
                    liEditor.parent = editor;
                    liEditor.start();
                    editor.child = liEditor;
                }
            }

            function _stop(editor) {
                if (editor.child) {
                    editor.child.stop();
                }
                var ele = $(editor.element);
                ele.find('li').each(function() {
                    var checkbox = getCheckbox(this);
                    wrapToParagraph(this, checkbox);
                })
                ele.off('click', 'li', editor.clickHandler);
                ele.find('[contenteditable]').each(function() {
                    this.removeEventListener('paste', plainPasteHandler);
                    this.removeAttribute('contenteditable');
                });
            }

            function getLi(_target, root) {
                var target = _target;
                while (target != null) {
                    if (target.tagName == 'LI' && target.parentNode == root) {
                        return target;
                    }
                    target = target.parentElement;
                    if (!root.contains(target)) {
                        return null;
                    }
                }
                return null;
            }

            return {
                create: function(element, wysiwyg, embed) {
                    return new ListEditor(element, wysiwyg, embed);
                },
                name: 'ListEditorFactory',
                match: function(element) {
                    var tagName = element.tagName;
                    return tagName == 'OL' || tagName == 'UL';
                },
                order: 0
            }
        })();

        var PreEditorFactory = (function() {
            function PreEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                this.history = new History();
                triggerEditorEvent('create', this);
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
                        if (me.composing === true) return;
                        updateEditor(pre, function() {
                            highlight(pre, me.language);
                        })
                        saveHistory(me);
                    }, 100)
                }

                this.startHandler = function(e) {
                    me.composing = true;
                };
                this.endHandler = function(e) {
                    me.composing = false;
                };
				
				this.indentHandler = function(e){
					var text = e.detail.text;
					var range = e.detail.range;
					var html = highlightStr(text,me.language);
					if(html != null){
						var renderer = document.createElement('template');
						renderer.innerHTML = html;
						range.insertNode(renderer.content);
					} else {
						range.insertNode(document.createTextNode(text));
					}
                    saveHistory(me);
				}

                pre.addEventListener('compositionstart', this.startHandler);
                pre.addEventListener('compositionend', this.endHandler);
                pre.addEventListener('input', this.inputHandler);
                pre.addEventListener('indent', this.indentHandler);
                pre.addEventListener('unindent', this.indentHandler);
				
                this.preHelper = new PreHelper(pre);

                if (this.language == 'html') this.language = 'xml';
                highlight(pre, me.language);

                saveHistory(this);
                this.element.focus();
                triggerEditorEvent('start', this);
            }

            PreEditor.prototype.getContextMenus = function() {
                var me = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        me.stop();
                    }
                }, {
                    html: '<i class="fas fa-code"></i>语言',
                    handler: function() {
                        var inputOptions = {};
                        var languages = hljs.listLanguages();
                        for (var i = 0; i < languages.length; i++) {
                            var language = languages[i];
                            inputOptions[language] = language;
                        }
                        Swal.fire({
                            title: '选择语言',
                            input: 'select',
                            animation: false,
                            inputValue: me.language,
                            inputOptions: inputOptions
                        }).then((result) => {
                            if (result.value) {
                                var lang = result.value;
                                me.language = lang;
                                highlight(me.element, me.language);
                                me.element.focus();

                                saveHistory(me);
                            }
                        })
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        me.delete();
                    }
                }];
                return menus;
            }

            PreEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                var pre = this.element;

                pre.removeEventListener('compositionstart', this.startHandler);
                pre.removeEventListener('compositionend', this.endHandler);
                pre.removeEventListener('input', this.inputHandler);
                pre.removeEventListener('indent', this.indentHandler);
                pre.removeEventListener('unindent', this.indentHandler);
                this.preHelper.unbind();
				this.history.clear();
                $(pre).removeAttr('contenteditable');
                highlight(pre, this.language);
                var code = document.createElement('code');
                if (this.language != '') {
                    code.classList.add('language-' + this.language);
                }
                code.innerHTML = pre.innerHTML;
                pre.innerHTML = code.outerHTML;
                triggerEditorEvent('stop', this);
            }

            PreEditor.prototype.undo = function() {
                var record = this.history.undo();
                if (record != null) {
                    this.language = record.language;
                    this.element.innerHTML = record.html;
                    this.saveHistory = false;
                }
            }

            PreEditor.prototype.redo = function() {
                var record = this.history.redo();
                if (record != null) {
                    this.language = record.language;
                    this.element.innerHTML = record.html;
                    this.saveHistory = false;
                }
            }

            PreEditor.prototype.getElement = function() {
                return this.element;
            }

            PreEditor.prototype.delete = function() {
                this.element.remove();
                this.stop();
            }

            function saveHistory(editor) {
                if (editor.saveHistory === false) {
                    editor.saveHistory = true;
                } else {
                    editor.history.save({
                        language: editor.language,
                        html: editor.element.innerHTML
                    });
                }
            }

            function getLanguage(code) {
                var classes = code.getAttribute('class');
                if (classes != null) {
                    var classArray = classes.split(' ');
                    for (const clazz of classArray) {
                        if (clazz.startsWith("language-")) {
                            return clazz.split('-')[1];
                        }
                    }
                }

            }

            function highlight(pre, language) {
                if (hljs.getLanguage(language)) {
                    var html = hljs.highlight(language, pre.textContent, true).value;
                    var _pre = document.createElement('pre');
                    _pre.innerHTML = html;
                    cloneAttributes(_pre, pre);
                    morphdom(pre, _pre);
                }
            }
			
			function highlightStr(str, language) {
                if (hljs.getLanguage(language)) {
                   return hljs.highlight(language, str, true).value;
                }
				return null;
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
                processPasteNode: function(node) {
                    var code = node.querySelector('code');
                    var language;
                    if (code != null) {
                        language = getLanguage(code);
                    }
                    var innerHTML = node.innerHTML;
                    var pre = document.createElement('pre');
                    var codeNode = document.createElement('code');
                    if (!isUndefined(language)) {
                        codeNode.classList.add('language-' + language);
                    }
                    codeNode.innerHTML = innerHTML;
                    pre.appendChild(codeNode);
                    return pre;
                },
                create: function(element, wysiwyg, embed) {
                    return new PreEditor(element, wysiwyg, embed);
                },
                name: 'PreEditorFactory',
                match: function(element) {
                    var tagName = element.tagName;
                    return tagName == 'PRE';
                },
                order: 0
            }
        })();

        var TaskListEditorFactory = (function() {
            return {
                create: function(element, wysiwyg, embed) {
                    return ListEditorFactory.create(element, wysiwyg, embed)
                },
                name: 'TaskListEditorFactory',
                match: function(element) {
                    return ListEditorFactory.match(element);
                },
                order: 0
            }
        })();

        var BlockquoteEditorFactory = (function() {
            function BlockquoteEditor(element, wysiwyg, embed) {
                this.element = element;
                this.wysiwyg = wysiwyg;
                this.embed = embed;
                this.compositeEditorHelper = new CompositeEditorHelper(this);
                triggerEditorEvent('create', this);
            }

            BlockquoteEditor.prototype.start = function(_target) {
                this.compositeEditorHelper.start();
                triggerEditorEvent('start', this);
                this.compositeEditorHelper.edit(_target);
            }

            BlockquoteEditor.prototype.getContextMenus = function() {
                var me = this;
                var menus = [{
                    html: '<i class="fas fa-check"></i>完成',
                    handler: function() {
                        me.stop();
                    }
                }, {
                    html: '<i class="fas fa-times"></i>删除',
                    handler: function() {
                        me.delete();
                    }
                }];
                return menus;
            }

            BlockquoteEditor.prototype.delete = function(_target) {
                this.element.remove();
                this.stop();
            }

            BlockquoteEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.compositeEditorHelper.stop();
                triggerEditorEvent('stop', this);
            }

            BlockquoteEditor.prototype.getElement = function() {
                return this.element;
            }

            BlockquoteEditor.prototype.insertBlock = function(block) {
                this.compositeEditorHelper.insertBlock(block);
            }

            BlockquoteEditor.prototype.notifyEmbedStopped = function() {
                this.child = undefined;
            }

            BlockquoteEditor.prototype.isTaskList = function() {
                return this.checkbox != null;
            }

            BlockquoteEditor.prototype.editNextEmbed = function() {
                return this.compositeEditorHelper.editNextEmbed();
            }

            BlockquoteEditor.prototype.editPrevEmbed = function() {
                return this.compositeEditorHelper.editPrevEmbed();
            }

            BlockquoteEditor.prototype.insertBefore = function() {
                this.compositeEditorHelper.insertBefore();
            }

            BlockquoteEditor.prototype.insertAfter = function() {
                this.compositeEditorHelper.insertAfter();
            }
			BlockquoteEditor.prototype.undo = function() {
				this.compositeEditorHelper.undo();
			}
			
			BlockquoteEditor.prototype.redo = function() {
				this.compositeEditorHelper.redo();
			}
            return {
                create: function(element, wysiwyg, embed) {
                    return new BlockquoteEditor(element, wysiwyg, embed)
                },
                name: 'BlockquoteEditorFactory',
                match: function(element) {
                    return element.tagName == 'BLOCKQUOTE';
                },
                order: 0
            }
        })();

        var CompositeEditorHelper = (function() {

            function CompositeEditorHelper(editor) {
                var me = this;
                this.editor = editor;
                this.element = this.editor.getElement();
            }

            CompositeEditorHelper.prototype.start = function() {
                var me = this;
                var clickHandler = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var target = e.target;
                    editTarget(me, target);
                }
                me.editor.getElement().addEventListener('click', clickHandler);
                this.clickHandler = clickHandler;
            }

            CompositeEditorHelper.prototype.edit = function(target) {
                if (target) {
                    editTarget(this, target);
                } else {
                    //first 
                    var first = this.editor.getElement().firstElementChild;;
                    if (first) {
                        editTarget(this, first);
                    }
                }
            }

            CompositeEditorHelper.prototype.stop = function() {
                var child = this.editor.child;
                if (child)
                    child.stop();
                this.editor.getElement().removeEventListener('click', this.clickHandler);
            }

            CompositeEditorHelper.prototype.insertBefore = function() {
                var child = this.editor.child;
                if (child) {
                    if (hasMethod(child, 'insertBefore')) {
                        child.insertBefore();
                    } else {
                        createEmbedEditorDialog(this, function(element) {
                            $(child.getElement()).before(element);
                        });
                    }
                } else {
                    var me = this;
                    createEmbedEditorDialog(this, function(element) {
                        me.element.prepend(element);
                    });
                }
            }

            CompositeEditorHelper.prototype.insertAfter = function() {
                var child = this.editor.child;
                if (child) {
                    if (hasMethod(child, 'insertAfter')) {
                        child.insertAfter();
                    } else {
                        createEmbedEditorDialog(this, function(element) {
                            $(child.getElement()).after(element);
                        });
                    }
                } else {
                    var me = this;
                    createEmbedEditorDialog(me, function(element) {
                        me.element.appendChild(element);
                    });
                }
            }

            CompositeEditorHelper.prototype.editNextEmbed = function() {
                var child = this.editor.child;
                if (child) {
                    if (hasMethod(child, 'editNextEmbed')) {
                        if (child.editNextEmbed() !== true) {
                            child.stop();
                            var next = child.getElement().nextElementSibling;
                            if (next != null) {
                                createEditor(next, this);
                                return true;
                            }
                            return false;
                        }
                        return true;
                    } else {
                        child.stop();
                        var next = child.getElement().nextElementSibling;
                        if (next != null) {
                            createEditor(next, this);
                            return true;
                        }
                    }
                } else {
                    //edit first element if exists
                    var first = this.element.children[0];
                    if (first) {
                        createEditor(first, this);
                        return true;
                    }
                }
                return false;
            }

            CompositeEditorHelper.prototype.editPrevEmbed = function() {
                var child = this.editor.child;
                if (child) {
                    if (hasMethod(child, 'editPrevEmbed')) {
                        if (child.editPrevEmbed() !== true) {
                            child.stop();
                            var prev = child.getElement().previousElementSibling;
                            if (prev != null) {
                                createEditor(prev, this);
                                return true;
                            }
                            return false;
                        }
                        return true;
                    } else {
                        child.stop();
                        var prev = child.getElement().previousElementSibling;
                        if (prev != null) {
                            createEditor(prev, this);
                            return true;
                        }
                    }
                } else {
                    var children = this.element.children;
                    var last = children[children.length - 1];
                    if (last) {
                        createEditor(last, this);
                        return true;
                    }
                }
                return false;
            }


            CompositeEditorHelper.prototype.insertBlock = function(block) {
                var child = this.editor.child;
                if (child) {
                    if (hasMethod(child, 'insertBlock')) {
                        child.insertBlock(block);
                    } else {
                        var element = child.getElement();
                        $(element).after(block);
                        createEditor(block, this);
                    }
                } else {
                    this.element.appendChild(block);
                    createEditor(block, this);
                }
            }
			
			CompositeEditorHelper.prototype.undo = function() {
				if (this.editor.child) 
					this.editor.child.undo();
			}
			
			CompositeEditorHelper.prototype.redo = function() {
				if (this.editor.child) 
					this.editor.child.redo();
			}

            function editTarget(helper, _target) {
                var target = _target;
                while (target != null) {
                    if (target.parentElement == helper.element) {
                        break;
                    }
                    target = target.parentElement;
                }
                if (target == null) {
                    return;
                }
                if (helper.editor.child && helper.editor.child.getElement() === target) {
                    return;
                };
                createEditor(target, helper, _target);
            }

            function createEmbedEditorDialog(editor, handler) {
                var oldChild = editor.child;
                if (oldChild) {
                    oldChild.stop();
                }
                showEditorFactoryDialog(function(element) {
                    handler(element);
                    createEditor(element, editor);
                })
            }

            function createEditor(element, editor, _target) {
                var factory = getEditorFactoryByElement(element);
                var child;
                if (factory != null) {
                    child = factory.create(element, editor.editor.wysiwyg, true);
                    child.parent = editor.editor;
                }
                if (editor.editor.child) {
                    editor.editor.child.stop();
                }
                if (child) {
                    child.start(_target);
                    editor.editor.child = child;
                }
            }

            return CompositeEditorHelper;
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
        editorFactories.push(HtmlBlockEditorFactory);
		

        editorFactories.sort(function(a, b) {
            return a.order > b.order ? -1 : a.order == b.order ? 0 : 1;
        });


        var runInlineCommand = function(wysiwyg, callback) {
            if (wysiwyg.currentEditor) {
                var element = wysiwyg.currentEditor.getElement();
                var rangeInfo = getRangeInfo(element);
                var range = rangeInfo.range;
                var sel = rangeInfo.sel;
                if (range != null) {
                    callback(range, sel);
                }
            }
        }

        ////init default commands ;
        var runBlockCommand = function(element, wysiwyg) {
            if (wysiwyg.currentEditor) {
                var editor = wysiwyg.currentEditor;
                if (hasMethod(editor, 'insertBlock')) {
                    editor.insertBlock(element); //just add block ,let editor do remain work
                } else {
					var next = editor.getElement().nextElementSibling;
                    wysiwyg.stopEdit();
					if(next == null){
						 wysiwyg.rootElem.appendChild(element);
					} else {
						$(next).before(element)
					}
					startEdit(wysiwyg, element);
                }
            } else {
                wysiwyg.rootElem.appendChild(element);
                startEdit(wysiwyg, element);
            }
        }

        commands['factories'] = function() {
            var me = this;
            showEditorFactoryDialog(function(element) {
                runBlockCommand(element, me);
            })
        }

        commands['insertBefore'] = function() {
            if (this.currentEditor) {
                if (hasMethod(this.currentEditor, 'insertBefore')) {
                    this.currentEditor.insertBefore();
                } else {
                    var me = this;
                    showEditorFactoryDialog(function(element) {
                        var ele = me.currentEditor.getElement();
						var prev = ele.previousElementSibling;
                        me.stopEdit();
						
						if(prev == null){
							$(this.rootElem).prepend(element);
						} else {
							$(prev).after(element);
						}
                        startEdit(me, element);
                    })
                }
            }
        }
        commands['insertAfter'] = function() {
            if (this.currentEditor) {
                if (hasMethod(this.currentEditor, 'insertAfter')) {
                    this.currentEditor.insertAfter();
                } else {
                    var me = this;
                    showEditorFactoryDialog(function(element) {
                        var ele = me.currentEditor.getElement();
						var next = ele.nextElementSibling;
                        me.stopEdit();
						
						if(next == null){
							$(this.rootElem).after(element);
						} else {
							$(next).before(element);
						}
                        startEdit(me, element);
                    })
                }
            }
        }
        commands['contextmenu'] = function() {
            if (this.currentEditor) {
                var menuCards = [];
                var editor = this.currentEditor;
				
				var rangeInfo;
				var depthestChild = getDepthestChild(this);
				if(depthestChild == null){
					rangeInfo = getRangeInfo(editor.getElement());
				} else {
					rangeInfo = getRangeInfo(depthestChild.getElement());
				}
				
                var child = editor.child;
                var menus = editor.getContextMenus();

                menuCards.push({
                    title: this.currentEditor.getElement().tagName,
                    menus: menus
                });
                if (!isUndefined(child)) {
                    while (true) {
                        if (isUndefined(child)) {
                            break;
                        }
                        var childMenus = child.getContextMenus();
                        menuCards.push({
                            title: child.getElement().tagName,
                            menus: childMenus
                        });
                        child = child.child;
                    }
                }

                menuCards.reverse();
                var me = this;
                var first = menuCards[0];
                first.menus.unshift({
                    html: '<i class="fas fa-check"></i>在前方插入',
                    handler: function() {
                        me.execCommand('insertBefore');
                    }
                });
                createMenuDialog(menuCards,rangeInfo);
            }
        }
        commands['table'] = function() {
            runBlockCommand(TableEditorFactory, this);
        }
        commands['heading'] = function() {
            runBlockCommand(HeadingEditorFactory, this);
        }
        commands['quote'] = function() {
            runBlockCommand(BlockquoteEditorFactory, this);
        }
        commands['codeBlock'] = function() {
            runBlockCommand(PreEditorFactory, this);
        }
        commands['tasklist'] = function() {
            runBlockCommand(TaskListEditorFactory, this);
        }
        commands['paragraph'] = function() {
            runBlockCommand(ParagraphEditorFactory, this);
        }
        commands['list'] = function() {
            runBlockCommand(ListEditorFactory, this);
        }
        commands['hr'] = function() {
            runBlockCommand(HREditorFactory, this);
        }
        commands['math'] = function() {
            runBlockCommand(KatexBlockEditorFactory, this);
        }
        commands['mermaid'] = function() {
            runBlockCommand(MermaidEditorFactory, this);
        }
        commands['bold'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.bold();
            });
        }
        commands['italic'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.italic();
            });
        }
        commands['strikethrough'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.strikethrough();
            });
        }
        commands['code'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.inlineTagHandler('CODE', range, sel);
            });
        }
        commands['link'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.link(range, sel);
            });
        }
        commands['removeFormat'] = function() {
            runInlineCommand(this, function(range, sel) {
                DocumentCommandHelper.removeFormat();
            });
        }

        var MediaHelper = (function() {

            function makeVideoFocusable(element) {
                var videos = element.querySelectorAll('video');
                for (var i = 0; i < videos.length; i++) {
                    var video = videos[i];
                    var prev = video.previousSibling;
                    var next = video.nextSibling;
                    if (prev == null) {
                        $(video).before(veryThinHtml);
                    } else {
                        if (!prev.nodeValue || !prev.nodeValue.endsWith(veryThinChar)) {
                            $(video).before(veryThinHtml);
                        }
                    }
                    if (next == null) {
                        $(video).after(veryThinHtml);
                    } else {
                        if (!next.nodeValue || !next.nodeValue.startsWith(veryThinChar)) {
                            $(video).after(veryThinHtml);
                        }
                    }
                }
            }

            function MediaHelper(element) {

                var imgClickHandler = function(e) {
                    var element = e.target;
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
                        showCancelButton: true
                    }).then((formValues) => {
                        formValues = formValues.value;
                        if (!formValues) {
                            return;
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
                        }
                    });
                }

                $(element).on('click', 'img', imgClickHandler);
				
                makeVideoFocusable(element);

                var observer = new MutationObserver(function(mutations, observer) {
                    out: for (const mutationRecord of mutations) {
                        var removedVideo = false;
                        if (mutationRecord.removedNodes) {
                            for (const removedNode of mutationRecord.removedNodes) {
                                if (removedNode.tagName == 'VIDEO') {
                                    removedVideo = true;
                                    break;
                                }
                            }
                        }
                        if (removedVideo) {
                            var prev = mutationRecord.previousSibling;
                            if (prev != null && prev.nodeType == 3) {
                                var value = prev.nodeValue;
                                if (value.endsWith(veryThinChar)) {
                                    var newValue = value;
                                    while (newValue.endsWith(veryThinChar)) {
                                        newValue = newValue.substring(0, newValue.length - 1);
                                        if (newValue == '') {
                                            break;
                                        }
                                    }
                                    if (newValue == '') {
                                        prev.remove();
                                    } else {
                                        prev.nodeValue = newValue;
                                    }
                                }
                            }

                            var next = mutationRecord.nextSibling;
                            if (next != null && next.nodeType == 3) {
                                var value = next.nodeValue;
                                if (value.startsWith(veryThinChar)) {
                                    var newValue = value;
                                    while (newValue.startsWith(veryThinChar)) {
                                        newValue = newValue.substring(1, newValue.length);
                                        if (newValue == '') {
                                            break;
                                        }
                                    }
                                    if (newValue == '') {
                                        next.remove();
                                    } else {
                                        next.nodeValue = newValue;
                                    }
                                }
                            }
                            if (prev != null) {
                                var range = getRangeInfo(element).range;
                                if (range != null) {
                                    range.setStartAfter(prev);
                                }
                            }
                        }
                    }

                    makeVideoFocusable(element);
                });

                observer.observe(element, {
                    childList: true,
                    subtree: true
                });

                this.observer = observer;
                this.imgClickHandler = imgClickHandler;
                this.element = element;
            }

            MediaHelper.prototype.remove = function() {
                $(this.element).off('click', 'img', this.imgClickHandler);
                this.observer.disconnect();
            }
            return MediaHelper;
        })();


        var PreHelper = (function() {
            function PreHelper(pre) {
                this.pre = pre;
                this.keyDownHandler = function(e) {
                    if (e.key == 'Enter') {
						var rangeInfo = getRangeInfo(pre);
						var range = rangeInfo.range;
                        var sel = rangeInfo.sel;
						if(range != null){
							e.preventDefault();
							e.stopPropagation();
							var text = document.createTextNode('\n'+veryThinChar);
							range.insertNode(text);
							sel.removeAllRanges();
							range.setStart(text,1);
							range.setEnd(text,1);
							sel.addRange(range);
							pre.dispatchEvent(new Event("input"));
						}
                        return false;
                    }
                    if (e.shiftKey && e.key == 'Tab') {
                        var rangeInfo = getRangeInfo(pre);
                        var range = rangeInfo.range;
                        var sel = rangeInfo.sel;
                        if (range != null) {
                            var text = sel.toString().replaceAll("\r", "");
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
							pre.dispatchEvent(new CustomEvent("unindent",{detail:{
								text : rst,
								range : range
							}}));
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    if (e.key == 'Tab') {

                        var rangeInfo = getRangeInfo(pre);
                        var sel = rangeInfo.sel;
                        var range = rangeInfo.range;
                        if (sel.type == 'Caret') {
                            document.execCommand('insertText', false, '    ');
                        } else {
                            if (range != null) {
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
                             //   range.insertNode(document.createTextNode(rst));
								pre.dispatchEvent(new CustomEvent("indent",{detail:{
									text : rst,
									range : range
								}}));
                            }
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }

                this.pasteHandler = function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var cpdata = (e.originalEvent || e).clipboardData;
                    var data = cpdata.getData('text/plain');
                    var rangeInfo = getRangeInfo(pre);
                    var sel = rangeInfo.sel;
                    var range = rangeInfo.range;
                    if (range != null) {
                        range.deleteContents();
						var node = document.createTextNode(data.replaceAll('<br>', '\n').replaceAll(tabSpace, "    "));
                        range.insertNode(node);
						range.setStartAfter(node);
						pre.dispatchEvent(new Event("input"));
                    }
                    return false;
                }

                this.pre.addEventListener('keydown', this.keyDownHandler);
                this.pre.addEventListener('paste', this.pasteHandler);
            }

            PreHelper.prototype.unbind = function() {
                this.pre.removeEventListener('keydown', this.keyDownHandler);
                this.pre.removeEventListener('paste', this.pasteHandler);
            }

            return PreHelper;
        })();
		
		

        function triggerEditorEvent(name, editor, element) {
            var wysiwyg = editor.wysiwyg;
            if (editor.embed === true) {
                if (editor.parent && name == 'stop') {
                    editor.parent.notifyEmbedStopped(editor);
                }
                triggerEvent(wysiwyg,'editor.embed.' + name, editor, element);
            } else {
               triggerEvent(wysiwyg,'editor.' + name, editor, element);
            }
        }
		
		function triggerEvent(wysiwyg, name, args) {
            for (var i = 0; i < wysiwyg.eventHandlers.length; i++) {
                var evtHandler = wysiwyg.eventHandlers[i];
                if (evtHandler.name == name) {
                    try {
                        evtHandler.handler.call(wysiwyg, args);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }

        function fileToElement(info) {
            var type = (info.type || 'image').toLowerCase();
            switch (type) {
                case 'image':
                    var img = document.createElement('img');
                    img.setAttribute('alt', info.name);
                    img.setAttribute('src', info.url);
                    return img;
                case 'file':
                    var link = document.createElement('a');
                    link.innerHTML = info.name;
                    link.setAttribute('href', info.url);
                    return link;
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
                    return video;
            }
            return null;
        }

        function insertFileAtElement(info, element) {
            var rangeInfo = getRangeInfo(element);
            insertFileAtRange(info,rangeInfo);
        }
		
		function insertFileAtRange(info, rangeInfo) {
            var range = rangeInfo.range;
            var sel = rangeInfo.sel;
            if (range != null) {
                var fileElement = fileToElement(info);
                if (fileElement != null) {
					if(fileElement.tagName == 'IMG'){
						//add on error callback
						fileElement.onerror = function(){
							this.onerror = null;
							fileElement.classList.add('heather_img_error');
						}
					}
                    range.deleteContents();
                    range.insertNode(fileElement);
                    range.setStartAfter(fileElement);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }
		
		function createInsertFileDialog(rangeInfo){
			if(rangeInfo.range == null){
				return ;
			}
			//TODO add video
			createMenuDialog([{
				'title': '',
				'menus': [{
					html: '<i class="fas fa-link"></i>超链接',
					handler: function(rangeInfo) {
						Swal.fire({
							html: '<label>超链接地址</label><input  class="swal2-input">' +
								'<label>超链接内容</label><input  class="swal2-input">',
							focusConfirm: false,
							preConfirm: (dom) => {
								var inputs = Swal.getContent().querySelectorAll('input');
								return [
									inputs[0].value,
									inputs[1].value
								]
							},
							showCancelButton: true
						}).then((formValues) => {
							formValues = formValues.value;
							if (!formValues) {
								return;
							}
							var src = formValues[0];
							var name = formValues[1];

							if (src.trim() != '') {
								var fileInfo = {type:'file'};
								fileInfo.url = src.trim();
								fileInfo.name = name || fileInfo.url;
								insertFileAtRange(fileInfo,rangeInfo);
							}
						});
					}
				}, {
					html: '<i class="fas fa-paragraph"></i>图片',
					handler: function(rangeInfo) {
						Swal.fire({
							html: '<label>图片地址</label><input  class="swal2-input">' +
								'<label>图片alt</label><input  class="swal2-input">',
							focusConfirm: false,
							preConfirm: (dom) => {
								var inputs = Swal.getContent().querySelectorAll('input');
								return [
									inputs[0].value,
									inputs[1].value
								]
							},
							showCancelButton: true
						}).then((formValues) => {
							formValues = formValues.value;
							if (!formValues) {
								return;
							}
							var src = formValues[0];
							var alt = formValues[1];

							if (src.trim() != '') {
								var fileInfo = {type:'image'};
								fileInfo.url = src.trim();
								fileInfo.name = alt || '';
								insertFileAtRange(fileInfo,rangeInfo);
							}
						});
					}
				}]
			}],rangeInfo)
		}

        function createMenuDialog(menuCards,rangeInfo) {
            var html = '<div class="heather-menu-breadcrums"></div><ul class="heather-menu-card">';
            html += '</ul>';
            var handler;
            var nodes;
			var _menus = {};

            var keydownListener = function(e) {
                if (e.key == 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCard(Swal.getContent().querySelector('.on').previousElementSibling);
                }
				if (e.key == 'Tab') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveNext();
                }
                if (e.key == 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCard(Swal.getContent().querySelector('.on').nextElementSibling);
                }
                if (e.key == 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    movePrev();
                }
                if (e.key == 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveNext();
                }
                if (e.key == 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    Swal.getContent().querySelector('.on').querySelector('.active').click();
                }
            }

            var moveCard = function(next) {
                var card = Swal.getContent().querySelector('.on');
				
                if (next != null) {
					var prevActive = card.querySelector('.active');
					prevActive.classList.remove('active');
					onInActive(prevActive);
					
                    card.classList.remove('on');
                    card.classList.add('off');
                    next.classList.remove('off');
                    next.classList.add('on');
                    activeCrumb(next);
                    //find first li and add class active
                    var active = next.querySelector('.active');
                    if (active == null) {
                        next.firstChild.firstChild.classList.add('active');
						onActive(next.firstChild.firstChild);
                    } else {
						onActive(active);
					}
                }
            }

            var activeCrumb = function(li) {
                var lis = Swal.getContent().querySelector('.heather-menu-card').querySelectorAll(':scope > li');
                var crumbDiv = Swal.getContent().querySelector('.heather-menu-breadcrums');
                var crumbs = crumbDiv.querySelectorAll('span');
                for (var i = 0; i < lis.length; i++) {
                    if (lis[i] == li) {
                        var active = crumbDiv.querySelector('.active');
                        if (active != null) {
                            active.classList.remove('active');
                        }
                        crumbs[i].classList.add('active');
                        break;
                    }
                }
            }

            var moveNext = function() {
                var dom = Swal.getContent().querySelector('.on');
                var active = dom.querySelector('.active');
                var next = active.nextElementSibling;
                if (next == null || next.hasAttribute('data-ignore')) {
                    //move to first;
                    next = dom.querySelector('li');
                }
                while (next != null && next.hasAttribute('data-ignore')) {
                    next = next.nextElementSibling;
                }
                if (next != null) {
                    active.classList.remove('active');
					onInActive(active);
                    next.classList.add('active');
					onActive(next);
                }
            }
			
			
			var onInActive = function(li){
				li.removeAttribute('tabindex');
				var index = parseInt(li.getAttribute('data-index'));
				var menu = _menus[index];
				if(menu.onInActive){
					menu.onInActive(li);
				}
			}
			var onActive = function(li){
				li.setAttribute('tabindex',0);
				li.focus();
				var index = parseInt(li.getAttribute('data-index'));
				var menu = _menus[index];
				if(menu.onActive){
					menu.onActive(li);
				}
			}
            var movePrev = function() {
                var dom = Swal.getContent().querySelector('.on');
                var active = dom.querySelector('.active');
                var prev = active.previousElementSibling;
                if (prev == null || prev.hasAttribute('data-ignore')) {
                    //move to last ;
                    var lis = dom.querySelectorAll('li');
                    prev = lis[lis.length - 1];
                }
                while (prev != null && prev.hasAttribute('data-ignore')) {
                    prev = prev.previousElementSibling;
                }
                if (prev != null) {
                    active.classList.remove('active');
					onInActive(active);
                    prev.classList.add('active');
					onActive(prev);
                }
            }

            Swal({
                animation: false,
                html: html,
                onBeforeOpen: function(dom) {
                    var root = dom.querySelector('.heather-menu-card');
                    var crumbs = [];
					var index = 0;
                    for (const card of menuCards) {
                        var menus = card.menus;
                        var title = card.title;
                        crumbs.push(title);
                        var ul = document.createElement('ul');
                        ul.classList.add('heather-menu-dialog');
                        for (const menu of menus) {
                            if (hasMethod(menu, 'condition')) {
                                if (menu.condition() !== true) {
                                    continue;
                                }
                            }
                            var li = document.createElement('li');
                            li.innerHTML = menu.html;
                            li.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
								if(isInput(e.target)) return ;
                                handler = menu.handler;
                                nodes = this.childNodes;
                                Swal.getCloseButton().click();
                            });

                            ul.appendChild(li);
							_menus[index] = menu;
							li.setAttribute('data-index',index);
							index++;
                        }
                        var li = document.createElement('li');
                        li.classList.add('off');
                        li.appendChild(ul);
                        root.appendChild(li);
                    }

                    var crumbDiv = dom.querySelector('.heather-menu-breadcrums');
                    if (crumbs.length > 0 && crumbs[0] != '') {
                        for (const crumb of crumbs) {
                            var ele = document.createElement('span');
                            ele.innerHTML = crumb;
                            crumbDiv.appendChild(ele);
                        }
                    } else {
                        crumbDiv.style.display = 'none';
                    }
                   
                },
                onOpen: function(dom) {
					
					var root = dom.querySelector('.heather-menu-card');
					 //find first li and add class on
                    var crumbDiv = dom.querySelector('.heather-menu-breadcrums');
					for(const child of crumbDiv.children){
						child.addEventListener('click',function(){
							var nodes = Array.prototype.slice.call(crumbDiv.children);
							var index = nodes.indexOf(child);
							var cards = dom.querySelector('.heather-menu-card').children;
							moveCard(cards[index]);
						})
					}
                    dom.addEventListener('keydown', keydownListener);
                    var first = root.firstElementChild;
                    if (first != null) {
                        first.classList.remove('off');
                        first.classList.add('on');
                        //find first li and add class active
                        var subFirst = first.querySelector('ul').firstElementChild;
                        if (subFirst != null) {
                            subFirst.classList.add('active');
							onActive(subFirst);
                        }
                        var crumb = crumbDiv.firstElementChild;
                        if (crumb != null) {
                            crumb.classList.add('active')
                        }
                    }
                },
                onClose: function(dom) {
                    dom.removeEventListener('keydown', keydownListener);
                },
                onAfterClose: function() {
                    if (handler) handler.call(nodes,rangeInfo);
                }
            });
        }
		
		function isInput(el){
			var tagName = el.tagName;
			if(tagName == 'INPUT' || tagName == 'TEXTAREA' || tagName == 'SELECT'){
				return true;
			}
			return false;
		}

        function showEditorFactoryDialog(callback) {
			var headingKeydownHandler = function(e){
				var key = e.key;
				if(key == '1' || key == '2' || key == '3' || key == '4' || key == '5' || key == '6'){
					e.preventDefault();
					e.stopPropagation();
					this.querySelector('select').value = key;
				}
			}
            createMenuDialog([{
                'title': '',
                'menus': [{
                    html: '<i class="fas fa-heading"></i><select style="border: none;outline: none;font-size:20px;background:none;-webkit-appearance: none; -moz-appearance: none; appearance: none;"><option value="1">H1</option><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option><option value="5">H5</option><option value="6">H6</option></select>',
                    handler: function() {
						for(const node of this){
							if(node.nodeType == 1 && node.tagName == 'SELECT'){
								callback(document.createElement('h'+node.value));
								return ;
							}
						}
                    },
					onActive:function(li){
						li.addEventListener('keydown',headingKeydownHandler);
					},
					onInActive:function(li){
						document.removeEventListener('keydown',headingKeydownHandler);
						
					}
                }, {
                    html: '<i class="fas fa-paragraph"></i>段落',
                    handler: function() {
                        callback(document.createElement('p'))
                    }
                }, {
                    html: '<i class="fas fa-table"></i>表格',
                    handler: function() {
                        var table = document.createElement('table');
                        table.innerHTML = '<tr><th></th><th></th></tr><tr><td></td><td></td></tr>'
                        callback(table);
                    }
                }, {
                    html: '<i class="fas fa-file-code"></i>代码块',
                    handler: function() {
                        callback(document.createElement('pre'))
                    }
                }, {
                    html: '<i class="fas fa-list-ul"></i>列表',
                    handler: function() {
                        var ul = document.createElement('ul');
                        ul.innerHTML = '<li><p></p></li>';
                        callback(ul)
                    }
                }, {
                    html: '<i class="fas fa-list"></i>任务列表',
                    handler: function() {
                        var ul = document.createElement('ul');
                        ul.classList.add('contains-task-list');
                        ul.innerHTML = '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" type="checkbox"></li>';
                        callback(ul)
                    }
                }, {
                    html: '<i class="fas fa-quote-left"></i>引用',
                    handler: function() {
                        callback(document.createElement('blockquote'))
                    }
                }, {
                    html: '<i class="fas">--</i>分割线',
                    handler: function() {
                        callback(document.createElement('hr'))
                    }
                }, {
                    html: '<i class="fas fa-square-root-alt"></i>数学公式块',
                    handler: function() {
                        var span = document.createElement('span');
                        span.setAttribute('data-block-katex', '');
                        span.classList.add('katex-display');
                        span.innerHTML = '<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>e</mi><mi>d</mi><mi>i</mi><mi>t</mi><mi>m</mi><mi>e</mi></mrow><annotation encoding="application/x-tex"></annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.69444em;vertical-align:0em;"></span><span class="mord mathdefault">e</span><span class="mord mathdefault">d</span><span class="mord mathdefault">i</span><span class="mord mathdefault">t</span><span class="mord mathdefault">m</span><span class="mord mathdefault">e</span></span></span></span>';
                        callback(span)
                    }
                }, {
                    html: '<i class="fas">M</i>mermaid图表',
                    handler: function() {
                        var element = createUnparsedMermaidElement("graph TD\nA --> B\n");
                        element.querySelector('.mermaid-source').value = '';
                        callback(element)
                    }
                }]
            }])
        }

        function createInlineMathSession(wysiwyg, element) {
            return wysiwyg.inlineMath.createSession(element)
        }

		
        function getEditorFactoryByElement(element) {
            for (const factory of editorFactories) {
                if (factory.match(element))
                    return factory;
            }
        }


        function getCoords(range) {
            var box = range.getBoundingClientRect();
            range = range.cloneRange();
            var rects, rect, left, top;
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
                    if (rect) {
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
                height: Math.round(box.height),
                width: Math.round(box.width)
            };
        }

        return {
            create: function(rootElem,config) {
                return new Wysiwyg(rootElem,config);
            },
            DocumentCommandHelper: DocumentCommandHelper,
            HtmlPasteHelper: HtmlPasteHelper,
            commands: commands,
            runBlockCommand: runBlockCommand,
            runInlineCommand: runInlineCommand,
            ContenteditableBar: {
                defaultBarElements: ContenteditableBar.defaultBarElements
            }
        }
    })();



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


    function cleanHtml(html) {
        return html.replaceAll(veryThinChar, '');
    }

    function getRangeInfo(element) {
        var sel = window.getSelection();
        var rst = {
            sel: sel,
            range: null
        };
        if (sel.rangeCount > 0) {
            var range = sel.getRangeAt(0);
            var node = range.commonAncestorContainer;

            if (element.contains(node)) {
                rst.range = range;
            }
        }
        return rst;
    }

    var plainPasteHandler = function(e) {
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    var katexLoading = false;
    var katexLoaded = false;

    function loadKatex(callback) {
        if (katexLoaded) {
            if (callback) callback();
            return;
        }
        if (katexLoading) return;
        katexLoading = true;
        $('<link>').appendTo('head').attr({
            type: 'text/css',
            rel: 'stylesheet',
            href: lazyRes.katex_css
        });
        $('<script>').appendTo('body').attr({
            src: lazyRes.katex_js
        });
        var t = setInterval(function() {
            try {
                var html = katex.renderToString("", {
                    throwOnError: false
                })
                clearInterval(t);
                katexLoaded = true;
                if (callback) callback();
            } catch (__) {

            }
        }, 20)
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
        $('<script>').appendTo('body').attr({
            src: lazyRes.mermaid_js
        });
        var t = setInterval(function() {
            try {
                mermaid.initialize({
                    theme: 'default'
                });
                clearInterval(t);
                mermaidLoaded = true;
                if (callback) callback();
            } catch (__) {}
        }, 20)
    }



    function cloneAttributes(element, sourceNode, filter) {
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

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    function isUndefined(o) {
        return (typeof o == 'undefined')
    }

    function getDefault(o, dft) {
        return isUndefined(o) ? dft : o;
    }

    function parseHTML(html) {
        return new DOMParser().parseFromString(html, "text/html");
    }
	
    function isEmptyText(text) {
        return text.replaceAll(veryThinChar, '').replaceAll('&nbsp;', '').replaceAll('<br>', '').trim() == ''
    }

    function toast(title, type, timer) {
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

    function createUnparsedMermaidElement(expression) {
        var div = document.createElement('div');
        div.classList.add('mermaid-block');
        div.innerHTML = '<div class="mermaid"></div><textarea class="mermaid-source" style="display:none !important">' + expression + '</textarea>';
        div.querySelector('.mermaid').innerHTML = expression;
        return div;
    }

    function wrapToParagraph(node, checkbox) {
        node.normalize();
        var array = [];
        //wrap inline|text nodes to paragraph
        var childNodes = node.childNodes;
        if (childNodes.length > 0) {
            for (var i = 0; i < childNodes.length; i++) {
                var childNode = childNodes[i];
                if (childNode == checkbox) {
                    continue;
                }
                if (childNode.nodeType == 1) {
                    if (childNode.blockDefault()) {
                        break;
                    }
                    //detech is katex display
                    if (childNode.hasAttribute('data-block-katex')) {
                        break;
                    }
                    array.push(childNode);
                } else {
                    array.push(childNode);
                }
            }
        }
        if (array.length > 0) {
            var paragraph = document.createElement('p');
            $(array[array.length - 1]).after(paragraph);
            for (var i = 0; i < array.length; i++) {
                paragraph.appendChild(array[i].cloneNode(true));
                array[i].remove();
            }
        }
    }

    function getCheckbox(li) {
        var firstChild = li.childNodes[0];
        if (firstChild == null) {
            return null;
        }
        if (firstChild.nodeType != 1) {
            if (firstChild.nodeType == 3) {
                //get next element if exists
                var elem = firstChild;
                var removes = [];
                while (elem != null) {
                    if (elem.nodeType == 1) {
                        break;
                    }
                    if (elem.nodeValue.trim() != '') {
                        return null;
                    }
                    removes.push(elem);
                    elem = elem.nextSibling;
                }
                for (var i = 0; i < removes.length; i++) {
                    removes[i].remove();
                }
                if (elem == null) {
                    return null;
                }
                firstChild = elem;
            }
        }
        if (firstChild.type == 'checkbox') {
            return firstChild;
        }
        if (firstChild != null && firstChild.nodeType == 1 && firstChild.tagName == 'P') {
            var firstChildFirstChild = firstChild.firstChild;
            if (firstChildFirstChild != null && firstChildFirstChild.nodeType == 1 &&
                firstChildFirstChild.type == 'checkbox') {
                //move checkbox to first	
                var clone = firstChildFirstChild.cloneNode(true);
                $(li).prepend(clone);
                firstChildFirstChild.remove();
                return clone;
            }
        }
        return null;
    }

    function hasMethod(o, pro) {
        return typeof o[pro] === 'function';
    }

    function renderKatexAndMermaid(element) {
		
        loadKatex(function() {
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
				block.outerHTML = child.outerHTML;
			}
		})
		loadMermaid(function() {
			$(element).find('.mermaid').each(function() {
				if (!this.hasAttribute("data-processed")) {
					try {
						mermaid.parse(this.textContent);
						mermaid.init({}, $(this));
					} catch (e) {
						this.innerHTML = '<pre>' + e.str + '</pre>'
					}
				}
			});
		});
       
    }

////https://gist.github.com/gordonbrander/2230317
	function createUniqueId(){
		return '_' + Math.random().toString(36).substr(2, 9);
	}

    function deleteStartWhiteSpace(str, count) {
        var rst = str;
        for (var i = 0; i < count; i++) {
            if (rst.startsWith(" ")) {
                rst = rst.substring(1);
            } else {
				if(rst.startsWith(tabSpace)){
					return rst.substring(1);
				}
                return rst;
            }
        }
        return rst;
    }
	
	function getKatexExpression(elem) {
		return elem.querySelector('[encoding="application/x-tex"]').textContent;
	}

	function getMermaidExpression(elem) {
		return elem.querySelector('.mermaid-source').value;
	}
	function morphdomUpdate(target,source){
		var elem = morphdom(target, source, {
			onBeforeElUpdated: function(f, t) {
				if (f.isEqualNode(t)) {
					return false;
				}
				if (f.classList.contains('mermaid-block') &&
					t.classList.contains('mermaid-block')) {
					var oldEle = f.getElementsByClassName('mermaid-source')[0];
					var nowEle = t.getElementsByClassName('mermaid-source')[0];
					if (isUndefined(oldEle) || isUndefined(nowEle)) {
						return true;
					}
					var old = oldEle.value;
					var now = nowEle.value;
					if (old == now) {
						//更新属性
						cloneAttributes(f, t);
						return false;
					}
				}
				return true;
			}
		});
		renderKatexAndMermaid(elem);
		$(elem).find('img').one('error',function(){
			this.classList.add('heather_img_error');
		})
		return elem;
	}

   return Wysiwyg;
})();