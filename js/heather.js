var Heather = (function(){
	
	CodeMirror.prototype.unfocus = function(){
		this.getInputField().blur();
	}

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
	
	var keyNames = CodeMirror.keyNames;
	var mac = CodeMirror.browser.mac;
	var mobile = CodeMirror.browser.mobile;
    var ios = CodeMirror.browser.ios;
	
	function _Heather(){
		this.commands = {
			emoji : function(editor) {
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
			heading : function(editor) {
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
						var text = editor.getSelection();
						var _text = '\n';
						for (var i = 0; i < v; i++) {
							_text += '#';
						}
						_text += ' ';
						if (text == '') {
							editor.replaceRange(_text, editor.getCursor());
							editor.focus();
							var start_cursor = editor.getCursor();
							var cursorLine = start_cursor.line;
							var cursorCh = start_cursor.ch;
							editor.setCursor({
								line: cursorLine,
								ch: cursorCh + v
							});
						} else {
							editor.replaceSelection(_text + text);
						}
					}
				}
				getHeading();
			},
			bold :  function(editor) {
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

			italic : function(editor) {
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

			quote : function(editor) {
				var text = editor.getSelection();
				if (text == '') {
					editor.replaceRange("\n> ", editor.getCursor());
					editor.focus();
					var start_cursor = editor.getCursor();
					var cursorLine = start_cursor.line;
					var cursorCh = start_cursor.ch;
					editor.setCursor({
						line: cursorLine,
						ch: cursorCh
					});
				} else {
					editor.replaceSelection("> " + text);
				}
			},

			strikethrough : function(editor) {
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


			link : function(editor) {
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
				var editor = heather.editor;
				var text = "\n```";
				text += '\n';
				text += editor.getSelection() + "";
				text += '\n'
				text += "```";
				editor.focus();
				editor.replaceSelection(text);
				editor.setCursor({
					line: editor.getCursor('start').line - 1,
					ch: 0
				});
			},

			code : function(editor) {
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

			uncheck :  function(editor) {
				var text = editor.getSelection();
				if (text == '') {
					editor.replaceRange("\n- [ ] ", editor.getCursor());
					editor.focus();
					var start_cursor = editor.getCursor();
					var cursorLine = start_cursor.line;
					var cursorCh = start_cursor.ch;
					editor.setCursor({
						line: cursorLine,
						ch: cursorCh
					});
				} else {
					editor.replaceSelection("- [ ] " + text);
				}
			},

			check : function(editor) {
				var text = editor.getSelection();
				if (text == '') {
					editor.replaceRange("\n- [x] ", editor.getCursor());
					editor.focus();
					var start_cursor = editor.getCursor();
					var cursorLine = start_cursor.line;
					var cursorCh = start_cursor.ch;
					editor.setCursor({
						line: cursorLine,
						ch: cursorCh
					});
				} else {
					editor.replaceSelection("- [x] " + text);
				}
			},

			table : function(editor) {
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
							text += "\n";
						}
					}
					editor.replaceSelection("\n" + text);
				}).catch(swal.noop)
			}
		}
	}
	
	_Heather.prototype.create = function(display,editor,config){
		return new Heather(display,editor,config)
	}
	
	_Heather.prototype.loadMermaid = function(callback){
		if (this.mermaidLoading) {
			return;
		};
		if(this.mermaidLoaded && callback){
			callback(false);
			return ;
		}
		this.mermaidLoading = true;
		var me = this;
		$('<script>').appendTo('body').attr({
			src: this.mermaid_js || 'js/mermaid.min.js',
			onload:function(){
				var t = setInterval(function(){
					try{
						mermaid.initialize({});
						clearInterval(t);
						me.mermaidLoaded = true;
						delete me.mermaidLoading;
						if(callback) callback(true);
					}catch(e){
						if(this.mermaidLoaded){
							console.log(e);
						}
					}
				},20);
			}
		});
	}
	

    _Heather.prototype.loadKatex = function(callback){
		if (this.katexLoading) return;
		if(this.katexLoaded) return;
		this.katexLoading = true;
		var me = this;
		$('<link>').appendTo('head').attr({
			type: 'text/css',
			rel: 'stylesheet',
			href: this.katex_css || 'katex/katex.min.css'
		});
		$('<script>').appendTo('body').attr({
			src: this.katex_js || 'katex/katex.min.js',
			onload:function(){
				var t = setInterval(function() {
					try {
						var html = katex.renderToString("", {
							throwOnError: false
						})
						clearInterval(t);
						me.katexLoaded = true;
						delete me.katexLoading;
						if(callback){
							callback();
						}
					} catch (e) {
						if(me.katexLoaded){
							console.log(e);
						}
					}
				}, 20)
			}
		});
		
	}
	
	var _heather = new _Heather();
	
	
	
	var Tooltip = (function(){
		
		var HljsTip = (function(){
			
			$('<div id="editor_hljs_tip" style="visibility:hidden;position:absolute;z-index:99;overflow:auto;background-color:#fff"></div>').appendTo($('body'));	
			var tip = $("#editor_hljs_tip");
			function HljsTip(editor,display){				
				var state = {running:false,cursor:undefined,hideOnNextChange:false};
				
				
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
										if($(display).height() - pos.top < height+editor.defaultTextHeight()){
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
		
		function Tooltip(editor,display){
			this.hljsTip = HljsTip.create(editor,display);
		}
		
		Tooltip.prototype.enable = function(){
			this.hljsTip.enable();
		}
		
		return {create : function(editor,display){return new Tooltip(editor,display)}}
		
	})();
	
	
	var Bar = (function() {


        function Bar(element) {
            this.element = $(element);
            this.keepHidden = false;
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

        Bar.prototype.addIcon = function(clazz, handler, callback) {
            this.insertIcon(clazz, handler, this.getSize(), callback);
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
	
	function Heather(display,editor,config){
		config = config || {};
		var _editor = createEditor(editor,display,config);
		cm = _editor.editor;
		var md = config.md || window.md;
		var cvtKey = (mac ? "Cmd-Enter" : "Ctrl-Enter")||config.cvtKey;
		var nbKey = (mac ? "Shift-Cmd-Enter" : "Shift-Ctrl-Enter")||config.nbKey;
		var keyMap = {};
		var me = this;
		
		var handler = function(editor){
			var source = editor.getValue();
			var html = window.md.render(source);
			$(display).append('<div class="markdown-body editor_display_inline">'+html+'<textarea class="editor_display_source">'+source+'</textarea></div>');
			renderHtml($('.editor_display_inline').last());
			editor.setValue('');
			editor.setCursor({line:0,ch:0})
			editor.focus();
			me.save();
		};
		var innerBar = _editor.innerBar;
		innerBar.insertIcon('fas fa-check editor_icon',function(){
			handler(cm);
		},0)
		keyMap[cvtKey] = handler;
		keyMap['Esc'] = handler;
		cm.addKeyMap(keyMap);
		cm.focus();
		this.cm = cm;
		this.md = md;
		this.display = display;
		this.cvtKey = cvtKey;
		this.nbKey = nbKey;
		this.state = {};
		this.config = config;
		this._editor = _editor;
		bindDisplayEvent(this);
		
		this.cm.setOption('dropFileHandler', function(file) {
			var name = file.name.toLowerCase();
			if(!name.endsWith('.md')){
				return true;
			}
			var reader = new FileReader();
			reader.onload = function (e) {
                var lines = e.target.result.split('\n');
				var blocks = [];
				var block = '';
				for(var i=0;i<lines.length;i++){
					if(lines[i].trim() == ''){
						blocks.push(block);
						block = '';
					} else {
						block += lines[i];
						if(i < lines.length - 1){
							block += '\n';
						}
					}
				}
				if(block.trim() != ''){
					blocks.push(block);
				}
				me.render(blocks);
            };
            reader.readAsText(file);
			return true;
		});
		
		
		/////test
		var blocksJson = localStorage.getItem('heather-demo');
		if(blocksJson == null){
			
			 $.ajax({
				url: "test.txt",
				async: false,
				success: function (data){
					blocksJson = data;
				}
			});
			
		}
		
		var blocks = $.parseJSON(blocksJson);
		this.render(blocks);
	}
	
	
	Heather.prototype.getMarkdownBlocks = function(){
		var sources = this.display.querySelectorAll('.editor_display_source');
		var blocks = [];
		$.each(sources,function(){
			blocks.push($(this).val());
		})
		return blocks;
	}
	
	Heather.prototype.getMarkdown = function(){
		var blocks = this.getMarkdownBlocks();
		var markdown = '';
		for(var i=0;i<blocks.length;i++){
			var block = blocks[i];
			if(block.trim() == '') continue;
			var newLineSize = 2;
			if(block.endsWith('\n')){
				newLineSize--;
			}
			if(block.startsWith('\n')){
				newLineSize--;
			}
			var newLine = newLineSize == 2 ? '\n\n' : newLineSize == 1 ? '\n' : '';
			markdown += block;
			if(i < blocks.length-1){
				markdown += newLine;
			}
		}
		return markdown;
	}
	
	Heather.prototype.getHtml = function(){
		return this.md.render(this.getMarkdown());
	}
	
	Heather.prototype.clear = function(){
		this.display.innerHTML = '';
		this.cm.setValue('');
		this.cm.focus();
		this.cm.setCursor({line:0,ch:0});
		unlockRootEditor(this);
	}
	
	Heather.prototype.render = function(blocks){
		var display = this.display;
		var md = this.md;
		for(var i=0;i<blocks.length;i++){
			var block = blocks[i];
			var html = md.render(block);
			$(display).append('<div class="markdown-body editor_display_inline">'+html+'<textarea class="editor_display_source">'+block+'</textarea></div>');
		}
		renderHtml($(display));
	}
	
	
	function bindInnerBar(editor){
		var div = document.createElement('div');
		div.classList.add('editor_bar');
		var innerBar = Bar.create(div);
		var wrapper = editor.getWrapperElement();
		$(wrapper).after(div);
		var icons = ['emoji', 'heading', 'bold', 'italic', 'quote', 'strikethrough', 'link', 'code', 'code-block', 'uncheck', 'check', 'table', 'undo', 'redo'];
		for (var i = 0; i < icons.length; i++) {
			var icon = icons[i];
			if(icon == 'emoji'){
				innerBar.addIcon('far fa-grin-alt editor_icon',function(){
					_heather.commands['emoji'](editor);
				})
			}
			if(icon == 'heading'){
				innerBar.addIcon('fas fa-heading editor_icon',function(){
					_heather.commands['heading'](editor);
				})
			}
			if(icon == 'bold'){
				innerBar.addIcon('fas fa-bold editor_icon',function(){
					_heather.commands['bold'](editor);
				})
			}
			if(icon == 'italic'){
				innerBar.addIcon('fas fa-italic editor_icon',function(){
					_heather.commands['italic'](editor);
				})
			}
			if(icon == 'quote'){
				innerBar.addIcon('fas fa-quote-left editor_icon',function(){
					_heather.commands['quote'](editor);
				})
			}
			
			if(icon == 'strikethrough'){
				innerBar.addIcon('fas fa-strikethrough editor_icon',function(){
					_heather.commands['strikethrough'](editor);
				})
			}
			
			if(icon == 'link'){
				innerBar.addIcon('fas fa-link editor_icon',function(){
					_heather.commands['link'](editor);
				})
			}
			
			if(icon == 'code'){
				innerBar.addIcon('fas fa-code editor_icon',function(){
					_heather.commands['code'](editor);
				})
			}
			
			if(icon == 'code-block'){
				innerBar.addIcon('fas fa-file-code editor_icon',function(){
					_heather.commands['codeBlock'](editor);
				})
			}
			
			if(icon == 'uncheck'){
				innerBar.addIcon('far fa-square editor_icon',function(){
					_heather.commands['uncheck'](editor);
				})
			}
			
			if(icon == 'check'){
				innerBar.addIcon('far fa-check-square editor_icon',function(){
					_heather.commands['check'](editor);
				})
			}
			
			if(icon == 'table'){
				innerBar.addIcon('fas fa-table editor_icon',function(){
					_heather.commands['table'](editor);
				})
			}
			
			if(icon == 'undo'){
				innerBar.addIcon('fas fa-undo editor_icon',function(){
					editor.execCommand('undo');
				})
			}
			
			if(icon == 'redo'){
				innerBar.addIcon('fas fa-redo editor_icon',function(){
					editor.execCommand('redo');
				})
			}
		}	
		var cursorActivityHandler = function(editor) {
			var lh = editor.defaultTextHeight();
			var top = editor.cursorCoords(true).top;
			if(top < innerBar.height() + 2*lh){
				$(div).css({
					"top": (editor.cursorCoords(true).top + 2 * lh) + "px",
				});
			} else {
				$(div).css({
					"top": (editor.cursorCoords(true).top - 2 * lh - innerBar.height()/2) + "px",
				});
			}
			
			innerBar.show();
		}
		editor.on('cursorActivity',cursorActivityHandler);
		return innerBar;
	}
	
	//used for test
	Heather.prototype.save = function(){
		var markdownBlocks = this.getMarkdownBlocks();
		localStorage.setItem('heather-demo',JSON.stringify(markdownBlocks));
	}
	
	
	
	
	function renderHtml(block){
		//highlight code
		block.find('pre code').each(function(){
			var language = this.getAttribute('class');
			if(language && language.startsWith("language-")){
				var lang = language.split('-')[1];
				if(hljs.getLanguage(lang)){
					this.innerHTML = hljs.highlight(lang, this.textContent, true).value;
				}
			}
		});
		//render mermaid
		var hasMermaid = block[0].querySelector('.mermaid') != null;
		if(hasMermaid){
			_heather.loadMermaid(function(status){
				block.find('.mermaid').each(function(){
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
		//render katex || only once
		var hasKatex = block[0].querySelector('.katex') != null;
		if(hasKatex){
			_heather.loadKatex(function(){
				block.find('.katex').each(function(){
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
	
	
	function unlockRootEditor(heather){
		heather._editor.innerBar.keepHidden = false;
		heather.cm.setOption('readOnly',false);
	}
	
	function lockRootEditor(heather){
		heather._editor.innerBar.keepHidden = true;
		heather._editor.innerBar.hide();
		heather.cm.setOption('readOnly',true);
	}
	
	
	function bindDisplayEvent(heather){
		var state = heather.state;
		var cm = heather.cm;
		var display = heather.display;
		
		
		var newBlockHandler = function(editor){
			Swal.fire({
				title: '确定要分块吗?',
				type: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33'
			}).then((result) => {
				if (result.value) {
					var me = state.displayEditorEement;
					var cursor = editor.getCursor();
					var lineCount = editor.lineCount();
					var ch = cursor.ch;
					var line = cursor.line;
					var newSource = '';
					var lastSource = '';
					for(var i=0;i<line;i++){
						newSource += editor.getLine(i) + '\n';
					}
					newSource += editor.getLine(line).substring(0,ch);
					lastSource = editor.getLine(line).substring(ch);
					for(var i=line+1;i<=lineCount-1;i++){
						lastSource += editor.getLine(i);
						if(i < lineCount - 1){
							lastSource += '\n';
						}
					}
					
					if(lastSource.startsWith('\n')) lastSource = lastSource.substring(2);
					if(lastSource.trim() != ''){
						var html = heather.md.render(lastSource);
						var newDisplay = $('<div class="editor_display_inline markdown-body">'+html+'<textarea class="editor_display_source">'+lastSource+'</textarea></div>');
						$(me).after(newDisplay);
						renderHtml(newDisplay);
					}
					
					if(newSource.trim() == ''){
						$(me).remove();
					} else {
						var html = heather.md.render(newSource);
						me.innerHTML = html+'<textarea class="editor_display_source">'+newSource+'</textarea>';
						$(me).addClass('markdown-body');
						renderHtml($(me));
					}
					
					
					
					
					delete state.cursor;
					delete state.displayEditor;
					delete state.displayEditorEement;
					
				}
			})
			
		}
		
		var handler = function(displayEditor){
			var me = state.displayEditorEement;
			var source = displayEditor.getValue();
			if(source.trim() == ''){
				$(me).remove();
				unlockRootEditor(heather);
				return ;
			}
			
			var html = heather.md.render(source);
			me.innerHTML = html+'<textarea class="editor_display_source">'+source+'</textarea>';
			$(me).addClass('markdown-body');
			renderHtml($(me));
			
			delete state.cursor;
			delete state.displayEditor;
			delete state.displayEditorEement;
			
			unlockRootEditor(heather);
		};
		
		
		$(display).on('input',function(){
			heather.save();
		})
		$(display).on('click','.editor_display_inline',function(){
			var me = this;
			if(state.displayEditorEement){
				if(state.displayEditorEement != this){
					handler(state.displayEditor);
				} else {
					return ;
				}
			} 
			$(me).removeClass('markdown-body');
			me.innerHTML = me.querySelector('.editor_display_source').outerHTML;
			var _editor = createEditor(me.querySelector('.editor_display_source'),heather.config,me);
			var editor = _editor.editor;
			
			var innerBar = _editor.innerBar;
			innerBar.insertIcon('fas fa-times editor_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if(result.value){
						$(me).remove();
						unlockRootEditor(heather);
					}
				});
			},0)
			innerBar.insertIcon('fas fa-columns editor_icon',function(){
				newBlockHandler(editor);
			},0)
			innerBar.insertIcon('fas fa-check editor_icon',function(){
				handler(editor);
			},0)
			var keyMap = {};
			keyMap[heather.cvtKey] = handler;
			keyMap[heather.nbKey] = newBlockHandler;
			keyMap['Esc'] = handler;
			
			var keyMap2 = {'Backspace':function(editor){
				var prev = $(me).prev('.editor_display_inline');
				if(prev.length > 0){
					var source = prev.find('.editor_display_source').val();
					var newLine = source.endsWith('\n') ? '\n' : '\n\n';
					editor.setValue(source + newLine + editor.getValue());
					editor.setCursor({line:source.split('\n').length+1,ch:0});
					prev.remove();
				}
			}}
			editor.on('cursorActivity',function(editor){
				var cursor = editor.getCursor();
				if(cursor.line == 0 && cursor.ch == 0){
					editor.addKeyMap(keyMap2);
				} else {
					editor.removeKeyMap(keyMap2);
				}
			})
			
			editor.addKeyMap(keyMap);
			state.displayEditor = editor;
			state.displayEditorEement = me;
			state.cursor = heather.cm.getCursor();
			
			lockRootEditor(heather);
			
			editor.focus();
			editor.setCursor({line:editor.lineCount()-1,ch:editor.getLine(editor.lineCount()-1).length});
			
		})
	}
	
	function Editor(editor,tooltip,innerBar){
		this.editor = editor;
		this.tooltip = tooltip;
		this.innerBar = innerBar;
	}
	
	
	function createEditor(editor,display,config){
        var scrollBarStyle = mobile ? 'native' : 'overlay';
		var cm = CodeMirror.fromTextArea(editor, {
			mode: {name: "gfm"},
			lineNumbers: false,
			matchBrackets: true,
			lineWrapping: true,
			dragDrop: true,
			scrollbarStyle: scrollBarStyle,
			extraKeys: {
				"Enter": "newlineAndIndentContinueMarkdownList"
			}
		});
		var tooltip = Tooltip.create(cm,display);
		tooltip.enable();
		var bar = bindInnerBar(cm);
		return new Editor(cm,tooltip,bar);
	}
	
	return _heather;
})();