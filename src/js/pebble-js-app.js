
Pebble.addEventListener("ready",
  function(e) {
  	AddMessageListener();
	console.log("Yes, it's running!!!");
  }
);

function AddMessageListener () {
	Pebble.addEventListener("appmessage",
  		function(e) {
    		console.log("Received message: " + e.payload);
    		TestJson();
  		}
	);
};

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
			routeString = "";
			timeString = "";
			for (var i = 0; i < jsonObject.TramTrackerResponse.ArrivalsPages.length; i++) {
				var arrivalsPage = jsonObject.TramTrackerResponse.ArrivalsPages[i];
				for (var j = 0; j < arrivalsPage.length; j++) {
					var tramInfo = arrivalsPage[j];
					if (j == 0) {
						routeString += tramInfo.RouteNo + ";";
					}
					timeString += tramInfo.Arrival + ",";
					//pebbleResponse.push(tramInfo.RouteNo);
					//pebbleResponse.push(tramInfo.Destination);
					//pebbleResponse.push(tramInfo.HasDisruption);
					//pebbleResponse.push(tramInfo.IsLowFloorTram);
					//pebbleResponse.push(tramInfo.Arrival);

					if (tramInfo.HasSpecialEvent && tramInfo.SpecialEventMessage) {
						specialEvent = tramInfo.SpecialEventMessage;
					}
    			}
    			timeString += ";";
			}
			pebbleResponse[1] = routeString;
			pebbleResponse[2] = timeString;

			console.log(JSON.stringify(pebbleResponse));
			if (specialEvent) {
				//Pebble.showSimpleNotificationOnPebble("Special Event", specialEvent);
			}
    		console.log("done!");
			console.log("Size:" + roughSizeOfObject(pebbleResponse));
    		var transactionId = Pebble.sendAppMessage(
    			pebbleResponse,
  				function(e) {
    				console.log("Successfully delivered message with transactionId=" + e.data.transactionId);
    			},
  				function(e) {
    				console.log("Unable to deliver message with transactionId=" + e.data.transactionId + " Error is: " + e.message);
  				}
			);
		}
}

function TestJson () {
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.open("POST", "http://www.yarratrams.com.au/base/tramTrackerController/TramInfoAjaxRequest",true);
	xmlHTTP.setRequestHeader( "Content-Type","application/x-www-form-urlencoded");
	var params = "StopID=1923&Route=&LowFloorOnly=false";
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