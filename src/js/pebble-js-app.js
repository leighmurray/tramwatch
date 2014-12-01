var currentStopID;
var configKeys = ["stop1","stop2","stop3"];

function sortNumber(a,b) {
    return a - b;
}

Object.prototype.getKeys=function() {
  var keyArray = [];
	for (var key in this) {
		if (key == "getKeys") continue;
		keyArray.push(key);
	}
	return keyArray;
};


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
      if (e.payload.KEY_GET_TIMES) {
        var stopID = e.payload.KEY_GET_TIMES;
        RetrieveStopInfo(stopID);
        
      } else if (e.payload.KEY_GET_CONFIG) {
        SendStops();
        return;
      }
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
}

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
  
  var stopIDs = [GetConfig("stop1"), GetConfig("stop2"), GetConfig("stop3")];
  
  sendDictionary({
    "KEY_STOP_IDS": stopIDs.join(';')
  });
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
      console.log(xmlHTTP.responseText);
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
						routesArray[routeNumberStr] = [];
					}
          
					routesArray[routeNumberStr].push(parseInt(tramInfo.Arrival.replace("NOW", 0)));

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
			}
			var keys = routesArray.getKeys();
			pebbleResponse[1] = keys.join(';')  + ";";
			var timeString = "";
			console.log("Routes Array: " + routesArray.toString());
			for (var k=0; k< keys.length; k++) {
        var key = keys[k];
        routesArray[key].sort(sortNumber);
				timeString += routesArray[key].join(',') + ";";
			}
			pebbleResponse[2] = timeString;

			if (specialEvent) {
				//Pebble.showSimpleNotificationOnPebble("Special Event", specialEvent);
			}
      console.log("name:" + pebbleResponse[0] + " ids:" + pebbleResponse[1] + " times:" + pebbleResponse[2]);
      var dictionary = {
        "KEY_STOP_NAME": pebbleResponse[0],
        "KEY_ROUTE_IDS": pebbleResponse[1],
        "KEY_ROUTE_TIMES": pebbleResponse[2]
      };
      sendDictionary(dictionary);
		}
}

function sendDictionary (dictionary) {
  console.log(dictionary);
  Pebble.sendAppMessage(dictionary,
    function(e) {
      console.log("Event info sent to Pebble successfully!");
    },
    function(e) {
      console.log("Error sending event info to Pebble!");
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

var xhrRequest = function (url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.send();
};
