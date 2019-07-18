var Editor = (function() {
	var style = document.createElement('style');
	style.innerHTML = '.noscroll{overflow: hidden;}'
	document.head.appendChild(style);
	var currentDiv;

	var Editor = function(textarea,config,callback) {
		removeCurrentDiv();
		var div = document.createElement('div');
		div.style.cssText = "position:fixed;top:0px;left:0px;width:100%;height:100%;z-index:999999";
		div.innerHTML = '<iframe src="offline.html" width="100%" height="100%" border="0" frameborder="0" ></iframe>';
		var iframe = div.querySelector('iframe');
		iframe.addEventListener('load', function() {
			var innerDoc ;
			try{
				innerDoc = iframe.contentWindow.document;
			}catch(e){
				window.location.href = 'offline.html';
				return ;
			}
			iframe.contentWindow.createEditor(config);
			document.body.classList.add('noscroll');
			if(callback){
				callback(iframe.contentWindow.wrapper);
			}
		});
		document.body.append(div);
		currentDiv = div;
	}

	var removeCurrentDiv = function() {
		if (currentDiv) {
			currentDiv.parentNode.removeChild(currentDiv);
			currentDiv = undefined;
		}
	}

	Editor.prototype.remove = function() {
		removeCurrentDiv();
	}
	return {
		create : function(textarea,config,callback) {
			return new Editor(textarea,config,callback)
		}
	}

})();