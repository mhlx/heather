# heather
## 说明
markdown编辑器，特性如下：
1. 支持mermaid图表
2. 自定义工具条|辅助工具条
3. 支持拖曳html|md文件，自动将html转化为markdown
4. 本地存储(localStorage)支持
5. 编辑预览同步滚动
6. 主题设置
7. 支持手机端
8. 离线访问

### 在线demo
https://md.qyh.me

### 其他
**编辑器采用iframe的方式调用，一个页面只能存在一个编辑器实例，同事存在跨域问题时，编辑器将会无法工作**

## 使用
从 https://github.com/mhlx/heather 下载最新的文件

### 引入js
```xml
<script src="iframe.js"></script>
```
### 创建编辑器
```html
<textarea id="editor" style="display:none"></textarea>
```

```javascript
var config = {};
Editor.create(document.getElementById("editor"),config,function(wrapper){
    console.log(wrapper);
});
```

### 完整代码
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</head>
<body>
  <textarea id="editor" style="display:none"></textarea>
  <script src="iframe.js"></script>
  <script>
      var config = {};
      Editor.create(document.getElementById("editor"),config,function(wrapper){
          console.log(wrapper);
      });
  </script>
</body>
</html>
```

## 配置

|  配置项  |  说明  | 默认值   |    
|  -  |  -  |  -  |
|  `toolbar_icons`  | 配置顶部工具条图标   | [ 'toc','innerBar','backup','new','search','config' ]   |    
|  `toolbar_autoSaveMs`  | **当配置'backup'时生效**，当编辑器内容发生变更时，多少毫秒后自动保存编辑器内容   |  500  | 
|  `innerBar_icons`  | 配置辅助工具条的图标  |['heading','bold','italic','quote','strikethrough','link','code','code-block','uncheck','check','table','undo','redo','close'] | 
|  `render_allowHtml`  | 是否允许html标签  | false |
|  `render_plugins`  | 配置markdown渲染支持的插件  | ['footnote','katex','mermaid','anchor','task-lists','sup','sub','abbr'] |
|  `render_beforeRender`  | 配置在渲染前元素处理器  |  |
|  `render_ms`  | 当编辑器内容发生变更时，多少毫秒后开始渲染  | 500 |
|  `stat_enable`  | 是否启用状态条  | true |
|  `stat_formatter`  | 当启用状态条时，用于获取状态条渲染内容的方法  |  |
|  `sync_animateMs`  | 配置同步滚动时滚动动画时间  | 0 |
|  `sync_enable`  | 是否启用同步滚动  |  |
|  `swipe_animateMs`  | 预览|编辑|toc切换时动画时间  | 500 |

## 方法

## 编辑器
`wrapper.editor`

获取codemirror对象

#### 获取编辑器内容
`wrapper.editor.getValue()`

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
`wrapper.toPreview()`**只在手机端有效**

### 顶部工具栏
`wrapper.toolbar`

#### 添加一个图标
`wrapper.toolbar.addIcon(clazz,hander,callback)`

clazz为fontawesome图标的样式，例如`fa fa-file icon`，如果不希望这个图标在手机端显示，只需要加上`mobile-hide`样式即可，同理，加上`pc-hide`则不会在pc端显示，handler为图标被点击时触发的方法，callback则为图标元素的回调，例如为添加的图标加上id属性：
```javascript
wrapper.toolbar.addIcon(clazz,hander,function(icon){
  icon.setAttribute(id,'icon-id');
})
```

#### 删除图标
`wrapper.toolbar.removeIcon(function(icon){return bool})`

#### 隐藏
`wrapper.toolbar.hide()`

#### 显示
`wrapper.toolbar.show()`


### 辅助工具栏
`wrapper.innerBar`

#### 添加一个图标
`wrapper.innerBar.addIcon(clazz,hander,callback)`

同顶部工具条

#### 删除图标
`wrapper.innerBar.removeIcon(function(icon){return bool})`

#### 隐藏
`wrapper.innerBar.hide()`

#### 显示
`wrapper.innerBar.show()`

#### 保持隐藏状态
```javascript
wrapper.innerBar.keepHidden = true;
wrapper.innerBar.hide();
```

### 主题
`wrapper.theme`

#### 配置编辑器主题
```
var theme = wrapper.theme;
theme.editor.theme = 'abcdef'
theme.render();
theme.store();
```

#### 配置顶部工具条颜色
```
var theme = wrapper.theme;
theme.toolbar.color = '#fff'
theme.render();
theme.store();
```

#### 配置辅助工具条颜色
```
var theme = wrapper.theme;
theme.bar.color = '#fff'
theme.render();
theme.store();
```

#### 配置状态条字体颜色
```
var theme = wrapper.theme;
theme.stat.color = '#fff'
theme.render();
theme.store();
```

#### 自定义css
```javascript
var css = '';
wrapper.theme.customCss = css;
wrapper.theme.render();
wrapper.theme.store();//储存配置的主题
```


## 支持的浏览器
1. chrome
2. safari?