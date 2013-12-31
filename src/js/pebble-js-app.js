var currentStopID;
var configKeys = ["stop1","stop2","stop3"];

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

    		RetrieveStopInfo(e.payload[1]);
  		}
	);
	Pebble.addEventListener("showConfiguration",
		function(e) {

			var url = "http://tw.leighmurray.com/settings.html#";
			url += GetJSONConfig();
			url = encodeURI(url);
			console.log(url);
			Pebble.openURL(url);
		}
	);
	Pebble.addEventListener("webviewclosed",
  		function(e) {
  			var stopStr = "";
    		console.log("Configuration window returned: " + e.response);
    		if (!e.response) {
    			return;
    		}

    		var configuration = JSON.parse(e.response);

    		for (var i = 0; i < configuration.length; i++) {
    			var returnedObject = configuration[i];
				SetConfig(returnedObject.name, returnedObject.value);
    		}
    		SendStops();
  		}
	);
};

function GetJSONConfig () {

	var tempConfig = {};
	for (var i=0; i<configKeys.length; i++) {
		var configKey = configKeys[i];
		tempConfig[configKey] = GetConfig(configKey);
	}
	var jsonConfig = JSON.stringify(tempConfig);
	return jsonConfig;
}

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

function readyStateChange (xmlHTTP) {
		if (xmlHTTP.readyState == 4 && xmlHTTP.status == 200) {
			var pebbleResponse = {};
			var specialEvent = "";


			console.log("Got a response from TRAMTRACKER...");

			var jsonObject = JSON.parse(xmlHTTP.responseText);

			if (jsonObject.ErrorMessage) {
				console.log("TramTracker Request Error:" + jsonObject.ErrorMessage);
				var splitErrorMessage = jsonObject.ErrorMessage.split("]")[1];
				SendAppMessage("error", (splitErrorMessage ? splitErrorMessage : jsonObject.ErrorMessage));
				return;
			}

			if (currentStopID != jsonObject.TramTrackerResponse.StopID) {
				// should send an app message prob
				return;
			}
			// 19 is the amount of characters that fit the width of the screen at the chosen font size.
			var stopName = jsonObject.TramTrackerResponse.StopName.substr(0, 19);
			console.log("Direction:" + jsonObject.TramTrackerResponse.CityDirection);

			var cityDirection = jsonObject.TramTrackerResponse.CityDirection;

			if (cityDirection.search("towards") >= 0)
				cityDirection = " to " + cityDirection.split("towards ")[1].substr(0, 16);
			else if (cityDirection.search("from") >= 0)
				cityDirection = " from " + cityDirection.split("from ")[1].substr(0, 16);


			var stopNameSecondary = jsonObject.TramTrackerResponse.StopNameSecondary.substr(0, 19);

			/*
			pebbleResponse[0] =// "" + jsonObject.TramTrackerResponse.StopID + "-" +
								jsonObject.TramTrackerResponse.StopName.substr(0, 19)
								+ "\n" + jsonObject.TramTrackerResponse.StopNameSecondary.substr(0, 19)
								+ "\nto " + jsonObject.TramTrackerResponse.CityDirection.split("towards ")[1].substr(0, 19);
			*/

			pebbleResponse[0] = stopName + "\n" + stopNameSecondary + cityDirection;
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
					routesArray[routeNumberStr].push(tramInfo.Arrival.replace("NOW", "0"));

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
			setTimeout(function () {CheckStopSendAppMessage(currentStopID, "routes", pebbleResponse[1]);}, 1000);
			setTimeout(function () {CheckStopSendAppMessage(currentStopID, "times", pebbleResponse[2]);}, 2000);
		}
}

function CheckStopSendAppMessage (stopID, header, content) {
	if (stopID == currentStopID) {
		SendAppMessage(header, content);
	}
}

function SendAppMessage (header, content) {
	// TODO! Make headers/functions into int (use config for names)
	// so more space available for content
	var maxLength = 47;
	maxLength -= header.length;
	if (content.length > maxLength) {
		console.log("Warning! SendAppMessage trimming content to " + maxLength + ". Orig length:" + content.length);
		content = content.substr(0, maxLength);
	}
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

function RetrieveStopInfo (trackerStopID) {
	currentStopID = trackerStopID;
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.open("POST", "http://www.yarratrams.com.au/base/tramTrackerController/TramInfoAjaxRequest",true);
	xmlHTTP.setRequestHeader( "Content-Type","application/x-www-form-urlencoded");
	var params = "StopID=" + trackerStopID + "&Route=&LowFloorOnly=false";
	xmlHTTP.onreadystatechange = function () {
		readyStateChange(xmlHTTP);
	};
	xmlHTTP.send(params);
}
