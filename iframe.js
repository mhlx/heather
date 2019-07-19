Editor = (function() {
	var style = document.createElement('style');
	style.innerHTML = '.noscroll{overflow: hidden;}'
	document.head.appendChild(style);
	var currentDiv;

	var createEditor = function(textarea,config,callback) {
		var div = document.createElement('div');
		div.style.cssText = "position:fixed;top:0px;left:0px;width:100%;height:100%;z-index:999999";
		div.innerHTML = '<iframe allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="offline.html" width="100%" height="100%" border="0" frameborder="0" ></iframe>';
		var iframe = div.querySelector('iframe');
		iframe.addEventListener('load', function() {
			var innerDoc ;
			try{
				innerDoc = iframe.contentWindow.document;
			}catch(e){
				document.body.innerHTML = '<h1>这个文件无法在本地工作</h1>';
				return ;
			}
			var wrapper = iframe.contentWindow.createEditor(config);
			document.body.classList.add('noscroll');
			if(callback){
				callback(wrapper,iframe.contentWindow);
			}
		});
		document.body.append(div);
		currentDiv = div;
	}

	return {
		create : createEditor
	}

})();