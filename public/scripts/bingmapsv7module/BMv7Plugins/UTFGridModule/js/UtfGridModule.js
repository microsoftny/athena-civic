var UtfGrid;

(function() {

    UtfGrid = function (map, urlTemplate, options) {

        var _layer = {};
        var _cache = {};
        var _currentKey;
        var _options = {


            //callback that is called when there's a mouse click on any utfgrid tile
            mouseclickCallback: undefined,

            //callback that is called when there's a mouse over any utfgrid tile
            mouseoverCallback: undefined,

            //callback that is called each time any utfgrid tile is loaded
            tileLoadedCallback: undefined,

            //indicates if the tiles should be loaded by jsonp or regular ajax.
            jsonp: true,

            //size of each pixel on the utfgrid. The size by default is 4 (meaning a utfgrid of 64x64)
            tileSize: 4,

            //zoom level until the utf grid is active
            maxZoomLevel: 20
        };

        /*********************** Private Methods ****************************/
        //Initialization method
        function _init(map) {

            _setOptions(options);

            if(_options.jsonp) {
                urlTemplate = _addCallbackIfMissing(urlTemplate);
            }

            var tileSource = new Microsoft.Maps.TileSource({
                uriConstructor:  function getTilePath(tile) {

                    if(tile.levelOfDetail > _options.maxZoomLevel) return;

                    var key = tile.levelOfDetail + "_" + tile.x + "_" + tile.y;

                    if(_cache[key] == undefined) {
                        _loadUtfGridForTile(tile, urlTemplate);
                    }

                }});

            _layer = new Microsoft.Maps.TileLayer({ mercator: tileSource});

            if(_options.mouseoverCallback != undefined) {

                Microsoft.Maps.Events.addHandler(map, 'mousemove', function(e) {
                    _handleMouseEvent(e);
                });
            }

            if(_options.mouseclickCallback != undefined) {

                Microsoft.Maps.Events.addHandler(map, 'click', function(e) {
                    _handleMouseEvent(e);
                });
            }


        };


        function _handleMouseEvent(e) {

            var zoom = map.getZoom();
            var mouseX = e.getX();;
            var mouseY = e.getY();

            var point = new Microsoft.Maps.Point(mouseX, mouseY);

            var loc = map.tryPixelToLocation(point);

            var worldpixel = _latLongToPixelXY(loc.latitude, loc.longitude, zoom);

            var tileX = worldpixel.x / 256.0;
            var tileY = worldpixel.y / 256.0;

            var x = (tileX - Math.floor(tileX)) * 256;
            var y = (tileY - Math.floor(tileY)) * 256;

            var data = _cache[zoom + "_" + Math.floor(tileX) + "_" + Math.floor(tileY)];

            if(data == undefined || data.grid == undefined){
                return;
            }

            var row = Math.floor(y / _options.tileSize);
            var col = Math.floor(x / _options.tileSize);

            var rowData = data.grid[row];

            if(rowData != undefined) {

                var id = rowData.charCodeAt(col);

                var val = _utfDecode(id);
                var key = data.keys[val];

                var result = data.data[key];

                if(result != undefined && key != _currentKey) {
                    _currentKey = key;
                }
                else if(result == undefined && _currentKey != undefined) {
                    _currentKey = undefined;
                    result = undefined;
                }

                if(e.eventName == "mousemove") {
                    _options.mouseoverCallback(result);
                }

                if(e.eventName == "click") {
                    _options.mouseclickCallback(result);
                }

            }

        }

        function _addCallbackIfMissing(uri) {

            var key="callback";
            var value="grid";

            var re = new RegExp("([?|&])" + key + "=.*?(&|$)", "i");
            var separator = uri.indexOf('?') !== -1 ? "&" : "?";
            if (!uri.match(re)) {
                return uri + separator + key + "=" + value;
            }
        }



        function _loadUtfGridForTile(tile, urlTemplate) {

            var x = tile.x;
            var z = tile.levelOfDetail;
            var y = tile.y;

            var url = urlTemplate;

            url = url.replace("{z}", z);
            url = url.replace("{x}", x);
            url = url.replace("{y}", y);

            reqwest({
                url: url
                , type: _options.jsonp ? 'jsonp' : 'json'
                , success: function (data) {

                    var key = z + "_" + x + "_" + y;
                    _cache[key] = data;

                    if(_options.tileLoadedCallback != undefined) {
                        _options.tileLoadedCallback(tile);
                    }

                }
            });
        }

        /*
         * According to the UTFGrid spec at https://github.com/mapbox/utfgrid-spec/blob/master/1.3/utfgrid.md
         */
        function _utfDecode(codepoint) {

            if (codepoint >= 93) {
                codepoint--;
            }
            if (codepoint >= 35) {
                codepoint--;
            }
            return codepoint - 32;
        }



        function _setOptions(options) {
            for (attrname in options) {
                _options[attrname] = options[attrname];
            }
        }


        function _latLongToPixelXY(latitude, longitude, levelOfDetail) {

            var sinLatitude = Math.sin(latitude * Math.PI / 180);
            var pixelX = ((longitude + 180) / 360) * 256 * (2 << (levelOfDetail - 1));
            var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * 256 * (2 << (levelOfDetail - 1));

            var pixel = new Object();
            pixel.x = (0.5 + pixelX) | 0;
            pixel.y = (0.5 + pixelY) | 0;

            return pixel;
        }

        /*********************** Public Methods ****************************/

        this.getTileData = function(tile) {
            return _cache[tile.z + "_" + tile.x + "_" + tile.y];
        };

        this.getTileSize = function() {
            return _options.tileSize;
        };

        _init(map);

        return _layer;
    }


    /*! version: 0.9.1 */
    /*!
     * Reqwest! A general purpose XHR connection manager
     * (c) Dustin Diaz 2013
     * https://github.com/ded/reqwest
     * license MIT
     */
    !function(e,t,n){typeof module!="undefined"&&module.exports?module.exports=n():typeof define=="function"&&define.amd?define(n):t[e]=n()}("reqwest",this,function(){function handleReadyState(e,t,n){return function(){if(e._aborted)return n(e.request);e.request&&e.request[readyState]==4&&(e.request.onreadystatechange=noop,twoHundo.test(e.request.status)?t(e.request):n(e.request))}}function setHeaders(e,t){var n=t.headers||{},r;n.Accept=n.Accept||defaultHeaders.accept[t.type]||defaultHeaders.accept["*"],!t.crossOrigin&&!n[requestedWith]&&(n[requestedWith]=defaultHeaders.requestedWith),n[contentType]||(n[contentType]=t.contentType||defaultHeaders.contentType);for(r in n)n.hasOwnProperty(r)&&"setRequestHeader"in e&&e.setRequestHeader(r,n[r])}function setCredentials(e,t){typeof t.withCredentials!="undefined"&&typeof e.withCredentials!="undefined"&&(e.withCredentials=!!t.withCredentials)}function generalCallback(e){lastValue=e}function urlappend(e,t){return e+(/\?/.test(e)?"&":"?")+t}function handleJsonp(e,t,n,r){var i=uniqid++,s=e.jsonpCallback||"callback",o=e.jsonpCallbackName||reqwest.getcallbackPrefix(i),u=new RegExp("((^|\\?|&)"+s+")=([^&]+)"),a=r.match(u),f=doc.createElement("script"),l=0,c=navigator.userAgent.indexOf("MSIE 10.0")!==-1;return a?a[3]==="?"?r=r.replace(u,"$1="+o):o=a[3]:r=urlappend(r,s+"="+o),win[o]=generalCallback,f.type="text/javascript",f.src=r,f.async=!0,typeof f.onreadystatechange!="undefined"&&!c&&(f.event="onclick",f.htmlFor=f.id="_reqwest_"+i),f.onload=f.onreadystatechange=function(){if(f[readyState]&&f[readyState]!=="complete"&&f[readyState]!=="loaded"||l)return!1;f.onload=f.onreadystatechange=null,f.onclick&&f.onclick(),t(lastValue),lastValue=undefined,head.removeChild(f),l=1},head.appendChild(f),{abort:function(){f.onload=f.onreadystatechange=null,n({},"Request is aborted: timeout",{}),lastValue=undefined,head.removeChild(f),l=1}}}function getRequest(e,t){var n=this.o,r=(n.method||"GET").toUpperCase(),i=typeof n=="string"?n:n.url,s=n.processData!==!1&&n.data&&typeof n.data!="string"?reqwest.toQueryString(n.data):n.data||null,o,u=!1;return(n.type=="jsonp"||r=="GET")&&s&&(i=urlappend(i,s),s=null),n.type=="jsonp"?handleJsonp(n,e,t,i):(o=xhr(n),o.open(r,i,n.async===!1?!1:!0),setHeaders(o,n),setCredentials(o,n),win[xDomainRequest]&&o instanceof win[xDomainRequest]?(o.onload=e,o.onerror=t,o.onprogress=function(){},u=!0):o.onreadystatechange=handleReadyState(this,e,t),n.before&&n.before(o),u?setTimeout(function(){o.send(s)},200):o.send(s),o)}function Reqwest(e,t){this.o=e,this.fn=t,init.apply(this,arguments)}function setType(e){var t=e.match(/\.(json|jsonp|html|xml)(\?|$)/);return t?t[1]:"js"}function init(o,fn){function complete(e){o.timeout&&clearTimeout(self.timeout),self.timeout=null;while(self._completeHandlers.length>0)self._completeHandlers.shift()(e)}function success(resp){resp=type!=="jsonp"?self.request:resp;var filteredResponse=globalSetupOptions.dataFilter(resp.responseText,type),r=filteredResponse;try{resp.responseText=r}catch(e){}if(r)switch(type){case"json":try{resp=win.JSON?win.JSON.parse(r):eval("("+r+")")}catch(err){return error(resp,"Could not parse JSON in response",err)}break;case"js":resp=eval(r);break;case"html":resp=r;break;case"xml":resp=resp.responseXML&&resp.responseXML.parseError&&resp.responseXML.parseError.errorCode&&resp.responseXML.parseError.reason?null:resp.responseXML}self._responseArgs.resp=resp,self._fulfilled=!0,fn(resp),self._successHandler(resp);while(self._fulfillmentHandlers.length>0)resp=self._fulfillmentHandlers.shift()(resp);complete(resp)}function error(e,t,n){e=self.request,self._responseArgs.resp=e,self._responseArgs.msg=t,self._responseArgs.t=n,self._erred=!0;while(self._errorHandlers.length>0)self._errorHandlers.shift()(e,t,n);complete(e)}this.url=typeof o=="string"?o:o.url,this.timeout=null,this._fulfilled=!1,this._successHandler=function(){},this._fulfillmentHandlers=[],this._errorHandlers=[],this._completeHandlers=[],this._erred=!1,this._responseArgs={};var self=this,type=o.type||setType(this.url);fn=fn||function(){},o.timeout&&(this.timeout=setTimeout(function(){self.abort()},o.timeout)),o.success&&(this._successHandler=function(){o.success.apply(o,arguments)}),o.error&&this._errorHandlers.push(function(){o.error.apply(o,arguments)}),o.complete&&this._completeHandlers.push(function(){o.complete.apply(o,arguments)}),this.request=getRequest.call(this,success,error)}function reqwest(e,t){return new Reqwest(e,t)}function normalize(e){return e?e.replace(/\r?\n/g,"\r\n"):""}function serial(e,t){var n=e.name,r=e.tagName.toLowerCase(),i=function(e){e&&!e.disabled&&t(n,normalize(e.attributes.value&&e.attributes.value.specified?e.value:e.text))},s,o,u,a;if(e.disabled||!n)return;switch(r){case"input":/reset|button|image|file/i.test(e.type)||(s=/checkbox/i.test(e.type),o=/radio/i.test(e.type),u=e.value,(!s&&!o||e.checked)&&t(n,normalize(s&&u===""?"on":u)));break;case"textarea":t(n,normalize(e.value));break;case"select":if(e.type.toLowerCase()==="select-one")i(e.selectedIndex>=0?e.options[e.selectedIndex]:null);else for(a=0;e.length&&a<e.length;a++)e.options[a].selected&&i(e.options[a])}}function eachFormElement(){var e=this,t,n,r=function(t,n){var r,i,s;for(r=0;r<n.length;r++){s=t[byTag](n[r]);for(i=0;i<s.length;i++)serial(s[i],e)}};for(n=0;n<arguments.length;n++)t=arguments[n],/input|select|textarea/i.test(t.tagName)&&serial(t,e),r(t,["input","select","textarea"])}function serializeQueryString(){return reqwest.toQueryString(reqwest.serializeArray.apply(null,arguments))}function serializeHash(){var e={};return eachFormElement.apply(function(t,n){t in e?(e[t]&&!isArray(e[t])&&(e[t]=[e[t]]),e[t].push(n)):e[t]=n},arguments),e}function buildParams(e,t,n,r){var i,s,o,u=/\[\]$/;if(isArray(t))for(s=0;t&&s<t.length;s++)o=t[s],n||u.test(e)?r(e,o):buildParams(e+"["+(typeof o=="object"?s:"")+"]",o,n,r);else if(t&&t.toString()==="[object Object]")for(i in t)buildParams(e+"["+i+"]",t[i],n,r);else r(e,t)}var win=window,doc=document,twoHundo=/^20\d$/,byTag="getElementsByTagName",readyState="readyState",contentType="Content-Type",requestedWith="X-Requested-With",head=doc[byTag]("head")[0],uniqid=0,callbackPrefix="reqwest_"+ +(new Date),lastValue,xmlHttpRequest="XMLHttpRequest",xDomainRequest="XDomainRequest",noop=function(){},isArray=typeof Array.isArray=="function"?Array.isArray:function(e){return e instanceof Array},defaultHeaders={contentType:"application/x-www-form-urlencoded",requestedWith:xmlHttpRequest,accept:{"*":"text/javascript, text/html, application/xml, text/xml, */*",xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript",js:"application/javascript, text/javascript"}},xhr=function(e){if(e.crossOrigin===!0){var t=win[xmlHttpRequest]?new XMLHttpRequest:null;if(t&&"withCredentials"in t)return t;if(win[xDomainRequest])return new XDomainRequest;throw new Error("Browser does not support cross-origin requests")}return win[xmlHttpRequest]?new XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP")},globalSetupOptions={dataFilter:function(e){return e}};return Reqwest.prototype={abort:function(){this._aborted=!0,this.request.abort()},retry:function(){init.call(this,this.o,this.fn)},then:function(e,t){return e=e||function(){},t=t||function(){},this._fulfilled?this._responseArgs.resp=e(this._responseArgs.resp):this._erred?t(this._responseArgs.resp,this._responseArgs.msg,this._responseArgs.t):(this._fulfillmentHandlers.push(e),this._errorHandlers.push(t)),this},always:function(e){return this._fulfilled||this._erred?e(this._responseArgs.resp):this._completeHandlers.push(e),this},fail:function(e){return this._erred?e(this._responseArgs.resp,this._responseArgs.msg,this._responseArgs.t):this._errorHandlers.push(e),this}},reqwest.serializeArray=function(){var e=[];return eachFormElement.apply(function(t,n){e.push({name:t,value:n})},arguments),e},reqwest.serialize=function(){if(arguments.length===0)return"";var e,t,n=Array.prototype.slice.call(arguments,0);return e=n.pop(),e&&e.nodeType&&n.push(e)&&(e=null),e&&(e=e.type),e=="map"?t=serializeHash:e=="array"?t=reqwest.serializeArray:t=serializeQueryString,t.apply(null,n)},reqwest.toQueryString=function(e,t){var n,r,i=t||!1,s=[],o=encodeURIComponent,u=function(e,t){t="function"==typeof t?t():t==null?"":t,s[s.length]=o(e)+"="+o(t)};if(isArray(e))for(r=0;e&&r<e.length;r++)u(e[r].name,e[r].value);else for(n in e)buildParams(n,e[n],i,u);return s.join("&").replace(/%20/g,"+")},reqwest.getcallbackPrefix=function(){return callbackPrefix},reqwest.compat=function(e,t){return e&&(e.type&&(e.method=e.type)&&delete e.type,e.dataType&&(e.type=e.dataType),e.jsonpCallback&&(e.jsonpCallbackName=e.jsonpCallback)&&delete e.jsonpCallback,e.jsonp&&(e.jsonpCallback=e.jsonp)),new Reqwest(e,t)},reqwest.ajaxSetup=function(e){e=e||{};for(var t in e)globalSetupOptions[t]=e[t]},reqwest})


})();

Microsoft.Maps.moduleLoaded('UtfGridModule');




