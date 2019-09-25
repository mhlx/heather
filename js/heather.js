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


    //used to load lazy resource
    var lazyRes = {
        mermaid_js: "js/mermaid.min.js",
        katex_css: "katex/katex.min.css",
        katex_js: "katex/katex.min.js",
        colorpickerJs: "colorpicker/dist/js/bootstrap-colorpicker.min.js",
        colorpickerCss: "colorpicker/dist/css/bootstrap-colorpicker.min.css",
        editorTheme: function(editorTheme) {
            return 'codemirror/theme/' + editorTheme + '.css';
        },
        hljsTheme: function(hljsTheme) {
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
            Swal.fire({
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
				var lines = [];
				for(const line of text.split('\n')){
					lines.push("> "+line);
				}
                return lines.join('\n');
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
		
		mathBlock: function(wrapper) {
            var editor = wrapper.editor;
            var status = editor.selectionStatus();
            selectionBreak(status, function(text) {
                return '$$\n' + text+"\n$$";
            });
            if (status.selected == '') {
                editor.replaceRange(status.text, editor.getCursor());
                editor.focus();
                editor.setCursor({
                    line: status.startLine+1,
                    ch: 0
                });
            } else {
                editor.replaceSelection(status.text);
            }
        },
		
		mermaid : function(wrapper) {
            var editor = wrapper.editor;
            var status = editor.selectionStatus();
            selectionBreak(status, function(text) {
                var newText = "``` mermaid";
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
		
		indentLess : function(wrapper){
			wrapper.editor.execCommand('indentLess');
		},
		
		indentMore:function(wrapper){
			var editor = wrapper.editor;
			if(!editor.somethingSelected() && wrapper.rendered === true){
				var cursor = editor.getCursor();
				var line = cursor.line;
				var out = document.getElementById("heather_out");
				var mappingElem ;
				for(const element of out.children){
					if(element.hasAttribute('data-line')){
						var startLine = parseInt(element.dataset.line);
						var endLine = parseInt(element.dataset.endLine);
						if(line >= startLine && line<=endLine){
							//detect conflict endLine 
							var conflict = false;
							if(line == endLine){
								var elem = out.querySelector('[data-line="'+endLine+'"]');
								if(elem != null){
									conflict = true;
									mappingElem = elem;
								}
							}
							if(!mappingElem)
								mappingElem = element;
							mappingElem.startLine = startLine;
							mappingElem.endLine = conflict ? endLine - 1 : endLine;
							break;
						}
					}
				}
				if(mappingElem){
					if(mappingElem.tagName === 'TABLE'){
						
						var setNextCursor = function(i){
							var lineStr = i == line ? editor.getLine(i).substring(cursor.ch) : editor.getLine(i);
							var firstCh,lastCh;
							for(var j=0;j<lineStr.length;j++){
								var ch = lineStr.charAt(j);
								if(ch == '|'){
									//find prev char '\';
									var prevChar = j == 0 ? '' : lineStr.charAt(j-1);
									if(prevChar != '\\'){
										//find first
										//need to find next
										if(isUndefined(firstCh)){
											firstCh = j;
										}else {
											lastCh = j;
											break;
										}
									}
								}
							}
							if(!isUndefined(firstCh) && !isUndefined(lastCh)){
								//set cursor at middle
								var ch = parseInt(Math.ceil((lastCh - firstCh)/2))+ firstCh + (i == line ? cursor.ch : 0);
								editor.setCursor({line : i,ch : ch});
								return true;
							} else {
								return false;
							}
						}
						var hasNext = false;
						for(var i=line;i<=mappingElem.endLine-1;i++){
							if(setNextCursor(i)){
								hasNext = true;
								break;
							}
						}
						
						if(!hasNext){
							setNextCursor(mappingElem.startLine);
						}
						
						return ;
					}
				}
			}
			wrapper.editor.execCommand('indentMore');
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
			Swal.fire({
                html: '<input class="swal2-input" placeholder="行">' +
                    '<input class="swal2-input" placeholder="列">',
				focusConfirm: false,
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
		
		
		turndownService.addRule('html-block', {
			filter: function(node){
				return node.nodeType == 1  && node.tagName == 'DIV' && node.hasAttribute('data-html');
			},
			replacement: function(content,node) {
				return '\n\n' + node.innerHTML + '\n\n';
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
        MarkdownRender.prototype.renderAt = function(markdownText, element, patch, options) {
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
            if (this.config.render_beforeRender) {
                this.config.render_beforeRender(doc);
            }
            var innerHTML = doc.body.innerHTML;
            if (patch) {
                var div = document.createElement('div');
                cloneAttributes(div, element)
                div.innerHTML = innerHTML;
				morphdomUpdate(element,div);
            } else {
                element.innerHTML = innerHTML;
				renderKatexAndMermaid(element);
            }

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
                lines.push(parseInt(ele.dataset.line));
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
                nextMarker = parseInt(lineMarkers[lineMarkers.length - 1].dataset.endLine);
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
                toast('保存成功')
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
                        toast('保存成功')
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
                    toast('搜索内容不能为空','error');
                    return;
                }
                searchUtil.startSearch(query, function(cursor) {
                    if (cursor == null) {
                        toast('没有找到符合条件的搜索内容');
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
                    var markdown = HtmlPasteHelper.getMarkdownFromPasteHtml(content, wrapper);
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
			this.taskListHelper = new TaskListHelper(this);
			this.tableHelper = new TableHelper(this);
            this.inlinePreview = new InlinePreview(this);
            initKeyMap(this);
            initToolbar(this);
            this.fullscreenMode = new FullscreenMode(this);
            editor.on('paste', function(editor, evt) {
                var clipboardData, pastedData;
                clipboardData = evt.clipboardData || window.clipboardData;
                var files = clipboardData.files;
                if (files.length > 0) {
                    if (wrapper.fileUploadEnable()) {
                        var f = files[0];
                        var type = f.type;
                        if (type.indexOf('image/') == -1) {
                            toast("请上传图片文件",'error');
                            return;
                        }
                        new FileUpload(f, wrapper).start();
                    }
                } else {
                    var html = clipboardData.getData('text/html');
                    evt.preventDefault();
                    evt.stopPropagation();
                    var markdown = HtmlPasteHelper.getMarkdownFromPasteHtml(html, wrapper);
                    if (markdown != null) {
                        editor.replaceSelection('\n\n' + markdown);
                    } else {
                        var text = clipboardData.getData('text/plain');
                        editor.replaceSelection('\n\n' + text);
                    }
                }
            });
            if (!mobile) {
                this.enableAutoRender();
            }
			
            this.editor.on('change', function(){
				wrapper.rendered = false;
			});
			this.rendered = true;
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
									if(node.classList.contains('mermaid-block')){
										rootNode.replaceWith(node);
									} else {
										 morphdomUpdate(rootNode, node);
									}
                                   
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
                        var _startLine = parseInt(this.dataset.line);
                        var _endLine = parseInt(this.dataset.endLine) - 1;
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
                 'Alt-/': function(){
					showCommandDialog(wrapper);
				},
                "Cmd-Enter": function() {
                    toggleFullscreen(wrapper);
                },
				"Tab":'indentMore',
				"Shift-Tab":'indentLess'
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
                'Alt-/': function(){
					showCommandDialog(wrapper);
				},
                "Ctrl-Enter": function() {
                    toggleFullscreen(wrapper);
                },
				"Tab":'indentMore',
				"Shift-Tab":'indentLess'
            }
            wrapper.bindKey(keyMap);
        }
		
		function toggleFullscreen(wrapper){
			if (wrapper.inFullscreen()) {
				wrapper.exitFullScreen();
			} else {
				wrapper.requestFullScreen();
			}
		}


        function triggerEvent(wrapper, name, args) {
            for (var i = 0; i < wrapper.eventHandlers.length; i++) {
                var evtHandler = wrapper.eventHandlers[i];
                if (evtHandler.name == name) {
                    try {
                        evtHandler.handler.call(wrapper, args);
                    } catch (e) {
                        console.log(e);
                    }
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
            var handler = commands[name];
            if (!isUndefined(handler)) {
                handler.call(null, this);
            }
        }

        EditorWrapper.prototype.doRender = function(patch, options) {
            this.render.renderAt(this.editor.getValue(), $("#heather_out")[0], patch, options);
            renderToc();
			this.rendered = true;
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
                this.editor.on('scroll', this.scrollHandler)
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
            var me = this;
            var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
            $("#heather_wrapper").animate({
                scrollLeft: 0
            }, ms, function() {	
				if (mobile) {
					me.doRender(true);
				}			
                if (callback) callback();
            });
        }

        EditorWrapper.prototype.toPreview = function(callback, _ms) {
            if (mobile || this.inFullscreen()) {
                this.editor.unfocus();
                var me = this;
                var ms = getDefault(_ms, getDefault(this.config.swipe_animateMs, 500));
                $("#heather_wrapper").animate({
                    scrollLeft: $("#heather_out")[0].offsetLeft
                }, ms, function() {
					if (mobile) {
						me.doRender(true);
						me.doSync();
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

        EditorWrapper.prototype.triggerEvent = function(name, args) {
            triggerEvent(this, name, args)
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
                                'material-darker': 'material-darker',
                                'material-ocean': 'material-ocean',
                                'material-palenight': 'material-palenight',
                                'mbo': 'mbo',
                                'mdn-like': 'mdn-like',
                                'midnight': 'midnight',
                                'monokai': 'monokai',
                                'moxer': 'moxer',
                                'neat': 'neat',
                                'neo': 'neo',
                                'night': 'night',
                                'nord': 'nord',
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
                                'yonce': 'yonce',
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
                        href: lazyRes.colorpickerCss
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
                        Swal.fire({
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
                    toast('没有保存的文档');
                } else {
                    var html = '<table style="width:100%">';
                    for (var i = 0; i < documents.length; i++) {
                        var doc = documents[i];
                        html += '<tr><td>' + doc.title + '</td><td><i class="fas fa-times" data-title="' + doc.title + '" style="margin-right:20px;cursor:pointer"></i><i data-title="' + doc.title + '" class="fas fa-arrow-down" style=";cursor:pointer"></i></td><tr>';
                    }
                    html += '</table>';
                    Swal.fire({
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
                var line = head.dataset.line;
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
	
	var HtmlPasteHelper = (function() {

		var attributeRule = {
			'img': ['src', 'title', 'alt'],
			'a': ['href', 'title']
		}

		var unwrapSet = new Set(['DIV', 'ARTICLE','SECTION']);
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
						var p = document.createElement('p');
						p.appendChild(n);
						nodes.push(p);
						continue;
					}
					cleanNode(root, n);
					if (!root.contains(n)) continue;
					cleanAttribute(n);
					nodes.push(n);
				}
			}
			return nodes;
		}

		var getMarkdownFromPasteHtml = function(html) {
			var nodes = getNodesFromPasteHTML(html);
			if (nodes.length > 0) {
				var markdown = '';
				var i = 0;
				for (const node of nodes) {
					if (node.hasAttribute('data-html')) {
						node.removeAttribute('data-html');
						markdown += node.outerHTML;
					} else {
						markdown += turndownService.turndown(node.outerHTML);
					}
					if (i < nodes.length - 1) {
						markdown += '\n\n';
					}
					i++;
				}
				return markdown;
			}

			return null;
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
			getMarkdownFromPasteHtml: getMarkdownFromPasteHtml,
			attributeRule: attributeRule,
			nodeHandler: nodeHandler,
			unwrapSet : unwrapSet
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
		
		var link = document.createElement('link');
		link.setAttribute('type','text/css');
		link.setAttribute('rel','stylesheet');
		link.setAttribute('href',lazyRes.katex_css);
		document.head.appendChild(link);
		
		loadScript(lazyRes.katex_js,function(){
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
		loadScript(lazyRes.mermaid_js,function(){
			 mermaidLoaded = true;
			 if (callback) callback();
		})
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

    function hasMethod(o, pro) {
        return typeof o[pro] === 'function';
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
				block.innerHTML = child.outerHTML;
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
	
	
	function showCommandDialog(wrapper) {
		createMenuDialog([{
			'title': '',
			'menus': [{
				html: '<i class="fas fa-heading"></i>标题',
				handler: function() {
					wrapper.execCommand('heading');
				}
			}, {
				html: '<i class="fas fa-table"></i>表格',
				handler: function() {
					wrapper.execCommand('table');
				}
			}, {
				html: '<i class="fas fa-file-code"></i>代码块',
				handler: function() {
					wrapper.execCommand('codeBlock');
				}
			}, {
				html: '<i class="fas fa-list"></i>任务列表',
				handler: function() {
					wrapper.execCommand('check');
				}
			}, {
				html: '<i class="fas fa-quote-left"></i>引用',
				handler: function() {
					wrapper.execCommand('quote');
				}
			}, {
				html: '<i class="fas fa-square-root-alt"></i>数学公式块',
				handler: function() {
				  wrapper.execCommand('mathBlock');
				}
			}, {
				html: '<i class="fas">M</i>mermaid图表',
				handler: function() {
					wrapper.execCommand('mermaid');
				}
			}]
		}])
	}


	function createMenuDialog(menuCards) {
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
			var index = parseInt(li.dataset.index);
			var menu = _menus[index];
			if(menu.onInActive){
				menu.onInActive(li);
			}
		}
		var onActive = function(li){
			li.setAttribute('tabindex',0);
			li.focus();
			var index = parseInt(li.dataset.index);
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

		Swal.fire({
			animation: false,
			html: html,
			scrollbarPadding :false,
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
				if (handler) handler.call(nodes);
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
	
	var TaskListHelper = (function(){
		
		function TaskListHelper(wrapper){
			
			var clickHandler = function(e){
				var root = e.target;
				while(root != null){
					if(root.classList.contains('contains-task-list'))
						break;
					root = root.parentElement;
				}
				
				if(root == null)
					return ;
				
				var li = e.target;
				while(!li.classList.contains('task-list-item')){
					li = li.parentElement;
				}
				var cm = wrapper.editor;
				cm.setOption('readOnly',true);
				wrapper.disableExtraEditorSpace = true;
				var line = parseInt(root.dataset.line);
				var endLine = parseInt(root.dataset.endLine);
				var str = cm.getLines(line,endLine);
				
				var body = parseHTML(str).body;
				if(body.querySelector('.contains-task-list') != null){
					cm.setOption('readOnly',false);
					wrapper.disableExtraEditorSpace = false;
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
					var element = parseHTML(root.outerHTML).body.firstChild;
					var markdown = turndownService.turndown(element.outerHTML);
					var cursor = wrapper.editor.getCursor();
					replaceMarkdown(cm,markdown,line,endLine);
					try{
						wrapper.editor.setCursor(cursor)
					}catch(e){}
					wrapper.doRender(true);
				}
				wrapper.disableExtraEditorSpace = false;
				wrapper.editor.setOption('readOnly',false);
			}
			
			$("#heather_out").on('click','.task-list-item',clickHandler);
			$(document).on('click','.inline-preview',clickHandler);
		}
		
		return TaskListHelper;
	})();
	
	var ContenteditableBar = (function(){
		function ContenteditableBar(wrapper,element){
			var me = this;
			this.composing = false;
			var bar = document.createElement('div');
			bar.setAttribute('class','heather_contenteditable_bar');
			document.body.appendChild(bar);
			bar = new Bar(bar);
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
			registerSelectionChangeListener(selectionChangeListener);
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
			unregisterSelectionChangeListener(this.selectionChangeListener);
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
		
		return ContenteditableBar;
	})();
	
	var TableHelper = (function(){
		
		function TableHelper(wrapper){
			var me = this;
			this.oneTimeHandlers = [];
			
			var clickHandler = function(e){
				var root = e.target;
				while(root != null){
					if(root.tagName == 'TABLE')
						break;
					root = root.parentElement;
				}
				if(root == null){
					return ;
				}
				var line = parseInt(root.dataset.line);
				var endLine = parseInt(root.dataset.endLine);
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
						this.tableSession.start(e.target);
					}
				}
			}
			$(document).on('click','.inline-preview',clickHandler)
			$("#heather_out").on('click','table',clickHandler)
		}
		
		function TableSession(wrapper,table,line,endLine){
			this.wrapper = wrapper;
			this.table = table;
			this.line = line;
			this.endLine = endLine;
		}
		
		TableSession.prototype.start = function(target){
			var me = this;
			this.wrapper.editor.setOption('readOnly',true);
			this.wrapper.disableExtraEditorSpace = true;
			
			this.clickHandler = function(e){
				var td = getTd(e.target,me.table);
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
					me.contenteditableBar = new ContenteditableBar(me.wrapper,td);
					td.focus();
				}
				me.td = td;
			}
			$(this.table).on('click','th,td',this.clickHandler);
			
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			this.table.before(toolbar);
			toolbar = new Bar(toolbar);
			toolbar.addIcon('fas fa-bars middle-icon',function(){
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
				var menus = [{
					html: '<i class="fas fa-check"></i>完成',
					handler: function() {
						me.close();
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
				
				createMenuDialog([{
					'title': '',
					'menus': menus
				}])
			});
			this.toolbar = toolbar;
			
			
			if(target){
				var td = getTd(target,me.table);
				td.addEventListener('paste',plainPasteHandler);
				td.setAttribute('contenteditable',true);
				me.contenteditableBar = new ContenteditableBar(me.wrapper,td);
				td.focus();
				me.td = td;
			}
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
			var markdown = '';
			if(table.index() != -1){
				var element = parseHTML(table[0].outerHTML).body.firstChild;
				markdown = turndownService.turndown(element.outerHTML);
			};
			var cursor = this.wrapper.editor.getCursor();
			replaceMarkdown(this.wrapper.editor,markdown,this.line,this.endLine);
			try{
				this.wrapper.editor.setCursor(cursor)
			}catch(e){}
			this.wrapper.doRender(true);
			this.wrapper.disableExtraEditorSpace = false;
			this.closed = true;
		}
		
		function doAlign(table,td,align){
			var index = td.index();
			table.find('tr').each(function(){
				var tr = $(this);
				tr.children().eq(index).css({'text-align':align})
			})
		}
		
		function addCol(table, td, num,after,editor) {
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

		function addRow(table, td,num, after,editor) {
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

		
		return TableHelper;
	})();
	
	function loadScript(src, callback, relative){
		var script = document.createElement('script');
		script.src = src; 
		if(callback !== null){
			script.onload = function() { 
				callback();
			};
		}
		document.body.appendChild(script);
	}
	
	function replaceMarkdown(cm,markdown,line,endLine){
		var endLineConfict = $("#heather_out").find('[data-line="'+endLine+'"]').length > 0;
		var nextLine = endLineConfict ? cm.getLine(endLine) :  endLine < cm.lineCount() - 1 ? cm.getLine(endLine + 1) : "";
		if(nextLine.trim() != ''){
			markdown += '\n\n';
		}
		cm.replaceRange(markdown, {
			line: line,
			ch: 0
		}, {
			line: endLineConfict?endLine : endLine + 1,
			ch: 0
		});
	}
	
    return {
        commands: commands,
        lazyRes: lazyRes,
        create: function(config) {
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