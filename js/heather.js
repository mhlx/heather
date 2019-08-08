var Heather = (function(){
	var keyNames = CodeMirror.keyNames;
	var mac = CodeMirror.browser.mac;
	var mobile = CodeMirror.browser.mobile;
    var ios = CodeMirror.browser.ios;
	var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
	var headings = ['# ','## ','### ','#### ','#### ','##### ','###### '];
	var headingNames = ['H1','H2','H3','H4','H5','H6']
	var tableMd = '|   |   |\n| - | - |\n|   |   |';
	var headingMd = '# ';
	var blockquoteMd = '> ';
	var listMd = '- ';
	var horizontalRuleMd = '---';
	var veryThinHtml = '&#8203;';
	var veryThinChar = '​';
	var codeBlockMd = '``` \n```';
	var taskListMd = '- [ ] '+veryThinHtml;
	var tabSpace = "	";
	Element.prototype.blockDefault = function(){
		return "block" == window.getComputedStyle(this, "").display;
	}
	
    var plainPasteHandler = function(e){
		var text = (e.originalEvent || e).clipboardData.getData('text/plain');
		document.execCommand('insertText',false,text);
		return false;
	}
	
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.replace(new RegExp(search, 'g'), replacement);
	};
	
	CodeMirror.prototype.unfocus = function(){
		this.getInputField().blur();
	}

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
	
	CodeMirror.commands['emoji'] =  function(editor) {
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
	
	function parseHTML(html){
		return new DOMParser().parseFromString(html, "text/html");
	}
	
	function isUndefined(o) {
        return (typeof o == 'undefined')
    }
	
	function _Heather(){
		this.selectionChangeListeners = [];
		var me = this;
		document.onselectionchange = function(){
			for(var i=0;i<me.selectionChangeListeners.length;i++){
				try{
					me.selectionChangeListeners[i].call()
				}catch(e){console.log(e)};
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
	
	_Heather.prototype.markdownToBlocks = function(markdown){
		markdown = markdown += '\n';
		var lines = markdown.split('\n');
		var blocks = [];
		var block = '';
		var hasHtml = false;
		for(var i=0;i<lines.length;i++){
			if(lines[i].trim() == ''){
				if(inCodeBlock(block)){
					block += '\n';
					continue;
				}
				if( inHtmlBlock(block)){
					hasHtml = true;
					block += '\n';
					continue;
				}
				
				if(block.trim() != ''){
					blocks.push({html:hasHtml,block:block});
					hasHtml = false;
				}
				block = '';
			} else {
				if(lines[i].startsWith("# ")){
					
					if(block.trim() != ''){
						blocks.push({html:hasHtml,block:block});
						hasHtml = false;
					}
					block = '';
					blocks.push({html:false,block:lines[i]});
					continue;
				}
				block += lines[i];
				if(i < lines.length - 1){
					block += '\n';
				}
			}
		}
		if(block.trim() != ''){
			blocks.push({html:hasHtml,block:block});
		}
		return blocks;
	}
	
	function inCodeBlock(block){
		if(block.startsWith("```")){
			var blockArray = block.split('\n');
			for(var j=blockArray.length-1;j>=1;j--){
				if(blockArray[j].trim() == '```'){
					return false;
				}
			}
			return true;
		}
		return false;
	}
	
	function inHtmlBlock(block){
		var doc = parseHTML(block.replaceAll("\<","&lt;"));
		var nodes = doc.body.childNodes;
		if(nodes.length == 0){
			return false;
		}
		return nodes[nodes.length-1].nodeType == 1;
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
		
		 Bar.prototype.remove = function() {
            this.element.remove();
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

		Bar.prototype.clear = function() {
			$(this.element).html('');
        }

        function createElement(icon, handler) {
            var i = document.createElement('i');
            i.setAttribute('class', icon);
            i.setAttribute('style', 'cursor: pointer;margin-right:20px');
			if(handler){
				if(mobile){
					i.addEventListener('touchstart', function(e) {
						if(e.cancelable){
							e.preventDefault();
						}
						handler(i);
					})
				} else {
					i.addEventListener('mousedown', function(e) {
						if(e.cancelable){
							e.preventDefault();
						}
						handler(i);
					})
				}
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
	
	var Toolbar = (function(){
		
		function Toolbar(){
			var toolbar = document.createElement('div');
			toolbar.classList.add('heather_bar');
			document.body.appendChild(toolbar);
			this.bar = Bar.create(toolbar);
			var me = this;
			this.hideHandler = function(evt) {
				me.bar.hide();
			};
			this.cursorActivityHandler = function(editor) {
				editor.scrollIntoView({line:editor.getCursor().line});
				var lh = editor.defaultTextHeight();
				if(editor.cursorCoords(true).top -  $(window).scrollTop() > me.bar.height()+2*lh){
					me.bar.element.css({
						"top": (editor.cursorCoords(true).top -  me.bar.height() -lh) + "px",
					});
				} else {
					me.bar.element.css({
						"top": (editor.cursorCoords(true).top +  lh) + "px",
					});	
				}
				
				me.bar.show();
			}
		}
		
		Toolbar.prototype.unbind = function(){
			if(this.editor){
				this.bar.clear();
				this.bar.hide();
				this.editor.off('cursorActivity',this.cursorActivityHandler);
				this.editor.getScrollerElement().removeEventListener('touchmove', this.hideHandler);
				this.editor.off('scroll',this.hideHandler);
				this.editor = undefined;
			}
		}
		
		Toolbar.prototype.hide = function(){
			this.bar.hide();
		}
		
		Toolbar.prototype.bind = function(editor){
			this.unbind();
			var bar = this.bar;
			bar.clear();
			bar.hide();
			bar.addIcon('far fa-grin-alt heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('emoji');
				})
			});
			
			bar.addIcon('fas fa-bold heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('md_bold');
				})
			})
		
			bar.addIcon('fas fa-italic heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('md_italic');
				})
			})
		
			bar.addIcon('fas fa-strikethrough heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('md_strikethrough');
				})
			})
			
			
			bar.addIcon('fas fa-link heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('md_link');
				})
			})
	
			bar.addIcon('fas fa-code heather_middle_icon',undefined,function(ele){
				ele.addEventListener('click',function(){
					editor.execCommand('md_code');
				})
			})
		
			editor.on('cursorActivity',this.cursorActivityHandler);
			editor.getScrollerElement().addEventListener('touchmove', this.hideHandler);
			editor.on('scroll',this.hideHandler);
			
			this.editor = editor;
		}
		
		return new Toolbar();
		
	})();
	
	
	
	function Heather(display,editor,config){
		var me = this;
		config = config || {};
		
		var cm = createEditor(this,editor,display,config,true);
		cm.setOption('endMarkdownListHandler',function(cm){
			handler(cm);
		})
		this.md = config.md || createMarkdownParser({
			html: true,
			plugins: ['footnote', 'katex', 'mermaid', 'anchor', 'task-lists', 'sup', 'sub', 'abbr'],
			lineNumber: false,
			highlight: function(str, lang) {
				if (hasMermaid && lang == 'mermaid') {
					return '<div class="mermaid">' + str + '</div>';
				}
			}
		});
		var cvtKey = (mac ? "Cmd-Enter" : "Ctrl-Enter")||config.cvtKey;
		var keyMap = {};
		
		var handler = function(editor){
			var source = editor.getValue();
			Toolbar.unbind();
			editor.setValue('');
			if(source.trim() == ''){
				return ;
			}
			var html = render(me,source);
			var element = createEditableElement(html,source,false);
			$(display).append(element);
			renderHtml($(element));
			editor.setCursor({line:0,ch:0})
			editor.focus();
			bind();
		};
		
		
		var bind = function(){
			Toolbar.bind(cm);
			Toolbar.bar.insertIcon('fas fa-check heather_middle_icon',function(){
				handler(cm);
			},0)
		}
		var clickEditableHandler = function(e){
			var editableElement;
			var ele = e.target;
			if(ele.classList.contains('heather_display')){
				editableElement = ele;
			} else {
				var parent = ele.parentElement;
				while(parent != null){
					if(parent.classList.contains('heather_display')){
						editableElement = parent;
						break;
					}
					parent = parent.parentElement;
				}
			}
			if(editableElement)
				edit(editableElement,me,false);
		}
		
		$(display).on('click','.heather_display',clickEditableHandler)
		//create toolbar
		
		var bar = document.createElement('div');
		//TODO
		bar.setAttribute('style','position:sticky;top:0px;visibility:visible;z-index:999');
		$(display).before(bar);
		bar = Bar.create(bar);
		
		bar.addIcon('fas fa-trash heather_middle_icon',function(){
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

		bar.addIcon('fas fa-align-justify heather_middle_icon',function(){
			
			var heatherDisplays = $(display).find('.heather_display');
			if(heatherDisplays.length > 0 && !$(display).hasClass('heather_opacity-5')){
				me.stopEdit();
				Toolbar.hide();
				$(display).addClass('heather_opacity-5');
				$(display).off('click','.heather_display',clickEditableHandler);
				for(var i=0;i<heatherDisplays.length;i++){
					var heatherDisplay = heatherDisplays[i];
					var p = document.createElement('div');
					p.classList.add('heather_p');
					p.innerHTML = '<i class="fas fa-plus heather_middle_icon"></i>';
					p.querySelector('i').addEventListener('click',function(){
						var p = this.parentElement;
						var div = createEditableElement('','',false);
						$(p).after(div);
						edit(div,me,false);
						$(display).removeClass('heather_opacity-5');
						$('.heather_p').remove();
						$(display).on('click','.heather_display',clickEditableHandler);
					});
					heatherDisplay.before(p);
				}
			} else {
				$(display).removeClass('heather_opacity-5');
				$('.heather_p').remove();
				$(display).on('click','.heather_display',clickEditableHandler);
			}
		});
		
		bind();
		keyMap[cvtKey] = handler;
		keyMap['Esc'] = handler;
		cm.addKeyMap(keyMap);
		cm.focus();
		this.cm = cm;
		this.md = md;
		this.display = display;
		this.cvtKey = cvtKey;
		this.state = {};
		this.config = config;
		this.editor = editor;
		this.bar = bar;
		this.eventHandlers = [];
		
		this.cm.setOption('dropFileHandler', function(file) {
			var name = file.name.toLowerCase();
			if(!name.endsWith('.md')){
				return true;
			}
			var reader = new FileReader();
			reader.onload = function (e) {
				var blocks = _heather.markdownToBlocks(e.target.result);
				me.render(blocks);
            };
            reader.readAsText(file);
			return true;
		});
		
		
		this.cm.on('focus',function(){
			me.stopEdit();
			bind();
		})
		
		//TODO used for test 
		var current = localStorage.getItem('heather2-demo');
		if(current != null){
			me.loadMarkdown(current);
		}
		window.onbeforeunload = function(event)
		{
			me.stopEdit();
			handler(me.cm)
			me.save();
		};
	}
	
	
	//used for test TODO
	Heather.prototype.save = function(){
		localStorage.setItem('heather2-demo',this.getMarkdown());
	}
	
	
	Heather.prototype.getMarkdown = function(){
		var sources = this.display.querySelectorAll('.heather_display_source');
		var blocks = [];
		$.each(sources,function(){
			blocks.push($(this).val());
		})
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
		return render(this,this.getMarkdown());
	}
	
	Heather.prototype.clear = function(){
		this.stopEdit();
		this.display.innerHTML = '';
		this.cm.setValue('');
		this.cm.focus();
		this.cm.setCursor({line:0,ch:0});
	}
	
	Heather.prototype.stopEdit = function(){
		var currentEditors = this.currentEditors || [];
		for(var i=currentEditors.length-1;i>=0;i--){
			try{
				if(currentEditors[i].startEditAfterEnd == true){
					delete currentEditors[i].startEditAfterEnd;
				}
				currentEditors[i].stopEdit();
			}catch(e){console.log(e)};
			currentEditors.splice(i,1);
		}
	}
	
	Heather.prototype.loadMarkdown = function(markdown){
		this.clear();
		var blocks = _heather.markdownToBlocks(markdown);
		var me = this;
		renderBlocks(this,blocks,function(html){
			$(me.display).html(html)
			renderHtml($(me.display));
		});
	}
	
	function triggleEvent(heather,name,args){
		for(var i=0;i<heather.eventHandlers.length;i++){
			var handler = heather.eventHandlers[i];
			try{
				if(!isUndefined(handler[name]))
					handler[name].call(this,args);
			}catch(e){console.log(e)};
		}
	}
	
	function renderBlocks(heather,blocks,callback){
		var html = '';
		for(var i=0;i<blocks.length;i++){
			var block = blocks[i];
			var div = createEditableElement(render(heather,block.block),block.block,block.html);
			html += div.outerHTML;
		}
		if(callback){
			callback(html);
		}
	}
	
	function render(heather,markdown){
		return new DOMParser().parseFromString(heather.md.render(markdown), "text/html").body.innerHTML;
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
	
	
	function edit(element,heather,forceSource,callback){
		if(element.getAttribute('data-on-edit') != null){
			return ;
		}
		
		heather.stopEdit();
		
		var editor;	
		if(forceSource){
			editor = SourceEditor.create(element,heather,false);
		} else {
			if(element.getAttribute("data-html") === 'true'){
				editor = SourceEditor.create(element,heather,false);
			} else {
				var children = $(element).children().not(".heather_display_source");
				if(children.length == 1){
					var child = children[0];
					var tagName = child.tagName;
					switch(tagName){
						case 'H1':
						case 'H2':
						case 'H3':
						case 'H4':
						case 'H5':
						case 'H6':
							editor = HeadingEditor.create(element,heather);
							break;
						case 'BLOCKQUOTE':
						case 'P':
							editor = CommonSingleElementEditor.create(element,heather);
							break;
						case 'TABLE':
							editor = TableEditor.create(element,heather);
							break;
						case 'OL':
						case 'UL':
							editor = ListEditor.create(element,heather);
							break;
						case 'HR':
							editor = HREditor.create(element,heather);
							break;
						case 'PRE':
							editor = PreEditor.create(element,heather);
							break;
					}
				}
			}
			if(!editor)
				editor = SourceEditor.create(element,heather,true);
		}
		if(callback) callback(editor);
		$('.heather_block_item_container').remove();
		element.setAttribute("data-on-edit",true);
		var currentEditors = heather.currentEditors || [];
		currentEditors.push(editor);
		heather.currentEditors = currentEditors;
		Toolbar.bar.keepHidden=true;
		Toolbar.hide();
		triggleEvent(heather,'beforeStartEdit');
		var index = $(element).index();
		editor.startEdit();
		editor.onEndEdit(function(){
			$('.heather_block_item_container').remove();
			element.removeAttribute('data-on-edit');
			Toolbar.bar.keepHidden=false;
			var currentEditors = heather.currentEditors || [];
			for(var i=currentEditors.length-1;i>=0;i--){
				if(currentEditors[i] == editor){
					currentEditors.splice(i,1);
				}
			}
			triggleEvent(heather,'afterEdit');
		});	
	}
	
	function createEditableElement(html,markdown,hasHtml){
		var div = document.createElement('div');
		div.innerHTML = html;
		div.classList.add('markdown-body');
		div.classList.add('heather_display');
		div.setAttribute('data-html',(hasHtml !== false));
		var textarea = createSourceElement(markdown);
		div.appendChild(textarea);
		return div;
	}
	
	function createSourceElement(source){
		var textarea = document.createElement('textarea');
		textarea.classList.add('heather_display_source');
		textarea.innerHTML = source;
		return textarea;
	}
	
	function startNewBlockEdit(heather,source,editor){
		var div = createEditableElement(render(heather,source),source,false);
		var parentElement = editor.getWrapperElement().parentElement;
		if(parentElement.classList.contains('heather_display')){
			$(parentElement).after(div);
			$(parentElement).remove();
		} else {
			heather.display.appendChild(div);
		}
		editor.setValue("");
		editor.unfocus();
		edit(div,heather,false);
	}
		
	function createEditor(heather,editor,display,config,smartEditor){
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
		cm.on('change',function(editor){
			if(editor.lineCount() == 1){
				var source = editor.getValue();
				//from marktext
				if(source == '@'){
					Toolbar.bar.keepHidden = true;
					var div = document.createElement('div');
					div.classList.add('heather_block_item_container')
					div.setAttribute('style',"position:absolute");
					div.innerHTML = '<p class="heather_block_item" data-editor="paragraph">插入段落</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="heading">插入标题</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="blockquote">插入引用</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="table">插入表格</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="horizontalRule">插入水平线</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="list">插入列表</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="taskList">插入任务列表</p>';
					div.innerHTML += '<p class="heather_block_item" data-editor="codeBlock">插入代码块</p>';
					document.body.appendChild(div);
					var coords = editor.cursorCoords(true);
					if(coords.top -  $(window).scrollTop() - $(div).height()-editor.defaultTextHeight() > 0){
						$(div).css({'top':coords.top -$(div).height()- editor.defaultTextHeight(),"left":coords.left});
					} else {
						$(div).css({'top':coords.top + editor.defaultTextHeight(),"left":coords.left})
					}
					$('.heather_block_item').click(function(){
						$('.heather_block_item_container').remove();
						var editorType = $(this).data('editor');
						if(editorType == 'heading')
							startNewBlockEdit(heather,headingMd,editor);
						if(editorType == 'paragraph')
							startNewBlockEdit(heather,veryThinChar,editor);
						if(editorType == 'blockquote')
							startNewBlockEdit(heather,blockquoteMd,editor);
						if(editorType == 'table')
							startNewBlockEdit(heather,tableMd,editor);
						if(editorType == 'list')
							startNewBlockEdit(heather,listMd,editor);
						if(editorType == 'taskList')
							startNewBlockEdit(heather,taskListMd,editor);
						if(editorType == 'codeBlock')
							startNewBlockEdit(heather,codeBlockMd,editor);
						if(editorType == 'horizontalRule')
							startNewBlockEdit(heather,horizontalRuleMd,editor);
					})
				} else {
					$('.heather_block_item_container').remove();
				}
			}
			
		})
		if(smartEditor){
			cm.on('change',function(editor){
				if(editor.lineCount() == 1){
					var source = editor.getLine(0);
					if(source.startsWith("> ") && source.trim().length > 1){
						startNewBlockEdit(heather,source,editor)
						return;
					}
					for(var i=0;i<headings.length;i++){
						if(source.startsWith(headings[i]) && source.trim().length > headings[i].trim().length){
							startNewBlockEdit(heather,source,editor)
							return ;
						}
					}
				}
			})
		}
		
		return cm;
	}
	
	
	var ContenteditableBar = (function(){
		function ContenteditableBar(element){
			var me = this;
			this.composing = false;
			var bar = document.createElement('div');
			bar.setAttribute('class','heather_contenteditable_bar');
			document.body.appendChild(bar);
			bar = Bar.create(bar);
			var clazz = "heather_status_on";
			bar.addIcon('fas fa-bold heather_middle_icon',function(ele){
				document.execCommand('bold');
				document.queryCommandState('bold') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
			},function(ele){
				me.boldBtn = ele;
			});
			bar.addIcon('fas fa-italic heather_middle_icon',function(ele){
				document.execCommand('italic');
				document.queryCommandState('italic') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
			},function(ele){
				me.italicBtn = ele;
			});
			bar.addIcon('fas fa-strikethrough heather_middle_icon',function(ele){
				document.execCommand('strikeThrough');
				document.queryCommandState('strikeThrough') ? ele.classList.add(clazz) : ele.classList.remove(clazz);
			},function(ele){
				me.strikeThroughBtn = ele;
			});
			bar.addIcon('fas fa-code heather_middle_icon',function(){
				var selection = window.getSelection().toString();
				if(selection.length > 0){
					document.execCommand("insertHTML",false,'<code>'+selection+'</code>');
				}
			});
			bar.addIcon('fas fa-eraser heather_middle_icon',function(ele){
				var selection = window.getSelection().toString();
				if(selection.length > 0){
					document.execCommand('removeFormat');
				}
			});
			var startHandler = function(e){
				me.composing = true;
			};
			var endHandler = function(e){
				me.composing = false;
			};
			
			var selectionChangeListener = function(){
				if(me.composing == false && window.getSelection().toString().length > 0){
					posContenteditableBar(bar,element);
				} else {
					bar.hide();
				}
				document.queryCommandState('bold') ? me.boldBtn.classList.add(clazz) : me.boldBtn.classList.remove(clazz);
				document.queryCommandState('italic') ? me.italicBtn.classList.add(clazz) : me.italicBtn.classList.remove(clazz);				
				document.queryCommandState('strikeThrough') ? me.strikeThroughBtn.classList.add(clazz) : me.strikeThroughBtn.classList.remove(clazz);			
			}
			_heather.selectionChangeListeners.push(selectionChangeListener);
			element.addEventListener('compositionstart',startHandler);
			element.addEventListener('compositionend',endHandler);
			this.startHandler = startHandler;
			this.endHandler = endHandler;
			this.bar = bar;
			this.selectionChangeListener = selectionChangeListener;
			this.element = element;
		}
		
		ContenteditableBar.prototype.remove = function(){
			var me = this;
			var listeners = _heather.selectionChangeListeners;
			for(var i=0;i<listeners.length;i++){
				if(listeners[i] == me.selectionChangeListener){
					listeners.splice(i,1);
					break;
				}
			}
			me.bar.remove();
			me.element.removeEventListener('compositionstart',me.startHandler);
			me.element.removeEventListener('compositionend',me.endHandler);
		}
		
		function posContenteditableBar(bar,element){
			var sel = window.getSelection();
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
					return;
				}
				node = node.parentElement;
			}
			bar.hide();
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
		
		return {create:function(element){
			return new ContenteditableBar(element);
		}}
	})();
	
	
	var TableEditor = (function(){
		
		function getTd(ele){
			if(ele==null){
				return null;
			} 
			if(ele.tagName == 'TD' || ele.tagName == 'TH'){
				return ele;
			}
			return getTd(ele.parentElement);
		}
		
		function TableEditor(element,heather){
			var me = this;
			
			this.tdHandler = function(e){
				var td = getTd(e.target);
				
				if(!td.isContentEditable){
					if(me.contenteditableBar){
						me.contenteditableBar.remove();
					}
					$(element).find('[contenteditable]').each(function(){
						this.removeEventListener('paste',plainPasteHandler);
						this.removeAttribute('contenteditable');
					});
					td.addEventListener('paste',plainPasteHandler);
					td.setAttribute('contenteditable',true);
					placeCaretAtEnd(td);
					me.contenteditableBar = ContenteditableBar.create(td);
					setTimeout(function(){
						td.scrollIntoView({
							behavior: 'auto',
							block: 'center',
							inline: 'center'
						});
					},100)
				}
				me.td = td;
			}
			
			this.endHandlers = [];
			this.element = element;
			this.heather = heather;
		}
		
		TableEditor.prototype.startEdit = function(){
			var me = this;
			var ele = $(this.element);
			var table = ele.find('table');
			ele.find('.heather_display_source').remove();
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			ele.before(toolbar);
			toolbar = Bar.create(toolbar);
			toolbar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除表格?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						me.stopEdit();
						ele.remove();
					}
				})
			});
			toolbar.addIcon('fas fa-plus heather_middle_icon',function(){
				if(!me.td){
					return ;
				}
				var td = $(me.td);
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
			toolbar.addIcon('fas fa-minus heather_middle_icon',function(){
				if(!me.td){
					return ;
				}
				var td = $(me.td);
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
			toolbar.addIcon('fas fa-align-left heather_middle_icon',function(){
				if(!me.td){
					return ;
				}
				doAlign(table,$(me.td),'left')
			});
			toolbar.addIcon('fas fa-align-center heather_middle_icon',function(){
				if(!me.td){
					return ;
				}
				doAlign(table,$(me.td),'center')
			});
			
			toolbar.addIcon('fas fa-align-right heather_middle_icon',function(){
				if(!me.td){
					return ;
				}
				doAlign(table,$(me.td),'right')
			});
			
			toolbar.addIcon('fas fa-edit heather_middle_icon',function(){
				me.toSourceEditor();
			});
			toolbar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			
			table.addClass("heather_edit_table");
			ele.on('click','th,td',this.tdHandler);
			this.onEndEdit(function(){
				toolbar.remove();
			})
		}
		
		TableEditor.prototype.stopEdit = function(){
			var me = this;
			var ele = $(this.element);
			var table = ele.find('table');
			ele.off('click','th,td',this.tdHandler);
			ele.find('[contenteditable]').each(function(){
				this.removeEventListener('paste',plainPasteHandler);
				this.removeEventListener('click',me.clickHandler);
				this.removeEventListener('keydown',me.keyDownHandler);
				this.removeAttribute('contenteditable');
			});
			table.removeAttr("class");
			if(me.contenteditableBar){
				me.contenteditableBar.remove();
			}
			var markdown = toMarkdown(table);
			var textarea = createSourceElement(markdown);
			this.element.appendChild(textarea);
			for(var i=0;i<this.endHandlers.length;i++){
				var handler = this.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
		
		TableEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler);
		}
		
		TableEditor.prototype.toSourceEditor = function(handler){
			this.stopEdit();
			var me = this;
			edit(me.element,me.heather,true,function(editor){
				editor.startEditAfterEnd = true;
			})
		}
		var alignMap = {
			'' : ' -- ',
			'left' : ' :-- ',
			'center' : ' :--: ',
			'right' : ' --: '
		}
		function toMarkdown(table){
			var markdown = '';
			var trs = table.find('tr');
			for(var i=0;i<trs.length;i++){
				var tr = trs.eq(i);
				var ths = tr.find('th');
				var headingRow = ths.length > 0;
				if(headingRow){
					markdown += getRowMarkdown(ths);
					markdown += '\n';
					for(var j=0;j<ths.length;j++){
						var align = ths[j].style['text-align'];
						markdown += "|" + alignMap[align];
					}
					markdown += "|";
				} else {
					markdown += getRowMarkdown(tr.find('td'));
				}
				if(i < trs.length - 1){
					markdown += '\n';
				}
			}
			return markdown;
		}
		
		function getRowMarkdown(tds){
			var markdown = '';
			for(var j=0;j<tds.length;j++){
				var td = tds.eq(j);
				markdown += "|";
				var md = turndownService.turndown(td.html());
				md = md.trim().replace(/\n\r/g, '<br>').replace(/\n/g, "<br>")
				markdown += md.length < 3 ? "  "+md : md;
				
			}
			markdown += "|";
			return markdown;
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
			
		return {create:function(element,heather){
			return new TableEditor(element,heather);
		}}
	})();
	
	
	var HeadingEditor = (function(){
		function HeadingEditor(element,heather){
			this.element = element;
			this.endHandlers = [];
			this.heather = heather;
		}
		
		HeadingEditor.prototype.startEdit = function(){
			var ele = $(this.element);
			var me = this;
			ele.find('.heather_display_source').remove();
			var heading = ele.find('h1,h2,h3,h4,h5,h6')[0];
			var html = heading.innerHTML;
			heading.innerHTML = '';
			var editor = document.createElement('div');
			editor.setAttribute('contenteditable','true');
			editor.innerHTML = html;
			heading.appendChild(editor);
			this.element.innerHTML = heading.outerHTML;
			
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			$(this.element).after(toolbar);
			this.bar = Bar.create(toolbar);
			this.bar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						me.bar.remove();
						$(me.element).remove();
						triggleStopEdit(me);
					}
				})
				
			});
			this.bar.addIcon('fas fa-arrow-up heather_middle_icon',function(){
				var index = parseInt(heading.tagName.substring(1));
				if(index == 1){
					return ;
				}
				index--;
				var h = document.createElement("H"+index);
				h.appendChild($(me.element).find('[contenteditable]')[0]);
				$(me.element).html(h.outerHTML);
				heading = h;
				return ;
			});
			this.bar.addIcon('fas fa-arrow-down heather_middle_icon',function(){
				var index = parseInt(heading.tagName.substring(1));
				if(index == 6){
					return ;
				}
				index++;
				var h = document.createElement("H"+index);
				h.appendChild($(me.element).find('[contenteditable]')[0]);
				$(me.element).html(h.outerHTML);
				heading = h;
				return ;
			});
			
			this.bar.addIcon('fas fa-edit heather_middle_icon',function(){
				me.toSourceEditor();
			});
			
			this.bar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			

			editor = $(this.element).find('[contenteditable]');
			editor.on('keydown',function(e){
				if(CodeMirror.keyNames[e.keyCode] == 'Enter'){
					me.stopEdit();
					return false;
				}
				return true;
			});
			editor.on('paste',plainPasteHandler);
			placeCaretAtEnd(editor[0]);
			
			setTimeout(function(){
				me.bar.element[0].scrollIntoView({
					behavior: 'auto',
					block: 'center',
					inline: 'center'
				});
			},100)
		}
		
		HeadingEditor.prototype.stopEdit = function(){
			var element = this.element;
			if($(element).find('[contenteditable]').length > 0){
				var html = $(element).find('[contenteditable]').html();
				var heading = $(element).find('h1,h2,h3,h4,h5,h6')[0];
				$(heading).html(html);
				var markdown = turndownService.turndown(heading.outerHTML);
				var textarea = createSourceElement(markdown);
				element.appendChild(textarea);
				this.bar.remove();
				triggleStopEdit(this);
			}
		}
		
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var handler = editor.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
		
		HeadingEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
		
		HeadingEditor.prototype.toSourceEditor = function(handler){
			this.stopEdit();
			var me = this;
			edit(me.element,me.heather,true,function(editor){
				editor.startEditAfterEnd = true;
			})
		}
			
		return {create:function(element,heather){
			return new HeadingEditor(element,heather);
		}}
	})();
	
	var HREditor = (function(){
		function HREditor(element,heather){
			this.element = element;
			this.endHandlers = [];
			this.heather = heather;
		}
		
		HREditor.prototype.startEdit = function(){
			var me = this;
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			$(this.element).after(toolbar);
			this.bar = Bar.create(toolbar);
			this.bar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						me.bar.remove();
						$(me.element).remove();
						triggleStopEdit(me);
					}
				})
			});
			
			this.bar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			setTimeout(function(){
				me.bar.element[0].scrollIntoView({
					behavior: 'auto',
					block: 'center',
					inline: 'center'
				});
			},100)
		}
		
		HREditor.prototype.stopEdit = function(){
			var element = this.element;
			this.bar.remove();
			triggleStopEdit(this);
		}
		
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var handler = editor.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
		
		HREditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
			
		return {create:function(element,heather){
			return new HREditor(element,heather);
		}}
	})();
	
	var PreEditor = (function(){
		function PreEditor(element,heather){
			this.element = element;
			this.endHandlers = [];
			this.heather = heather;
		}
		
		PreEditor.prototype.startEdit = function(){
			var me = this;
			$(me.element).find('.heather_display_source').remove();
			var pre = me.element.querySelector('pre');
			var code = pre.querySelector('code');
			this.language = code == null ? '' : getLanguage(code) || '';
			if(code != null){
				pre.innerHTML = code.innerHTML;
			}
			pre.setAttribute('contenteditable','true');
			
			var keyDownHandler = function(e){
				if(keyNames[e.keyCode] == 'Enter'){
					document.execCommand('insertHTML',false,'\r\n')
					e.preventDefault();
					return false; 
				}
				if(e.shiftKey && keyNames[e.keyCode] == 'Tab'){
					var sel = window.getSelection();
					if (sel.rangeCount) {
						var text = window.getSelection().toString().replaceAll("\r","");
						if(text.endsWith("\n")){
							text = text.substring(0,text.length-1);
						}
						var lines = text.split('\n');
						var rst = "";
						for(var i=0;i<lines.length;i++){
							var line = lines[i];
							line = deleteStartWhiteSpace(line,4);
							rst += line;
							if(i<lines.length-1){
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
				if(keyNames[e.keyCode] == 'Tab'){
					var sel = window.getSelection();
					if(sel.toString() == ''){
						document.execCommand('insertText',false,'    ');
					} else {
						if (sel.rangeCount) {
							var lines = sel.toString().replaceAll("\r","").split('\n');
							var rst = "";
							for(var i=0;i<lines.length;i++){
								var line = lines[i];
								rst += '    '+line;
								if(i<lines.length-1){
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
			var inputHandler = function(){
				if(timer){
					clearTimeout(timer);
				}
				timer = setTimeout(function(){
					updateEditor(pre,function(){
						highlight(pre,me.language);
					})
				},500)
			}
			
			var pasteHandler = function(e){
				var cpdata = (e.originalEvent || e).clipboardData;
				var data = cpdata.getData('text/plain');
				var range = window.getSelection().getRangeAt(0);
				range.deleteContents();
				//replace tabSpace char with 4 ' '
				range.insertNode(document.createTextNode(data.replaceAll('<br>','\n').replaceAll(tabSpace,"    ")));
				e.preventDefault();
				return false;
			}
			pre.addEventListener('input',inputHandler);
			pre.addEventListener('keydown',keyDownHandler);
			pre.addEventListener('paste',pasteHandler);
			me.onEndEdit(function(){
				pre.removeEventListener('input',inputHandler);
				pre.removeEventListener('keydown',keyDownHandler);
				pre.removeEventListener('paste',pasteHandler);
			})
			var toolbar = document.createElement('div');
			$(me.element).before(toolbar);
			
			var options = '<option value="">选择语言</option>';
			var languages = hljs.listLanguages();
			for(var i=0;i<languages.length;i++){
				options += '<option value="'+languages[i]+'">'+languages[i]+'</option>';
			}
			
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			var languageSelect = '<div style="text-align:right"><select>'+options+'</select></div>';
			
			var select = document.createElement('select');
			select.classList.add('heather_language_select')
			select.setAttribute('style','border: 0px;outline: 0px solid transparent;font-weight: 900; -webkit-font-smoothing: antialiased;display: inline-block; font-style: normal;font-variant: normal;text-rendering: auto;line-height: 1;-moz-appearance: none;-webkit-appearance: none;appearance: none;margin-right:10px')
			toolbar.appendChild(select);
			select.innerHTML = languageSelect;
			select.addEventListener('change',function(){
				var lang = $(this).val();
				me.language = lang;
				if(lang == '')
					pre.innerHTML = pre.textContent;
				else 
					highlight(pre,me.language);
			});
			$(select).val(this.language);
			highlight(pre,me.language);
			this.bar = Bar.create(toolbar);
			this.bar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						me.bar.remove();
						$(me.element).remove();
						triggleStopEdit(me);
					}
				})
			});
			this.bar.addIcon('fas fa-edit heather_middle_icon',function(){
				me.toSourceEditor();
			});
			this.bar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			setTimeout(function(){
				me.bar.element[0].scrollIntoView({
					behavior: 'auto',
					block: 'center',
					inline: 'center'
				});
			},100)
		}
		
		PreEditor.prototype.stopEdit = function(){
			var element = this.element;
			var pre = element.querySelector('pre');
			//to markdown
			var lines = pre.textContent;
			var lastLine = lines[lines.length-1];
			var lineBreaker = lastLine == '\n' ? '':'\n';
			var markdown = '``` '+this.language+'\n'+pre.textContent+lineBreaker+'```';
			var textarea = createSourceElement(markdown);
			element.appendChild(textarea);
			$(element).find('[contenteditable]').removeAttr('contenteditable');
			var code = document.createElement('code');
			if(this.language != ''){
				code.classList.add('language-'+this.language);
			}
			code.innerHTML = pre.innerHTML;
			pre.innerHTML = code.outerHTML;
			highlight(pre.querySelector('code'),this.language);
			this.bar.remove();
			triggleStopEdit(this);
		}
		
		function deleteStartWhiteSpace(str,count){
			var rst = str;
			for(var i=0;i<count;i++){
				if(rst.startsWith(" ")){
					rst = rst.substring(1);
				} else {
					return rst;
				}
			}
			return rst;
		}
		
		function getLanguage(code){
			var language = code.getAttribute('class');
			if(language && language.startsWith("language-")){
				return language.split('-')[1];
			}
		}
		
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var handler = editor.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
		
		PreEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
		
		PreEditor.prototype.toSourceEditor = function(handler){
			this.stopEdit();
			var me = this;
			edit(me.element,me.heather,true,function(editor){
				editor.startEditAfterEnd = true;
			})
		}
		
		function highlight(pre,language){
			if(hljs.getLanguage(language)){
				pre.innerHTML = hljs.highlight(language, pre.textContent, true).value;
			}
		}
		//code from https://codepen.io/brianmearns/pen/YVjZWw
		function getTextSegments(element) {
			var textSegments = [];
			for(var i=0;i<element.childNodes.length;i++){
				var node = element.childNodes[i];
				var nodeType = node.nodeType;
				if(nodeType == 1){
					textSegments.splice(textSegments.length, 0, ...(getTextSegments(node)));
				}
				if(nodeType == 3){
					textSegments.push({text: node.nodeValue, node});
				}
			}
			return textSegments;
		}
		
		function updateEditor(code,callback) {
			var sel = window.getSelection();
			var textSegments = getTextSegments(code);
			var textContent = textSegments.map(({text}) => text).join('');
			var anchorIndex = null;
			var focusIndex = null;
			var currentIndex = 0;
			for(var i=0;i<textSegments.length;i++){
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
			if(callback) callback();
			restoreSelection(code,anchorIndex, focusIndex);
		}
		
		function restoreSelection(code,absoluteAnchorIndex, absoluteFocusIndex) {
			var sel = window.getSelection();
			var textSegments = getTextSegments(code);
			var anchorNode = code;
			var anchorIndex = 0;
			var focusNode = code;
			var focusIndex = 0;
			var currentIndex = 0;
			for(var i=0;i<textSegments.length;i++){
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
			sel.setBaseAndExtent(anchorNode,anchorIndex,focusNode,focusIndex);
		}
					
		return {create:function(element,heather){
			return new PreEditor(element,heather);
		}}
	})();
	
	
	var CommonSingleElementEditor = (function(){
		
		function CommonSingleElementEditor(element,heather){
			this.element = element;
			this.endHandlers = [];
			this.heather = heather;
			this.tagName = this.element.childNodes[0].tagName;
		}
		
		CommonSingleElementEditor.prototype.startEdit = function(){
			var index = 0;
			var ele = $(this.element);
			var me = this;
			ele.find('.heather_display_source').remove();
			var tag = ele.find(this.tagName)[0];
			tag.setAttribute('contenteditable','true');
			
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			ele.before(toolbar);
			toolbar = Bar.create(toolbar);
			toolbar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						me.contenteditableBar.remove();
						toolbar.remove();
						$(me.element).remove();
						triggleStopEdit(me);
					}
				})
			});
			
			toolbar.addIcon('fas fa-edit heather_middle_icon',function(){
				me.toSourceEditor();
			});
			
			toolbar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			
			var contenteditableBar = ContenteditableBar.create(tag);
			
			var imgHandler = function(e){
				//TODO
			}
			
			$(tag).on('paste',plainPasteHandler);
			$(tag).on('click','img',imgHandler);
			this.onEndEdit(function(){
				$(tag).off('paste',plainPasteHandler);
				$(tag).off('click','img',imgHandler);
			});
			
			placeCaretAtEnd($(this.element).find('[contenteditable]')[0]);
			this.contenteditableBar = contenteditableBar;
			this.toolbar = toolbar;
			setTimeout(function(){
				me.toolbar.element[0].scrollIntoView({
					behavior: 'auto',
					block: 'center',
					inline: 'center'
				});
			},100)
		}
		
		CommonSingleElementEditor.prototype.stopEdit = function(){
			var element = this.element;
			if(element.querySelector('[contenteditable]') != null){
				this.contenteditableBar.remove();
				this.toolbar.remove();
				var tag = $(element).find(this.tagName);
				tag.find('[heather_wait_file]').remove();
				var divs = tag.find('div');
				for(var i=0;i<divs.length;i++){
					var div = divs[i];
					var prevBr = false;
					var prev = div.previousSibling;
					while(prev != null && prev.nodeType == 3 && prev.textContent.trim() == ''){
						prev = prev.previousSibling;
					}
					if(prev != null){
						var nodeType = prev.nodeType;
						if(nodeType == 3){
							//text node need add br
							$(div).before('<br>');
							prevBr = true;
						} else if(nodeType == 1){
							//element node 
							if(!prev.blockDefault() && prev.tagName != 'BR'){
								$(div).before('<br>');
								prevBr = true;
							}
						}
					}
					var childNodes = div.childNodes;
					var last = childNodes[childNodes.length-1];
					if(last == null){
						if(!prevBr){
							$(div).before('<br>');
						}$(div).remove();
					} else {
						var nodeType = last.nodeType;
						if(nodeType == 3 || (nodeType == 1 && !last.blockDefault() && last.tagName != 'BR')){
							var next = div.nextSibling;
							while(next != null && next.nodeType == 3 && next.textContent.trim() == ''){
								next = next.nextSibling;
							}
							if(next != null){
								var nodeType = next.nodeType;
								if(nodeType == 3){
									$(div).after('<br>');
								} else if(nodeType == 1){
									if(!next.blockDefault() && next.tagName != 'BR'){
										$(div).after('<br>');
									}
								}
							}
						}
						$(div).after(div.innerHTML);
						$(div).remove();
					}
				}
				tag = tag[0];
				$('.heather_empty_br').removeAttr('class');
				tag.removeAttribute('contenteditable');
				tag.innerHTML = tag.innerHTML.replaceAll(veryThinChar,'');
				var markdown = turndownService.turndown(tag.outerHTML);
				var textarea = createSourceElement(markdown);
				element.appendChild(textarea);
				triggleStopEdit(this);
			}
		}
		
		CommonSingleElementEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
		
		CommonSingleElementEditor.prototype.toSourceEditor = function(handler){
			this.stopEdit();
			var me = this;
			
			edit(me.element,me.heather,true,function(editor){
				editor.startEditAfterEnd = true;
			})
		}
		
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var handler = editor.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
			
		return {create:function(element,heather){
			return new CommonSingleElementEditor(element,heather);
		}}
	})();
	
	var ListEditor = (function(){
		
		function ListEditor(element,heather){
			var me = this;
			this.element = element;
			this.endHandlers = [];
			this.heather = heather;
		}
	
		
		ListEditor.prototype.startEdit = function(){
			var me = this;
			var ele = $(me.element);
			ele.find('.heather_display_source').remove();
			ele.find('input[type="checkbox"]').prop('disabled',false);
			
			var toolbar = document.createElement('div');
			toolbar.setAttribute("style","margin-bottom:10px;margin-top:5px");
			ele.before(toolbar);
			toolbar = Bar.create(toolbar);
			toolbar.addIcon('fas fa-trash heather_middle_icon',function(){
				Swal.fire({
					title: '确定要删除吗?',
					type: 'warning',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33'
				}).then((result) => {
					if (result.value) {
						if(me.contenteditableBar){
							me.contenteditableBar.remove();
						}
						toolbar.remove();
						$(me.element).remove();
						triggleStopEdit(me);
					}
				})
			});
			
			
			toolbar.addIcon('fas fa-exchange-alt heather_middle_icon',function(){
				var ul = ele.find('ul,ol');
				if(ul.find('input[type="checkbox"]').length == 0){
					//can convert;
					var tagName = ul[0].tagName == 'OL' ? "ul" : 'ol';
					var replace = document.createElement(tagName);
					replace.innerHTML = ul.html();
					ele.html(replace.outerHTML);
					me.stopEdit();
				}
			});
			
			
			toolbar.addIcon('fas fa-plus heather_middle_icon',function(){
				if(!me.li){
					return ;
				}
				var li = $(me.li);
				var style = 'width:200px;margin-bottom:0.5rem;border: 0;border-radius: .25em;background: initial;background-color: #3085d6;color: #fff;font-size: 1.0625em;margin: .3125em;padding: .625em 2em;font-weight: 500;box-shadow: none;';
				var html = '';
				html += '<div><button style="'+style+'" >向上添加</button></div>';
				html += '<div><button style="'+style+'" >向下添加</button></div>';
				Swal({
					animation:false,
					html : html
				});
				var buttons = $(Swal.getContent()).find('button');
				buttons.eq(0).click(function(){
					var checkbox = $(me.li).find('input[type="checkbox"]');
					if(checkbox.length > 0){
						li.before('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
					} else {
						li.before('<li></li>');
					}
					
					Swal.close();
				});
				buttons.eq(1).click(function(){
					var checkbox = li.find('input[type="checkbox"]');
					if(checkbox.length > 0){
						li.after('<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"/></li>');
					} else {
						li.after('<li></li>');
					}
					Swal.close();
				});
			});
			
			
			toolbar.addIcon('fas fa-edit heather_middle_icon',function(){
				me.toSourceEditor();
			});
			
			toolbar.addIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			});
			var inputHandler = function(e){
				var li = me.li;
				if(li){
					//ios会移动checkbox，所以这里克隆后插入前端
					var checkbox = li.querySelector('.task-list-item-checkbox');
					if(checkbox != null){
						var clone = $(checkbox).clone();
						$(checkbox).remove();
						$(li).prepend(clone[0].outerHTML);
					}
				}
			}
			var clickHandler = function(e){
				var li = getLi(e.target);
				if(li != null){
					var checkbox = $(li).find('input[type="checkbox"]');
					if(checkbox.length > 0){
						if(checkbox.is(":checked")){
							checkbox.attr('checked','');
						}else{
							checkbox.removeAttr('checked');
						}
					}
					if(!li.isContentEditable){
						if(me.contenteditableBar){
							me.contenteditableBar.remove();
						}
						ele.find('li').each(function(){
							this.removeEventListener('paste',plainPasteHandler);
							this.removeAttribute('contenteditable');
							this.removeAttribute('input',inputHandler);
						});
						li.setAttribute('contenteditable',true);
						li.addEventListener('paste',plainPasteHandler);
						li.addEventListener('input',inputHandler);
						me.contenteditableBar = ContenteditableBar.create(li);
					}
					me.li = li;	
					setTimeout(function(){
						li.scrollIntoView({
							behavior: 'auto',
							block: 'center',
							inline: 'center'
						});
					},100)
				}
			}
			me.onEndEdit(function(){
				ele.find('li').each(function(){
					if(this.isContentEditable){
						this.removeEventListener('paste',plainPasteHandler);
						this.removeAttribute('contenteditable');
						this.removeAttribute('input',inputHandler);
					}
				})
			})
			var keyDownHandler = function(e){
				if(keyNames[e.keyCode] == 'Enter'){
					document.execCommand('insertHTML',false,'<br>'+veryThinHtml);
					return false;
				}
				return true;
			}
			
			ele.on('click','li',clickHandler);
			ele.on('keydown','li',keyDownHandler);
			
			me.onEndEdit(function(){
				ele.off('click','li',clickHandler);
				ele.off('keydown','li',keyDownHandler);
				ele.find('input[type="checkbox"]').prop('disabled',true);
				toolbar.remove();
			})
		}
		
		ListEditor.prototype.stopEdit = function(){
			var ele = $(this.element);
			if(this.contenteditableBar){
				this.contenteditableBar.remove();
			}
			ele.find('.heather_display_source').remove();
			var ul = ele.find('ul,ol')[0];
			ul.innerHTML = ul.innerHTML.replaceAll(veryThinChar,"");
			var html = ul.outerHTML;
			var markdown = turndownService.turndown(html);
			var textarea = createSourceElement(markdown);
			ele.append(textarea);
			triggleStopEdit(this);
		}
		
		ListEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
		
		ListEditor.prototype.toSourceEditor = function(handler){
			this.stopEdit();
			var me = this;
			edit(me.element,me.heather,true,function(editor){
				editor.startEditAfterEnd = true;
			})
		}
		
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var handler = editor.endHandlers[i];
				try{
					handler();
				}catch(e){console.log(e)}
			}
		}
		
		function getLi(target){
			if(target == null) return null;
			if(target.tagName == 'LI'){
				return target;
			}
			return target.parentElement;
		}
			
		return {create:function(element,heather){
			return new ListEditor(element,heather);
		}}
	})();
	
	var SourceEditor = (function(){
		
		function SourceEditor(element,heather,smart){
			var me = this;
			this.handler = function(editor){
				Toolbar.unbind();
				var source = editor.getValue();
				if(source.trim() == ''){
					$(element).remove();
					triggleStopEdit(me,null);
					return ;
				}
				var html = render(heather,source);
				$(element).html(html);
				renderHtml($(element));
				var sourceElement = createSourceElement(source);
				element.appendChild(sourceElement);
				triggleStopEdit(me);
				if(me.startEditAfterEnd == true){
					delete me.startEditAfterEnd;
					edit(element,heather,false);
				}
			}
			
			
			var keyMap = {};
			keyMap[heather.cvtKey] = this.handler;
			keyMap['Esc'] = this.handler;
			this.keyMap = keyMap;
			var keyMap2 = {'Backspace':function(editor){
				var prev = $(element).prev('.heather_display');
				if(prev.length > 0){
					var source = prev.find('.heather_display_source').val();
					var newLine = source.endsWith('\n') ? '\n' : '\n\n';
					editor.setValue(source + newLine + editor.getValue());
					editor.setCursor({line:source.split('\n').length+1,ch:0});
					prev.remove();
				}
			}}
			this.cursorActivityHandler = function(editor){
				var cursor = editor.getCursor();
				if(cursor.line == 0 && cursor.ch == 0){
					editor.addKeyMap(keyMap2);
				} else {
					editor.removeKeyMap(keyMap2);
				}
			};
			this.heather = heather;
			this.element = element;
			this.endHandlers = [];
			this.smart = smart;
		}
		
		SourceEditor.prototype.startEdit = function(){
			ele = $(this.element);
			ele.removeClass("markdown-body");
			var me = this;
			this.element.innerHTML = this.element.querySelector('.heather_display_source').outerHTML;
			var editor = createEditor(this.heather,this.element.querySelector('.heather_display_source'),this.heather.config,this.element,this.smart);
			editor.setOption('endMarkdownListHandler',function(cm){
				me.stopEdit();
			})
			editor.on('cursorActivity',this.cursorActivityHandler)
			editor.addKeyMap(this.keyMap);
			editor.focus();
			editor.setCursor({line:0,ch:0});
			this.cursorActivityHandler(editor);
			this.editor = editor;
			Toolbar.bind(this.editor);
			Toolbar.bar.keepHidden = false;
			Toolbar.bar.insertIcon('fas fa-trash heather_middle_icon',function(){
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
						triggleStopEdit(me)
					}
				})
			},0)
			Toolbar.bar.insertIcon('fas fa-check heather_middle_icon',function(){
				me.stopEdit();
			},0)
		}
		
		SourceEditor.prototype.stopEdit = function(){
			if(this.editor)
				this.handler(this.editor);
		}
		
		SourceEditor.prototype.onEndEdit = function(handler){
			this.endHandlers.push(handler)
		}
		function triggleStopEdit(editor){
			for(var i=0;i<editor.endHandlers.length;i++){
				var endHandler = editor.endHandlers[i];
				try{
					endHandler();
				}catch(e){console.log(e)}
			}
		}
		
		return {create:function(element,heather,smart){
			return new SourceEditor(element,heather,smart);
		}}
	})();
	
	function placeCaretAtEnd(el) {
		el.focus();
		if (typeof window.getSelection != "undefined"
				&& typeof document.createRange != "undefined") {
			var range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (typeof document.body.createTextRange != "undefined") {
			var textRange = document.body.createTextRange();
			textRange.moveToElementText(el);
			textRange.collapse(false);
			textRange.select();
		}
	}
	
	
	return _heather;

})();