Object.prototype.getKeys=function() {
	var keyArray = new Array();
	for (var key in this) {
		if (key == "getKeys") continue;
		keyArray.push(key);
	}
	return keyArray;
}


Pebble.addEventListener("ready",
  function(e) {
  	AddMessageListener();
	console.log("Yes, it's running!!!");
	SendStops();
  }
);

function AddMessageListener () {
	Pebble.addEventListener("appmessage",
  		function(e) {
  			console.log("Received message: " + e.payload[1]);
  			if (e.payload[1] == "get_config") {
				SendStops();
  				return;
  			}

    		TestJson(e.payload[1]);
  		}
	);
	Pebble.addEventListener("showConfiguration",
		function(e) {
			Pebble.openURL("http://tw.leighmurray.com");
		}
	);
	Pebble.addEventListener("webviewclosed",
  		function(e) {
  			var stopStr = "";
    		console.log("Configuration window returned: " + e.response);
    		var configuration = JSON.parse(e.response);

    		for (var i = 0; i < configuration.length; i++) {
    			var returnedObject = configuration[i];
				SetConfig(returnedObject.name, returnedObject.value);
				SendStops();
    		}
  		}
	);
};

function GetConfig (key) {
	return window.localStorage.getItem(key);
}

function SendStops () {
	SendAppMessage("set_stops", GetConfig("stop1") + ";" + GetConfig("stop2") + ";" + GetConfig("stop3") + ";");
}

function SetConfig (key, value) {
	console.log("Setting Key:" + key + " - Value:" + value);
	window.localStorage.setItem(key, value);
}

function GetTramTimes () {
	var req = new XMLHttpRequest();
  	req.open('GET', 'http://tw.leighmurray.com', true);
  	req.onload = function(e) {
    if (req.readyState == 4 && req.status == 200) {
      if(req.status == 200) {
        var response = JSON.parse(req.responseText);
        console.log("Response: " + req.responseText);
      } else { console.log("Error"); }
    }
  }
  req.send(null);
}

function readyStateChange (xmlHTTP) {
		if (xmlHTTP.readyState == 4 && xmlHTTP.status == 200) {
			var pebbleResponse = {};
			var specialEvent = "";


			console.log("Got a response from TRAMTRACKER...");

			var jsonObject = JSON.parse(xmlHTTP.responseText);

			pebbleResponse[0] = "" + jsonObject.TramTrackerResponse.StopID;
								//+ "-" + jsonObject.TramTrackerResponse.StopName
								//+ "-" + jsonObject.TramTrackerResponse.StopNameSecondary
								//+ jsonObject.TramTrackerResponse.CityDirection.trim();
			var routesArray = {};
			//timeString = "";
			console.log("ArrivalsPages: " + jsonObject.TramTrackerResponse.ArrivalsPages.length);
			for (var i = 0; i < jsonObject.TramTrackerResponse.ArrivalsPages.length; i++) {
				var arrivalsPage = jsonObject.TramTrackerResponse.ArrivalsPages[i];
				for (var j = 0; j < arrivalsPage.length; j++) {
					var tramInfo = arrivalsPage[j];
					/*if (routes.indexOf(tramInfo.RouteNo) < 0) {
						routes.push(tramInfo.RouteNo);
					}*/
					var routeNumberStr = tramInfo.RouteNo.toString();
					if (!(routeNumberStr in routesArray)) {
						routesArray[routeNumberStr] = new Array();
					}
					routesArray[routeNumberStr].push((tramInfo.Arrival == "NOW") ? "-" : tramInfo.Arrival);

					//timeString += tramInfo.Arrival + ",";
					//pebbleResponse.push(tramInfo.RouteNo);
					//pebbleResponse.push(tramInfo.Destination);
					//pebbleResponse.push(tramInfo.HasDisruption);
					//pebbleResponse.push(tramInfo.IsLowFloorTram);
					//pebbleResponse.push(tramInfo.Arrival);

					if (tramInfo.HasSpecialEvent && tramInfo.SpecialEventMessage) {
						specialEvent = tramInfo.SpecialEventMessage;
					}
    			}
    			//timeString += ";";
			}
			var keys = routesArray.getKeys();
			pebbleResponse[1] = keys.join(';')  + ";";
			var timeString = "";
			console.log("Routes Array: " + routesArray.toString());
			for (var i=0; i< keys.length; i++) {
				key = keys[i];
				timeString += routesArray[key].join(',') + ";";
			}
			pebbleResponse[2] = timeString;

			if (specialEvent) {
				//Pebble.showSimpleNotificationOnPebble("Special Event", specialEvent);
			}
			SendAppMessage("stopID", pebbleResponse[0]);
			SendAppMessage("routes", pebbleResponse[1]);
			setTimeout(function () {SendAppMessage("times", pebbleResponse[2]);}, 100);
		}
}

