# heather

## 2.0 (可能)

2.0不再提供左右栏的结构，而是尝试将输入的markdown文本直接转化为html，用户点击渲染的html元素时，显示原始的markdown文本以供编辑

如果你对此感兴趣，可以到 https://md.qyh.me/new.html 尝试，原型版本提供以下操作：

1. 编辑完成之后通过 <kbd>Ctrl|Cmd</kbd> <kbd>Enter</kbd>保存编辑器的内容到一个块中
2. 编辑工程中，通过点击 <kbd>Shift</kbd> <kbd>Ctrl|Cmd</kbd> <kbd>Enter</kbd>来分块，**一次只能分两块，以编辑器所在光标为分块点**

## 说明

markdown编辑器，特性如下：
1. 支持mermaid图表、katex
2. 自定义工具条|辅助工具条
3. 支持拖曳html|md文件，自动将html转化为markdown
4. 本地存储(localStorage)支持
5. 编辑预览同步滚动
6. 主题设置
7. 支持手机端
8. 离线访问
9. mermaid、katex懒加载
10. 全屏编辑

### 在线demo

https://md.qyh.me

### 源码

https://github.com/mhlx/heather

## 使用

从 https://github.com/mhlx/heather 下载最新的文件

### 引入css

```html
<link rel="stylesheet"  href="codemirror/lib/codemirror.css" media="screen">
<link rel="stylesheet" 
   href="codemirror/addon/scroll/simplescrollbars.css" media="screen">
<link rel="stylesheet"  href="css/markdown.css" media="all">
<link href="fontawesome-free/css/all.min.css" rel="stylesheet" media="screen">
<link rel="stylesheet" href="css/style.css" media="screen">
<link rel="stylesheet" href="css/print.css" media="print">
```

### 引入js

```html
<script src="jquery/jquery.min.js"></script>
<script src="js/htmlparser.js"></script>
<script src="js/morphdom-umd.min.js"></script>
<script src="codemirror/lib/codemirror.js"></script>
<script src="codemirror/addon/mode/overlay.js"></script>
<script src="codemirror/mode/javascript/javascript.js"></script>
<script src="codemirror/mode/xml/xml.js"></script>
<script src="codemirror/mode/markdown/markdown.js"></script>
<script src="codemirror/mode/gfm/gfm.js"></script>
<script src="codemirror/addon/selection/mark-selection.js"></script>
<script src="codemirror/addon/search/searchcursor.js"></script>
<script src="codemirror/addon/search/search.js"></script>
<script src="codemirror/addon/edit/continuelist.js"></script>
<script src="codemirror/addon/scroll/simplescrollbars.js"></script>
<script src="sweet2alert/dist/sweetalert2.all.min.js"></script>
<script src="js/turndown.js"></script>
<script src="js/turndown-plugin-gfm.js"></script>
<script src="highlight/highlight.pack.js"></script>
<script src="js/jquery.touchwipe.min.js"></script>
<script src="js/fullscreen.js"></script>
<script src="js/md.js"></script>
<script src="js/all.js"></script>
```

### 创建编辑器

```javascript
var config = {};
var wrapper = EditorWrapper.create(config);
```

### 完整代码

```html
<!DOCTYPE html>
<html lang="zh-CN">
   <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport"
         content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <meta name="description" content="Heather is a online Markdown Editor">
      <meta name="keywords" content="Markdown, Heather, Editor, CodeMirror, Github, Open Source">
      <link rel="stylesheet"  href="codemirror/lib/codemirror.css" media="screen">
      <link rel="stylesheet" 
       href="codemirror/addon/scroll/simplescrollbars.css" media="screen">
      <link rel="stylesheet"  href="css/markdown.css" media="all">
      <link href="fontawesome-free/css/all.min.css" rel="stylesheet" media="screen">
      <link rel="stylesheet" href="css/style.css" media="screen">
      <link rel="stylesheet" href="css/print.css" media="print">
   </head>
   <body>
      <script src="jquery/jquery.min.js"></script>
      <script src="js/htmlparser.js"></script>
      <script src="js/morphdom-umd.min.js"></script>
      <script src="codemirror/lib/codemirror.js"></script>
      <script src="codemirror/addon/mode/overlay.js"></script>
      <script src="codemirror/mode/javascript/javascript.js"></script>
      <script src="codemirror/mode/xml/xml.js"></script>
      <script src="codemirror/mode/markdown/markdown.js"></script>
      <script src="codemirror/mode/gfm/gfm.js"></script>
      <script src="codemirror/addon/selection/mark-selection.js"></script>
      <script src="codemirror/addon/search/searchcursor.js"></script>
      <script src="codemirror/addon/search/search.js"></script>
      <script src="codemirror/addon/edit/continuelist.js"></script>
      <script src="codemirror/addon/scroll/simplescrollbars.js"></script>
      <script src="sweet2alert/dist/sweetalert2.all.min.js"></script>
      <script src="js/turndown.js"></script>
      <script src="js/turndown-plugin-gfm.js"></script>
      <script src="highlight/highlight.pack.js"></script>
      <script src="js/jquery.touchwipe.min.js"></script>
      <script src="js/fullscreen.js"></script>
      <script src="js/md.js"></script>
      <script src="js/all.js"></script>
      <script>
        var config = {};
        var wrapper = EditorWrapper.create(config);
        //https://www.qyh.me/space/web/article/598
        var userAgent = navigator.userAgent;
        if(userAgent.indexOf('Windows NT 10.0') != -1 && userAgent.indexOf('Firefox') != -1){
            var textarea = wrapper.editor.getWrapperElement().querySelector('textarea');
            textarea.style.width = "1000px";
        }
      </script>
   </body>
</html>
```

