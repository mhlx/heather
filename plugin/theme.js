var ThemePlugin = (function(){
	 var ThemeHandler = (function() {
		function ThemeHandler(config){
			this.key = config.theme_key || "heather-theme";
			this.store = config.theme_store || {
				saveJson : function(key,json){
					localStorage.setItem(key, json);
				},
				getJson : function(key){
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
				handler.store.saveJson(handler.key,json);
			}, 500)
		}
		
		ThemeHandler.prototype.reset = function() {
			var theme = new Theme(this.config);
			this.store.saveJson(this.key,JSON.stringify(theme));
			theme.render();
			return theme;
		}
		
		ThemeHandler.prototype.getTheme = function(){
			var json = this.store.getJson(this.key);
			if(json == null){
				return new Theme(this.config);
			} else {
				var current = $.parseJSON(json);
				var theme = new Theme(this.config);
				theme.toolbar = current.toolbar;
				theme.bar = current.bar;
				theme.stat = current.stat;
				theme.editor = current.editor;
				theme.inCss = current.inCss;
				theme.cursorHelper = current.cursorHelper;
				theme.mermaid = current.mermaid;
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
			theme.toolbar = copy.toolbar;
			theme.bar = copy.bar;
			theme.stat = copy.stat;
			theme.editor = copy.editor;
			theme.inCss = copy.inCss;
			theme.searchHelper = copy.searchHelper;
			theme.mermaid = copy.mermaid;
			theme.customCss = copy.customCss;
			return theme;
		}

		Theme.prototype.render = function(config) {
			config = config || {};
			loadEditorTheme(this,config.editorThemeLoad);
			loadHljsTheme(this);
			var css = "";
			css += "#editor_toolbar{color:" + (this.toolbar.color || 'inherit') + "}\n";
			css += "#editor_innerBar{color:" + (this.bar.color || 'inherit') + "}\n"
			css += "#editor_stat{color:" + (this.stat.color || 'inherit') + "}\n";
			css += "#editor_in{background:" + (this.inCss.background || 'inherit') + "}\n";
			var searchHelperColor = (this.searchHelper.color || 'inherit');
			css += "#editor_searchHelper{color:" + searchHelperColor + "}\n#editor_searchHelper .form-control{color:" + searchHelperColor + "}\n#editor_searchHelper .input-group-text{color:" + searchHelperColor + "}\n#editor_searchHelper .form-control::placeholder {color: " + searchHelperColor + ";opacity: 1;}\n#editor_searchHelper .form-control::-ms-input-placeholder {color: " + searchHelperColor + ";}\n#editor_searchHelper .form-control::-ms-input-placeholder {color: " + searchHelperColor + ";}";

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
				if ($('hljs-theme-' + hljsTheme + '').length == 0) {
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
	
	EditorWrapper.prototype.saveTheme = function() {
	   this.themeHandler.saveTheme(this.theme);
	}
	
	return {name : 'theme'}
})();