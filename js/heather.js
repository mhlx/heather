var Heather = (function() {
    var keyNames = CodeMirror.keyNames;
    var mac = CodeMirror.browser.mac;
    var mobile = CodeMirror.browser.mobile;
    var ios = CodeMirror.browser.ios;
    var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    var headings = ['# ', '## ', '### ', '#### ', '#### ', '##### ', '###### '];
    var headingNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']
    var veryThinHtml = '&#8203;';
    var veryThinChar = '​';
    var tabSpace = "	";
	
	Node.prototype.blockDefault = function(){
		return this.nodeType == 1 && "block" == window.getComputedStyle(this, "").display;
	}

    var plainPasteHandler = function(e) {
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        e.preventDefault();
        return false;
    }

    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

    CodeMirror.prototype.unfocus = function() {
        this.getInputField().blur();
    }

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";

    CodeMirror.commands['emoji'] = function(editor) {
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
    };

    CodeMirror.commands['md_bold'] = function(editor) {
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
    }

    CodeMirror.commands['md_italic'] = function(editor) {
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
    }

    CodeMirror.commands['md_strikethrough'] = function(editor) {
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
    }

    CodeMirror.commands['md_link'] = function(editor) {
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
    }

    CodeMirror.commands['md_code'] = function(editor) {
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
    }

    var markdownParser = createMarkdownParser({
        html: true,
        plugins: ['footnote', 'katex', 'mermaid', 'anchor', 'task-lists', 'sup', 'sub', 'abbr'],
        lineNumber: false,
        highlight: function(str, lang) {
            if (lang == 'mermaid') {
                return '<div class="mermaid">' + str + '</div>';
            }
        },
        math_inline_enable: false //disable math_inline mode
    });

  var turndownService = (function(){
		var turndownService = new window.TurndownService({
			'headingStyle': 'atx',
			'codeBlockStyle': 'fenced',
			'emDelimiter': '*',
			'bulletListMarker': '-',
			defaultReplacement: function(innerHTML, node) {
				return node.blockDefault() ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML
			}
		});
		var alignMap = {
			'': ' -- ',
			'left': ' :-- ',
			'center': ' :--: ',
			'right': ' --: '
		}


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
				return '\n\n' + options.fence + language + '\n' + textContent + lineBreaker + options.fence + '\n\n';
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
					return '<pre>' + node.outerHTML + 'is not a valid UL|OL</pre>';
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
							outerHTML = '<p>' + subChild.nodeValue + '</p>';
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
	})();

    function parseHTML(html) {
        return new DOMParser().parseFromString(html, "text/html");
    }

    function isUndefined(o) {
        return (typeof o == 'undefined')
    }

    function _Heather() {
        this.selectionChangeListeners = [];
        this.markdownParser = createMarkdownParser({
            html: true,
            plugins: ['footnote', 'katex', 'mermaid', 'anchor', 'task-lists', 'sup', 'sub', 'abbr'],
            lineNumber: true,
            highlight: function(str, lang) {
                if (lang == 'mermaid') {
                    return '<div class="mermaid">' + str + '</div>';
                }
            }
        });
        var me = this;
        var timer;
        //TODO delete selection not trigger this event (chrome only ??)
        $(document).on('selectionchange', function(e) {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(function() {
                for (var i = 0; i < me.selectionChangeListeners.length; i++) {
                    try {
                        me.selectionChangeListeners[i].call()
                    } catch (e) {
                        console.log(e)
                    };
                }
            }, 200)

        });
    }

    _Heather.prototype.create = function(container, config) {
        return new Heather(container, config)
    }

    _Heather.prototype.loadMermaid = function(callback) {
        if (this.mermaidLoading) {
            return;
        };
        if (this.mermaidLoaded && callback) {
            callback(false);
            return;
        }
        this.mermaidLoading = true;
        var me = this;
        $('<script>').appendTo('body').attr({
            src: this.mermaid_js || 'js/mermaid.min.js',
            onload: function() {
                var t = setInterval(function() {
                    try {
                        mermaid.initialize({});
                        clearInterval(t);
                        me.mermaidLoaded = true;
                        delete me.mermaidLoading;
                        if (callback) callback(true);
                    } catch (e) {
                        if (this.mermaidLoaded) {
                            console.log(e);
                        }
                    }
                }, 20);
            }
        });
    }

    //TODO miss lines ?
    _Heather.prototype.markdownToBlocks = function(markdown) {
        var blocks = [];
        var lines = markdown.split('\n');
        var doc = parseHTML(this.markdownParser.render(markdown)).body;
        var elems = doc.querySelectorAll('[data-line]');
        var prevStartLine = 0;
        for (var i = 0; i < elems.length; i++) {
            var elem = elems[i];
            var startLine = parseInt(elem.getAttribute('data-line'));
            var endLine = parseInt(elem.getAttribute('data-end-line')) - 1;
            var block = '';
            for (var j = startLine; j <= endLine; j++) {
                block += lines[j];
                if (j < endLine) {
                    block += '\n';
                }
            }
            blocks.push({
                html: elem.getAttribute('data-html') != null,
                block: block
            });
        }
        return blocks;
    }

    _Heather.prototype.loadKatex = function(callback) {
        if (this.katexLoading) return;
        if (this.katexLoaded) return;
        this.katexLoading = true;
        var me = this;
        $('<link>').appendTo('head').attr({
            type: 'text/css',
            rel: 'stylesheet',
            href: this.katex_css || 'katex/katex.min.css'
        });
        $('<script>').appendTo('body').attr({
            src: this.katex_js || 'katex/katex.min.js',
            onload: function() {
                var t = setInterval(function() {
                    try {
                        var html = katex.renderToString("", {
                            throwOnError: false
                        })
                        clearInterval(t);
                        me.katexLoaded = true;
                        delete me.katexLoading;
                        if (callback) {
                            callback();
                        }
                    } catch (e) {
                        if (me.katexLoaded) {
                            console.log(e);
                        }
                    }
                }, 20)
            }
        });

    }

    var _heather = new _Heather();

    function registerSelectionChangeListener(selectionChangeListener) {
        _heather.selectionChangeListeners.push(selectionChangeListener);
    }

    function unregisterSelectionChangeListener(selectionChangeListener) {
        var listeners = _heather.selectionChangeListeners;
        for (var i = 0; i < listeners.length; i++) {
            if (listeners[i] == selectionChangeListener) {
                listeners.splice(i, 1);
                break;
            }
        }
    }

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

            return {
                create: function(file, range, config) {
                    return new FileUpload(file, range, config);
                }
            }
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
                        var upload = FileUpload.create(rst.value, range, me.config);
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

        return {
            create: function(element, config) {
                return new FileUploadMgr(element, config);
            }
        }
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
                if (mobile) {
                    i.addEventListener('touchstart', function(e) {
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                        handler(i);
                    })
                } else {
                    i.addEventListener('mousedown', function(e) {
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                        handler(i);
                    })
                }
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

        return {
            create: function(element) {
                return new Bar(element);
            }
        };
    })();

    var MediaHelper = (function() {

        var mediaElementProcessors = [];

        function MediaHelper(element, config) {
            this.element = element
            this.config = config;
            start(this);
        }

        MediaHelper.prototype.remove = function() {
            this.element.removeEventListener('click', this.clickHandler);
            this.observer.disconnect();
        }

        function start(helper) {
            var config = helper.config;
            var element = helper.element;
            var clickHandler = function(e) {
                var sel = window.getSelection();
                var range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                if (range == null) return;
                var target = range.commonAncestorContainer;
                var mediaElement;
                while (target != null) {
                    if (isProcessableNode(target)) {
                        mediaElement = target;
                        break;
                    }
                    if (target == element) {
                        break;
                    }
                    target = target.parentElement;
                }
                if (mediaElement) {
                    processMediaElement(mediaElement, config);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            makeVideoFocusable(element);
            var observer = new MutationObserver(function(mutations, observer) {
                makeVideoFocusable(element);
            });
            observer.observe(element, {
                childList: true
            });

            element.addEventListener('click', clickHandler);
            helper.clickHandler = clickHandler;
            helper.observer = observer;
        }

        mediaElementProcessors['img'] = function(element, config) {
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
                }
            }).then((formValues) => {
                formValues = formValues.value;
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

        function processMediaElement(mediaElement, config) {
            var processor = mediaElementProcessors[mediaElement.tagName.toLowerCase()];
            processor(mediaElement, config);
        }

        function isProcessableNode(node) {
            if (node.nodeType != 1) return false;
            return !isUndefined(mediaElementProcessors[node.tagName.toLowerCase()]);
        }

        return {
            create: function(element, config) {
                return new MediaHelper(element, config);
            }
        }
    })();

    var Toolbar = (function() {

        function Toolbar() {
            var toolbar = document.createElement('div');
            toolbar.classList.add('heather_bar');
            document.body.appendChild(toolbar);
            this.bar = Bar.create(toolbar);
            var me = this;
            this.hideHandler = function(evt) {
                me.bar.hide();
            };
            this.cursorActivityHandler = function(editor) {
                editor.scrollIntoView({
                    line: editor.getCursor().line
                });
                var lh = editor.defaultTextHeight();
                if (editor.cursorCoords(true).top - $(window).scrollTop() > me.bar.height() + 2 * lh) {
                    me.bar.element.css({
                        "top": (editor.cursorCoords(true).top - me.bar.height() - lh) + "px",
                    });
                } else {
                    me.bar.element.css({
                        "top": (editor.cursorCoords(true).top + lh) + "px",
                    });
                }

                me.bar.show();
            }
        }

        Toolbar.prototype.unbind = function() {
            if (this.editor) {
                this.bar.clear();
                this.bar.hide();
                this.editor.off('cursorActivity', this.cursorActivityHandler);
                this.editor.getScrollerElement().removeEventListener('touchmove', this.hideHandler);
                this.editor.off('scroll', this.hideHandler);
                this.editor = undefined;
            }
        }

        Toolbar.prototype.hide = function() {
            this.bar.hide();
        }

        Toolbar.prototype.bind = function(editor) {
            this.unbind();
            var bar = this.bar;
            bar.clear();
            bar.hide();
            bar.addIcon('far fa-grin-alt heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('emoji');
                })
            });

            bar.addIcon('fas fa-bold heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('md_bold');
                })
            })

            bar.addIcon('fas fa-italic heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('md_italic');
                })
            })

            bar.addIcon('fas fa-strikethrough heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('md_strikethrough');
                })
            })


            bar.addIcon('fas fa-link heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('md_link');
                })
            })

            bar.addIcon('fas fa-code heather_middle_icon', undefined, function(ele) {
                ele.addEventListener('click', function() {
                    editor.execCommand('md_code');
                })
            })

            editor.on('cursorActivity', this.cursorActivityHandler);
            editor.getScrollerElement().addEventListener('touchmove', this.hideHandler);
            editor.on('scroll', this.hideHandler);

            this.editor = editor;
        }

        return new Toolbar();

    })();

    function Heather(container, config) {
        var me = this;
        config = config || {};

        container.innerHTML = '';
        var display = document.createElement('div');
        display.setAttribute('id', 'heather_display');
        container.append(display);

        var editor = document.createElement('p');
        editor.setAttribute('contenteditable', 'true');
        editor.classList.add('heather_default_editor');
        container.append(editor);


        var fileUploadMgr = FileUploadMgr.create(editor, config);

        var toolbarElement = document.createElement('div');
        editor.before(toolbarElement);
        toolbar = Bar.create(toolbarElement);

        editor.addEventListener('paste', plainPasteHandler);

        toolbar.addIcon('fas fa-upload heather_middle_icon', function() {
            fileUploadMgr.upload();
        });

        toolbar.addIcon('fas fa-bars heather_middle_icon', function() {
            showEditorFactoryDialog(function(factory) {
                var element = factory.createElement();
                $(display).append(element);
                edit(element, me, false);
            })
        });

        toolbar.addIcon('fas fa-check heather_middle_icon', function() {
            fileUploadMgr.stopUpload();
            var p = document.createElement('p');
            p.innerHTML = editor.innerHTML;
            if (p.innerHTML.replaceAll('&nbsp;', '').replaceAll('<br>', '').trim() == '') {
                return;
            }
            divToBr($(p));
            p.innerHTML = cleanHtml(p.innerHTML);
            var markdown = turndownService.turndown(p.outerHTML);
            var div = createEditableElement(markdown, false);
            $(display).append(div);
            editor.innerHTML = '';
            $('.heather_block_item_container').remove();
        });

        editor.addEventListener('focus', function() {
            me.stopEdit();
        });

        var clickEditableHandler = function(e) {
            var editableElement;
            var ele = e.target;
            if (ele.classList.contains('heather_display')) {
                editableElement = ele;
            } else {
                var parent = ele.parentElement;
                while (parent != null) {
                    if (parent.classList.contains('heather_display')) {
                        editableElement = parent;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            if (editableElement)
                edit(editableElement, me, false, undefined, ele);
        }

        $(display).on('click', '.heather_display', clickEditableHandler)

        //TODO
        var bar = document.createElement('div');
        bar.setAttribute('style', 'position:sticky;top:0px;visibility:visible;z-index:999');
        $(display).before(bar);
        bar = Bar.create(bar);

        bar.addIcon('fas fa-trash heather_middle_icon', function() {
            Swal.fire({
                title: '确定要清空吗',
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33'
            }).then((result) => {
                if (result.value) {
                    me.clear();
                }
            })
        });

        bar.addIcon('fas fa-align-justify heather_middle_icon', function() {

            $(display).off('click', '.heather_display', clickEditableHandler);
            var heatherDisplays = $(display).find('.heather_display');
            if (heatherDisplays.length > 0 && !$(display).hasClass('heather_opacity-5')) {
                me.stopEdit();
                Toolbar.hide();
                $(display).addClass('heather_opacity-5');
                for (var i = 0; i < heatherDisplays.length; i++) {
                    var heatherDisplay = heatherDisplays[i];
                    var p = document.createElement('div');
                    p.classList.add('heather_p');
                    p.innerHTML = '<i class="fas fa-plus heather_middle_icon"></i>';
                    p.querySelector('i').addEventListener('click', function() {
                        var i = this;
                        showEditorFactoryDialog(function(factory) {
                            var element = factory.createElement();
                            var p = i.parentElement;
                            p.after(element);
                            edit(element, me, false);
                            $(display).removeClass('heather_opacity-5');
                            $('.heather_p').remove();
                            $(display).on('click', '.heather_display', clickEditableHandler)
                        })
                    });
                    heatherDisplay.before(p);
                }
            } else {
                $(display).removeClass('heather_opacity-5');
                $('.heather_p').remove();
                $(display).on('click', '.heather_display', clickEditableHandler);
            }
        });

        this.md = md;
        this.display = display;
        this.state = {};
        this.config = config;
        this.editor = editor;
        this.bar = bar;
        this.eventHandlers = [];
        this.editor = editor;
        this.toolbar = toolbar; //TODO remove
        this.fileUploadMgr = fileUploadMgr; //TODO remove
        this.contenteditableBar = ContenteditableBar.create(editor); //TODO remove


        //TODO used for test 
        var current = localStorage.getItem('heather2-demo');
        if (current != null) {
            me.loadMarkdown(current);
        }
        var eventName = ios ? "pagehide" : "beforeunload";
        window.addEventListener(eventName, function(event) {
            me.stopEdit();
            me.save();
        });
    }


    //used for test TODO
    Heather.prototype.save = function() {
        localStorage.setItem('heather2-demo', this.getMarkdown());
    }


    Heather.prototype.getMarkdown = function() {
        var sources = this.display.querySelectorAll('.heather_display_source');
        var blocks = [];
        $.each(sources, function() {
            blocks.push(templateToMarkdown(this.innerHTML));
        })
        var markdown = '';
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            if (block.trim() == '') continue;
            var newLineSize = 2;
            if (block.endsWith('\n')) {
                newLineSize--;
            }
            if (block.startsWith('\n')) {
                newLineSize--;
            }
            var newLine = newLineSize == 2 ? '\n\n' : newLineSize == 1 ? '\n' : '';
            markdown += block;
            if (i < blocks.length - 1) {
                markdown += newLine;
            }
        }
        return markdown;
    }

    Heather.prototype.getHtml = function() {
        return render(this.getMarkdown());
    }

    Heather.prototype.clear = function() {
        this.stopEdit();
        this.display.innerHTML = '';
        this.editor.innerHTML = '';
    }

    Heather.prototype.stopEdit = function() {
        var currentEditors = this.currentEditors || [];
        for (var i = currentEditors.length - 1; i >= 0; i--) {
            try {
                if (currentEditors[i].startEditAfterEnd == true) {
                    delete currentEditors[i].startEditAfterEnd;
                }
                currentEditors[i].stopEdit();
            } catch (e) {
                console.log(e)
            };
            currentEditors.splice(i, 1);
        }
    }

    Heather.prototype.loadMarkdown = function(markdown) {
        this.clear();
        var blocks = _heather.markdownToBlocks(markdown);
        var me = this;
        renderBlocks(this, blocks, function(html) {
            $(me.display).html(html)
            renderHtml($(me.display));
        });
    }

    function triggerEvent(heather, name, args) {
        for (var i = 0; i < heather.eventHandlers.length; i++) {
            var handler = heather.eventHandlers[i];
            try {
                if (!isUndefined(handler[name]))
                    handler[name].call(this, args);
            } catch (e) {
                console.log(e)
            };
        }
    }

    function renderBlocks(heather, blocks, callback) {
        var html = '';
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            var div = createEditableElement(block.block, block.html);
            html += div.outerHTML;
        }
        if (callback) {
            callback(html);
        }
    }

    function render(markdown) {
        return new DOMParser().parseFromString(markdownParser.render(markdown), "text/html").body.innerHTML;
    }

    function renderHtml(block) {
        //highlight code
        block.find('pre code').each(function() {
            var language = this.getAttribute('class');
            if (language && language.startsWith("language-")) {
                var lang = language.split('-')[1];
                if (hljs.getLanguage(lang)) {
                    this.innerHTML = hljs.highlight(lang, this.textContent, true).value;
                }
            }
        });
        //render mermaid
        var hasMermaid = block[0].querySelector('.mermaid') != null;
        if (hasMermaid) {
            _heather.loadMermaid(function(status) {
                block.find('.mermaid').each(function() {
                    if (this.getAttribute("data-processed") == null) {
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
        //render katex || only once
        var hasKatex = block[0].querySelector('.katex') != null;
        if (hasKatex) {
            _heather.loadKatex(function() {
                block.find('.katex').each(function() {
                    var displayMode = this.tagName != 'SPAN';
                    try {
                        this.innerHTML = katex.renderToString(this.textContent, {
                            throwOnError: false,
                            displayMode: displayMode
                        });
                    } catch (e) {
                        console.log(e);
                    }
                });
            });
        }
    }


    function edit(element, heather, forceSource, callback, ele) {
        if (element.getAttribute('data-on-edit') != null) {
            return;
        }

        heather.stopEdit();

        var editor;
        if (forceSource) {
            editor = SourceEditor.create(element, heather);
        } else {
            if (element.getAttribute("data-html") === 'true') {
                editor = SourceEditor.create(element, heather);
            } else {
                var children = $(element).children().not(".heather_display_source");
                if (children.length == 0) {
                    editor = ParagraphEditor.create(element, heather);
                }
                if (children.length == 1) {
                    var child = children[0];
                    var factory = EditorFactory.getFactory(child);
                    if (factory != null) {
                        editor = factory.create(element, heather)
                    }
                }
            }
            if (!editor)
                editor = SourceEditor.create(element, heather);
        }
        if (callback) callback(editor);
        $('.heather_block_item_container').remove();
        element.setAttribute("data-on-edit", true);
        var currentEditors = heather.currentEditors || [];
        currentEditors.push(editor);
        heather.currentEditors = currentEditors;
        Toolbar.bar.keepHidden = true;
        Toolbar.hide();
        triggerEvent(heather, 'beforeStartEdit');
        var index = $(element).index();
        editor.startEdit(ele);
        editor.onEndEdit(function() {
            $('.heather_block_item_container').remove();
            element.removeAttribute('data-on-edit');
            if (!element.classList.contains('markdown-body')) {
                element.classList.add('markdown-body');
            }
            Toolbar.bar.keepHidden = false;
            var currentEditors = heather.currentEditors || [];
            for (var i = currentEditors.length - 1; i >= 0; i--) {
                if (currentEditors[i] == editor) {
                    currentEditors.splice(i, 1);
                }
            }
            triggerEvent(heather, 'afterEdit');
        });
    }

    function createEditableElement(markdown, hasHtml) {
        var div = document.createElement('div');
        div.innerHTML = render(markdown);
        div.classList.add('markdown-body');
        div.classList.add('heather_display');
        div.setAttribute('data-html', (hasHtml !== false));
        var textarea = createSourceElement(markdown);
        div.appendChild(textarea);
        return div;
    }

    function createSourceElement(source) {
        var template = document.createElement('template');
        template.classList.add('heather_display_source');
        template.innerHTML = source;
        return template;
    }

    var ContenteditableBar = (function() {

        function ContenteditableBar(element) {
            var me = this;
            this.composing = false;
            var bar = document.createElement('div');
            bar.setAttribute('class', 'heather_contenteditable_bar');
            document.body.appendChild(bar);
            bar = Bar.create(bar);
            var clazz = "heather_status_on";
            bar.addIcon('fas fa-bold heather_middle_icon', function(ele) {
                document.execCommand('bold');
                document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
            }, function(ele) {
                me.boldBtn = ele;
            });
            bar.addIcon('fas fa-italic heather_middle_icon', function(ele) {
                document.execCommand('italic');
                document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
            }, function(ele) {
                me.italicBtn = ele;
            });
            bar.addIcon('fas fa-strikethrough heather_middle_icon', function(ele) {
                document.execCommand('strikeThrough');
                document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
            }, function(ele) {
                me.strikeThroughBtn = ele;
            });
            bar.addIcon('fas fa-code heather_middle_icon', function() {
                var selection = window.getSelection().toString();
                if (selection.length > 0) {
                    document.execCommand("insertHTML", false, '<code>' + selection + '</code>');
                }
            });
            bar.addIcon('fas fa-link heather_middle_icon', function(ele) {
				var sel = window.getSelection();
				if(sel.rangeCount == 0){
					return ;
				}
				var range = sel.getRangeAt(0);
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
            }, function(ele) {
                me.linkBtn = ele;
            });
            bar.addIcon('fas fa-eraser heather_middle_icon', function(ele) {
                document.execCommand('removeFormat');
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
				if(sel.rangeCount == 0){
					return ;
				}
                var elem = sel.getRangeAt(0);
                var container = elem.commonAncestorContainer
                var node = container;
                while (node != null) {
                    if (node == element) {
                        if (me.composing == false && sel.type == 'Range') {
                            posContenteditableBar(bar, element);
                        } else {
                            bar.hide();
                        }
                        document.queryCommandState('bold') ? me.boldBtn.classList.add(clazz) : me.boldBtn.classList.remove(clazz);
                        document.queryCommandState('italic') ? me.italicBtn.classList.add(clazz) : me.italicBtn.classList.remove(clazz);
                        document.queryCommandState('strikeThrough') ? me.strikeThroughBtn.classList.add(clazz) : me.strikeThroughBtn.classList.remove(clazz);
                        return;
                    }
                    node = node.parentElement;
                }

                bar.hide();
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

        function posContenteditableBar(bar, element) {
			var sel = window.getSelection();
			if(sel.rangeCount == 0){
				bar.hide();return ;
			}
            var elem = sel.getRangeAt(0);
            var coords = getCoords(elem);
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

        function getCoords(elem) {
            var box = elem.getBoundingClientRect();
            var body = document.body;
            var docEl = document.documentElement;
            var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
            var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;
            var clientTop = docEl.clientTop || body.clientTop || 0;
            var clientLeft = docEl.clientLeft || body.clientLeft || 0;
            var top = box.top + scrollTop - clientTop;
            var left = box.left + scrollLeft - clientLeft;
            return {
                top: Math.round(top),
                left: Math.round(left),
                height: Math.round(box.height)
            };
        }

        return {
            create: function(element) {
                return new ContenteditableBar(element);
            }
        }
    })();

    var EditorFactory = (function() {
        function getFactory(element) {
            switch (element.tagName) {
                case 'H1':
                case 'H2':
                case 'H3':
                case 'H4':
                case 'H5':
                case 'H6':
                    return HeadingEditor;
                case "PRE":
                    return PreEditor;
                case "BLOCKQUOTE":
                    return BlockquoteEditor;
                case "P":
                    return ParagraphEditor;
                case "UL":
                case "OL":
                    return ListEditor;
                case "TABLE":
                    return TableEditor;
                case "HR":
                    return HREditor;
            }
            return null;
        }

        return {
            getFactory: function(element) {
                return getFactory(element);
            }
        }
    })();

    var TableEditor = (function() {

        var EmbedEditor = (function() {
            function EmbedEditor(element, config) {
                this.element = element;
                this.config = config;
                this.endHandlers = [];
            }

            EmbedEditor.prototype.start = function(_target) {
                var me = this;
                this.element.classList.add("heather_edit_table");
                var editTd = function(td) {
                    if (td != null) {
                        if (!td.isContentEditable) {
                            if (me.contenteditableBar) {
                                me.contenteditableBar.remove();
                            }
                            if (me.fileUploadMgr) {
                                me.fileUploadMgr.remove();
                            }
                            if (me.mediaHelper) {
                                me.mediaHelper.remove();
                            }
                            $(me.element).find('[contenteditable]').each(function() {
                                this.removeEventListener('paste', plainPasteHandler);
                                this.removeAttribute('contenteditable');
                            });
                            td.addEventListener('paste', plainPasteHandler);
                            td.setAttribute('contenteditable', true);
                            me.contenteditableBar = ContenteditableBar.create(td);
                            me.fileUploadMgr = FileUploadMgr.create(td, me.config);
                            me.mediaHelper = MediaHelper.create(td, me.config);
                            td.focus();
                        }
                        me.td = td;
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
                toolbar = Bar.create(toolbar);
                toolbar.addIcon('fas fa-trash heather_middle_icon', function() {
                    Swal.fire({
                        title: '确定要删除表格?',
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
                toolbar.addIcon('fas fa-plus heather_middle_icon', function() {
                    if (!me.td) {
                        return;
                    }
                    var td = $(me.td);
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
                        addCol(table, td, true);
                        Swal.close();
                    });
                    buttons.eq(1).click(function() {
                        addCol(table, td, false);
                        Swal.close();
                    });
                    buttons.eq(2).click(function() {
                        addRow(table, td, false);
                        Swal.close();
                    });
                    buttons.eq(3).click(function() {
                        addRow(table, td, true);
                        Swal.close();
                    });
                });
                toolbar.addIcon('fas fa-minus heather_middle_icon', function() {
                    if (!me.td) {
                        return;
                    }
                    var td = $(me.td);
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
                        deleteRow(table, td);
                        Swal.close();
                    });
                    buttons.eq(1).click(function() {
                        deleteCol(table, td);
                        Swal.close();
                    });
                });
                toolbar.addIcon('fas fa-align-left heather_middle_icon', function() {
                    if (!me.td) {
                        return;
                    }
                    doAlign(table, $(me.td), 'left')
                });
                toolbar.addIcon('fas fa-align-center heather_middle_icon', function() {
                    if (!me.td) {
                        return;
                    }
                    doAlign(table, $(me.td), 'center')
                });

                toolbar.addIcon('fas fa-align-right heather_middle_icon', function() {
                    if (!me.td) {
                        return;
                    }
                    doAlign(table, $(me.td), 'right')
                });

                toolbar.addIcon('fas fa-upload heather_middle_icon', function() {
                    if (me.fileUploadMgr) {
                        me.fileUploadMgr.upload();
                    }
                });

                toolbar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });
                this.toolbar = toolbar;
                this.tdHandler = tdHandler;
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.toolbar.remove();
                var ele = $(this.element);
                ele.off('click', 'th,td', this.tdHandler);
                ele.find('[contenteditable]').each(function() {
                    this.removeEventListener('paste', plainPasteHandler);
                    this.removeAttribute('contenteditable');
                });
                ele.removeAttr("class");
                if (this.contenteditableBar) {
                    this.contenteditableBar.remove();
                }
                if (this.fileUploadMgr) {
                    this.fileUploadMgr.remove();
                }
                if (this.mediaHelper) {
                    this.mediaHelper.remove();
                }
                triggerStopEdit(this);
            }


            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler);
            }

            EmbedEditor.prototype.focus = function(handler) {

            }

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
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

            return {
                create: function(element, config) {
                    return new EmbedEditor(element, config);
                }
            }
        })();


        function TableEditor(element, heather) {
            this.endHandlers = [];
            this.element = element;
            this.heather = heather;
        }

        TableEditor.prototype.startEdit = function() {
            var me = this;
            var ele = $(this.element);
            var table = ele.find('table');
            var embedEditor = EmbedEditor.create(table[0], this.heather.config);
            embedEditor.start();
            embedEditor.toolbar.insertIcon('fas fa-edit heather_middle_icon', function() {
                me.toSourceEditor();
            }, embedEditor.toolbar.length() - 1);
            embedEditor.afterStop(function() {
                var table = getElementFromDisplay(me.element, function(node) {
                    if (node.nodeType == 1) {
                        var tagName = node.tagName;
                        return tagName == 'TABLE';
                    }
                    return false;
                });
                if (table == null) {
                    ele.remove();
                } else {
                    table.innerHTML = cleanHtml(table.innerHTML)
                    var markdown = turndownService.turndown(table.outerHTML);
                    ele.find('.heather_display_source').html(markdown);
                }
                triggerStopEdit(me);
            });
            this.embedEditor = embedEditor;
        }


        TableEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        TableEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler);
        }

        TableEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;
            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new TableEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return EmbedEditor.create(element, config)
            },
            createElement: function() {
                return createEditableElement('|   |   |\n| - | - |\n|   |   |', false);
            },
            createEmbedElement: function() {
                var table = document.createElement('table');
                table.innerHTML = '<tr><th></th><th></th></tr><tr><td></td><td></td></tr>'
                return table;
            }
        }
    })();


    var HeadingEditor = (function() {

        var EmbedEditor = (function() {
            function EmbedEditor(element) {
                this.element = element;
                this.endHandlers = [];
            }

            EmbedEditor.prototype.start = function() {
                var me = this;
                var heading = this.element;
                heading.setAttribute('contenteditable', 'true');
                var keyDownHandler = function(e) {
                    if (CodeMirror.keyNames[e.keyCode] == 'Enter') {
                        me.stop();
                        return false;
                    }
                    return true;
                };
                heading.addEventListener('keydown', keyDownHandler);

                var toolbar = document.createElement('div');
                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                $(heading).after(toolbar);

                this.bar = Bar.create(toolbar);
                this.bar.addIcon('fas fa-trash heather_middle_icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            me.bar.remove();
                            $(me.element)[0].remove();
                            triggerStopEdit(me);
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
                this.bar.addIcon('fas fa-arrow-up heather_middle_icon', function() {
                    var heading = $(me.element)[0];
                    var index = parseInt(heading.tagName.substring(1));
                    if (index == 1) {
                        return;
                    }
                    index--;
                    var h = document.createElement("H" + index);
                    h.setAttribute('contenteditable', true);
                    h.innerHTML = heading.innerHTML;
                    $(me.element).after(h).remove();
                    me.element = h;
                    me.focus();
                    showTip(index);
                    return;
                });
                this.bar.addIcon('fas fa-arrow-down heather_middle_icon', function() {
                    var heading = $(me.element)[0];
                    var index = parseInt(heading.tagName.substring(1));
                    if (index == 6) {
                        return;
                    }
                    index++;
                    var h = document.createElement("H" + index);
                    h.setAttribute('contenteditable', true);
                    h.innerHTML = heading.innerHTML;
                    $(heading).after(h).remove();
                    me.element = h;
                    me.focus();
                    showTip(index);

                    return;
                });

                this.bar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });

                showTip($(me.element)[0].tagName.substring(1));
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.bar.remove();
                this.element.removeAttribute('contenteditable');
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }
            EmbedEditor.prototype.focus = function(handler) {
                this.element.focus();
            }

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

            return {
                create: function(element) {
                    return new EmbedEditor(element);
                }
            }
        })();

        function HeadingEditor(element, heather) {
            this.element = element;
            this.endHandlers = [];
            this.heather = heather;
        }

        HeadingEditor.prototype.startEdit = function() {
            var ele = $(this.element);
            var me = this;
            var heading = ele.find('h1,h2,h3,h4,h5,h6')[0];
            var embedEditor = EmbedEditor.create(heading);
            embedEditor.start();
            embedEditor.afterStop(function() {
                var heading = getElementFromDisplay(me.element, function(node) {
                    if (node.nodeType == 1) {
                        var tagName = node.tagName;
                        return tagName == 'H1' || tagName == 'H2' || tagName == 'H3' ||
                            tagName == 'H4' || tagName == 'H5' || tagName == 'H6';
                    }
                    return false;
                });
                if (heading != null) {
                    heading.innerHTML = cleanHtml(heading.innerHTML);
                    var markdown = turndownService.turndown(heading.outerHTML);
                    ele.find('.heather_display_source').html(markdown);
                } else {
                    $(me.element).remove();
                }
                triggerStopEdit(me);
            })
            this.embedEditor = embedEditor;
        }

        HeadingEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        HeadingEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        HeadingEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;
            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        return {
            create: function(element, heather) {
                return new HeadingEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return EmbedEditor.create(element, config)
            },
            createElement: function() {
                return createEditableElement('# ', false);
            },
            createEmbedElement: function() {
                return document.createElement('H1');
            }
        }
    })();

    var HREditor = (function() {

        var EmbedEditor = (function() {

            function EmbedEditor(element, config) {
                this.element = element;
                this.config = config;
                this.endHandlers = [];
            }

            EmbedEditor.prototype.start = function() {
                var me = this;
                var toolbar = document.createElement('div');
                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                $(this.element).after(toolbar);
                this.bar = Bar.create(toolbar);
                this.bar.addIcon('fas fa-trash heather_middle_icon', function() {
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
                this.bar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.bar.remove();
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.focus = function() {}

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

            return {
                create: function(element, config) {
                    return new EmbedEditor(element, config);
                }
            }
        })();

        function HREditor(element, heather) {
            this.element = element;
            this.endHandlers = [];
            this.heather = heather;
        }

        HREditor.prototype.startEdit = function() {
            var hr = this.element.querySelector('HR');
            var embedEditor = EmbedEditor.create(hr, this.heather.config);
            embedEditor.start();
            var me = this;
            embedEditor.afterStop(function() {
				if(!$.contains(me.element,hr)){
					$(me.element).remove();
				}
                triggerStopEdit(me);
            });
            this.embedEditor = embedEditor;
        }

        HREditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        HREditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        return {
            create: function(element, heather) {
                return new HREditor(element, heather);
            },
            createEmbedEditor: function(element) {
                return EmbedEditor.create(element)
            },
            createElement: function() {
                return createEditableElement('***', false);
            },
            createEmbedElement: function() {
                return document.createElement('hr');
            }
        }
    })();

    var PreEditor = (function() {

        var EmbedEditor = (function() {
            function EmbedEditor(element) {
                this.endHandlers = [];
                this.element = element;
            }
            EmbedEditor.prototype.start = function() {
                var me = this;
                var pre = this.element;
                var code = pre.querySelector('code');
                this.language = code == null ? '' : getLanguage(code) || '';
                if (code != null) {
                    pre.innerHTML = code.innerHTML;
                }
                pre.setAttribute('contenteditable', 'true');
                this.keyDownHandler = function(e) {
                    if (keyNames[e.keyCode] == 'Enter') {
                        document.execCommand('insertHTML', false, '\r\n')
                        e.preventDefault();
                        return false;
                    }
                    if (e.shiftKey && keyNames[e.keyCode] == 'Tab') {
                        var sel = window.getSelection();
                        if (sel.rangeCount) {
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
                            range = sel.getRangeAt(0);
                            range.deleteContents();
                            var node = document.createTextNode(rst);
                            range.insertNode(node);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                        e.preventDefault();
                        return false;
                    }
                    if (keyNames[e.keyCode] == 'Tab') {
                        var sel = window.getSelection();
                        if (sel.toString() == '') {
                            document.execCommand('insertText', false, '    ');
                        } else {
                            if (sel.rangeCount) {
                                var lines = sel.toString().replaceAll("\r", "").split('\n');
                                var rst = "";
                                for (var i = 0; i < lines.length; i++) {
                                    var line = lines[i];
                                    rst += '    ' + line;
                                    if (i < lines.length - 1) {
                                        rst += '\n'
                                    }
                                }
                                range = sel.getRangeAt(0);
                                range.deleteContents();
                                range.insertNode(document.createTextNode(rst));
                            }
                        }
                        e.preventDefault();
                        return false;
                    }
                }

                var timer;
                this.inputHandler = function() {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function() {
                        updateEditor(pre, function() {
                            highlight(pre, me.language);
                        })
                    }, 500)
                }

                this.pasteHandler = function(e) {
                    var cpdata = (e.originalEvent || e).clipboardData;
                    var data = cpdata.getData('text/plain');
					var sel = window.getSelection();
					if(sel.rangeCount > 0){
						var range = sel.getRangeAt(0);
						range.deleteContents();
						range.insertNode(document.createTextNode(data.replaceAll('<br>', '\n').replaceAll(tabSpace, "    ")));
					}
                    e.preventDefault();
                    return false;
                }
                pre.addEventListener('input', this.inputHandler);
                pre.addEventListener('keydown', this.keyDownHandler);
                pre.addEventListener('paste', this.pasteHandler);

                var toolbar = document.createElement('div');
                pre.before(toolbar);

                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                var languageSelect = document.createElement('i');
                languageSelect.classList.add('fas');
                languageSelect.classList.add('heather_middle_icon');
                languageSelect.innerHTML = '选择语言';
                toolbar.appendChild(languageSelect);
                var languageSelectEvent = mobile ? 'touchstart' : 'mousedown';
                languageSelect.addEventListener(languageSelectEvent, function() {
                    var inputOptions = {};
                    var languages = hljs.listLanguages();
                    for (var i = 0; i < languages.length; i++) {
                        var language = languages[i];
                        inputOptions[language] = language;
                    }
                    Swal.fire({
                        title: '选择语言',
                        input: 'select',
                        inputOptions: inputOptions
                    }).then((result) => {
                        if (result.value) {
                            var lang = result.value;
                            me.language = lang;
                            if (lang == '') {
                                pre.innerHTML = pre.textContent;
                                languageSelect.textContent = '请选择语言'
                            } else {
                                highlight(pre, me.language);
                                languageSelect.textContent = me.language;
                            }
                        }
                    })
                });
                if (this.language == 'html') this.language = 'xml';
                languageSelect.textContent = this.language.trim() == '' ? '请选择语言' : this.language.trim();
                highlight(pre, me.language);
                this.bar = Bar.create(toolbar);
                this.bar.addIcon('fas fa-trash heather_middle_icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            me.bar.remove();
                            pre.remove();
                            triggerStopEdit(me);
                        }
                    })
                });
                this.bar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                var pre = this.element;
                pre.removeEventListener('input', this.inputHandler);
                pre.removeEventListener('keydown', this.keyDownHandler);
                pre.removeEventListener('paste', this.pasteHandler);
                $(pre).removeAttr('contenteditable');
                var code = document.createElement('code');
                if (this.language != '') {
                    code.classList.add('language-' + this.language);
                }
                code.innerHTML = pre.innerHTML;
                pre.innerHTML = code.outerHTML;
                highlight(pre.querySelector('code'), this.language);
                this.bar.remove();
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }

            EmbedEditor.prototype.focus = function(handler) {
                this.element.focus();
            }

            function getLanguage(code) {
                var language = code.getAttribute('class');
                if (language && language.startsWith("language-")) {
                    return language.split('-')[1];
                }
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

            function highlight(pre, language) {
                if (hljs.getLanguage(language)) {
                    pre.innerHTML = hljs.highlight(language, pre.textContent, true).value;
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

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

            return {
                create: function(element) {
                    return new EmbedEditor(element);
                }
            }
        })();


        function PreEditor(element, heather) {
            this.element = element;
            this.endHandlers = [];
            this.heather = heather;
        }

        PreEditor.prototype.startEdit = function() {
            var me = this;
            var pre = me.element.querySelector('pre');
            var embedEditor = EmbedEditor.create(pre);
            embedEditor.start();
            embedEditor.bar.addIcon('fas fa-edit heather_middle_icon', function() {
                me.toSourceEditor();
            });
            embedEditor.afterStop(function() {
                var pre = getElementFromDisplay(me.element, function(node) {
                    return node.nodeType == 1 && node.tagName == 'PRE';
                });
                if (pre == null) {
                    $(me.element).remove();
                } else {
                    var language = me.embedEditor.language;
                    var lines = pre.textContent;
                    var lastLine = lines[lines.length - 1];
                    var lineBreaker = lastLine == '\n' ? '' : '\n';
                    var markdown = '``` ' + language + '\n' + pre.textContent + lineBreaker + '```';
                    $(me.element).find('.heather_display_source').html(markdown);
                }
                triggerStopEdit(me);
            });
            this.embedEditor = embedEditor;
        }

        PreEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        PreEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        PreEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;
            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        return {
            create: function(element, heather) {
                return new PreEditor(element, heather);
            },
            createEmbedEditor: function(element) {
                return EmbedEditor.create(element)
            },
            createElement: function() {
                return createEditableElement('```\n\n```', false);
            },
            createEmbedElement: function() {
                return document.createElement('pre');
            }
        }
    })();

    var CompositeEmbedEditor = (function() {
        function CompositeEmbedEditor(element, config) {
            this.element = element;
            this.config = config;
            this.endHandlers = [];
        }

        CompositeEmbedEditor.prototype.start = function(_target) {
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
                if (me.embedElement === target) return;
                createEmbedEditor(target, me, _target);
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
            toolbar = Bar.create(toolbar);
            toolbar.addIcon('fas fa-trash heather_middle_icon', function() {
                Swal.fire({
                    title: '确定要删除吗?',
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33'
                }).then((result) => {
                    if (result.value) {
                        toolbar.remove();
                        $(me.element).remove();
                        triggerStopEdit(me);
                    }
                })
            });

            toolbar.addIcon('fas fa-bars heather_middle_icon', function() {
                createEmbedEditorDialog(me, function(element) {
                    me.element.appendChild(element);
                });
            });
            toolbar.addIcon('fas fa-align-justify heather_middle_icon', function() {
                if (me.embedEditor) {
                    me.embedEditor.stop();
                    delete me.embedEditor;
                    delete me.embedElement;
                }
                me.element.removeEventListener('click', me.clickHandler);
                var children = $(me.element).children();
                if (children.length > 0 && !me.element.classList.contains('heather_opacity-5')) {
                    me.element.classList.add('heather_opacity-5');
                    $.each(children, function() {
                        var p = document.createElement('div');
                        p.classList.add('heather_p');
                        p.innerHTML = '<i class="fas fa-plus heather_middle_icon"></i>';
                        p.querySelector('i').addEventListener('click', function() {
                            var p = this.parentElement;
                            var prev = p.previousElementSibling;
                            me.element.classList.remove('heather_opacity-5');
                            $('.heather_p').remove();
                            me.element.addEventListener('click', me.clickHandler);
                            createEmbedEditorDialog(me, function(element) {
                                if (prev == null) {
                                    $(me.element).prepend(element);
                                } else {
                                    $(prev).after(element)
                                }
                            })
                        });
                        $(this).before(p);
                    })
                } else {
                    me.element.classList.remove('heather_opacity-5');
                    $('.heather_p').remove();
                    me.element.addEventListener('click', me.clickHandler);
                }
            });

            toolbar.addIcon('fas fa-check heather_middle_icon', function() {
                me.stop();
            });

            this.toolbar = toolbar;
            this.clickHandler = clickHandler;
        }

        CompositeEmbedEditor.prototype.afterStop = function(handler) {
            this.endHandlers.push(handler)
        }

        CompositeEmbedEditor.prototype.focus = function(handler) {

        }

        CompositeEmbedEditor.prototype.stop = function() {
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
            triggerStopEdit(this);
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        function createEmbedEditorDialog(editor, handler) {
            if (editor.embedEditor) {
                editor.embedEditor.stop();
            }

            showEditorFactoryDialog(function(factory) {
                var element = factory.createEmbedElement();
                handler(element);
                createEmbedEditor(element, editor);
            })
        }

        function createEmbedEditor(element, editor, _target) {
            var factory = EditorFactory.getFactory(element);
            var embedEditor;
            if (factory != null) {
                embedEditor = factory.createEmbedEditor(element, editor.config);
            }
            if (editor.embedEditor) {
                editor.embedEditor.stop();
            }
            delete editor.embedEditor;
            delete editor.embedElement;
            if (embedEditor) {
                embedEditor.afterStop(function() {
                    delete editor.embedEditor;
                    delete editor.embedElement;
                })
                embedEditor.start(_target);
                embedEditor.focus();
                editor.embedEditor = embedEditor;
                editor.embedElement = element;
            }
        }

        return {
            create: function(element, config) {
                return new CompositeEmbedEditor(element, config);
            }
        }
    })();

    var BlockquoteEditor = (function() {

        function BlockquoteEditor(element, heather) {
            this.element = element;
            this.endHandlers = [];
            this.heather = heather;
        }

        BlockquoteEditor.prototype.startEdit = function() {
            var ele = $(this.element);
            var me = this;
            var blockquote = ele.find('blockquote')[0];
            this.embedEditor = CompositeEmbedEditor.create(blockquote, this.heather.config);
            this.embedEditor.start();
            this.embedEditor.toolbar.insertIcon('fas fa-edit heather_middle_icon', function() {
                me.toSourceEditor();
            }, me.embedEditor.toolbar.length() - 1);
            this.embedEditor.afterStop(function() {
                var blockquote = getElementFromDisplay(me.element, function(node) {
                    return node.nodeType == 1 && node.tagName == 'BLOCKQUOTE';
                });
                if (blockquote == null) {
                    $(me.element).remove();
                } else {
                    blockquote.innerHTML = cleanHtml(blockquote.innerHTML);
                    var markdown = turndownService.turndown(blockquote.outerHTML);
                    ele.find('.heather_display_source').html(markdown);
                }
                triggerStopEdit(me);
            });
        }

        BlockquoteEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        BlockquoteEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        BlockquoteEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;

            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new BlockquoteEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return CompositeEmbedEditor.create(element, config)
            },
            createElement: function() {
                return createEditableElement('> ', false);
            },
            createEmbedElement: function() {
                return document.createElement('blockquote');
            }
        }
    })();

    var TaskListEditor = (function() {
        return {
            create: function(element, heather) {
                return ListEditor.create(element, heather,true)
            },
            createEmbedEditor: function(element, config) {
                return ListEditor.createEmbedEditor(element, config,true)
            },
            createElement: function() {
                return createEditableElement('- [ ] task', false);
            },
            createEmbedElement: function() {
                var ul = document.createElement('ul');
                ul.classList.add('contains-task-list');
                ul.innerHTML = '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" type="checkbox"></li>';
                return ul;
            }
        }
    })();

    var ListEditor = (function() {

        var EmbedEditor = (function() {
			
            function EmbedEditor(element, config) {
                this.element = element;
                this.config = config;
                this.endHandlers = [];
            }

            EmbedEditor.prototype.start = function(_target) {
                var me = this;
                var ele = $(this.element);
                var toolbar = document.createElement('div');
                toolbar.setAttribute("style", "margin-bottom:10px;margin-top:5px");
                ele.before(toolbar);
                toolbar = Bar.create(toolbar);
                toolbar.addIcon('fas fa-trash heather_middle_icon', function() {
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

                toolbar.addIcon('fas fa-plus heather_middle_icon', function() {
                    if (!me.li) {
                        return;
                    }
                    var li = $(me.li);
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
                        if (me.tasklist === true) {
                            li.before('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
                        } else {
                            li.before('<li></li>');
                        }
                        Swal.close();
                    });
                    buttons.eq(1).click(function() {
                        if (me.tasklist === true) {
                            li.after('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
                        } else {
                            li.after('<li></li>');
                        }
                        Swal.close();
                    });
                });
				toolbar.addIcon('fas fa-exchange-alt heather_middle_icon', function() {
					if (!me.li) {
						return;
					}
					var child = me.li.firstChild;
					if (child != null && child.type == 'checkbox') {
						return;
					}
					me.stop();
					var tagName = me.element.tagName == 'OL' ? "ul" : 'ol';
					var replace = document.createElement(tagName);
					replace.innerHTML = me.element.innerHTML;
					ele.after(replace);
					ele.remove();
				},function(ele){
					me.exchangeIcon = ele;
				});	
				toolbar.addIcon('far fa-square heather_middle_icon',function(ele){
					if(ele.classList.contains('fa-square')){
						me.checked = true;
						ele.classList.remove('fa-square')
						ele.classList.add('fa-check-square')
					} else {
						me.checked = false;
						ele.classList.remove('fa-check-square')
						ele.classList.add('fa-square')
					}		
				},function(ele){
					$(ele).hide();
					me.checkIcon = ele;
				});
				
				var setCheckIconStatus = function(checked){
					var ele = me.checkIcon;
					if(checked){
						ele.classList.remove('fa-square')
						ele.classList.add('fa-check-square')
					} else {
						ele.classList.remove('fa-check-square')
						ele.classList.add('fa-square')
					}
					me.checked = checked;
				}

                toolbar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });
				
				
                var editLi = function(li, target) {
                    if (li != null) {
						
                        if (!li.isContentEditable) {
							var checkbox = getCheckbox(li);
							if (checkbox != null) {
								setCheckIconStatus(checkbox.checked);
								$(checkbox).remove();
								$(me.exchangeIcon).hide();
								$(me.checkIcon).show();
								me.tasklist = true;
							} else {
								$(me.exchangeIcon).show();
								$(me.checkIcon).hide();
								me.tasklist = false;
							}
							wrapToParagraph(li,checkbox);
                            if (me.compositeEmbedEditor) {
                                me.compositeEmbedEditor.stop();
                            }
                            me.compositeEmbedEditor = CompositeEmbedEditor.create(li, me.config);
                            if (target != li) {
                                me.compositeEmbedEditor.start(target);
                            } else {
                                me.compositeEmbedEditor.start();
                            }
							if(checkbox != null){
								me.compositeEmbedEditor.afterStop(function(){
									var checkbox = document.createElement('input');
									checkbox.setAttribute('type','checkbox');
									checkbox.classList.add('task-list-item-checkbox');
									checkbox.setAttribute('disabled','');
									if(me.checked){
										checkbox.setAttribute('checked','');
									}
									$(li).prepend(checkbox);
								})	
							}
                        }
                        me.li = li;
                        li.focus();
                    }
                }
                if (_target) {
                    editLi(getLi(_target, this.element), _target);
                }
                var clickHandler = function(e) {
                    var li = getLi(e.target, me.element);
                    editLi(li, e.target);
                }
                var keyDownHandler = function(e) {
                    if (keyNames[e.keyCode] == 'Enter') {
                        document.execCommand('insertHTML', false, '<br>' + veryThinHtml);
                        return false;
                    }
                    return true;
                }

                ele.on('click', 'li', clickHandler);
                ele.on('keydown', 'li', keyDownHandler);

                this.clickHandler = clickHandler;
                this.keyDownHandler = keyDownHandler;
                this.toolbar = toolbar;
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                if (this.contenteditableBar) {
                    this.contenteditableBar.remove();
                }
                if (this.mediaHelper) {
                    this.mediaHelper.remove();
                }
                if (this.compositeEmbedEditor) {
                    this.compositeEmbedEditor.stop();
                }
                this.toolbar.remove();
                var me = this;
                var ele = $(this.element);
				ele.find('li').each(function(){
					var checkbox = getCheckbox(this);
					wrapToParagraph(this,checkbox);
				})
                ele.off('click', 'li', this.clickHandler);
                ele.off('keydown', 'li', this.keyDownHandler);
                ele.find('[contenteditable]').each(function() {
                    this.removeEventListener('paste', plainPasteHandler);
                    this.removeAttribute('contenteditable');
                });
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }

            EmbedEditor.prototype.focus = function(handler) {

            }
			
			
			function wrapToParagraph(li,checkbox){
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

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
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
                create: function(element, config) {
                    return new EmbedEditor(element, config);
                }
            }
        })();

        function ListEditor(element, heather) {
            var me = this;
            this.element = element;
            this.endHandlers = [];
            this.heather = heather;
        }

        ListEditor.prototype.startEdit = function(_target) {
            var me = this;
            var ele = $(me.element);
            var ul = ele.find('ul,ol')[0];
            var embedEditor = EmbedEditor.create(ul, this.heather.config);
            embedEditor.start(_target);
            embedEditor.toolbar.insertIcon('fas fa-edit heather_middle_icon', function() {
                me.toSourceEditor();
            }, embedEditor.toolbar.length() - 1);
            embedEditor.afterStop(function() {
                var ul = getElementFromDisplay(me.element, function(node) {
                    return node.nodeType == 1 && (node.tagName == 'UL' || node.tagName == 'OL');
                });
                if (ul == null) {
                    ele.remove();
                } else {
                    if (ul.children.length == 0) {
                        ele.remove();
                    } else {
                        ul.innerHTML = cleanHtml(ul.innerHTML);
                        var markdown = turndownService.turndown(ul.outerHTML);
                        ele.find('.heather_display_source').html(markdown);
						
						//unwrap li's first child if  it is paragraph
						var lis = ul.querySelectorAll('li');
						out:for(var j=0;j<lis.length;j++){
							var li = lis[j];var elem;
							var checkbox = getCheckbox(li);
							if(checkbox != null){
								elem = checkbox.nextSibling;
							} else {
								elem = li.firstChild;
							}
							if(elem != null && elem.nodeType == 1 && elem.tagName == 'P'){
								var childNodes = elem.childNodes;
								for(var i=0;i<childNodes.length;i++){
									var childNode = childNodes[i];
									if(childNode.nodeType == 1 && childNode.blockDefault()){
										continue out ;
									}
								}
								$(elem).contents().unwrap();
							}
						}
                    }
                }
                triggerStopEdit(me);
            });
            this.embedEditor = embedEditor;
        }

        ListEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        ListEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        ListEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;
            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new ListEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return EmbedEditor.create(element, config)
            },
            createElement: function() {
                return createEditableElement('- ', false);
            },
            createEmbedElement: function() {
                var ul = document.createElement('ul');
                ul.innerHTML = '<li></li>';
                return ul;
            }
        }
    })();

    var SourceEditor = (function() {

        function SourceEditor(element, heather) {
            var me = this;
            this.handler = function(editor) {
                Toolbar.unbind();
                var source = editor.getValue();
                if (source.trim() == '') {
                    $(element).remove();
                    triggerStopEdit(me);
                    return;
                }
                var blocks = _heather.markdownToBlocks(source);
                if (blocks.length == 1) {
                    var block = blocks[0];
                    element.innerHTML = render(block.block);
                    element.setAttribute('data-html', block.html);
                    renderHtml($(element));
                    var sourceElement = createSourceElement(source);
                    element.appendChild(sourceElement);
                    triggerStopEdit(me);
                    if (me.startEditAfterEnd == true) {
                        delete me.startEditAfterEnd;
                        edit(element, heather, false);
                    }
                } else {
                    var $element = $(element);
                    for (var i = 0; i < blocks.length; i++) {
                        var block = blocks[i];
                        var newElement = createEditableElement(block.block, block.html);
                        $element.after(newElement);
                        $element = $(newElement);
                        renderHtml($(newElement));
                    }
                    $(element).remove();
                    delete me.startEditAfterEnd;
                    triggerStopEdit(me);
                }
            }


            var keyMap = {};
            keyMap['Esc'] = this.handler;
            this.keyMap = keyMap;
            this.heather = heather;
            this.element = element;
            this.endHandlers = [];
        }

        SourceEditor.prototype.startEdit = function() {
            var ele = $(this.element);
            ele.removeClass("markdown-body");
            var me = this;
            var source = templateToMarkdown(this.element.querySelector('.heather_display_source').innerHTML);
            this.element.innerHTML = '<textarea></textarea>';
            var scrollBarStyle = mobile ? 'native' : 'overlay';
            var editor = CodeMirror.fromTextArea(this.element.querySelector('textarea'), {
                mode: {
                    name: "gfm"
                },
                lineNumbers: false,
                matchBrackets: true,
                lineWrapping: true,
                dragDrop: true,
                extraKeys: {
                    "Enter": "newlineAndIndentContinueMarkdownList"
                }
            });
            editor.setValue(source);
            editor.addKeyMap(this.keyMap);
            editor.focus();
            editor.setCursor({
                line: 0,
                ch: 0
            });
            this.editor = editor;
            Toolbar.bind(this.editor);
            Toolbar.bar.keepHidden = false;
            Toolbar.bar.insertIcon('fas fa-trash heather_middle_icon', function() {
                Swal.fire({
                    title: '确定要删除吗?',
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33'
                }).then((result) => {
                    if (result.value) {
                        ele.remove();
                        Toolbar.hide();
                        triggerStopEdit(me)
                    }
                })
            }, 0)
            Toolbar.bar.insertIcon('fas fa-check heather_middle_icon', function() {
                me.stopEdit();
            }, 0)
        }

        SourceEditor.prototype.stopEdit = function() {
			if(this.stoped === true){
				return;
			}
			this.stoped = true;
            if (this.editor)
                this.handler(this.editor);
        }

        SourceEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var endHandler = editor.endHandlers[i];
                try {
                    endHandler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new SourceEditor(element, heather);
            }
        }
    })();

    var KatexEditor = (function() {

        var EmbedEditor = (function() {
            function EmbedEditor(element, config) {
                this.endHandlers = [];
                this.element = element;
                this.config = config;
            }
            EmbedEditor.prototype.start = function() {

            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }

            EmbedEditor.prototype.focus = function(handler) {
                this.element.focus();
            }

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

            return {
                create: function(element, config) {
                    return new EmbedEditor(element, config);
                }
            }
        })();

        function KatexEditor(element, heather) {
            this.element = element;
            this.config = heather.config;
            this.endHandlers = [];
            this.heather = heather;
        }

        KatexEditor.prototype.startEdit = function() {

        }

        KatexEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        KatexEditor.prototype.toSourceEditor = function(handler) {}

        KatexEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new KatexEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return EmbedEditor.create(element, config)
            }
        }
    })();

    var ParagraphEditor = (function() {

        var EmbedEditor = (function() {
            function EmbedEditor(element, config) {
                this.endHandlers = [];
                this.element = element;
                this.config = config;
            }
            EmbedEditor.prototype.start = function() {
                var me = this;

                var paragraph = this.element;
                paragraph.setAttribute('contenteditable', 'true');
                paragraph.addEventListener('paste', plainPasteHandler);

                var fileUploadMgr = FileUploadMgr.create(paragraph, this.config);
                var toolbar = document.createElement('div');
                $(paragraph).before(toolbar);
                this.bar = Bar.create(toolbar);
                this.bar.addIcon('fas fa-trash heather_middle_icon', function() {
                    Swal.fire({
                        title: '确定要删除吗?',
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.value) {
                            me.fileUploadMgr.remove();
                            me.contenteditableBar.remove();
                            me.bar.remove();
                            $(paragraph).remove();
                            triggerStopEdit(me);
                        }
                    })
                });

                this.bar.addIcon('fas fa-upload heather_middle_icon', function() {
                    fileUploadMgr.upload();
                });

                this.bar.addIcon('fas fa-check heather_middle_icon', function() {
                    me.stop();
                });
                this.mediaHelper = MediaHelper.create(this.element, this.config);
                this.fileUploadMgr = fileUploadMgr;
                this.contenteditableBar = ContenteditableBar.create(this.element);
            }

            EmbedEditor.prototype.stop = function() {
				if(this.stoped === true){
					return;
				}
				this.stoped = true;
                this.fileUploadMgr.remove();
                this.contenteditableBar.remove();
                this.bar.remove();
                this.mediaHelper.remove();
                var p = this.element;
                if (p.innerHTML.replaceAll('&nbsp;', '').replaceAll('<br>', '').trim() == '') {
                    p.remove();
                    triggerStopEdit(this);
                } else {
                    p.removeAttribute('contenteditable');
                    p.removeEventListener('paste', plainPasteHandler);
                    divToBr($(p));
                    p.innerHTML = cleanHtml(p.innerHTML);
                }
                triggerStopEdit(this);
            }

            EmbedEditor.prototype.afterStop = function(handler) {
                this.endHandlers.push(handler)
            }

            EmbedEditor.prototype.focus = function(handler) {
                this.element.focus();
            }

            function triggerStopEdit(editor) {
                for (var i = 0; i < editor.endHandlers.length; i++) {
                    var handler = editor.endHandlers[i];
                    try {
                        handler();
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

            return {
                create: function(element, config) {
                    return new EmbedEditor(element, config);
                }
            }
        })();

        function ParagraphEditor(element, heather) {
            this.element = element;
            this.config = heather.config;
            this.endHandlers = [];
            this.heather = heather;
        }

        ParagraphEditor.prototype.startEdit = function() {
            var ele = $(this.element);
            ele.removeClass('markdown-body');
            var me = this;
            var editor = document.createElement('p');
            editor.setAttribute('contenteditable', 'true');
            var child = ele[0].firstChild;
            editor.innerHTML = child == null ? '' : child.innerHTML;
            this.element.innerHTML = editor.outerHTML + ele.find('.heather_display_source')[0].outerHTML;
            var embedEditor = EmbedEditor.create(this.element.firstChild, this.config);
            embedEditor.start();
            embedEditor.bar.insertIcon('fas fa-edit heather_middle_icon', function() {
                me.toSourceEditor();
            }, embedEditor.bar.length() - 1);
            embedEditor.afterStop(function() {
                var p = getElementFromDisplay(me.element, function(node) {
                    return node.nodeType == 1 && node.tagName == 'P';
                });
                if (p == null) {
                    $(me.element).remove();
                } else {
                    p.innerHTML = cleanHtml(p.innerHTML);
                    ele.find('.heather_display_source').html(turndownService.turndown(p.outerHTML));
                    $(me.element).addClass('markdown-body');
                }

                triggerStopEdit(me);
            });
            this.embedEditor = embedEditor;

        }

        ParagraphEditor.prototype.stopEdit = function() {
            this.embedEditor.stop();
        }

        ParagraphEditor.prototype.toSourceEditor = function(handler) {
            this.stopEdit();
            var me = this;
            edit(me.element, me.heather, true, function(editor) {
                editor.startEditAfterEnd = true;
            })
        }

        ParagraphEditor.prototype.onEndEdit = function(handler) {
            this.endHandlers.push(handler)
        }

        function triggerStopEdit(editor) {
            for (var i = 0; i < editor.endHandlers.length; i++) {
                var handler = editor.endHandlers[i];
                try {
                    handler();
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return {
            create: function(element, heather) {
                return new ParagraphEditor(element, heather);
            },
            createEmbedEditor: function(element, config) {
                return EmbedEditor.create(element, config)
            },
            createElement: function() {
                return createEditableElement('', false);
            },
            createEmbedElement: function() {
                return document.createElement('p');
            }
        }
    })();

    function placeCaretAtEnd(el) {
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
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

    function cleanHtml(html) {
		return html.replaceAll(veryThinChar, "");
    }

    function templateToMarkdown(text) {
        return text.replaceAll('&gt;', '>')
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

    function getElementFromDisplay(display, nodeCheck) {
        var node = display.firstChild;
        if (node != null && nodeCheck(node)) {
            return node;
        }
        return null;
    }


    function getCheckbox(li) {
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

    function showEditorFactoryDialog(callback) {
        var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
        var html = '';
        html += '<div><button style="' + style + '" >插入标题</button></div>';
        html += '<div><button style="' + style + '" >插入段落</button></div>';
        html += '<div><button style="' + style + '" >插入代码块</button></div>';
        html += '<div><button style="' + style + '" >插入引用</button></div>';
        html += '<div><button style="' + style + '" >插入表格</button></div>';
        html += '<div><button style="' + style + '" >插入列表</button></div>';
        html += '<div><button style="' + style + '" >插入任务列表</button></div>';
        html += '<div><button style="' + style + '" >水平线</button></div>';
        Swal({
            animation: false,
            html: html
        });
        var buttons = Swal.getContent().querySelectorAll('button');
        buttons[0].addEventListener('click', function() {
            callback(HeadingEditor);
            Swal.close();
        });
        buttons[1].addEventListener('click', function() {
            callback(ParagraphEditor);
            Swal.close();
        });
        buttons[2].addEventListener('click', function() {
            callback(PreEditor);
            Swal.close();
        });
        buttons[3].addEventListener('click', function() {
            callback(BlockquoteEditor);
            Swal.close();
        });
        buttons[4].addEventListener('click', function() {
            callback(TableEditor);
            Swal.close();
        });
        buttons[5].addEventListener('click', function() {
            callback(ListEditor);
            Swal.close();
        });

        buttons[6].addEventListener('click', function() {
            callback(TaskListEditor);
            Swal.close();
        });

        buttons[7].addEventListener('click', function() {
            callback(HREditor);
            Swal.close();
        });
    }

    return _heather;

})();