### 其他

1. `codemirror.js` codemirror核心文件 **本地处理过，请勿使用cdn**
2. `md.js` markdown-it **本地处理过，请勿使用cdn**
3. 一个页面只能存在一个`EditorWrapper`实例，创建另一个`EditorWrapper`实例时会自动销毁已经存在的实例
4. 编辑器不会替代任何你页面的html元素，它只会额外创建一些html元素，它始终是全屏的，并且**无法改变**
5. `EditorWrapper`依赖以下html元素(初始化实例时自动创建)，请保证ID的唯一性

```html
<div id="editor_wrapper">
  <div id="editor_toc"></div>
  <div id="editor_in">
    <div id="editor_toolbar"></div>
    <textarea  style="width: 100%; height: 100%"></textarea>
    <div id="editor_stat"></div>
    <div id="editor_innerBar"></div>
  </div>
  <div class="markdown-body " id="editor_out" ></div>
</div>
```

## 配置

|  配置项  |  说明  | 默认值   |    
|  -  |  -  |  -  |
|  `toolbar_icons`  | 配置顶部工具条图标   | [ 'toc','innerBar','backup','new','search','config' ]   |
|  `backupEnable`  | 是否开启备份   |    |
|  `backup_autoSaveMs`  | **当配置backupEnable为true时生效**，当编辑器内容发生变更时，多少毫秒后自动保存编辑器内容   |  500  | 
|  `innerBar_icons`  | 配置辅助工具条的图标  |['heading','bold','italic','quote','strikethrough','link','code','code-block','uncheck','check','table','undo','redo','close'] | 
|  `render_allowHtml`  | 是否允许html标签  | false |
|  `render_plugins`  | 配置markdown渲染支持的插件  | ['footnote','katex','mermaid','anchor','task-lists','sup','sub','abbr'] |
|  `render_beforeRender`  | 配置在渲染前元素处理器  |  |
|  `render_ms`  | 当编辑器内容发生变更时，多少毫秒后开始渲染  | 500 |
|  `stat_enable`  | 是否启用状态条  | true |
|  `stat_formatter`  | 当启用状态条时，用于获取状态条渲染内容的方法  |  |
|  `sync_animateMs`  | 配置同步滚动时滚动动画时间  | 0 |
|  `sync_enable`  | 是否启用同步滚动  |  |
|  `swipe_animateMs`  | 预览、编辑、toc切换时动画时间  | 500 |
|  `res_mermaid_js`  | 指定mermaid文件的加载路径  | js/mermaid.min.js ||
|  `res_katex_css`  | 指定katex css文件的加载路径  | katex/katex.min.css |
|  `res_katex_js`  | 指定katex js文件的加载路径  | katex/katex.min.js |
|  `res_hljsTheme`  | 获取highlightjs主题的路径  | function(theme){return themeCssUrl} |
|  `res_editorTheme`  | 获取CodeMirror主题的路径  | function(theme){return themeCssUrl} |
|  `res_colorpickerCss`  | 指定colorpicker css文件路径  | colorpicker/dist/css/bootstrap-colorpicker.min.css |
|  `res_colorpickerJs`  | 指定colorpicker js文件路径  | colorpicker/dist/js/bootstrap-colorpicker.min.js |
|  `renderAllDocEnable`  | 代码高亮的同步预览中，由于codemirror只渲染当前视窗，因此会出现不同步的现象，开启这个选项在载入文档时可以消除这个现象，但是在文本量比较大的时候，加载非常缓慢，可以选择关闭  | true |

## 方法

### 编辑器

#### 获取codemirror对象

`wrapper.editor`

#### 获取编辑器内容

`wrapper.getValue()`

#### 设置编辑器内容

