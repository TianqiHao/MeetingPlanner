meetingPlannerApp.controller('homeCtrl', function ($scope, Meeting) {
     $scope.addActi = false;
     $scope.modeTitle = "+ Add activity";
     $scope.name = "";
     $scope.duration = undefined;
     $scope.type = "Type: Presentation";
     $scope.description = "";
     $scope.parkedActivities = Meeting.parkedActivities;
     $scope.notification = "Welcome to use Meeting planner.";
     $scope.login = function() {
          gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false},handleAuthResult);
     }
     $scope.loadIt = function() {
          if (!logged) {
               $scope.notification = "Please login to use this function.";
               return;
          }
          if (!fireLogged && logged) {
               $scope.notification = "You are logged in but failed connecting to the cloud database";
               return;
          }
          if (syncBlock) {
               $scope.notification = "Some other network access is processing, please wait a while.";
               return;
          }
          $scope.notification = "Loading saved meeting schedule from cloud database...";
          syncBlock = true;
          var jsonToDay, jsonToPark;
          dayPath.once("value",
               function(jsonDay) {
                    parkPath.once("value",
                         function(jsonPark){
                              var oldLength;
                              jsonToDay = JSON.parse(jsonDay.val());
                              jsonToPark = JSON.parse(jsonPark.val());
                              if (jsonToPark==null) {
                                   $scope.notification = "You have not saved any data on the cloud database.";
                                   $scope.$apply();
                                   syncBlock = false;
                                   return;
                              }
                              for (var i=0; i<7; i++) {
                                   for (var j=0; j<=7; j++) {
                                        if (Meeting.days[i]._fullDate == jsonToDay[j]._fullDate) {
                                             Meeting.days[i]._start = jsonToDay[j]._start;
                                             oldLength = Meeting.days[i]._activities.length;
                                             for (var k=0; k<oldLength; k++) {
                                                  Meeting.days[i]._removeActivity(0);
                                             }
                                             for (var k=0; k<jsonToDay[j]._activities.length; k++) {
                                                  Meeting.addActivity(
                                                       new Activity(
                                                            jsonToDay[j]._activities[k]._name,
                                                            jsonToDay[j]._activities[k]._length,
                                                            jsonToDay[j]._activities[k]._typeid,
                                                            jsonToDay[j]._activities[k]._description
                                                       ),i,k
                                                  );
                                             }
                                             break;
                                        }
                                   }
                              }
                              oldLength = Meeting.parkedActivities.length;
                              for (var i=0; i<oldLength; i++) {
                                   Meeting.removeParkedActivity(0);
                              }
                              for (var i=0; i<jsonToPark.length; i++) {
                                   Meeting.addParkedActivity(
                                        new Activity(
                                             jsonToPark[i]._name,
                                             jsonToPark[i]._length,
                                             jsonToPark[i]._typeid,
                                             jsonToPark[i]._description
                                        ),i
                                   );
                              }
                              $scope.notification = "The meeting schedule has been loaded to client successfully.";
                              $scope.startTime = Meeting.days[CurrentDate].getStart();
                              $scope.activities = Meeting.days[CurrentDate]._activities;
                              drawCanvas();
                              $scope.$apply();
                              syncBlock = false;
                         },
                         function(error){
                              $scope.notification = "Loading failed: " + error;
                              $scope.$apply();
                              syncBlock = false;
                         }
                    );
               },
               function(error) {
                    $scope.notification = "Loading failed: " + error;
                    $scope.$apply();
                    syncBlock = false;
                    return;
               }
          );
     }
     $scope.saveIt = function() {
          if (!logged) {
               $scope.notification = "Please login to use this function.";
               return;
          }
          if (!fireLogged && logged) {
               $scope.notification = "You are logged in but failed connecting to the cloud database";
               return;
          }
          if (syncBlock) {
               $scope.notification = "Some other network access is processing, please wait a while.";
               return;
          }
          $scope.notification = "Saving meeting schedule to cloud database...";
          syncBlock = true;
          var dayToJson = JSON.stringify(Meeting.days);
          var parkToJson = JSON.stringify(Meeting.parkedActivities);
          dayPath.set(dayToJson,function(error){
               if (error) {
                    $scope.notification = "Saving failed: " + error;
                    $scope.$apply();
                    syncBlock = false;
                    return;
               }
               else {
                    parkPath.set(parkToJson, function(){
                         if (error) {
                              $scope.notification = "Saving failed: " + error;
                              $scope.$apply();
                         }
                         else {
                              $scope.notification = "The meeting schedule has been saved to cloud database successfully.";
                              $scope.$apply();
                         }
                         syncBlock = false;
                    });
               }
          });
     }
     $scope.pushToCal = function() {
          if (!logged) {
               $scope.notification = "Please login to use this function.";
               return;
          }
          if (syncBlock) {
               $scope.notification = "Some other network access is pricessing, please wait a while.";
               return;
          }
          var thisDay = Meeting.days[CurrentDate];
          var dayIndex = CurrentDate;
          var success = 0;
          var failure = 0;
          if (thisDay._activities.length == 0) {
               $scope.notification = "There are no scheduled activities on this date.";
               return;
          }
          syncBlock = true;
          $scope.notification = "The schedule is being pushed to Google Calendar, please wait a while.";
          for (var i=0; i<thisDay._activities.length; i++) {
               var thisEvent = thisDay._activities[i];
               var thisDate = thisDay._year + "-" + (thisDay._month + 1) + "-" + thisDay._day;
               var thisStart, thisEnd;
               thisStart = "T" + $scope.getActivityTime(i,dayIndex) + ":00+02:00";
               if (i==thisDay._activities.length-1) {
                    thisEnd = "T" + thisDay.getEnd() + ":00+02:00";
               }
               else {
                    thisEnd = "T" + $scope.getActivityTime(i+1,dayIndex) + ":00+02:00";
               }
               Meeting.newEvent.save({access_token:token},{"summary":thisEvent.getType() + ": " + thisEvent.getName(),"description":thisEvent.getDescription(),
                    "start":{"dateTime":thisDate+thisStart},"end":{"dateTime":thisDate+thisEnd}},
                    function(){
                         success++;
                         if (success+failure == thisDay._activities.length) {
                              syncBlock = false;
                              if (failure == 0) {
                                   $scope.notification = "The meeting schedule of your chosen date has been pushed to Google Calendar successfully.";
                              }
                         }
                    },
                    function(){
                         $scope.notification = "Some activities failed to be pushed to Google Calendar.";
                         failure++;
                         if (success+failure == thisDay._activities.length) {
                              syncBlock = false;
                         }                         
                    }
               );
          }
     }
     var chosenPosition;
     var editMode = 0;
     var drawCanvas = function() {
          var height = new Array(4);
          var canvasHeight = 80;
          var canvasWidth = 60;
          var getCanvas = document.getElementById("myCanvas");
          var myCanvas = getCanvas.getContext("2d");
          var currentY=0;
          if (Meeting.days[CurrentDate].getTotalLength()) {
               for (var i=0; i<4; i++) {
                    if (Meeting.days[CurrentDate].getLengthByType(i)) {
                         height[i] = canvasHeight * Meeting.days[CurrentDate].getLengthByType(i) / Meeting.days[CurrentDate].getTotalLength();
                    }
                    else {
                         height[i] = 0;
                    }
               }
          }
          else {
               myCanvas.clearRect(0,0,canvasWidth+20,canvasHeight);
               myCanvas.fillStyle = "#000000";
               myCanvas.fillRect(10,0,canvasWidth,canvasHeight);
               return;
          }
          for (var i=0; i<4; i++) {
               myCanvas.clearRect(10,currentY,canvasWidth,height[i]);
               myCanvas.fillStyle=ColorType[i];
               myCanvas.fillRect(10,currentY,canvasWidth,height[i]);
               currentY += height[i];
          }
          currentY = canvasHeight * 0.7;
          myCanvas.strokeStyle = "red";
          myCanvas.moveTo(0,currentY);
          myCanvas.lineTo(canvasWidth+20,currentY);
          myCanvas.stroke();
     }

     var today = new Date();
     if (Meeting.days.length==0) {
     	for (var i=-3; i<=3; i++) {
     		var tmpDate = new Date((today/1000+i*86400)*1000);
     		Meeting.addDay(tmpDate.getFullYear(),tmpDate.getMonth(),tmpDate.getDate());
     	}
          drawCanvas();
     }
     $scope.activities = Meeting.days[CurrentDate]._activities;
     $scope.startTime = Meeting.days[CurrentDate].getStart();
     $scope.dateDisplay = function () {
          if (CurrentDate == 3) {
               return Meeting.days[CurrentDate]._monthDisplay + " " + Meeting.days[CurrentDate]._dayDisplaiy + " (Today)";
          }
          else if (CurrentDate == 0) {
               return Meeting.days[CurrentDate]._monthDisplay + " " + Meeting.days[CurrentDate]._dayDisplaiy + " (Min)";
          }
          else if (CurrentDate == 6) {
               return Meeting.days[CurrentDate]._monthDisplay + " " + Meeting.days[CurrentDate]._dayDisplaiy + " (Max)";
          }
          else {
               return Meeting.days[CurrentDate]._monthDisplay + " " + Meeting.days[CurrentDate]._dayDisplaiy;
          }
     }

     $scope.totalLength = function() {
     	return Meeting.days[CurrentDate].getTotalLength();
     }
     $scope.endTime = function() {
     	return Meeting.days[CurrentDate].getEnd();
     }
     $scope.changeDate = function (x) {
     	if (x==0 && CurrentDate>0) {
     		CurrentDate--;
     		$scope.activities = Meeting.days[CurrentDate]._activities;
     		$scope.startTime = Meeting.days[CurrentDate].getStart();
               drawCanvas();
     	}
     	if (x==1 && CurrentDate<6) {
     		CurrentDate++;
     		$scope.activities = Meeting.days[CurrentDate]._activities;
     		$scope.startTime = Meeting.days[CurrentDate].getStart();
               drawCanvas();
     	}
     }
     $scope.getActivityTime = function(position, daynum) {
          if (daynum==null) {
               daynum = CurrentDate;
          }
     	var activityTime = Meeting.days[daynum]._start;
     	var hours, minutes;
     	for (var i=0; i<position; i++) {
     		activityTime += $scope.activities[i].getLength();
     	}
     	hours = Math.floor(activityTime/60);
     	minutes = activityTime % 60;
		if (hours>23) {
			hours = 23;
			minutes = 59;
		}
		if (hours < 10) {
			hours = "0" + hours;
		}
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
     	return hours + ":" + minutes;
     }
     $scope.removeActivity = function(position) {
     	Meeting.days[CurrentDate]._removeActivity(position);
     	if (position == chosenPosition) {
     		$scope.name = "";
     		$scope.duration = undefined;
     		$scope.type = "Type: Presentation";
     		$scope.description = "";
     		$scope.addActi = false;
     		$scope.modeTitle = "+ Add activity";
     		editMode=0;
     	}
          drawCanvas();
     }
     $scope.removeParkedActivity = function(position) {
     	Meeting.removeParkedActivity(position);
     }
     $scope.setType = function(btnType) {
     	$scope.type = btnType;
     }
     $scope.editActivity = function(position, mode) {
     	editMode = mode;
     	chosenPosition = position;
     	$scope.addActi = true;
     	$scope.modeTitle = "Edit activity";
     	if (mode == 1) {
     		$scope.name = $scope.activities[position].getName();
     		$scope.duration = $scope.activities[position].getLength();
     		$scope.type = "Type: " + $scope.activities[position].getType();
     		$scope.description = $scope.activities[position].getDescription();
     	}
     	if (mode == 2) {
     		$scope.name = Meeting.parkedActivities[position].getName();
     		$scope.duration = Meeting.parkedActivities[position].getLength();
     		$scope.type = "Type: " + Meeting.parkedActivities[position].getType();
     		$scope.description = Meeting.parkedActivities[position].getDescription(); 
     	}
     }
     $scope.btnSave = function(position) {
     	if ($scope.name == "") {
     		document.getElementById("nameInput").focus();
     		return;
     	}
     	if (isNaN($scope.duration) || $scope.duration=='') {
     		document.getElementById("lengthInput").focus();
     		return;
     	}
     	var typeID;
     	if ($scope.type == "Type: Presentation") {
     		typeID = 0;
     	}
     	else if ($scope.type == "Type: Discussion") {
     		typeID = 1;
     	}
     	else if ($scope.type == "Type: Group Work") {
     		typeID = 2;
     	}
     	else {
     		typeID = 3;
     	}
     	if (editMode ==1) {
     		Meeting.days[CurrentDate]._activities[chosenPosition].setName($scope.name);
     		Meeting.days[CurrentDate]._activities[chosenPosition].setLength($scope.duration);
     		Meeting.days[CurrentDate]._activities[chosenPosition].setTypeId(typeID);
     		Meeting.days[CurrentDate]._activities[chosenPosition].setDescription($scope.description);
               drawCanvas();
     	}
     	else if (editMode ==2) {
     		Meeting.parkedActivities[chosenPosition].setName($scope.name);
     		Meeting.parkedActivities[chosenPosition].setLength($scope.duration);
     		Meeting.parkedActivities[chosenPosition].setTypeId(typeID);
     		Meeting.parkedActivities[chosenPosition].setDescription($scope.description);
     	}
     	else {
     		Meeting.addParkedActivity(new Activity($scope.name,$scope.duration,typeID,$scope.description));
     	}
     	$scope.name = "";
     	$scope.duration = undefined;
     	$scope.type = "Type: Presentation";
     	$scope.description = "";
     	$scope.addActi = false;
     	$scope.modeTitle = "+ Add activity";
     	editMode=0;
     }
     $scope.btnCancel = function() {
     	$scope.name = "";
     	$scope.duration = undefined;
     	$scope.type = "Type: Presentation";
     	$scope.description = "";
     	$scope.addActi = false;
     	$scope.modeTitle = "+ Add activity";
     	editMode=0;
     }
     $scope.setStart = function() {
          var flag = 0;
          var hour, min;
          for (var i=0; i<$scope.startTime.length; i++) {
               if ($scope.startTime[i]==":") {
                    flag = i;
                    break;
               }
          }
          if (flag==0 || flag>2) {
               $scope.startTime = Meeting.days[CurrentDate].getStart();
               return;
          }
          if (flag==1) {
               if (isNaN($scope.startTime[0]) || isNaN($scope.startTime[2]) || $scope.startTime.length>4) {
                    $scope.startTime = Meeting.days[CurrentDate].getStart();
                    return;
               }
               if ($scope.startTime.length==4) {
                    if (isNaN($scope.startTime[3])) {
                         $scope.startTime = Meeting.days[CurrentDate].getStart();
                         return;
                    }
                    min = parseInt($scope.startTime[2] + "" + $scope.startTime[3]);
               }
               else {
                    min = parseInt($scope.startTime[2]);
               }
               hour = $scope.startTime[0];
          }
          if (flag==2) {
               if (isNaN($scope.startTime[0]) || isNaN($scope.startTime[1]) || isNaN($scope.startTime[3])) {
                    $scope.startTime = Meeting.days[CurrentDate].getStart();
                    return;
               }
               if ($scope.startTime.length==5) {
                    if (isNaN($scope.startTime[4])) {
                         $scope.startTime = Meeting.days[CurrentDate].getStart();
                         return;
                    }
                    min = parseInt($scope.startTime[3] + "" + $scope.startTime[4]);
               }
               else {
                    min = parseInt($scope.startTime[3]);
               }
               hour = parseInt($scope.startTime[0] + "" + $scope.startTime[1]);
          }
          if (hour>23 || min>59) {
               $scope.startTime = Meeting.days[CurrentDate].getStart();
               return;
          }
          Meeting.days[CurrentDate].setStart(hour,min);
          $scope.startTime = Meeting.days[CurrentDate].getStart();
     }
     $scope.onDrop = function(index, type, data){
          var newPosition = index;
          var newType = type;
          var oldType = data[0];
          var oldPosition = data[1];
          if (newPosition==-1) {
               if (type=="P") {
                    newPosition = Meeting.parkedActivities.length;
               }
               else {
                    newPosition = $scope.activities.length;
               }
          }
          for (var i=2; i<data.length; i++) {
               oldPosition += data[i];
          }
          if (oldType =="P" && newType=="P") {
               Meeting.moveActivity(null,oldPosition,null,newPosition);
          }
          else if (oldType=="P" && newType=="D") {
               Meeting.moveActivity(null,oldPosition,CurrentDate,newPosition);
               drawCanvas();
          }
          else if (oldType=="D" && newType=="D") {
               Meeting.moveActivity(CurrentDate,oldPosition,CurrentDate,newPosition);
          }
          else {
               Meeting.moveActivity(CurrentDate,oldPosition,null,newPosition);
               drawCanvas();
          }
     }
});
