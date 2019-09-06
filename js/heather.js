var EditorWrapper = (function() {

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
		if(this.nodeType == 1){
			var tag = this.tagName.toLowerCase();
			for(const blockElementName of blockElements){
				if(blockElementName == tag){
					return true;
				}
			}
		}
		return false;
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

    CodeMirror.prototype.unfocus = function() {
        this.getInputField().blur();
    }

    CodeMirror.prototype.selectionStatus = function() {
        //selectionStatus
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

    CodeMirror.prototype.getLines = function(line, endLine) {
        var str = '';
        for (var i = line; i < endLine; i++) {
            str += this.getLine(i);

            if (i < endLine - 1) {
                str += '\n';
            }
        }
        return str;
    }

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";

    var mac = CodeMirror.browser.mac;
    var mobile = CodeMirror.browser.mobile;
    var ios = CodeMirror.browser.ios;
    var veryThinHtml = '&#8203;';
    var veryThinChar = '​';
    var tabSpace = "	";
    var chrome = CodeMirror.browser.chrome;
	var wrapperInstance = {};
	
	
    var selectionChangeListeners = [];
	var selectionChangeTimer;
	var selectionChangeTimerMill = 100;
	
    document.onselectionchange = function() {
		if(selectionChangeTimer){
			clearTimeout(selectionChangeTimer);
		}
		selectionChangeTimer = setTimeout(function(){
			for (var i = 0; i < selectionChangeListeners.length; i++) {
				try {
					selectionChangeListeners[i].call()
				} catch (e) {
					console.log(e)
				};
			}			
		},selectionChangeTimerMill)
    }
	
		
	//used to load lazy resource
	var lazyRes = {
		mermaid_js : "js/mermaid.min.js",
		katex_css : "katex/katex.min.css",
		katex_js : "katex/katex.min.js",
		colorpickerJs : "colorpicker/dist/js/bootstrap-colorpicker.min.js",
		colorpickerCss : "colorpicker/dist/css/bootstrap-colorpicker.min.css",
		editorTheme : function(editorTheme) {
			return 'codemirror/theme/' + editorTheme + '.css';
		},
		hljsTheme : function(hljsTheme) {
			return 'highlight/styles/' + hljsTheme + '.css';
		}
	}
	
	///default commands 
	var commands = {
		emoji: function(wrapper) {
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
		heading: function(wrapper) {
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
					selectionBreak(status, function(text) {
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
							ch: v + 1
						});
					} else {
						editor.replaceSelection(status.text);
					}
				}
			}
			getHeading();
		},
		bold: function(wrapper) {
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

		italic: function(wrapper) {
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

		quote: function(wrapper) {
			var editor = wrapper.editor;
			var status = editor.selectionStatus();
			selectionBreak(status, function(text) {
				return '> ' + text;
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

		strikethrough: function(wrapper) {
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


		link: function(wrapper) {
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

		codeBlock: function(wrapper) {
			var editor = wrapper.editor;
			var status = editor.selectionStatus();
			selectionBreak(status, function(text) {
				var newText = "``` ";
				newText += '\n';
				newText += text;
				newText += '\n'
				newText += "```";
				return newText;
			});
			editor.focus();
			editor.replaceSelection(status.text);
			editor.setCursor({
				line: status.startLine + 1,
				ch: 0
			});
		},

		code: function(wrapper) {
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

		uncheck: function(wrapper) {
			var editor = wrapper.editor;
			insertTaskList(editor, false);
		},

		check: function(wrapper) {
			var editor = wrapper.editor;
			insertTaskList(editor, true);
		},

		table: function(wrapper) {
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
						if (i < rows - 2)
							text += "\n";
					}
				}
				var status = editor.selectionStatus();
				selectionBreak(status, function(selected) {
					return text;
				});
				editor.replaceSelection(status.text);
			}).catch(swal.noop)
		},

		search: function(wrapper) {
			if (wrapper.searchHelper.isVisible()) {
				wrapper.searchHelper.close();
			} else {
				wrapper.searchHelper.open();
			}
		}
	}
	
    var turndown = (function() {

        var alignMap = {
            '': ' -- ',
            'left': ' :-- ',
            'center': ' :--: ',
            'right': ' --: '
        }

        var createTurndownservice = function() {
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
               filter: ['ul','ol'],
                replacement: function(content, node, options) {
                    node.innerHTML = cleanHtml(node.innerHTML);
                    return '\n\n' +  listToMarkdown(node, options, 0)+'\n\n';
                }
            });

            function listToMarkdown(node, options, indent) {
                var ol = node.tagName == 'OL';
				var index = 1;
				var markdown = '';
				for(const li of node.children){
					var liMarkdowns = [];
					var checkbox = getCheckbox(li);
					wrapToParagraph(li,checkbox);
					var taskList = checkbox != null;
					var prefix = '';
					if(taskList){
                        if (checkbox.checked) {
                            prefix = options.bulletListMarker + ' [x]';
                        } else {
                            prefix = options.bulletListMarker + ' [ ]';
                        }
					} else {
						prefix = ol ? index + '.' : options.bulletListMarker;
					}
					var spaces = taskList ? getSpaces(2) : getSpaces(prefix.length+1) ;
					var j = 0;
					for(const child of li.children){
						if(child === checkbox) continue;
						if(child.tagName == 'OL' || child.tagName == 'UL'){
							liMarkdowns.push(listToMarkdown(child,options,taskList ? 2 : prefix.length+1));
						} else {
							var str = turndownService.turndown(child.outerHTML);
							var strs = [];
							for(const line of str.split('\n')){
								strs.push(spaces+ line);
							}
							liMarkdowns.push(strs.join('\n'));
						}
						j++;
					}
					var liMarkdown = liMarkdowns.join('\n\n');
					liMarkdown = liMarkdown.substring(taskList ? ' ' : prefix.length);
					markdown += prefix +  liMarkdown+'\n';
					index ++;
				}
				var indentMarkdown = [];
				for(const line of markdown.split('\n')){
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
				if(table.find('[colspan][rowspan]').length > 0){
					return table.outerHTML;
				}
				
                var markdown = '';
                var trs = table.find('tr');
				
                for (var i = 0; i < trs.length; i++) {
                    var tr = trs.eq(i);
                    var headingRow = i == 0;
                    if (headingRow) {
						
						var ths = tr.find('th');
						if(ths.length == 0){
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
					for(var i=0;i<md.length;i++){
						var ch = md.charAt(i);
						if(ch == '|'){
							var prevCh = i == 0 ? '' : md.charAt(i-1);
							if(prevCh == '\\'){
								newMd += ch;
							} else {
								newMd += '\\'+ch;
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
        }

        return {
            create: function() {
                return createTurndownservice();
            }
        };
    })();

    var FileUpload = (function() {

        function FileUpload(file, wrapper) {
            var config = wrapper.config;
            this.uploadUrl = config.upload_url;
            this.fileName = config.upload_fileName || 'file';
            this.beforeUpload = config.upload_before;
            this.file = file;
            this.fileUploadFinish = config.upload_finish;
            this.wrapper = wrapper;
        }

        FileUpload.prototype.start = function() {
            var me = this;
            var editor = this.wrapper.editor;
            var formData = new FormData();
            formData.append(this.fileName, this.file);
            if (this.beforeUpload) {
                this.beforeUpload(formData, this.file);
            }
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
                    $(pb).css({
                        "width": percentComplete + "%"
                    })
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
                            return '<pre class="hljs"><code class="language-' + lang + '">' +
                                hljs.highlight(lang, str, true).value +
                                '</code></pre>';
                        } catch (__) {}
                    }
                }
            });
            this.md.renderer.rules.html_inline = function(tokens, idx /*, options, env */ ) {
                var token = tokens[idx];
                var content = token.content;
				if(!content.startsWith('</')){
					return content.substring(0,content.length - 1) + ' data-inline-html>';
				}
                return content;
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
        MarkdownRender.prototype.getPreviewHtml = function(markdownText) {
            return this.md.render(markdownText);
        }
        MarkdownRender.prototype.renderAt = function(markdownText, element, patch,options) {
            var me = this;
            var doc = parseHTML(this.getPreviewHtml(markdownText));
            var hasMermaid = doc.querySelector('.mermaid') != null && this.hasMermaid !== false;
            if (hasMermaid) {
                var theme = this.theme;
                loadMermaid(function() {
                    mermaid.initialize({
                        theme: theme.mermaid.theme || 'default'
                    });
                    $(element).find('.mermaid').each(function() {
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
            if (this.config.render_beforeRender) {
                this.config.render_beforeRender(doc);
            }
			var lis = doc.querySelectorAll('li');
			for(const li of lis){
				var checkbox = getCheckbox(li);
				wrapToParagraph(li, checkbox);
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
            } else {
                element.innerHTML = innerHTML;
            }

           renderKatexAndMermaid(element);
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


    var Tooltip = (function() {

        var HljsTip = (function() {

            function HljsTip(editor) {
                $('<div id="heather_hljs_tip" style="visibility:hidden;position:absolute;z-index:99;overflow:auto;background-color:#fff"></div>').appendTo($("#heather_in"));
                var state = {
                    running: false,
                    cursor: undefined,
                    hideOnNextChange: false
                };
                var tip = $("#heather_hljs_tip");

                tip.on('click', 'tr', function() {
                    setLanguage($(this));
                })

                var setLanguage = function(selected) {
                    var lang = selected.text();
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
                    hideTip();
                    state.hideOnNextChange = true;
                }

                var hideTip = function() {
                    tip.css({
                        'visibility': 'hidden'
                    });
                    if (!mobile) {
                        editor.removeKeyMap(languageInputKeyMap);
                    }
                    state.running = false;
                    state.cursor = undefined;
                }

                var languageInputKeyMap = {
                    'Up': function() {
                        var current = tip.find('.selected');
                        var prev = current.prev('tr');
                        if (prev.length > 0) {
                            current.removeClass('selected');
                            prev.addClass('selected');
                            prev[0].scrollIntoView();
                        }
                    },
                    'Down': function() {
                        var current = tip.find('.selected');
                        var next = current.next('tr');
                        if (next.length > 0) {
                            current.removeClass('selected');
                            next.addClass('selected');
                            next[0].scrollIntoView();
                        }
                    },
                    'Enter': function(editor) {
                        setLanguage(tip.find('.selected'));
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
                this.hideTipOnScroll = function() {
                    hideTip();
                }
                this.tipHandler = function(editor) {
                    if (editor.getSelection() == '') {
                        var cursor = editor.getCursor();
                        ///``` j
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
                                        var pos = editor.cursorCoords(true);
                                        tip.html(html);
                                        var height = tip.height();
                                        if ($("#heather_in").height() - pos.top < height + editor.defaultTextHeight()) {
                                            tip.css({
                                                'top': pos.top - height,
                                                'left': pos.left,
                                                'visibility': 'visible'
                                            });
                                        } else {
                                            tip.css({
                                                'top': pos.top + editor.defaultTextHeight(),
                                                'left': pos.left,
                                                'visibility': 'visible'
                                            })
                                        }
                                        if (!mobile) {
                                            editor.addKeyMap(languageInputKeyMap);
                                        }
                                    } else {
                                        hideTip();
                                    }
                                } else {
                                    hideTip();
                                }
                            }, 100)
                        }
                    } else {
                        hideTip();
                    }
                }
                this.editor = editor;
            }

            HljsTip.prototype.enable = function() {
                this.editor.on('change', this.tipHandler);
                this.editor.on('cursorActivity', this.hideTipOnCursorChange);
                this.editor.on('scroll', this.hideTipOnScroll);
                this.editor.on('touchmove', this.hideTipOnScroll);
            }

            HljsTip.prototype.disable = function() {
                this.editor.off('change', this.tipHandler);
                this.editor.off('cursorActivity', this.hideTipOnCursorChange);
                this.editor.off('scroll', this.hideTipOnScroll);
                this.editor.off('touchmove', this.hideTipOnScroll);
            }

            return HljsTip;
        })();

        function Tooltip(editor) {
            this.hljsTip = new HljsTip(editor);
        }

        Tooltip.prototype.enable = function() {
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
                    if (value == '') {
                        return;
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
        function ThemeHandler(config) {
            this.key = config.theme_key || "heather-theme";
            this.store = {
                save: function(key, json) {
                    localStorage.setItem(key, json);
                },
                get: function(key) {
                    return localStorage.getItem(key);
                }
            };
            this.config = config;
            this.timer = undefined;
        }

        ThemeHandler.prototype.saveTheme = function(theme) {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            var handler = this;
            this.timer = setTimeout(function() {
                var json = JSON.stringify(theme);
                handler.store.save(handler.key, json);
            }, 500)
        }

        ThemeHandler.prototype.reset = function() {
            var theme = new Theme(this.config);
            this.store.save(this.key, JSON.stringify(theme));
            theme.render();
            return theme;
        }

        ThemeHandler.prototype.getTheme = function() {
            var json = this.store.get(this.key);
            if (json == null) {
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
            theme.editor = copy.editor || {};
            theme.inCss = copy.inCss;
            theme.editor = copy.editor || {};
            theme.searchHelper = copy.searchHelper || {};
            theme.cursorHelper = copy.cursorHelper || {};
            theme.mermaid = copy.mermaid || {};
            theme.customCss = copy.customCss;
            return theme;
        }

        Theme.prototype.setEditorTheme = function(editor, name, callback) {
            this.editor.theme = name;
            var me = this;
            loadEditorTheme(this, function() {
                var div = document.createElement('div');
                div.classList.add('cm-s-' + name);
                document.body.appendChild(div);
                var bgColor = window.getComputedStyle(div, null).getPropertyValue('background-color');
                document.body.removeChild(div);
                editor.setOption("theme", name);
                me.inCss.background = bgColor;
                if (callback) callback();
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
                var hljsThemeFunction = lazyRes.hljsTheme;
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
                var editorThemeFunction = lazyRes.editorTheme;
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
        var SearchUtil = (function() {
            function SearchUtil(cm) {
                this.cm = cm;
            }

            SearchUtil.prototype.startSearch = function(query, callback) {
                var cm = this.cm;
                this.clearSearch();
                var state = getSearchState(cm);
                state.queryText = query;
                state.query = parseQuery(query);
                cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
                this.findNext(false, callback);
            }

            SearchUtil.prototype.clearSearch = function() {
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

            SearchUtil.prototype.replace = function(text) {
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

            SearchUtil.prototype.replaceAll = function(text) {
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

        function SearchHelper(editor) {
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

            var nextHandler = function() {
                searchUtil.findNext(false);
            }

            var previousHandler = function() {
                searchUtil.findNext(true)
            }

            this.keyMap = {
                'Up': previousHandler,
                'Down': nextHandler
            }

            var startSearchHandler = function() {
                var query = ele.find('input').eq(0).val();
                if ($.trim(query) == '') {
                    swal('搜索内容不能为空');
                    return;
                }
                searchUtil.startSearch(query, function(cursor) {
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

            ele.find('.form-control').eq(0).on('keydown', function(event) {
                if (event.key == 'Enter') {
                    startSearchHandler();
                    event.preventDefault();
                }
            });

            ele.find('.form-control').eq(1).on('keydown', function(event) {
                if (event.key == 'Enter') {
                    replaceHandler();
                    event.preventDefault();
                }
            });

            ele.on('click', '[data-search]', startSearchHandler);
            ele.on('click', '[data-down]', nextHandler);
            ele.on('click', '[data-up]', previousHandler);
            ele.on('click', '[data-replace]', replaceHandler);
            ele.on('click', '[data-replace-all]', replaceAllHandler);
            var me = this;
            ele.on('click', '.fa-times', function() {
                me.close();
            });

            this.ele = ele;
            this.visible = false;
            this.editor = editor;
            this.searchUtil = searchUtil;
        }

        SearchHelper.prototype.open = function() {
            this.editor.setOption('readOnly', true);
            this.ele.show();
            this.ele.find('.form-control').focus();
            this.visible = true;
            this.editor.addKeyMap(this.keyMap);
        }

        SearchHelper.prototype.close = function() {
            this.searchUtil.clearSearch();
            this.ele.hide();
            this.ele.find('input').val('');
            this.ele.find(".input-group").eq(0).show();
            this.ele.find(".input-group").eq(1).hide();
            this.editor.setOption('readOnly', false)
            this.visible = false;
            this.editor.removeKeyMap(this.keyMap);
        }

        SearchHelper.prototype.isVisible = function() {
            return this.visible;
        }

        return SearchHelper;

    })();


    ///手机端辅助选中
    var CursorHelper = (function() {
        'use strict';

        var CursorUtil = (function() {
            function CursorUtil(editor) {
                this.from = editor.getCursor('from');
                this.to = editor.getCursor('to');
                this.movedByMouseOrTouch = false;
                var me = this;
                this.cursorActivityHandler = function() {
                    if (me.movedByMouseOrTouch) {
                        if (me.mark) {
                            me.mark.clear();
                        }
                        me.movedByMouseOrTouch = false;
                        me.from = editor.getCursor('from');
                        me.to = editor.getCursor('to');
                    }
                };
                this.movedHandler = function() {
                    me.movedByMouseOrTouch = true;
                };
                this.editor = editor;
            }

            CursorUtil.prototype.init = function() {
                if (this.mark) {
                    this.mark.clear();
                }
                this.editor.on("cursorActivity", this.cursorActivityHandler);
                this.editor.on("mousedown", this.movedHandler);
                this.editor.on("touchstart", this.movedHandler);
            }

            CursorUtil.prototype.move = function(action) {
                var editor = this.editor;
                editor.setCursor(this.to);
                editor.execCommand(action);
                this.to = editor.getCursor('from');
                if (this.mark) {
                    this.mark.clear();
                }
                if (this.from.line > this.to.line || (this.from.line == this.to.line && this.from.ch > this.to.ch)) {
                    this.mark = editor.markText(this.to, this.from, {
                        className: "styled-background"
                    });
                } else {
                    this.mark = editor.markText(this.from, this.to, {
                        className: "styled-background"
                    });
                }
            }

            CursorUtil.prototype.end = function() {
                if (this.mark) {
                    this.mark.clear();
                }
                var editor = this.editor;
                editor.on("cursorActivity", this.cursorActivityHandler);
                editor.on("mousedown", this.movedHandler);
                editor.on("touchstart", this.movedHandler);
                if (this.from.line > this.to.line || (this.from.line == this.to.line && this.from.ch > this.to.ch)) {
                    editor.setSelection(this.to, this.from);
                } else {
                    editor.setSelection(this.from, this.to);
                }
                editor.focus();
            }

            return CursorUtil;
        })();

        function CursorHelper(editor) {
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
            ele.on('click', '[data-arrow]', function() {
                var action = $(this).data('arrow');
                cursorUtil.move(action);
            });
            var me = this;
            ele.on('click', '.fa-times', function() {
                me.close();
            });
            this.editor = editor;
            this.ele = ele;
            this.cursorUtil = cursorUtil;
        }

        CursorHelper.prototype.open = function() {
            this.editor.setOption('readOnly', true);
            this.cursorUtil.init();
            this.ele.show();
        }

        CursorHelper.prototype.close = function() {
            this.ele.hide();
            this.editor.setOption('readOnly', false);
            this.cursorUtil.end();
        }
        return CursorHelper;
    })();


    var _EditorWrapper = (function() {

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
                mode: {
                    name: "gfm"
                },
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
					var markdown =  NearWysiwyg.HtmlPasteHelper.getMarkdownFromPasteHtml(content,wrapper);
					return markdown == null ? '' : markdown;
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

                var changeHandler = function() {
                    wrapper.getExtraEditorSpace();
                }

                editor.on('change', changeHandler);

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
            if (this.config.backup_enable !== false) {
                this.backup = new Backup(this);
            }
            this.innerBar = new InnerBar(this);
            this.inlinePreview = new InlinePreview(this);
            initKeyMap(this);
            initToolbar(this);
            this.fullscreenMode = new FullscreenMode(this);
            this.nearWysiwyg = NearWysiwyg.create(this);
			editor.on('paste', function(editor, evt) {
				var clipboardData, pastedData;
				clipboardData = evt.clipboardData || window.clipboardData;
				var files = clipboardData.files;
				if (files.length > 0) {
					if(wrapper.fileUploadEnable()){
						var f = files[0];
						var type = f.type;
						if (type.indexOf('image/') == -1) {
							swal("请上传图片文件");
							return;
						}
						new FileUpload(f, wrapper).start();
					}
				} else {
					var html = clipboardData.getData('text/html');
					evt.preventDefault();
					evt.stopPropagation();
					var markdown = NearWysiwyg.HtmlPasteHelper.getMarkdownFromPasteHtml(html,wrapper);
					if(markdown != null){
						editor.replaceSelection('\n\n'+markdown);
					} else {
						var text =  clipboardData.getData('text/plain');
						editor.replaceSelection('\n\n'+text);
					}
				}
			});
            if (!mobile) {
                this.enableAutoRender();
            }
            triggerEvent(this, 'load');
        }

        var InlinePreview = (function() {
            function InlinePreview(wrapper) {
                this.wrapper = wrapper;
                this.editor = wrapper.editor;
                this.widget = undefined;
                this.started = false;
            }

            InlinePreview.prototype.start = function() {
                if (this.started) return;
                var editor = this.editor;
                var me = this;

                var changeHandler = function() {
                    if (me.disableCursorActivity !== true) {
                        me.disableCursorActivity = true;
                        me.widget.update();
                    }
                }

                var cursorActivityHandler = function() {
                    if (me.disableCursorActivity === true) {
                        return;
                    }
                    me.widget.update();
                }

                this.widget = new Widget(this);

                var afterRenderHandler = function() {
                    me.disableCursorActivity = false;
                    me.widget.update();
                }
                this.editor.on('cursorActivity', cursorActivityHandler);
                this.editor.on('change', changeHandler);
                this.wrapper.on('afterRender', afterRenderHandler);
                this.afterRenderHandler = afterRenderHandler;
                this.changeHandler = changeHandler;
                this.cursorActivityHandler = cursorActivityHandler;
                this.started = true;

                toast('预览开启')
            }



            InlinePreview.prototype.stop = function() {
                if (!this.started) return;
                if (this.widget) {
                    this.widget.remove();
                }
                this.editor.off('cursorActivity', this.cursorActivityHandler);
                this.editor.off('change', this.changeHandler);
                this.wrapper.off('afterRender', this.afterRenderHandler);
                this.started = false;

                toast('预览关闭')
            }

            InlinePreview.prototype.isStarted = function() {
                return this.started;
            }

            var Widget = (function() {
                var Widget = function(preview) {
                    this.preview = preview;
                    this.create();
                }

                Widget.prototype.create = function() {
                    var editor = this.preview.editor;
                    if (!editor.somethingSelected()) {
                        var nodeStatus = getNodeStatus(editor);
                        var node = nodeStatus.node;
                        if (node) {
                            //create wrap node
                            var div = document.createElement('div');
                            div.classList.add('markdown-body');
                            div.classList.add('inline-preview');
                            div.setAttribute('style', 'visibility:hidden;width:' + editor.getWrapperElement().querySelector('.CodeMirror-code').clientWidth + 'px');
                            div.appendChild(node);
                            var close = document.createElement('i');
                            close.classList.add('fas');
                            close.classList.add('fa-times');
                            close.classList.add('close');
                            div.appendChild(close);
                            var me = this;
                            close.addEventListener('click', function() {
                                me.remove();
                            });
                            this.startLine = nodeStatus.startLine;
                            this.endLine = nodeStatus.endLine;
                            var cursor = editor.getCursor();
                            editor.addWidget({
                                line: 0,
                                ch: 0
                            }, div);
                            $(div).css({
                                top: getWidgetTop(editor) + 'px',
                                visibility: 'visible'
                            });
                            this.preview.wrapper.getExtraEditorSpace();
                            this.widget = div;
                        }
                    }
                }

                Widget.prototype.update = function() {
                    var me = this;
                    if (!this.widget) {
                        this.create();
                    } else {
                        var editor = this.preview.editor;
                        if (!editor.getWrapperElement().contains(this.widget)) {
                            this.remove();
                            this.create();
                        } else {
                            if (editor.somethingSelected()) {
                                this.hide();
                            } else {
                                var nodeStatus = getNodeStatus(editor);
                                var node = nodeStatus.node;
                                if (!node) {
                                    this.hide();
                                } else {
                                    this.hide();
                                    var rootNode = this.widget.firstChild;
                                    morphdom(rootNode, node);
                                    this.show();
                                }
                            }
                        }
                    }
                }

                Widget.prototype.hide = function() {
                    if (this.widget)
                        $(this.widget).css({
                            'visibility': 'hidden'
                        });
                }

                Widget.prototype.show = function() {
                    if (this.widget) {
                        var top = getWidgetTop(this.preview.editor);
                        $(this.widget).css({
                            'top': top + 'px',
                            'visibility': 'visible'
                        });
                    }
                }

                Widget.prototype.remove = function() {
                    var me = this;
                    if (this.widget) {
                        me.widget.remove();
                        me.widget == undefined;
                    }
                }

                var getNodeStatus = function(editor) {
                    var line = editor.getCursor().line;
                    var node;
                    var endLine;
                    var startLine;
                    $("#heather_out").find('[data-line]').each(function() {
                        var _startLine = parseInt(this.getAttribute('data-line'));
                        var _endLine = parseInt(this.getAttribute('data-end-line')) - 1;
                        if (_startLine <= line && _endLine >= line) {
                            node = this;
                            endLine = _endLine;
                            startLine = _startLine;
                            return false;
                        }
                        if (_startLine > line) {
                            return false;
                        }
                    });
                    return {
                        node: node ? node.cloneNode(true) : node,
                        endLine: endLine,
                        startLine: startLine,
                    };
                }

                function getWidgetTop(editor) {
                    var lh = editor.defaultTextHeight();
                    return editor.charCoords(editor.getCursor(), "local").top + lh * 3.5;
                }

                return Widget;
            })();

            return InlinePreview;
        })();

        var InnerBar = (function() {
            function InnerBar(wrapper) {
                var bar = new Bar($("#heather_innerBar")[0]);
                bar.hide();
                this.bar = bar;
                this.wrapper = wrapper;
                init(this);
            }

            function init(bar) {
                var config = bar.wrapper.config;
                var innerBar = bar.bar;
                var wrapper = bar.wrapper;
                var editor = wrapper.editor;
                var icons = config.innerBar_icons || ['emoji', 'upload', 'heading', 'bold', 'italic', 'quote', 'strikethrough', 'link', 'code', 'code-block', 'uncheck', 'check', 'table', 'move', 'undo', 'redo', 'close'];
                for (var i = 0; i < icons.length; i++) {
                    var icon = icons[i];
                    if (icon == 'upload' && wrapper.fileUploadEnable()) {
                        var label = document.createElement('label');
                        label.setAttribute('class', 'icon fas fa-upload');
                        label.setAttribute('style', 'display: inline-block;')
                        label.innerHTML = '<input type="file" accept="image/*" style="display:none"/>';
                        label.querySelector('input[type="file"]').addEventListener('change', function() {
                            var file = this.files[0];
                            this.value = null;
                            if (file.name)
                                new FileUpload(file, wrapper).start();
                        })
                        innerBar.addElement(label, 0);
                    }
                    if (icon == 'emoji') {
                        innerBar.addIcon('far fa-grin-alt icon', function() {
                            wrapper.execCommand('emoji');
                        })
                    }

                    if (icon == 'heading') {
                        innerBar.addIcon('fas fa-heading icon', function() {
                            wrapper.execCommand('heading');
                        })
                    }
                    if (icon == 'bold') {
                        innerBar.addIcon('fas fa-bold icon', function() {
                            wrapper.execCommand('bold');
                        })
                    }
                    if (icon == 'italic') {
                        innerBar.addIcon('fas fa-italic icon', function() {
                            wrapper.execCommand('italic');
                        })
                    }
                    if (icon == 'quote') {
                        innerBar.addIcon('fas fa-quote-left icon', function() {
                            wrapper.execCommand('quote');
                        })
                    }

                    if (icon == 'strikethrough') {
                        innerBar.addIcon('fas fa-strikethrough icon', function() {
                            wrapper.execCommand('strikethrough');
                        })
                    }

                    if (icon == 'link') {
                        innerBar.addIcon('fas fa-link icon', function() {
                            wrapper.execCommand('link');
                        })
                    }

                    if (icon == 'code') {
                        innerBar.addIcon('fas fa-code icon', function() {
                            wrapper.execCommand('code');
                        })
                    }

                    if (icon == 'code-block') {
                        innerBar.addIcon('fas fa-file-code icon', function() {
                            wrapper.execCommand('codeBlock');
                        })
                    }

                    if (icon == 'uncheck') {
                        innerBar.addIcon('far fa-square icon', function() {
                            wrapper.execCommand('uncheck');
                        })
                    }

                    if (icon == 'check') {
                        innerBar.addIcon('far fa-check-square icon', function() {
                            wrapper.execCommand('check');
                        })
                    }

                    if (icon == 'table') {
                        innerBar.addIcon('fas fa-table icon', function() {
                            wrapper.execCommand('table');
                        })
                    }

                    if (icon == 'undo') {
                        innerBar.addIcon('fas fa-undo icon', function() {
                            wrapper.editor.execCommand('undo');
                        })
                    }

                    if (icon == 'redo') {
                        innerBar.addIcon('fas fa-redo icon', function() {
                            wrapper.editor.execCommand('redo');
                        })
                    }

                    if (icon == 'move') {
                        innerBar.addIcon('fas fa-arrows-alt icon pc-hide', function() {
                            wrapper.cursorHelper.open();
                        })
                    }

                    if (icon == 'close') {
                        innerBar.addIcon('fas fa-times icon', function() {
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
                    editor.on('cursorActivity', function() {
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

            InnerBar.prototype.pos = function() {
                if (!mobile) {
                    var editor = this.wrapper.editor;
                    var lh = editor.defaultTextHeight();
                    this.bar.element.css({
                        "top": (editor.cursorCoords(true).top + 2 * lh) + "px",
                    });
                    this.bar.show();
                }
            }

            InnerBar.prototype.isKeepHidden = function() {
                return this.bar.keepHidden;
            }

            InnerBar.prototype.keepHidden = function() {
                this.bar.keepHidden = true;
                this.bar.hide();
            }

            InnerBar.prototype.unkeepHidden = function() {
                this.bar.keepHidden = false;
            }

            InnerBar.prototype.show = function() {
                this.bar.show();
            }

            InnerBar.prototype.hide = function() {
                this.bar.hide();
            }

            return InnerBar;
        })();

        function initKeyMap(wrapper) {
            var keyMap = mac ? {
                "Ctrl-B": 'bold',
                "Ctrl-I": 'italic',
                "Shift-Cmd-T": 'table',
                "Ctrl-H": 'heading',
                "Ctrl-L": 'link',
                "Ctrl-Q": 'quote',
                "Shift-Cmd-B": 'codeBlock',
                "Shift-Cmd-U": 'uncheck',
                "Shift-Cmd-I": 'check',
                'Ctrl-S': 'search',
                "Cmd-Enter": function() {
                    if (wrapper.inFullscreen()) {
                        wrapper.exitFullScreen();
                    } else {
                        wrapper.requestFullScreen();
                    }
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
                'Alt-S': 'search',
                "Ctrl-Enter": function() {
                    if (wrapper.inFullscreen()) {
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
                    } catch (e) {console.log(e);}
                }
            }
        }

        EditorWrapper.prototype.enableAutoRender = function() {
            if (this.autoRenderEnable === true) return;
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
            this.editor.on('change', autoRenderHandler);
            this.autoRenderHandler = autoRenderHandler;
            this.autoRenderEnable = true;
        }

        EditorWrapper.prototype.disableAutoRender = function() {
            if (this.autoRenderEnable === true) {
                this.autoRenderEnable = false;
                this.editor.off('change', this.autoRenderHandler);
                if (this.autoRenderTimer) {
                    clearTimeout(this.autoRenderTimer);
                }
            }
        }

        EditorWrapper.prototype.getExtraEditorSpace = function() {
            if (this.disableExtraEditorSpace === true) return;
            var timer = this.extraEditorSpaceTimer;
            if (timer) {
                clearTimeout(timer);
            }
            var me = this;
            this.extraEditorSpaceTimer = setTimeout(function() {
                var min = me.config.minLine || 7;
                var length = me.config.lineLength || 15;
                var editor = me.editor;
                var lh = editor.defaultTextHeight();
                editor.focus();
                var cursor = editor.getCursor();
                var bottom = $(window).height() - editor.charCoords(cursor).top;
                if (bottom < min * lh) {
                    var space = length * lh;
                    $('.CodeMirror-code').css({
                        'margin-bottom': space + 'px'
                    });
                    $('#heather_out').css({
                        'padding-bottom': space + 'px'
                    })
                    var elem = editor.getScrollerElement();
                    var scrollTo = editor.charCoords(cursor, 'local').top - space;
                    var bar = me.innerBar;
                    var keepHidden = !bar.isKeepHidden();
                    if (keepHidden)
                        bar.keepHidden();
                    $(editor.getScrollerElement()).stop(true).animate({
                        scrollTop: scrollTo
                    }, 'slow', function() {
                        if (keepHidden) {
                            bar.unkeepHidden();
                            bar.pos();
                        }
                    });
                }
            }, 200)
        }

        EditorWrapper.prototype.fileUploadEnable = function() {
            return !isUndefined(this.config.upload_url) && !isUndefined(this.config.upload_finish);
        }

        EditorWrapper.prototype.execCommand = function(name) {
			if(this.nearWysiwyg.isEnabled === true){
				this.nearWysiwyg.execCommand(name);
				return ;
			}
            var handler = commands[name];
            if (!isUndefined(handler)) {
                handler.call(null, this);
            }
        }

        EditorWrapper.prototype.doRender = function(patch,options) {
            this.render.renderAt(this.editor.getValue(), $("#heather_out")[0], patch,options);
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

        var FullscreenMode = (function() {
            function FullscreenMode(wrapper) {
                this.fullscreen = false;
                this.keyMap = createKeyMap(wrapper);
                this.wrapper = wrapper;
                var editor = this.wrapper.editor;
                this.outToEditorHandler = function(e) {
                    var key = e.key;
                    if ((e.ctrlKey || e.metaKey) && key == 'ArrowLeft') {
                        $("#heather_out").removeAttr("tabindex");
                        wrapper.toEditor(function() {
                            editor.focus();
                            var info = editor.state.fullScreenRestore;
                            window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }
                this.tocToEditorHandler = function(e) {
                    var key = e.key;
                    if ((e.ctrlKey || e.metaKey) && key == 'ArrowRight') {
                        $("#heather_toc").removeAttr("tabindex");
                        wrapper.toEditor(function() {
                            editor.focus();
                            var info = editor.state.fullScreenRestore;
                            window.scrollTo(info.scrollLeft, info.scrollTop);
                        });
                    }
                }
            }

            FullscreenMode.prototype.on = function() {
                if (this.fullscreen) return;
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

            FullscreenMode.prototype.isFullscreen = function() {
                return this.fullscreen;
            }

            FullscreenMode.prototype.off = function() {
                if (!this.fullscreen) return;
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

            function createKeyMap(wrapper) {
                var cm = wrapper.editor;
                var wrap = cm.getWrapperElement();

                var toPreviewHandler = function() {
                    wrapper.toPreview(function() {
                        $("#heather_out").prop('tabindex', 0);
                        $("#heather_out").focus();
                    });
                };

                var toTocHandler = function() {
                    wrapper.toToc(function() {
                        $("#heather_toc").prop('tabindex', 0);
                        $("#heather_toc").focus();
                    });
                };

                var toggleInlinePreviewHandler = function() {
                    var inlinePreview = wrapper.inlinePreview;
                    if (inlinePreview.isStarted()) {
                        inlinePreview.stop();
                    } else {
                        inlinePreview.start();
                    }
                }


                return mac ? {
                    'Cmd-Right': toPreviewHandler,
                    'Cmd-Left': toTocHandler,
                    'Cmd-P': toggleInlinePreviewHandler
                } : {
                    'Ctrl-Right': toPreviewHandler,
                    'Ctrl-Left': toTocHandler,
                    'Ctrl-P': toggleInlinePreviewHandler
                }
            }

            return FullscreenMode;

        })();

        EditorWrapper.prototype.requestFullScreen = function() {
            if (!mobile) {
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
                this.editor.off('scroll', this.scrollHandler);
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
			this.editor.refresh();
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
                    if (me.config.disableWysiwyg !== true) {
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
            this.editor.setOption('theme', 'default');
            this.theme = this.themeHandler.reset();
            this.theme.render();
        }

        EditorWrapper.prototype.bindKey = function(map) {
            var keyMap = {};
            var me = this;
            Object.keys(map).forEach(function(key, index) {
                var o = map[key];
                if (typeof o === 'string') {
                    var handler = commands[o];
                    if (!isUndefined(handler)) {
                        var newHandler = function() {
                            handler.call(null, me);
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
            for (var i = 0; i < keys.length; i++) {
                for (var j = 0; j < keyMaps.length; j++) {
                    delete keyMaps[j][keys[i]];
                }
            }
        }

        EditorWrapper.prototype.getOutElement = function(keys) {
            return document.getElementById('heather_out');
        }
		
		EditorWrapper.prototype.triggerEvent = function(name,args) {
			triggerEvent(this,name,args)
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
                            theme.setEditorTheme(editor, _theme, function() {
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
                        href:lazyRes.colorpickerCss
                    });
                    $('<script>').appendTo('body').attr({
                        id: 'colorpicker-js',
                        src: lazyRes.colorpickerJs
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
                    wrapper.toolbar.addIcon('fas fa-search icon', function() {
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
                    wrapper.toolbar.addIcon('far fa-file icon', newDocumentHandler);
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

        return EditorWrapper;
    })();



    //======================================== 2.0
    var NearWysiwyg = (function() {

        var editorFactories = [];
        var commands = [];
		
		//TODO need more ? 
		var keyAlias = {
			'Ctrl' : 'Control'
		}
		
		
		var HtmlPasteHelper = (function(){
			
			var attributeRule = {
				'img':['src','title','alt'],
				'a':['href','title']
			}
			
			var unwrapSet = new Set(['DIV','ARTICLE']);
			var nodeHandler = {
				'p':{remove:function(node){
					//remove <p><br></p> node
					var childNodes = node.childNodes;
					return childNodes.length == 1 && childNodes[0].nodeType == 1 && childNodes[0].tagName == 'BR';
				}},
				'svg':{remove:true},
				'span':{
					remove:function(node){
						if(node.innerHTML == '&nbsp;'){
							$(node).after(' ');
						}
						var parent = node.parentNode;
						while (node.firstChild) parent.insertBefore(node.firstChild, node);
						return true;
					}
				},
				'*':{remove:function(node){
					if(!node.hasChildNodes()){
						if(node.blockDefault()) return node.tagName != 'TD' && node.tagName != 'TH';
						var tagName = node.tagName;
						return tagName == 'A';//TODO need more
					}
					
					return false;
				}}
			}	
			
			var cleanAttribute = function(node){
				removeAttributes(node,function(n,attr){
					var attributes = (attributeRule[n.tagName.toLowerCase()] || attributeRule['*']) || [];
					for(const _attr of attributes){
						if(_attr === attr.name){
							return false;
						}
					}
					return true;
				})
			}
			
			var cleanNode = function(root,node){
				var remove = false;
				var nodeType = node.nodeType;
				if(nodeType != 1){
					if(nodeType != 3)
						remove = true;
				} else {
					var handler = nodeHandler[node.tagName.toLowerCase()] || nodeHandler['*'];
					
					if(!isUndefined(handler)){
						if(handler.ignore === true) return;
						if(typeof handler.remove  === 'function'){
							remove = handler.remove(node) === true;
						} else {
							remove = handler.remove === true;
						}
					}
				}
				
				if(remove){
					var parent = node.parentNode;
					//need to check parent node again;
					node.remove();
					if(parent != null){
						cleanNode(root,parent);
					}
				}
				
				if(!root.contains(node)) return ;
				var childNodes = node.childNodes;
				for(const node of childNodes){
					cleanNode(root,node);
				}
			}
			
			
			var getMarkdownFromPasteHtml = function(html,wrapper){
				var nodes = getNodesFromPasteHTML(html);
				if(nodes.length > 0){
					var markdown = '';
					var i = 0;
					for(const node of nodes){
						if(node.hasAttribute('data-html')){
							node.removeAttribute('data-html');
							markdown += node.outerHTML;
						} else {
							markdown += wrapper.turndownService.turndown(node.outerHTML);
						}
						if(i < nodes.length - 1){
							markdown += '\n\n';
						}
						i++;
					}
					return markdown;
				}
				
				return null;
			}
			
			
			function getNodesFromPasteHTML(html){
				var root = parseHTML(html).body;
				unwrapNode(unwrapSet,root);
				var childNodes = root.childNodes;
				var nodes = [];
				for(const childNode of childNodes){
					var _nodes = [];
					var node = childNode;
					var nodeType = node.nodeType;
					if(nodeType != 1 && nodeType != 3) continue;
					if(nodeType == 3){
						var nodeValue = node.nodeValue;
						if(isEmptyText(nodeValue)){
							continue;
						}
						var p = document.createElement('p');
						p.innerHTML = nodeValue;
						_nodes.push(p);
					} else {
						_nodes.push(node);
					}
					for(const _node of _nodes){
						var n = _node;
						var factory = getEditorFactoryByElement(n); 
						if(factory != null && hasMethod(factory,'processPasteNode')){
							n =  factory.processPasteNode(n);
							cleanAttribute(n);
						} else {
							cleanNode(root,n);
							if(!root.contains(n)) continue;
							cleanAttribute(n);
							if(factory == null){
								n.setAttribute('data-html','')
							}
						}
						nodes.push(n);
					}
					
				}
				return nodes;
			}
			
			function unwrapNode(tagNames,node){
				if(tagNames.has(node.tagName)){
					node.normalize();
					var array = [];
					var array2 = [];
					var childNodes = node.childNodes;
					if (childNodes.length > 0) {
						for (var i = 0; i < childNodes.length; i++) {
							var childNode = childNodes[i];
							if (childNode.nodeType == 1) {
								if (childNode.blockDefault()) {
									
									if(array.length > 0){
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
						if(array.length > 0){
							array2.push(array);
						}
					}
					for(const array of array2){
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
					while (node.firstChild){
						var first = node.firstChild;
						parent.insertBefore(first, node);
						nodes.push(first);
					};
					parent.removeChild(node);
					for(const _node of nodes){
						unwrapNode(tagNames,_node);
					}
				} else {
					var children = node.children;
					for(const child of node.children){
						unwrapNode(tagNames,child);
					}
				}
			}
			
			function removeAttributes(element,checker){
				var attrs = element.attributes;
				for(var i = attrs.length - 1; i >= 0; i--) {
					if(checker(element,attrs[i]) === true){
						element.removeAttribute(attrs[i].name);
					}
				}
				for(const child of element.children){
					removeAttributes(child,checker);
				}
			}
			
			return {
				getMarkdownFromPasteHtml : getMarkdownFromPasteHtml,
				attributeRule:attributeRule,
				nodeHandler:nodeHandler
			}
			
		})();
		
		var htmlPasteEventListener = function(e){
			var editor = this;
			var isRoot = isUndefined(editor.parent);
			if(!isRoot){
				plainPasteHandler(e);
				return ;
			}
			var html = (e.originalEvent || e).clipboardData.getData('text/html');
			e.preventDefault();
			e.stopPropagation();
			
			var markdown = HtmlPasteHelper.getMarkdownFromPasteHtml(html,editor.wrapper);
			if(markdown != null){
				var element = editor.getElement();
				var next = element.nextElementSibling;
				var prev = element.previousElementSibling;
				editor.stop();
				var cm = editor.wrapper.editor;
				if(next == null){
					var addFirstLine = prev != null || editor.wrapper.getOutElement().contains(element);
					if(addFirstLine)
						markdown = '\n\n'+markdown;
					cm.replaceRange(markdown, CodeMirror.Pos(cm.lineCount()-1));
				} else {
					var line = parseInt(next.getAttribute('data-line'));
					if($.isNumeric(line)){
						cm.replaceRange(markdown+'\n\n', {line:line,ch:0});
					}
				}	
				editor.wrapper.doRender(true);	
			}
		}
		

        function NearWysiwyg(wrapper) {
            this.wrapper = wrapper;
            this.editor = wrapper.editor;
            this.rootElem = wrapper.getOutElement();
            this.inlineMath = new InlineMath(this.wrapper);
			this.keyMap = [];
            this.wrapper.turndownService.addRule('mermaid', {
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

            this.wrapper.turndownService.addRule('katex-inline', {
                filter: function(node) {
                    return node.hasAttribute('data-inline-katex');
                },

                replacement: function(content, node) {
                    return '$' + getKatexExpression(node) + '$';
                }
            });
            this.wrapper.turndownService.addRule('katex-block', {
                filter: function(node) {
                    return node.hasAttribute('data-block-katex');
                },

                replacement: function(content, node) {
					var expression = getKatexExpression(node);
					if(!expression.startsWith('\n')){
						expression = '\n' + expression;
					}
					if(!expression.endsWith('\n')){
						expression += '\n';
					}
                    return '\n\n$$' + expression + '$$\n\n';
                }
            });
            this.wrapper.turndownService.addRule('html-inline', {
                filter: function(node) {
                    return node.hasAttribute('data-inline-html');
                },

                replacement: function(content, node) {
                    node.removeAttribute('data-inline-html');
                    return node.outerHTML;
                }
            });
			initDefaultKey(this);
			var me = this;
			this.observer = new MutationObserver(function(records) {
				//detect need update 
				//TODO need more check at editor's level
				me.currentEditor.needUpdate = true;
			});
			this.wrapper.on('wysiwyg.editor.create',function(editor){
				if(editor.getElement().hasAttribute('data-line')){
					editor.startLine = parseInt(editor.getElement().getAttribute('data-line'));
					editor.endLine = parseInt(editor.getElement().getAttribute('data-end-line'));
				}
			});
			
			this.wrapper.on('wysiwyg.editor.start',function(editor){
				me.currentEditNextElement = getNextEditElement(editor.getElement(),me);
				me.currentEditPrevElement = getPrevEditElement(editor.getElement(),me);
				me.currentEditor = editor;
				me.observer.observe(editor.getElement(), {
					childList: true,
					subtree:true,
					attribute:true,
					characterData:true
				});
				markOnEdit(me,editor);
			});
			this.wrapper.on('wysiwyg.editor.embed.start',function(editor){
				markOnEdit(me,editor);
			});
			
			this.wrapper.on('wysiwyg.editor.embed.stop',function(edt){
				var editor = me.currentEditor;
				var element = editor.getElement();
				editor.elementRemoved = !me.rootElem.contains(element);
				var hasLine = !isUndefined(editor.startLine);
				if(!hasLine || editor.elementRemoved === true || editor.needUpdate === true){
					updateElementToMarkdownSource(me,hasLine,editor.startLine,editor.endLine,element,{updateAttributeOnly:true});
					editor.startLine = parseInt(element.getAttribute('data-line'));
					editor.endLine = parseInt(element.getAttribute('data-end-line'));
					editor.needUpdate = false;
					editor.needRender = true;
				}
				
				markOnEdit(me,edt.parent);
			});
			this.wrapper.on('wysiwyg.editor.stop',function(editor){
				me.observer.disconnect();
				me.currentEditor = undefined;
				if(editor.elementRemoved === true){
					return ;
				}
				var element = editor.getElement();
				editor.elementRemoved = !me.rootElem.contains(element);
				var hasLine = !isUndefined(editor.startLine);
				if(!hasLine || editor.elementRemoved === true || editor.needUpdate === true){
					var elem = updateElementToMarkdownSource(me,hasLine,editor.startLine,editor.endLine,element,{updateAttributeOnly:false});
					editor.element = elem;
				} else if(editor.needRender === true){
					var markdown = me.wrapper.turndownService.turndown(cleanHtml(element.outerHTML));
					var html = me.wrapper.render.getPreviewHtml(markdown);
					var dom = parseHTML(html).body.firstElementChild;
					if(dom != null && dom.tagName == element.tagName){
						cloneAttributes(dom,element);
						editor.element =  morphdom(element,dom);
						renderKatexAndMermaid(editor.element);
					}
					editor.needRender = false;
				}
				markOnEdit(me);
			});		
        }
		
		NearWysiwyg.prototype.refresh = function(){
			this.stopEdit();
			this.wrapper.doRender(false);
		}
		

		/// can not be used to delete katex || mermaid node
		NearWysiwyg.prototype.delete = function() {
            if (this.isEnable !== true) return;
            if(this.currentEditor) return;
			var rangeInfo = getRangeInfo(this.rootElem);
			var range = rangeInfo.range;
			var sel = rangeInfo.sel;
			if(range != null){
				if(sel.type != 'Range') return ;
				var contents = range.cloneContents();
				var selected = contents.querySelectorAll("[data-line]");
				var cm = this.editor;
				if(selected.length > 0){
					range.deleteContents();
					var markdown = "";
					var firstLine = parseInt(selected[0].getAttribute('data-line'));
					var lastLine = parseInt(selected[selected.length-1].getAttribute('data-end-line'));
					for(const select of selected){
						var elem = this.rootElem.querySelector('[data-line="'+select.getAttribute('data-line')+'"]');
						if( elem != null){
							markdown += this.wrapper.turndownService.turndown(cleanHtml(elem.outerHTML));
							markdown += '\n\n';
						}
					}
					cm.replaceRange(markdown, {
                        line: firstLine,
                        ch: 0
                    }, {
                        line: lastLine,
                        ch: 0
                    });
					this.wrapper.doRender(false);
				} else {
					var ancestor = range.commonAncestorContainer;
					if(ancestor != null){
						var node = ancestor;
						if(ancestor.nodeType == 3){
							node = ancestor.parentElement;
						} 
						while(node != null){
							if(node.hasAttribute('data-line')){
								break;
							}
							node = node.parentElement;
						}
						if(node != null){
							range.deleteContents();
							updateElementToMarkdownSource(this, true, parseInt(node.getAttribute('data-line')),  parseInt(node.getAttribute('data-end-line')), node,{render:false});	
							this.wrapper.doRender(false);
						}
					}
				}
			}
        }
		
		NearWysiwyg.prototype.undo = function() {
			if(!this.currentEditor){
				this.editor.execCommand('undo');
				this.wrapper.doRender(true);
			}
        }
		
		NearWysiwyg.prototype.redo = function() {
			if(!this.currentEditor){
				this.editor.execCommand('redo');
				this.wrapper.doRender(true);
			}
        }
		
        NearWysiwyg.prototype.disable = function() {
            if (this.isEnable !== true) return;
            this.bar.remove();
            this.stopEdit();
            this.wrapper.disableExtraEditorSpace = false;
            this.wrapper.enableAutoRender();
            this.rootElem.classList.remove('heather_wysiwyg');
            $(this.rootElem).off('click', '[data-line]', this.clickHandler);
			document.removeEventListener('keydown',this.keydownHandler);
			document.removeEventListener('keyup',this.keyupHandler);
            this.isEnable = false;
			this.wrapper.editor.setOption('readOnly',false);
			this.wrapper.triggerEvent('wysiwyg.disable',this);
            toast('所见即所得模式关闭');
        }

        NearWysiwyg.prototype.enable = function() {
            if (this.isEnable === true) return;
            this.rootElem.classList.add('heather_wysiwyg');
            this.wrapper.doRender(true);
            this.wrapper.disableExtraEditorSpace = true;
            this.wrapper.disableAutoRender();
			this.wrapper.disableSync();
			this.wrapper.editor.setOption('readOnly',true);

            var me = this;

            var clickHandler = function(e) {
				//check is range select
				var rangeInfo = getRangeInfo(me.rootElem);
				var range = rangeInfo.range;
				var sel = rangeInfo.sel;
				if(range != null && sel.type == 'Range') return ;
                var elem = e.target;
                while (elem != null) {
                    if (elem.hasAttribute('data-line')) {
                        break;
                    }
                    elem = elem.parentElement;
                }
                if (me.currentEditor) {
                    if (me.currentEditor.getElement() != elem) {
                        me.stopEdit();
                    } else {
                        return;
                    }
                }
                if (elem.hasAttribute('data-html')) {
                    toast('无法编辑由原生html生成的块', 'error');
                    return;
                }
                var factory = getEditorFactoryByElement(elem);
                if (factory != null) {
					startEdit(me, elem ,e.target);
                } else {
                    toast('没有找到合适的编辑器', 'error')
                }
            }
            $(this.rootElem).on('click', '[data-line]', clickHandler);

            //add toolbar 
            var toolbar = document.createElement('div');
            toolbar.classList.add('heather_wysiwyg_toolbar');
            $("#heather_wrapper").append(toolbar);
            var bar = new Bar(toolbar);

            bar.addIcon('fas fa-plus middle-icon', function() {
				me.execCommand('factories');
            });
			bar.addIcon('fas fa-cubes middle-icon', function() {
				me.execCommand('contextmenu');
            });
			var catchMap = {};
			var keyMap = this.keyMap;
			var keydownTimer;
			
			var keydownHandler = function(e){
				var key = e.key.toLowerCase();
				catchMap[key] = true;
				var kms = [];
				out : for(const km of keyMap){
					var keys = km.keys;
					for(const key of keys){
						if(catchMap[key] !== true){
							continue out;
						}
					}
					kms.push(km);
				}
				if(kms.length > 0){
					
					kms.sort(function(a,b){
						var la = a.keys.length;
						var lb = b.keys.length;
						return la > lb ? -1 : la == lb ? 0 : 1;
					});
					try{
						kms[0].handler.call(me,e);
					}catch(e){console.log(e);}
					catchMap = {};
				}
			}
			
			var keyupHandler = function(e){
				delete catchMap[e.key.toLowerCase()];
			}
			
			document.addEventListener('keydown',keydownHandler);
			document.addEventListener('keyup',keyupHandler);			

			this.keydownHandler = keydownHandler;
			this.keyupHandler = keyupHandler;
            this.clickHandler = clickHandler;
            this.isEnable = true;
            this.bar = bar;
			this.wrapper.triggerEvent('wysiwyg.enable',this);
            toast('所见即所得模式开启');
        }
		
		NearWysiwyg.prototype.unbindKey = function(keys){
			for(const key of keys){
				var newKeys = renameKeys(key.split('-'));
				for(var i=0;i<this.keyMap.length;i++){
					var _key = this.keyMap[i];
					if(JSON.stringify(_key.keys)==JSON.stringify(newKeys)){
						this.keyMap.splice(i,1);
						break;
					}
				}
			}
		}
		
		NearWysiwyg.prototype.bindKey = function(keymap) {
			var me = this;
			Object.keys(keymap).forEach(function(key, index) {
				var keys = key.split('-');
				if(keys.length > 0){
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
					
					for(var i=0;i<me.keyMap.length;i++){
						var key = me.keyMap[i];
						if(JSON.stringify(key.keys)==JSON.stringify(newKeys)){
							me.keyMap.splice(i,1);
							break;
						}
					}
					
					me.keyMap.push({
						keys : newKeys,
						handler : handler 
					})
					
				}
			});
        }

        NearWysiwyg.prototype.execCommand = function(name) {
            if (this.isEnable !== true) return;
            var command = commands[name];
            if (command) {
                command.call(this);
            }
        }
		
		NearWysiwyg.prototype.stopEdit = function(embed) {
             if (this.currentEditor) {
				 if(embed === true){
					var depthestChild = getDepthestChild(this);
					if(depthestChild != null){
						depthestChild.stop();
						return ;
					}
				 }
				this.currentEditor.stop();
            }
        }
		
		NearWysiwyg.prototype.insertFile = function(info) {
            var depthestChild = getDepthestChild(this);
			if (depthestChild != null) {
				if(hasMethod(depthestChild,'insertFile')){
					depthestChild.insertFile(info);
				}
            } else {
				var editor = this.currentEditor;
				if(editor != null && hasMethod(editor,'insertFile')){
					editor.insertFile(info);
				}
			}
        }
		
		//edit next element
		//if there's no current editor
		//editor first element
		//if there's no element
		//do nothing
		NearWysiwyg.prototype.editNext = function(embed) {
            if(this.currentEditor){
				if(embed === true && 
					hasMethod(this.currentEditor,'editNextEmbed') && 
					this.currentEditor.editNextEmbed() === true){
					return
				}
				//find next element that's has data-line attribute;
				var editor = this.currentEditor;
				this.stopEdit();
			}
			if(this.currentEditNextElement != null){
				startEdit(this,this.currentEditNextElement);
			}
        }
		
		NearWysiwyg.prototype.editPrev = function(embed) {
             if(this.currentEditor){
				if(embed === true && 
					hasMethod(this.currentEditor,'editPrevEmbed') && 
					this.currentEditor.editPrevEmbed() === true){
					return
				}
				//find prev element that's has data-line attribute;
				var editor = this.currentEditor;
				this.stopEdit();
			}
			
			if(this.currentEditPrevElement != null){
				startEdit(this,this.currentEditPrevElement);
			} 
			
        }
		
		function getNextEditElement(element,wysiwyg){
			var next = element.nextElementSibling;
			while(next != null){
				if(getEditorFactoryByElement(next) != null){
					return next;
				}
				next = next.nextElementSibling;
			}
			if(next == null){
				for(const child of wysiwyg.rootElem.children){
					if(getEditorFactoryByElement(child) != null){
						return child;
					}
				}	
			}
			return null;
		}
		
		function getPrevEditElement(element,wysiwyg){
			var prev = element.previousElementSibling;
			while(prev != null){
				if(getEditorFactoryByElement(prev) != null){
					return prev;
				}
				prev = prev.previousElementSibling;
			}
			if(prev == null){
				var children = wysiwyg.rootElem.children;
				for(var i=children.length-1;i>=0;i--){
					if(getEditorFactoryByElement(children[i]) != null){
						return children[i];
					}
				}
			}
			return null;
		}
		function markOnEdit(wysiwyg,editor){
			var old = wysiwyg.rootElem.querySelector('[data-edit]');
			if(old != null)
				old.removeAttribute('data-edit');
			if(editor)
				editor.getElement().setAttribute('data-edit','');
		}
		
		function getDepthestChild(wysiwyg){
			if(!wysiwyg.currentEditor) return null;
			var child = wysiwyg.currentEditor.child;
			if(!isUndefined(child)){
				//find nested child
				var depthestChild = child;
				while(true){
					var chd = depthestChild.child;
					if(isUndefined(chd)){
						break;
					}
					depthestChild = chd;
				}
				return depthestChild;
			}
			return null;
		}
		
		//TODO need more test
		function initDefaultKey(wysiwyg){
			//I do not have a mac ...
			var keyMap = mac ? {
               
            } : {
				'Alt-/' : 'factories',
				'Alt-O' : 'contextmenu',
                "Ctrl-B": 'bold',
                "Ctrl-I": 'italic',
                "Ctrl-L": 'link',
                "Ctrl-R": 'removeFormat',
                "Ctrl-D": 'code',
				'Tab':function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.editNext(true);
				},
				'Shift-Tab':function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.editNext();
				},
				'Ctrl-ArrowUp':function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.editPrev(true);
				},
				'Ctrl-S' : function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.stopEdit();
				},
				'Ctrl-Z' : function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.undo();
				},
				'Ctrl-Y' : function(e){
					e.preventDefault();
					e.stopPropagation();
					wysiwyg.redo();
				},
				'Backspace' :function(e){
					if(!wysiwyg.currentEditor){
						e.preventDefault();
						e.stopPropagation();
						wysiwyg.delete();
					}
				}
            }
            wysiwyg.bindKey(keyMap);
		}
		
		function renameKeys(keys){
			var newKeys = [];
			for(const key of keys){
				var alias = keyAlias[key];
				var newKey = (alias ? alias : key).toLowerCase();
				newKeys.push(newKey);
			}
			return newKeys;
		}

        function updateElementToMarkdownSource(wysiwyg, hasLine, startLine, endLine, elem,renderOption) {
			renderOption = renderOption || {};
            var rootElem = wysiwyg.rootElem;
            var cm = wysiwyg.editor;
            var wrapper = wysiwyg.wrapper;
			var endLineConfict = rootElem.querySelector('[data-line="'+endLine+'"]') != null;
			var render = function(){
				var children = parseHTML(wrapper.render.getPreviewHtml(wrapper.getValue())).body.children;
				var rootChildren = rootElem.children;
				var newElem = elem;
				if(children.length == rootChildren.length){
					for(var i=0;i<children.length;i++){
						var rootChild = rootChildren[i];
						var child = children[i];
						cloneAttributes(rootChild,child);
						if(rootChild === elem && renderOption.updateAttributeOnly !== true){
							//
							newElem = morphdom(rootChild,child);
							renderKatexAndMermaid(newElem);
						}
					}
				} else {
					//should not got here ? 
					wrapper.doRender(true);
				}
				return newElem;
			}
            if (rootElem.contains(elem)) {
                var markdown = wrapper.turndownService.turndown(cleanHtml(elem.outerHTML));
                if (hasLine) {
					var nextLine = endLineConfict ? cm.getLine(endLine) :  endLine < cm.lineCount() - 1 ? cm.getLine(endLine + 1) : "";
                    if(nextLine.trim() != ''){
						markdown += '\n\n';
					}
                    cm.replaceRange(markdown, {
                        line: startLine,
                        ch: 0
                    }, {
                        line: endLineConfict?endLine : endLine + 1,
                        ch: 0
                    });
                } else {
					var next = elem.nextElementSibling;
                    if (next == null) {
                        var prev = elem.previousElementSibling;
						cm.refresh();
						var startLine = cm.lineCount() - 1;
                        if (prev == null) {
                            cm.replaceRange(markdown, CodeMirror.Pos(startLine));
                        } else {
                            var prevLine = cm.getLine(cm.lineCount() - 1);
                            if (prevLine.replaceAll('\n', '') == '') {
                                markdown = '\n' + markdown;
                            } else {
                                markdown = "\n\n" + markdown;
                            }
                            cm.replaceRange(markdown, CodeMirror.Pos(startLine));
                        }
                    } else {
                        var line = parseInt(next.getAttribute('data-line'));
                        if (line > 0) {
                            var prevLine = cm.getLine(line - 1);
                            if (prevLine.replaceAll('\n', '') == '') {
                                markdown = markdown;
                            } else {
                                markdown = "\n" + markdown;
                            }
                        }
                        var currentLine = cm.getLine(line);
                        if (currentLine != null) {
                            if (currentLine.replaceAll('\n', '') != '') {
                                markdown = markdown + '\n\n';
                            } else {
                                markdown = markdown + '\n';
                            }
                        } else {
                            markdown = markdown + '\n\n';
                        }
                        cm.replaceRange(markdown, {
                            line: line,
                            ch: 0
                        });
                    }

                }
				if(renderOption.render !== false){
					return render();
				}
				return elem;
            } else {
                if (hasLine) {
                    if (endLine < cm.lineCount()) {
                        var nextLine = cm.getLine(endLine);
                        if (nextLine != veryThinChar && isEmptyText(nextLine)) {
                            endLine++;
                        }
                    } else {
                        endLine++;
                    }
                    cm.replaceRange("", CodeMirror.Pos(startLine, 0), CodeMirror.Pos(endLine, 0))
					if(renderOption.render !== false){
						return render();
					}
                }
				return elem;
            }
        }

        function startEdit(wysiwyg,elem,target) {
			var editorFactory = getEditorFactoryByElement(elem);
			if(editorFactory == null){
				toast('没有找到合适的编辑器','error');
				return;
			}
			var editor = editorFactory.create(elem,wysiwyg.wrapper);
            editor.start(target);
        }
		
        var DocumentCommandHelper = (function(){
			
			var set = new Set(['code','kbd']);//need more 
			
			
			var inlineBackspaceListener = function(e){
				if(e.key == 'Backspace'){
					var rangeInfo = getRangeInfo(this);
					var range = rangeInfo.range;
					if(range == null){
						return ;
					}
					var ancestor = range.commonAncestorContainer;
					var parent = ancestor;
					var deleteable = false;
					var sel  = rangeInfo.sel;
					while(parent != null){
						if(parent === this){
							return ;
						}
						if(parent.nodeType == 1 && set.has(parent.tagName.toLowerCase())){
						  var textContent = parent.textContent;
						  if(textContent.length == 1){
							e.preventDefault();
							e.stopPropagation();
							sel.removeAllRanges();
							range.setStartBefore(parent);
							range.setEndAfter(parent);
							sel.addRange(range);
							document.execCommand('removeFormat');
							range.deleteContents();
						  }
						  return ;
						}
						parent = parent.parentElement;
					}
					
				}
			}
			
			function inlineTagHandler(tagName,range,sel){
				tagName = tagName.toUpperCase();
				var ancestor = range.commonAncestorContainer;
				var parent = ancestor.parentElement;
				if(parent != null && parent.tagName == tagName){
					var next = parent.nextSibling;
					if(next == null || next.nodeType != 3 || !next.nodeValue.startsWith(veryThinChar)){
						var veryThinNode = document.createTextNode(veryThinChar);
						if(next == null){
							$(parent).after(veryThinNode);
						} else {
							$(next).before(veryThinNode);
						}
						next = veryThinNode;
					}
					range.setStart(next,1);
					range.setEnd(next,1);
					return ;
				}
				var node = document.createElement(tagName);
				var content = veryThinChar+sel.toString();
				node.innerHTML = content;
				range.deleteContents();
				range.insertNode(node);
				range.setStart(node,1);
				range.setEnd(node,1);
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
				'inlineTagHandler':inlineTagHandler,
				'bindInlineBackspaceListener':function(element){
					set.forEach(function(v){
						for(const node of element.querySelectorAll(v)){
							$(node).prepend(document.createTextNode(veryThinChar));
						}
					})
					element.addEventListener('keydown',inlineBackspaceListener)
				},
				'unbindInlineBackspaceListener':function(element){
					element.removeEventListener('keydown',inlineBackspaceListener)
				},
				inlineTagSet : set
			}
		})();

        var ContenteditableBar = (function() {
			
            var clazz = "heather_status_on";
			
			var defaultBarElements =  [];
			
			var bold = {
				createElement : function(){
					var bold = document.createElement('i');
					bold.setAttribute('class','fas fa-bold middle-icon');
					return bold;
				},
				handler : function(ele,range,sel){
					 DocumentCommandHelper.bold();
					 document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				onSelectionChange : function(ele,range,sel){
					 document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				type : 'range'
			}
			
			var italic = {
				createElement : function(){
					var italic = document.createElement('i');
					italic.setAttribute('class','fas fa-italic middle-icon');
					return italic;
				},
				handler : function(ele,range,sel){
					 DocumentCommandHelper.italic();
					 document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				onSelectionChange : function(ele,range,sel){
					document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				type : 'range'
			}
			
			var strikethrough = {
				createElement : function(){
					var strikeThrough = document.createElement('i');
					strikeThrough.setAttribute('class','fas fa-strikethrough middle-icon');
					return strikeThrough;
				},
				handler : function(ele,range,sel){
					 DocumentCommandHelper.strikethrough();
					 document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				onSelectionChange : function(ele,range,sel){
					document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
				},
				type : 'range'
			}	


			var link = {
				createElement : function(){
					var link = document.createElement('i');
					link.setAttribute('class','fas fa-link middle-icon');
					return link;
				},
				handler : function(ele,range,sel){
					DocumentCommandHelper.link(range,sel);
				},
				type : 'range'
			}	
			
			var code = {
				createElement : function(){
					var bold = document.createElement('i');
					bold.setAttribute('class','fas fa-code middle-icon');
					return bold;
				},
				handler : function(ele,range,sel){
					DocumentCommandHelper.inlineTagHandler('CODE',range,sel);
				}
			}

			var eraser = {
				createElement : function(){
					var eraser = document.createElement('i');
					eraser.setAttribute('class','fas fa-eraser middle-icon');
					return eraser;
				},
				handler : function(ele,range,sel){
					DocumentCommandHelper.removeFormat();
				},
				type : 'range'
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
				for(const ele of defaultBarElements){
					const barElement = ele.createElement();
					barElement.setAttribute('data-type',ele.type);
					barElement.setAttribute('style','cursor: pointer;margin-right:20px');
					barElement.addEventListener(eventType,function(e){
						e.preventDefault();
						var rangeInfo = getRangeInfo(element);
						var range = rangeInfo.range;
						var sel = rangeInfo.sel;
						if(range != null){
							ele.handler.call(me,barElement,range,sel);
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
					for(const ele of defaultBarElements){
						if(hasMethod(ele,'onSelectionChange')){
							try{ele['onSelectionChange'].call(this,ele.element,range,sel)}catch(e){console.log(e)};
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
                if (!mobile) {
                    if (bar.width() + coords.left > $(window).width()) {
                        bar.element.css({
                            'right': 30 + "px"
                        })
                    } else {
                        bar.element.css({
                            'left': coords.left - bar.width()/2 + coords.width/2 + "px"
                        })
                    }
                }
                bar.show();
            }

            return {
				create:function(element){
					return new ContenteditableBar(element);
				},
				defaultBarElements : defaultBarElements
			};
        })();

        var InlineMath = (function() {

            function InlineMath(wrapper) {
                this.wrapper = wrapper;
                this.rootElem = wrapper.getOutElement();
                var katexPreview = document.createElement('div');
                katexPreview.classList.add('katex-inline-preview');
                document.getElementById("heather_wrapper").appendChild(katexPreview);
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
                                            var left = coords.left-width/2+
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
									if(element == null){
										toast('无效的文件信息','error');
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


        var TableEditorFactory = (function() {

            var TdEditor = (function() {
				
                function TdEditor(table, td, wrapper, embed) {
                    this.table = table;
                    this.td = td;
                    this.wrapper = wrapper;
                    this.embed = true;
					triggerEditorEvent('create', this);
                }
				
                TdEditor.prototype.start = function() {
					this.mediaHelper = new MediaHelper(this.td);
					DocumentCommandHelper.bindInlineBackspaceListener(this.td);
                    this.td.addEventListener('paste', plainPasteHandler);
                    this.td.setAttribute('contenteditable', true);
                    this.contenteditableBar = ContenteditableBar.create(this.td);
                    this.fileUploadMgr = new FileUploadMgr(this.td, this.wrapper.config);
                    var inlineMath = createInlineMathSession(this.wrapper, this.td);
                    inlineMath.start();
                    this.inlineMath = inlineMath;
					triggerEditorEvent('start',this);
                }

                TdEditor.prototype.stop = function() {
					DocumentCommandHelper.unbindInlineBackspaceListener(this.td);
                    this.td.removeEventListener('paste', plainPasteHandler);
                    this.td.removeAttribute('contenteditable');
                    this.contenteditableBar.remove();
                    this.fileUploadMgr.remove();
					this.mediaHelper.remove();
                    this.inlineMath.stop();
					triggerEditorEvent('stop',this);
                }
				
				TdEditor.prototype.getContextMenus = function(){
					var me = this;
					var menus = [{
						html : '<i class="fas fa-check"></i>完成',
						handler : function(){
							me.stop();
						}
					},{
						html : '<i class="fas fa-upload"></i>上传文件',
						handler : function(){
							me.fileUploadMgr.upload();
						},
						condition:function(){
							return me.wrapper.fileUploadEnable();
						}
					},{
						html : '<i class="fas fa-arrow-right"></i>向右添加列',
						handler : function(){
							addCol($(me.table), $(me.td), true);
						}
					},{
						html : '<i class="fas fa-arrow-left"></i>向左添加列',
						handler : function(){
							addCol($(me.table), $(me.td), false);
						}
					},{
						html : '<i class="fas fa-arrow-up"></i>向上添加行',
						handler : function(){
							addRow($(me.table), $(me.td), false);
						}
					},{
						html : '<i class="fas fa-arrow-down"></i>向下添加行',
						handler : function(){
							addRow($(me.table), $(me.td), true);
						}
					},{
						html : '<i class="fas fa-minus"></i>删除列',
						handler : function(){
							 deleteCol($(me.table), $(me.td));
						}
					},{
						html : '<i class="fas fa-minus"></i>删除行',
						handler : function(){
							deleteRow($(me.table), $(me.td));
						}
					},{
						html : '<i class="fas fa-align-left"></i>左对齐',
						handler : function(){
							doAlign($(me.table), $(me.td),'left');
						}
					},{
						html : '<i class="fas fa-align-center"></i>居中对齐',
						handler : function(){
							doAlign($(me.table), $(me.td),'center');
						}
					},{
						html : '<i class="fas fa-align-right"></i>右对齐',
						handler : function(){
							doAlign($(me.table), $(me.td),'right');
						}
					}];
					return menus;
				}

                TdEditor.prototype.getElement = function() {
                   return this.td;
                }

                TdEditor.prototype.insertFile = function(info) {
                   insertFileAtRange(info,this.td);
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

               return TdEditor;
            })();

            function TableEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }
			
            TableEditor.prototype.insertFile = function(info) {
               if(this.child){
				   this.child.insertFile(info);
			   }
            }
			TableEditor.prototype.notifyEmbedStopped = function(){
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
                            var tdEditor = new TdEditor(me.element, td, me.wrapper);
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
				
				var keyDownHandler = function(e){
					if(e.key == 'Tab'){
						if(me.child){
							//find next td|th
							var $td = $(me.child.td);
							var next =  $td.next();
							if(next.length == 0){
								//find next tr
								var nextTr = $td.parent().next();
								if(nextTr.length == 0){
									//go to first tr
									//check is th
									if($td[0].tagName == 'TH'){
										nextTr = $(me.element).find('tr').eq(1);
									} else {
										//let other tab key do it's work
										return ;
									}
								}
								//go to first cell
								next =  nextTr.find('td,th').eq(0);
							} 
							me.child.stop();
							var tdEditor = new TdEditor(me.element, next[0], me.wrapper);
							tdEditor.start();
							next.focus();
							me.child = tdEditor;
						}
						e.preventDefault();
						return false;
					}
				}
				
				table.on('keydown',keyDownHandler);
				
                this.tdHandler = tdHandler;
				this.keyDownHandler = keyDownHandler;
                triggerEditorEvent('start', this);
				
                if (_target) {
                    editTd(getTd(_target, this.element));
                } else {
					editTd(this.element.querySelector('th,td'));
				}
            }
			
			TableEditor.prototype.delete = function(){
				this.element.remove();
				this.stop();
			}
			
			TableEditor.prototype.getContextMenus = function(){
				var editor = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
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
				ele.off('keydown',this.keyDownHandler);
                if (this.child) {
                    this.child.stop();
                }
                triggerEditorEvent('stop', this);
            }
			
            TableEditor.prototype.getElement = function() {
                return this.element;
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
                create: function(element, wrapper, embed) {
                    return new TableEditor(element, wrapper, embed);
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

            function HeadingEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
				
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
                
                var inlineMath = createInlineMathSession(this.wrapper, this.element);
                inlineMath.start();
                this.inlineMath = inlineMath;
                this.contenteditableBar = ContenteditableBar.create(this.element);
				me.element.focus();
				
                triggerEditorEvent('start', this);
            }

            HeadingEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.inlineMath.stop();
                this.contenteditableBar.remove();
                this.element.removeAttribute('contenteditable');
                triggerEditorEvent('stop', this);
            }
			
            HeadingEditor.prototype.getElement = function() {
                return this.element;
            }
			
			HeadingEditor.prototype.delete = function() {
               this.element.remove();
			   this.stop();
            }		
			
			HeadingEditor.prototype.getContextMenus = function(){
				
				var editor = this;
				
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				}];
				
				var index = parseInt(this.element.tagName.substring(1));
				
				for(var i=1;i<=6;i++){
					if(i != index){
						menus.push({
							html : '<i class="fas fa-heading" data-heading="'+i+'"></i>H'+i,
							handler : function(){
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
								
								startEdit(editor.wrapper.nearWysiwyg, editor.element);
							}
						});
					}
				}
				
				menus.push({
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
						editor.delete();
					}
				});
				
				return menus
			}

            return {
                create: function(element, wrapper, embed) {
                    return new HeadingEditor(element, wrapper, embed);
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

            function HREditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
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
			HREditor.prototype.getContextMenus = function(){
				var editor = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
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
                create: function(element, wrapper, embed) {
                    return new HREditor(element, wrapper, embed);
                },
                name: 'HREditorFactory',
                match: function(element) {
                    return element.tagName === 'HR';
                },
                order: 0
            }
        })();


        var ParagraphEditorFactory = (function() {
			
            function ParagraphEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            ParagraphEditor.prototype.start = function() {
                var me = this;
                var paragraph = this.element;
                paragraph.setAttribute('contenteditable', 'true');
				this.pasteHandler = function(e){
					htmlPasteEventListener.call(me,e)
				}
                paragraph.addEventListener('paste', this.pasteHandler);
                var fileUploadMgr = new FileUploadMgr(paragraph, this.wrapper.config);
				this.mediaHelper = new MediaHelper(paragraph);
                this.fileUploadMgr = fileUploadMgr;
                this.contenteditableBar = ContenteditableBar.create(this.element);
                var inlineMath = createInlineMathSession(this.wrapper, this.element);
                inlineMath.start();
                this.inlineMath = inlineMath;
				DocumentCommandHelper.bindInlineBackspaceListener(this.element);
				this.element.focus();
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
                triggerEditorEvent('stop', this);
            }

			
			ParagraphEditor.prototype.insertFile = function(info) {
               insertFileAtRange(info,this.element);
			}

            ParagraphEditor.prototype.getElement = function() {
                return this.element;
            }

            ParagraphEditor.prototype.delete = function() {
               this.element.remove();
			   this.stop();
            }
			
			ParagraphEditor.prototype.getContextMenus = function(){
				var editor = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				},{
					html : '<i class="fas fa-upload"></i>插入文件',
					handler : function(){
						editor.fileUploadMgr.upload();
					},
					condition:function(){
						return editor.wrapper.fileUploadEnable();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
						editor.delete();
					}
				}];
				return menus;
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
                create: function(element, wrapper, embed) {
                    return new ParagraphEditor(element, wrapper, embed);
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

            function KatexBlockEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }

            KatexBlockEditor.prototype.start = function() {
                var me = this;
                var expression = getKatexExpression(this.element);
                var pre = document.createElement('pre');
                pre.innerHTML = expression;
                var preview = document.createElement('div');
                preview.classList.add('katex-preview');

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
                    })
                };
                pre.setAttribute('contenteditable', 'true');
                pre.addEventListener('input', updatePreview);
                this.preHelper = new PreHelper(pre);
                $(this.element).after(pre).remove();
                this.element = pre;

                $(pre).after(preview);
                this.preview = preview;
                updatePreview();
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
			
			KatexBlockEditor.prototype.delete = function(){
				this.element.remove();
				this.stop();
			}
			
			KatexBlockEditor.prototype.getContextMenus = function(){
				var editor = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
						editor.delete();
					}
				}];
				return menus;
			}

            KatexBlockEditor.prototype.getElement = function() {
                return this.element;
            }

            return {
                create: function(element, wrapper, embed) {
                    return new KatexBlockEditor(element, wrapper, embed);
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

            function MermaidEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
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
                    })
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
				this.element.focus();
                triggerEditorEvent('start', this);
            }

            MermaidEditor.prototype.stop = function() {
                if (this.stoped === true) {
                    return;
                }
                this.stoped = true;
                this.preview.remove();
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
			MermaidEditor.prototype.delete = function(){
				this.element.remove();
				this.stop();
			}
			
			MermaidEditor.prototype.getContextMenus = function(){
				var editor = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						editor.stop();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
						editor.delete();
					}
				}];
				return menus;
			}			
            MermaidEditor.prototype.getElement = function() {
                return this.element;
            }
            return {
                create: function(element, wrapper, embed) {
                    return new MermaidEditor(element, wrapper, embed);
                },
                name: 'MermaidEditorFactory',
                match: function(element) {
                    return element.tagName == 'DIV' && element.classList.contains('mermaid-block');
                },
                order: 0
            }
        })();

        var ListEditorFactory = (function() {

            var LiEditor = (function() {
                function LiEditor(listEditor, li,  target) {
                    this.listEditor = listEditor;
                    this.li = li;
                    this.wrapper = listEditor.wrapper;
                    this.checkbox = getCheckbox(li);
                    this.target = target;
                    this.embed = true;//always true
					this.compositeEditorHelper = new CompositeEditorHelper(this);
					triggerEditorEvent('create', this);
                }

                LiEditor.prototype.insertBlock = function(block) {
					this.compositeEditorHelper.insertBlock(block);
                }
				
				LiEditor.prototype.getElement = function(block) {
                    return this.li;
                }
				
				LiEditor.prototype.getContextMenus = function(){
					var me = this;
					var menus = [{
						html : '<i class="fas fa-check"></i>完成',
						handler : function(){
							editor.stop();
						}
					},{
						html : '<i class="fas fa-arrow-up"></i>向上添加',
						handler : function(){
							me.append(false);
							
						}
					},{
						html : '<i class="fas fa-arrow-down"></i>向下添加',
						handler : function(){
							var li = me.append(true);
							me.stop();
							editLi(me.listEditor,li,li.querySelector('p'));
						}
					},{
						html : '<i class="fas fa-times"></i>删除',
						handler : function(){
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
					triggerEditorEvent('start',this);
					//
					this.compositeEditorHelper.edit(this.target);
                }

                LiEditor.prototype.stop = function() {
					var li = this.li;
					var checkbox = this.checkbox;
					if(checkbox != null){
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
					triggerEditorEvent('stop',this);
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

            function ListEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
                triggerEditorEvent('create', this);
            }
			
			ListEditor.prototype.notifyEmbedStopped = function(){
				this.child = undefined;
			}

            ListEditor.prototype.start = function(_target) {
                var me = this;
                var ele = $(this.element);
                var clickHandler = function(e) {
                    var li = getLi(e.target, me.element);
                    editLi(me,li, e.target);
                }

                ele.on('click', 'li', clickHandler);
                this.clickHandler = clickHandler;
                triggerEditorEvent('start', this);
                
                if (_target) {
                    editLi(this,getLi(_target, this.element), _target);
                } else {
					//start edit first li
					var li = this.element.querySelector('li');
					if(li != null){
						editLi(this,li);
					} else {
						//add a new li and edit it
						var li = document.createElement('li');
						li.appendChild(document.createElement('p'));
						this.element.appendChild(li);
						editLi(this,li);
					}
				}
            }
	
            ListEditor.prototype.delete = function() {
               this.element.remove();
			   this.stop();
            }
			
			ListEditor.prototype.getContextMenus = function(){
				var me = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						me.stop();
					}
				},{
					html : '<i class="fas fa-exchange-alt"></i>转化',
					handler:function(){
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
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
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
					if(li == null){
						//add li 
						var li = document.createElement('li');
						this.element.appendChild(li);
						editLi(this,li);
						this.child.insertBlock(block);
					} else {
						//find last li 
						var lis = this.element.querySelectorAll('li');
						var li = lis[lis.length - 1];
						editLi(this,li);
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
			
			ListEditor.prototype.editNextEmbed = function(){
				if (this.child) {
					if(this.child.editNextEmbed() !== true){
						var editor = this.child;
						this.child.stop();
						var next = editor.li.nextElementSibling;
						if(next != null){
							editLi(this,next);
							return true;
						}
						return false;
					}
					return true;
                } else {
					var li = this.element.querySelector('li');
					if(li != null){
						var liEditor = new LiEditor(this, li);
						liEditor.start();
						this.child = liEditor;
						return true;
					}
				}
				return false;
			}
			
			ListEditor.prototype.editPrevEmbed = function(){
				if (this.child) {
					if(this.child.editPrevEmbed() !== true){
						var editor = this.child;
						this.child.stop();
						var prev = editor.li.previousElementSibling;
						if(prev != null){
							editLi(this,prev);
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
                if(this.child){
					this.child.insertBefore();
				}
            }

			ListEditor.prototype.insertAfter = function() {
                if(this.child){
					this.child.insertAfter();
				}
            }

			var editLi = function(editor,li, target) {
				if (li != null && !li.isContentEditable) {
					if (editor.child) {
						editor.child.stop();
					}
					if(!target){
						var checkbox = getCheckbox(li);
						var first = li.firstChild;
						if(first != null){
							if(first !== checkbox){
								target = first;	
							} else {
								first = first.nextElementSibling;
								
								if(first == null){
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
					var liEditor = new LiEditor(editor, li,target);
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
                create: function(element, wrapper, embed) {
                    return new ListEditor(element, wrapper, embed);
                },
                name: 'ListEditorFactory',
                match: function(element) {
                    var tagName = element.tagName;
                    return tagName == 'OL' || tagName == 'UL';
                },
                order: 0
            }
        })();

        //TODO history missing
        var PreEditorFactory = (function() {
            function PreEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
                this.embed = embed;
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
               
                if (this.language == 'html') this.language = 'xml';
                highlight(pre, me.language);
				
				this.element.focus();
                triggerEditorEvent('start', this);
            }
			
			 PreEditor.prototype.getContextMenus = function() {
				var me = this;
				var menus = [{
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						me.stop();
					}
				},{
					html : '<i class="fas fa-code"></i>语言',
					handler : function(){
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
							}
						})
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
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
                this.preHelper.unbind();
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

            PreEditor.prototype.getElement = function() {
                return this.element;
            }
            PreEditor.prototype.delete = function() {
               this.element.remove();
			   this.stop();
            }			
            function getLanguage(code) {
                var classes = code.getAttribute('class');
				if(classes != null){
					var classArray = classes.split(' ');
					for(const clazz of classArray){
						if(clazz.startsWith("language-")){
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
			//defaultBarElements;
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
				processPasteNode:function(node){
					var code = node.querySelector('code');
					var language;
					if(code != null){
						language = getLanguage(code);
					}
					var innerHTML = node.innerHTML;
					var pre = document.createElement('pre');
					var codeNode = document.createElement('code');
					if(!isUndefined(language)){
						codeNode.classList.add('language-' + language);
					}
					codeNode.innerHTML = innerHTML;
					pre.appendChild(codeNode);
					return pre;
				},
                create: function(element, wrapper, embed) {
                    return new PreEditor(element, wrapper, embed);
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
                create: function(element, wrapper, embed) {
                    return ListEditorFactory.create(element, wrapper, embed)
                },
                name: 'TaskListEditorFactory',
                match: function(element) {
                    return ListEditorFactory.match(element);
                },
                order: 0
            }
        })();
		
		 var BlockquoteEditorFactory = (function() {
            function BlockquoteEditor(element, wrapper, embed) {
                this.element = element;
                this.wrapper = wrapper;
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
					html : '<i class="fas fa-check"></i>完成',
					handler : function(){
						me.stop();
					}
				},{
					html : '<i class="fas fa-times"></i>删除',
					handler : function(){
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
			
            return {
                create: function(element, wrapper,embed) {
                    return new BlockquoteEditor(element, wrapper,embed)
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
			
			CompositeEditorHelper.prototype.start = function(){
				var me = this;
                var clickHandler = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var target = e.target;
                    editTarget(me,target);
                }
                me.editor.getElement().addEventListener('click', clickHandler);
                this.clickHandler = clickHandler;
			}
			
			CompositeEditorHelper.prototype.edit = function(target){
				if(target){
					editTarget(this,target);
				} else {
					//first 
					var first = this.editor.getElement().firstElementChild;;
					if(first){
						editTarget(this,first);
					}
				}
			}
			
			CompositeEditorHelper.prototype.stop = function(){
				var child = this.editor.child;
				if(child)
					child.stop();
				this.editor.getElement().removeEventListener('click', this.clickHandler);
			}
			
			CompositeEditorHelper.prototype.insertBefore = function(){
				var child = this.editor.child;
				if (child) {
					if(hasMethod(child,'insertBefore')){
						child.insertBefore();
					} else {
						createEmbedEditorDialog(this, function(element) {
							$(child.getElement()).before(element);
						});
					}
                } else {
					var me  = this;
					createEmbedEditorDialog(this, function(element) {
                        me.element.prepend(element);
                    });
				}
			}
			
			CompositeEditorHelper.prototype.insertAfter = function(){
				var child = this.editor.child;
				if (child) {
					if(hasMethod(child,'insertAfter')){
						child.insertAfter();
					} else {
						createEmbedEditorDialog(this, function(element) {
							$(child.getElement()).after(element);
						});
					}
                } else {
					var me  = this;
					createEmbedEditorDialog(me, function(element) {
                        me.element.appendChild(element);
                    });
				}
			}
			
			CompositeEditorHelper.prototype.editNextEmbed = function(){
				var child = this.editor.child;
				if (child) {
					if (hasMethod(child,'editNextEmbed')) {
						if(child.editNextEmbed() !== true){
							child.stop();
							var next = child.getElement().nextElementSibling;
							if(next != null){
								createEditor(next,this);
								return true;
							} 
							return false;
						}
						return true;
					} else {
						child.stop();
						var next = child.getElement().nextElementSibling;
						if(next != null){
							createEditor(next,this);
							return true;
						} 
					}
                } else {
					//edit first element if exists
					var first = this.element.children[0];
					if(first){
						createEditor(first,this);
						return true;
					}
				}
				return false;
			}
			
			CompositeEditorHelper.prototype.editPrevEmbed = function(){
				var child = this.editor.child;
				if (child) {
					if (hasMethod(child,'editPrevEmbed')) {
						if(child.editPrevEmbed() !== true){
							child.stop();
							var prev = child.getElement().previousElementSibling;
							if(prev != null){
								createEditor(prev,this);
								return true;
							} 
							return false;
						}
						return true;
					} else {
						child.stop();
						var prev = child.getElement().previousElementSibling;
						if(prev != null){
							createEditor(prev,this);
							return true;
						} 
					}
                } else {
					var children = this.element.children;
					var last = children[children.length - 1];
					if(last){
						createEditor(last,this);
						return true;
					}
				}
				return false;
			}
			

            CompositeEditorHelper.prototype.insertBlock = function(block) {
				var child = this.editor.child;
                if (child) {
					if (hasMethod(child,'insertBlock')) {
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

			function editTarget(helper,_target){
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
				if (helper.editor.child && helper.editor.child.getElement() === target){
					return ;
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
                    child = factory.create(element, editor.editor.wrapper, true);
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
				if(hasMethod(editor,'insertBlock')) {
                    editor.insertBlock(element); //just add block ,let editor do remain work
                } else {
					wysiwyg.stopEdit();
					if(editor.elementRemoved === true){
						return ;
					}
					$(editor.getElement()).after(element);
					startEdit(wysiwyg, element);
				}
            } else {
                wysiwyg.rootElem.appendChild(element);
                startEdit(wysiwyg, element);
            }
        }
		
		commands['factories'] = function() {
			var me = this;
			showEditorFactoryDialog(function(element){
				 runBlockCommand(element, me);
			})
        }
		
		commands['insertBefore'] = function(){
			 if(this.currentEditor){
				if(hasMethod(this.currentEditor,'insertBefore')){
					this.currentEditor.insertBefore();
				} else {
					var me = this;
					showEditorFactoryDialog(function(element) {
						var ele = me.currentEditor.getElement();
						me.stopEdit();
						$(ele).before(element);
						startEdit(me, element);
					})
				}
			}
		}
		commands['insertAfter'] = function(){
			 if(this.currentEditor){
				if(hasMethod(this.currentEditor,'insertAfter')){
					this.currentEditor.insertAfter();
				} else {
					var me = this;
					showEditorFactoryDialog(function(element) {
						var ele = me.currentEditor.getElement();
						me.stopEdit();
						$(ele).after(element);
						startEdit(me, element);
					})
				}
			}
		}		
		commands['contextmenu'] = function(){
			if(this.currentEditor){
				var menuCards = [];
				var editor = this.currentEditor;
				var child = editor.child;
				var menus = editor.getContextMenus();
				
				menuCards.push({title:this.currentEditor.getElement().tagName,menus:menus});
				if(!isUndefined(child)){
					while(true){
						if(isUndefined(child)){
							break;
						}
						var childMenus = child.getContextMenus();
						menuCards.push({title:child.getElement().tagName,menus:childMenus});
						child = child.child;
					}
				}
				
				menuCards.reverse();
				var me = this;
				var first = menuCards[0];
				first.menus.unshift({
					html : '<i class="fas fa-check"></i>在前方插入',
					handler : function(){
						me.execCommand('insertBefore');
					}
				})
				createMenuDialog(menuCards);
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
                DocumentCommandHelper.inlineTagHandler('CODE',range,sel);
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

				var imgClickHandler = function(e){
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
				
				$(element).on('click','img',imgClickHandler);
				
				makeVideoFocusable(element);
				
				var observer = new MutationObserver(function(mutations, observer) {
					out:for(const mutationRecord of mutations){
						var removedVideo = false;
						if(mutationRecord.removedNodes){
							for(const removedNode of mutationRecord.removedNodes){
								if(removedNode.tagName == 'VIDEO'){
									removedVideo = true;
									break;
								}
							}
						}
						if(removedVideo){
							var prev = mutationRecord.previousSibling;
							if(prev != null && prev.nodeType == 3){
								var value = prev.nodeValue;
								if(value.endsWith(veryThinChar)){
									var newValue = value;
									while(newValue.endsWith(veryThinChar)){
										newValue = newValue.substring(0,newValue.length-1);
										if(newValue == ''){
											break;
										}
									}
									if(newValue == ''){
										prev.remove();
									} else {
										prev.nodeValue = newValue;
									}
								}
							}
							
							var next = mutationRecord.nextSibling;
							if(next != null && next.nodeType == 3){
								var value = next.nodeValue;
								if(value.startsWith(veryThinChar)){
									var newValue = value;
									while(newValue.startsWith(veryThinChar)){
										newValue = newValue.substring(1,newValue.length);
										if(newValue == ''){
											break;
										}
									}
									if(newValue == ''){
										next.remove();
									} else {
										next.nodeValue = newValue;
									}
								}
							}
							if(prev != null){
								var range = getRangeInfo(element).range;
								if(range != null){
									range.setStartAfter(prev);
								}
							}
						}
					}
					
					makeVideoFocusable(element);
				});
				
				observer.observe(element, {
					childList: true,
					subtree:true
				});
				
				this.observer = observer;
				this.imgClickHandler = imgClickHandler;
				this.element = element;
			}
			
			MediaHelper.prototype.remove = function(){
				$(this.element).off('click','img',this.imgClickHandler);
				this.observer.disconnect();
			}
			return MediaHelper;
		})();
		

        var PreHelper = (function() {
            function PreHelper(pre) {
                this.pre = pre;
                this.keyDownHandler = function(e) {
                    //TODO chrome || ios need enter twice
                    if (e.key == 'Enter') {
                        document.execCommand('insertHTML', false, '\r\n');
                        e.preventDefault();
                        e.stopPropagation();
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
                            var node = document.createTextNode(rst);
                            range.insertNode(node);
                            sel.removeAllRanges();
                            sel.addRange(range);
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
					var rangeInfo = getRangeInfo(pre);
                    var sel = rangeInfo.sel;
                    var range = rangeInfo.range;
                    if (range != null) {
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

            PreHelper.prototype.unbind = function() {
                this.pre.removeEventListener('keydown', this.keyDownHandler);
                this.pre.removeEventListener('paste', this.pasteHandler);
            }

            return PreHelper;
        })();
		
		function triggerEditorEvent(name,editor,element){
			var wrapper = editor.wrapper;
			if(editor.embed === true){
				if(editor.parent && name == 'stop'){
					editor.parent.notifyEmbedStopped(editor);
				}
				wrapper.triggerEvent('wysiwyg.editor.embed.'+name,editor,element);
			} else {
				wrapper.triggerEvent('wysiwyg.editor.'+name,editor,element);
			}
		}
		
		function fileToElement(info){
			var type = (info.type || 'image').toLowerCase();
			switch (type) {
				case 'image':
					var img = document.createElement('img');
					img.setAttribute('alt',info.name);
					img.setAttribute('src',info.url);
					return img;
				case 'file':
					var link = document.createElement('a');
					link.innerHTML = info.name;
					link.setAttribute('href',info.url);
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
		
		function insertFileAtRange(info,element){
			var rangeInfo = getRangeInfo(element);
			var range = rangeInfo.range;
			var sel = rangeInfo.sel;
		    if(range != null){
			   var fileElement = fileToElement(info);
			   if(fileElement != null){
				    range.deleteContents();
					range.insertNode(fileElement);
					range.setStartAfter(fileElement);
					sel.removeAllRanges();
					sel.addRange(range);
				}
			}
		}
		
		function createMenuDialog(menuCards){
			var html = '<div class="heather-menu-breadcrums"></div><ul class="heather-menu-card">';
			html += '</ul>';
			var handler;
			var nodes;
			
            var keydownListener = function(e){
				if(e.key == 'ArrowLeft'){
					e.preventDefault();
					e.stopPropagation();
					prevCard();
				}
				if(e.key == 'ArrowRight'){
					e.preventDefault();
					e.stopPropagation();
					nextCard();
				}
				if(e.key == 'ArrowUp'){
					e.preventDefault();
					e.stopPropagation();
					movePrev();
				}
				if(e.key == 'ArrowDown'){
					e.preventDefault();
					e.stopPropagation();
					moveNext();
				}
				if(e.key == 'Enter'){
					e.preventDefault();
					e.stopPropagation();
					Swal.getContent().querySelector('.on').querySelector('.active').click();
				}
			}
			
			var prevCard = function(){
				var card = Swal.getContent().querySelector('.on');
				var prev = card.previousElementSibling;
				if(prev != null){
					card.classList.remove('on');
					card.classList.add('off');
					prev.classList.remove('off');
					prev.classList.add('on');
					activeCrumb(prev);
					var active = prev.querySelector('.active');
					if(active == null){
						prev.firstChild.firstChild.classList.add('active');
					}
				}
			}
			
			var nextCard = function(){
				var card = Swal.getContent().querySelector('.on');
				var next = card.nextElementSibling;
				if(next != null){
					card.classList.remove('on');
					card.classList.add('off');
					next.classList.remove('off');
					next.classList.add('on');
					activeCrumb(next);
					//find first li and add class active
					var active = next.querySelector('.active');
					if(active == null){
						next.firstChild.firstChild.classList.add('active');
					}
				}
			}

			var activeCrumb = function(li){
				var lis = Swal.getContent().querySelector('.heather-menu-card').querySelectorAll(':scope > li');
				var crumbDiv = Swal.getContent().querySelector('.heather-menu-breadcrums'); 
				var crumbs = crumbDiv.querySelectorAll('span');
				for(var i=0;i<lis.length;i++){
					if(lis[i] == li){
						var active = crumbDiv.querySelector('.active');
						if(active != null){
							active.classList.remove('active');
						}
						crumbs[i].classList.add('active');
						break;
					}
				}
			}
			
			var moveNext = function(){
				var dom = Swal.getContent().querySelector('.on');
				var active = dom.querySelector('.active');
				var next = active.nextElementSibling;
				if(next == null || next.hasAttribute('data-ignore')){
					//move to first;
					next = dom.querySelector('li');
				}
				while(next !=null && next.hasAttribute('data-ignore')){
					next = next.nextElementSibling;
				}
				if(next != null){
					active.classList.remove('active');
					next.classList.add('active');
				}
			}
			
			var movePrev = function(){
				var dom = Swal.getContent().querySelector('.on');
				var active = dom.querySelector('.active');
				var prev = active.previousElementSibling;
				if(prev == null || prev.hasAttribute('data-ignore')){
					//move to last ;
					var lis = dom.querySelectorAll('li');
					prev = lis[lis.length - 1];
				}
				while(prev != null && prev.hasAttribute('data-ignore')){
					prev = prev.previousElementSibling;
				}
				if(prev != null){
					active.classList.remove('active');
					prev.classList.add('active');
				}
				
			}
			
			Swal({
                animation: false,
                html: html,
				onBeforeOpen:function(dom){
					var root = dom.querySelector('.heather-menu-card');
					var crumbs = [];
					for(const card of menuCards){
						var menus = card.menus;
						var title = card.title;
						crumbs.push(title);
						var ul = document.createElement('ul');
						ul.classList.add('heather-menu-dialog');
						for(const menu of menus){
							if(hasMethod(menu,'condition')){
								if(menu.condition() !== true){
									continue;
								}
							}
							var li = document.createElement('li');
							li.innerHTML = menu.html;
							li.addEventListener('click',function(e){
								e.preventDefault();
								e.stopPropagation();
								handler = menu.handler;
								nodes = this.childNodes;
								Swal.getCloseButton().click();
							});
							
							ul.appendChild(li);
						}
						var li = document.createElement('li');
						li.classList.add('off');
						li.appendChild(ul);
						root.appendChild(li);
					}
					
					var crumbDiv = dom.querySelector('.heather-menu-breadcrums');
					if(crumbs.length > 0 && crumbs[0] != ''){
						for(const crumb of crumbs){
							var ele = document.createElement('span');
							ele.innerHTML = crumb;
							crumbDiv.appendChild(ele);
						}
					} else {
						crumbDiv.style.display = 'none';
					}
					//find first li and add class on
					var first = root.firstElementChild;
					if(first != null){
						first.classList.remove('off');
						first.classList.add('on');
						//find first li and add class active
						var subFirst = first.querySelector('ul').firstElementChild;
						if(subFirst != null){
							subFirst.classList.add('active');
						}
						var crumb = crumbDiv.firstElementChild;
						if(crumb != null){
							crumb.classList.add('active');
						}
					}
				},
				onOpen:function(dom){
					if(mobile){
						$(dom).touchwipe({
							wipeLeft: function() {
								nextCard();
							},
							min_move_x: 100,
							max_move_y: 20
						});
						$(dom).touchwipe({
							wipeRight: function() {
								prevCard();
							},
							min_move_x: 100,
							max_move_y: 20
						});						
					}
					dom.addEventListener('keydown',keydownListener);
				},
                onClose: function(dom) {
					dom.removeEventListener('keydown',keydownListener);
                },
                onAfterClose: function() {
                    if (handler) handler.call(nodes);
                }
            });
		}

        function showEditorFactoryDialog(callback) {
			createMenuDialog([{
				'title':'',
				'menus':[{
					html : '<i class="fas fa-heading"></i>标题',
					handler : function(){callback(document.createElement('h1'))}
				},{
					html : '<i class="fas fa-paragraph"></i>段落',
					handler : function(){callback(document.createElement('p'))}
				},{
					html : '<i class="fas fa-table"></i>表格',
					handler : function(){
						var table = document.createElement('table');
						table.innerHTML = '<tr><th></th><th></th></tr><tr><td></td><td></td></tr>'
						callback(table);
					}
				},{
					html : '<i class="fas fa-file-code"></i>代码块',
					handler : function(){callback(document.createElement('pre'))}
				},{
					html : '<i class="fas fa-list-ul"></i>列表',
					handler : function(){
						var ul = document.createElement('ul');
						ul.innerHTML = '<li><p></p></li>';
						callback(ul)
					}
				},{
					html : '<i class="fas fa-list"></i>任务列表',
					handler : function(){
						var ul = document.createElement('ul');
						ul.classList.add('contains-task-list');
						ul.innerHTML = '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" type="checkbox"></li>';
						callback(ul)
					}
				},{
					html : '<i class="fas fa-quote-left"></i>引用',
					handler : function(){callback(document.createElement('blockquote'))}
				},{
					html : '<i class="fas">--</i>分割线',
					handler : function(){callback(document.createElement('hr'))}
				},{
					html : '<i class="fas fa-square-root-alt">--</i>数学公式块',
					handler : function(){
						var span = document.createElement('span');
						span.setAttribute('data-block-katex', '');
						span.classList.add('katex-display');
						span.innerHTML = '<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>e</mi><mi>d</mi><mi>i</mi><mi>t</mi><mi>m</mi><mi>e</mi></mrow><annotation encoding="application/x-tex"></annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.69444em;vertical-align:0em;"></span><span class="mord mathdefault">e</span><span class="mord mathdefault">d</span><span class="mord mathdefault">i</span><span class="mord mathdefault">t</span><span class="mord mathdefault">m</span><span class="mord mathdefault">e</span></span></span></span>';
						callback(span)
					}
				},{
					html : '<i class="fas">M</i>mermaid图表',
					handler : function(){
						var element = createUnparsedMermaidElement("graph TD\nA --> B\n");
						element.querySelector('.mermaid-source').value = '';
						callback(element)
					}
				}]
			}])
        }

        function createInlineMathSession(wrapper, element) {
            return wrapper.nearWysiwyg.inlineMath.createSession(element)
        }

        function getKatexExpression(elem) {
			return elem.querySelector('[encoding="application/x-tex"]').textContent;
        }

        function getMermaidExpression(elem) {
           return elem.querySelector('.mermaid-source').value;
        }

        function getEditorFactoryByName(name) {
            for (const factory of editorFactories) {
                if (factory.name === name)
                    return factory;
            }
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
			create : function(wrapper){
				return new NearWysiwyg(wrapper);
			},
			DocumentCommandHelper:DocumentCommandHelper,
			HtmlPasteHelper:HtmlPasteHelper,
			commands : commands,
			runBlockCommand : runBlockCommand,
			runInlineCommand : runInlineCommand,
			ContenteditableBar : {
				defaultBarElements : ContenteditableBar.defaultBarElements
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
		var rst = {sel:sel,range:null};
		if (sel.rangeCount > 0) {
			var range = sel.getRangeAt(0);
			var node = range.commonAncestorContainer;
			
			if(element.contains(node)){
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
		var prefix = checked ? '- [x]  ' : '- [ ]  '
		text += prefix + status.selected;
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
		editor.replaceSelection(text);
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
	
	function hasMethod(o,pro){
		return typeof o[pro] === 'function';
	}
	
	function renderKatexAndMermaid(element){
		var hasKatex = (element.querySelector(".katex-inline") != null ||
			element.querySelector(".katex-block") != null);
		if (hasKatex) {
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
				var blocks = element.querySelectorAll(".katex-block");
				for (var i = 0; i < blocks.length; i++) {
					var block = blocks[i];
					var expression = block.textContent;
					var result = parseKatex(expression, true);
					var div = document.createElement('div');
					div.innerHTML = result;
					var child = div.firstChild;
					child.setAttribute('data-block-katex', '');
					if (block.classList.contains('line')) {
						child.classList.add('line');
						child.setAttribute('data-line', block.getAttribute('data-line'))
						child.setAttribute('data-end-line', block.getAttribute('data-end-line'))
					}
					block.outerHTML = child.outerHTML;
				}
			})
		}
		$(element).find('.mermaid').each(function() {
			if (!this.hasAttribute("data-processed")) {
				try {
					mermaid.parse(this.textContent);
					mermaid.init({}, $(this));
				} catch (e) {
					if (window.mermaid)
						this.innerHTML = '<pre>' + e.str + '</pre>'
				}
			}
		});
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
	
    return {
		Wysiwyg:NearWysiwyg,
		commands : commands,
		lazyRes : lazyRes,
		create : function(config){
			if (wrapperInstance.wrapper) {
                wrapperInstance.wrapper.remove();
            }
            var wrapper = new _EditorWrapper(config);
            wrapper.eventHandlers.push({
                name: 'remove',
                handler: function() {
                    delete wrapperInstance.wrapper;
                }
            })
            wrapperInstance.wrapper = wrapper;
            return wrapper;
		}
	};

})();