`wrapper.setValue(newValue)`

### 获取html内容

`wrapper.getHtml()`

### 渲染内容

`wrapper.doRender(patch)` patch:是否patch更新

### 同步滚动条

`wrapper.doSync()`

### 启用编辑和预览的同步

`wrapper.enableSync()`

### 停用编辑和预览的同步

`wrapper.disableSync()`

### 切换到编辑器页面

`wrapper.toEditor()`

### 切换到TOC页面

`wrapper.toToc()`

### 切换到预览页面

`wrapper.toPreview()`**只在手机端或者全屏模式下有效**

### 顶部工具栏

`wrapper.toolbar`

#### 添加一个图标

`wrapper.toolbar.addIcon(clazz,hander,callback)`

clazz为fontawesome图标的样式，例如`fa fa-file icon`，handler为图标被点击时触发的方法，callback则为图标元素的回调，例如为添加的图标加上id属性：

```javascript
wrapper.toolbar.addIcon(clazz,hander,function(icon){
  icon.setAttribute(id,'icon-id');
})
```

##### 额外的图标样式

1. `mobile-hide`在手机端隐藏
2. `pc-hide`在pc端隐藏
3. `nofullscreen`在全屏模式下隐藏
4. `onfullscreen` 只在全屏模式下出现

#### 删除图标

`wrapper.toolbar.removeIcon(function(icon){return bool})`

#### 隐藏

`wrapper.toolbar.hide()`

#### 显示

`wrapper.toolbar.show()`

#### 保持隐藏状态

```javascriptwrapper.toolbar.keepHidden = true;
wrapper.toolbar.hide();
```

### 辅助工具栏

`wrapper.innerBar`

方法同顶部工具条

### 主题

`wrapper.theme`

#### 配置编辑器主题

```javascriptvar theme = wrapper.theme;
theme.setEditorTheme(wrapper.editor,'abcdef',function(){
	theme.render();
})
```

#### 配置代码高亮主题

```javascriptvar theme = wrapper.theme;
theme.hljs.theme = 'a11y-light'
theme.render();
```

#### 配置顶部工具条颜色

```javascriptvar theme = wrapper.theme;
theme.toolbar.color = '#fff'
theme.render();
```

#### 配置辅助工具条颜色

```javascriptvar theme = wrapper.theme;
theme.bar.color = '#fff'
theme.render();
```

#### 配置状态条字体颜色

```javascriptvar theme = wrapper.theme;
theme.stat.color = '#fff'
theme.render();
```

#### 自定义css

```javascriptvar css = '';
wrapper.theme.customCss = css;
wrapper.theme.render();
```

#### 保存主题