function SendAppMessage (header, content) {
	console.log("Sending Header: " + header + " with content: " + content);
	var transactionId = Pebble.sendAppMessage(
    	{
    		"0":header,
    		"1":content
    	},
  		function(e) {
    		console.log("Successfully delivered message with transactionId=" + e.data.transactionId);
    	},
  		function(e) {
    		console.log("Unable to deliver message with transactionId=" + e.data.transactionId + " Error is: " + e.message);
  		}
	);
}

function TestJson (trackerStopID) {
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.open("POST", "http://www.yarratrams.com.au/base/tramTrackerController/TramInfoAjaxRequest",true);
	xmlHTTP.setRequestHeader( "Content-Type","application/x-www-form-urlencoded");
	var params = "StopID=" + trackerStopID + "&Route=&LowFloorOnly=false";
	xmlHTTP.onreadystatechange = function () {
		readyStateChange(xmlHTTP);
	};
	xmlHTTP.send(params);
}

function TestSoap () {
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.open("POST", "http://ws.tramtracker.com.au/pidsservice/pids.asmx",true);
	xmlHTTP.setRequestHeader( "Content-Type","text/xml; charset=utf-8");
	xmlHTTP.setRequestHeader(
		"SOAPAction", "http://www.yarratrams.com.au/pidsservice/GetNextPredictedRoutesCollection");

	strRequest = "<?xml version='1.0' encoding='utf-8'?>";
	strRequest = strRequest + '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">';
	strRequest = strRequest + '<soap:Header>';
	strRequest = strRequest + '<PidsClientHeader xmlns="http://www.yarratrams.com.au/pidsservice/">';
	strRequest = strRequest + '<ClientGuid>9829137b-a174-4039-8451-41905003e8e0</ClientGuid>';
	strRequest = strRequest + '<ClientType>WEBPID</ClientType>';
	strRequest = strRequest + '<ClientVersion>1.0</ClientVersion>';
	strRequest = strRequest + '<ClientWebServiceVersion>6.4.0.0</ClientWebServiceVersion>';
	strRequest = strRequest + '</PidsClientHeader>';
	strRequest = strRequest + '</soap:Header>';
	strRequest = strRequest + '<soap:Body>';
	strRequest = strRequest + '<GetNextPredictedRoutesCollection xmlns="http://www.yarratrams.com.au/pidsservice/">';
	strRequest = strRequest + '<stopNo>1923</stopNo>';
	strRequest = strRequest + '<routeNo>0</routeNo>';
	strRequest = strRequest + '<lowFloor>false</lowFloor>';
	strRequest = strRequest + '</GetNextPredictedRoutesCollection>';
	strRequest = strRequest + '</soap:Body>';
	strRequest = strRequest + '</soap:Envelope>';

	xmlHTTP.onreadystatechange = function () {
		if (xmlHTTP.readyState == 4 && xmlHTTP.status == 200) {
			console.log("Got a response from TRAMTRACKER...");

    		console.log("done!");
    	}
	}
	xmlHTTP.send(strRequest);
}

function MyStringify (array) {
	var object = {};
	for (i = 0; i < array.length; i++) {
		object[i] = array[i];
		if (i == 3)
			break;
	}
	console.log("Size:" + roughSizeOfObject(object));
	return object;
}

function roughSizeOfObject( object ) {

    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
}