``` javascript
wrapper.saveTheme();
```
#### 重置主题
``` javascript
wrapper.resetTheme();
```
### 执行指令
`wrapper.execCommand(commandName)`
系统内置指令
| 名称   | 说明   |   快捷键_mac| 快捷键_pc| 
|  -  |  -  | - | - |
|  search  |  开启\|关闭一个搜索框  | <kbd>Ctrl</kbd> <kbd>S</kbd> |<kbd>Alt</kbd> <kbd>S</kbd>|
|  emoji  |  打开emoji选择框  |     
|  heading  |  打开heading选择框  |<kbd>Ctrl</kbd> <kbd>H</kbd> |<kbd>Ctrl</kbd> <kbd>H</kbd>  |  
|  bold  |  加粗文本  | <kbd>Ctrl</kbd> <kbd>B</kbd> |<kbd>Ctrl</kbd> <kbd>B</kbd> |
|  italic  |  倾斜文本  |<kbd>Ctrl</kbd> <kbd>I</kbd> |<kbd>Ctrl</kbd> <kbd>I</kbd>|
|  quote  |  引用文本  | <kbd>Ctrl</kbd> <kbd>Q</kbd> |<kbd>Ctrl</kbd> <kbd>Q</kbd> | 
|  strikethrough  |  为文本添加删除线  | 
|  link  |  插入超链接  | <kbd>Ctrl</kbd> <kbd>L</kbd>  |<kbd>Ctrl</kbd> <kbd>L</kbd> |
|  codeBlock  |  插入代码块  |<kbd>Shift</kbd> <kbd>Cmd</kbd> <kbd>B</kbd> |<kbd>Alt</kbd> <kbd>B</kbd>| 
|  code  |  插入行内代码  | 
|  uncheck  |  插入待办事项  |<kbd>Shift</kbd> <kbd>Cmd</kbd> <kbd>U</kbd> |<kbd>Alt</kbd> <kbd>U</kbd>|
|  check  |  插入已完成待办事项  |<kbd>Shift</kbd> <kbd>Cmd</kbd> <kbd>I</kbd>|<kbd>Alt</kbd> <kbd>I</kbd>|
|  undo  |  撤回  |<kbd>Cmd</kbd> <kbd>Z</kbd> | <kbd>Ctrl</kbd> <kbd>Z</kbd>|
|  redo  |  取消撤回  |<kbd>Cmd</kbd> <kbd>Y</kbd>|<kbd>Ctrl</kbd> <kbd>Y</kbd>|
|  table  |  插入表格  | <kbd>Shift</kbd> <kbd>Cmd</kbd> <kbd>T</kbd> |<kbd>Alt</kbd> <kbd>T</kbd>|
### 新增指令
`EditorWrapper.commands[commandName] = commandHandler`
commandHandler接受一个参数`wrapper`，例如：
新增一个插入图片的指令，并且为该指令绑定`Ctrl+G`的快捷键：
```javascript
EditorWrapper.commands['image'] = function(wrapper){
  var editor = wrapper.editor;
  var text = editor.getSelection();
  if (text == '') {
      editor.replaceRange("![]()", editor.getCursor());
      editor.focus();
      var start_cursor = editor.getCursor();
      var cursorLine = start_cursor.line;
      var cursorCh = start_cursor.ch;
      editor.setCursor({
          line: cursorLine,
          ch: cursorCh - 1
      });
  } else {
      editor.replaceSelection("![" + text + "]()");
  }
}
wrapper.bindKey({'Ctrl-G':'image'});
```
### 快捷键绑定
`wrapper.bindKey(keyMap)`
keyMap对象属性为快捷键名称，例如`Ctrl-A`,属性值可以为string或者一个方法，如果为string类型，那么则会绑定对应名称的命令，如果为方法，则会直接绑定该方法
### 解除快捷键绑定
`wrapper.unbindKey(keyArray)` keyArray为快捷键数组，例如`['Ctrl-A']`
### 全屏编辑
`wrapper.requestFullScreen()` **只在PC端有效**
### 退出全屏
`wrapper.exitFullScreen()`  **只在PC端有效**
### 销毁实例
`wrapper.remove()`
### 监听实例销毁
`wrapper.onRemove(fun)`
### 取消监听实例销毁
`wrapper.offRemove(fun)`
## 导出PDF
没有直接导出PDF的方法，但是可以通过以下步骤，让chrome浏览器的打印功能来实现
### 设置打印样式
```html
<link rel="stylesheet"  href="codemirror/lib/codemirror.css" media="screen">
<link rel="stylesheet" 
 href="codemirror/addon/scroll/simplescrollbars.css" media="screen">
<link rel="stylesheet"  href="css/markdown.css" media="all">
<link href="fontawesome-free/css/all.min.css"  media="all" rel="stylesheet">
<link rel="stylesheet" href="css/style.css" media="screen">
<link rel="stylesheet" href="css/print.css" media="print">
```
上述html中，`media="print"`的只会在打印时使用，`media="screen"`的则只会在页面渲染时使用，而`media="all"` 则在所有情况下都会使用，请参考 https://www.w3schools.com/tags/att_link_media.asp
### 打印前渲染
mermaid渲染出来的元素大小会根据视窗大小自动调整，由于左右预览的原因，打印出来的大小会跟预期的大小不一致，此时可以通过监听打印事件使得在打印前再次渲染。
```javascript
var wrapper = EditorWrapper.create({});
var beforePrintHandler = function(mql) {
    if (mql.matches) {
        wrapper.doRender(false);
    }
}
if (window.matchMedia) {
    var mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener(beforePrintHandler);
}
wrapper.onRemove(function(){
    mediaQueryList.removeListener(beforePrintHandler);
});
```
### 强制分页
通过添加以下代码可以让pdf文件强制分页
```html
<div style="page-break-after: always;"></div>
```
## 支持的浏览器
**只在chrome上做了测试，但应该支持一些其他的现代化浏览器**
## 感谢
1. 采用[codemirror](https://codemirror.net/)作为编辑器
2. 采用[markdown-it](https://github.com/markdown-it/markdown-it)渲染markdown
3. 采用[jquery](https://jquery.com/)简化dom操作
4. 采用[fontawesome](https://fontawesome.com/)美化图标
5. 采用[highlight.js](https://highlightjs.org/)高亮代码
6. 采用[katex](https://katex.org/)渲染数学公式
7. 采用[sweet2alert](https://sweetalert2.github.io/)美化弹出框
8. 采用[mermaid](https://mermaidjs.github.io/)绘制流程图、甘特图和时序图
9. 采用[turndown](https://github.com/domchristie/turndown)将html转化为markdown
10. 采用[morphdom](https://github.com/patrick-steele-idem/morphdom)来patch更新dom