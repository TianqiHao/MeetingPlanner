// JavaScript Document

// The possible activity types
var ActivityType = ["Presentation","Discussion","Group Work","Break"];
var ColorType = ["#9bcdc5","#a0c25f","#e98665","#f6e66e"];
var Months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var Days = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","13th","14th","15th","16th","17th","18th","19th","20th","21st","22nd","23rd","24th","25th","26th","27th","28th","29th","30th","31st"];
var CurrentDate = 3;
var clientId = "173219749680-im8nddl4noslsqfnqsj6vf0gs4di64l9.apps.googleusercontent.com";
var scopes = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.profile.emails.read";
var logged = false;
var fireLogged = false;
var token;
var syncBlock = false;
var firebaseRef = new Firebase("https://scorching-heat-1940.firebaseio.com/");
var dayPath;
var parkPath;

// This is an activity constructor
// When you want to create a new activity you just call
// var act = new Activity("some activity",20,1,"Some description);

function checkAuth() {
    gapi.auth.authorize(
        {
            'client_id': clientId,
            'scope': scopes,
            'immediate': true
        },handleAuthResult);
}

function handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
        logged = true;
        token = gapi.auth.getToken().access_token;
        document.getElementById("login").style.display = 'none';
        document.getElementById("logout").style.display = '';
        firebaseRef.authWithOAuthToken("google", token, function(error, authData) {
        	if (error) {
        		fireLogged = false;
        	}
        	else {
        		fireLogged = true;
        		setPath(firebaseRef.getAuth().uid);
        	}
        });
    }
    else {
    	document.getElementById("logout").style.display = 'none';
    	document.getElementById("login").style.display = '';
        logged = false;
    }
}

function setPath (uid){
	console.log(uid);
	var dayPathString = "https://scorching-heat-1940.firebaseio.com/days/" + uid;
	var parkPathString = "https://scorching-heat-1940.firebaseio.com/park/" + uid;
	dayPath = new Firebase(dayPathString);
	parkPath = new Firebase(parkPathString);
}

function Activity(name,length,typeid,description){
	this._name = name;
	this._length = parseInt(length);
	this._typeid = typeid;
	this._description = description;
	
	// sets the name of the activity
	this.setName = function(name) {
		this._name = name;
	}

	// get the name of the activity
	this.getName = function(name) {
		return this._name;
	}
	
	// sets the length of the activity
	this.setLength = function(length) {
		this._length = parseInt(length);
	}

	// get the name of the activity
	this.getLength = function() {
		return this._length;
	}
	
	// sets the typeid of the activity
	this.setTypeId = function(typeid) {
		this._typeid = typeid;
	}

	// get the type id of the activity
	this.getTypeId = function() {
		return this._typeid;
	}
	
	// sets the description of the activity
	this.setDescription = function(description) {
		this._description = description;
	}

	// get the description of the activity
	this.getDescription = function() {
		return this._description;
	}
	
	// This method returns the string representation of the
	// activity type.
	this.getType = function () {
		return ActivityType[this._typeid];
	};

	//get the background color of the activity
	this.getColor = function (_typeid) {
		return ColorType[this._typeid];
	}
}

// This is a day consturctor. You can use it to create days, 
// but there is also a specific function in the Model that adds
// days to the model, so you don't need call this yourself.
function Day(startH,startM,YYYY,MM,DD) {
	this._start = startH * 60 + startM;
	this._activities = [];
	this._year = YYYY;
	this._month = MM;
	this._day = DD;
	this._monthDisplay = Months[MM];
	this._dayDisplaiy = Days[DD-1];
	this._fullDate = "" + YYYY + this._monthDisplay + this._dayDisplaiy;

	// sets the start time to new value
	this.setStart = function(startH,startM) {
		this._start = startH * 60 + startM;
	}

	// returns the total length of the acitivities in 
	// a day in minutes
	this.getTotalLength = function () {
		var totalLength = 0;
		$.each(this._activities,function(index,activity){
			totalLength += activity.getLength();
		});
		return totalLength;
	};
	
	// returns the string representation Hours:Minutes of 
	// the end time of the day
	this.getEnd = function() {
		var hours, minutes;
		var end = this._start + this.getTotalLength();
		hours = Math.floor(end/60);
		minutes = end % 60;
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
	};
	
	// returns the string representation Hours:Minutes of 
	// the start time of the day
	this.getStart = function() {
		var hours, minutes;
		hours = Math.floor(this._start/60);
		minutes = this._start % 60;
		if (hours < 10) {
			hours = "0" + hours;
		}
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		return hours + ":" + minutes;
	};

	// returns the length (in minutes) of activities of certain type
	this.getLengthByType = function (typeid) {
		var length = 0;
		$.each(this._activities,function(index,activity){
			if(activity.getTypeId() == typeid){
				length += activity.getLength();
			}
		});
		return length;
	};
	
	// adds an activity to specific position
	// if the position is not provided then it will add it to the 
	// end of the list
	this._addActivity = function(activity,position){
		if(position != null){
			this._activities.splice(position,0,activity);
		} else {
			this._activities.push(activity);
		}
	};
	
	// removes an activity from specific position
	// this method will be called when needed from the model
	// don't call it directly
	this._removeActivity = function(position) {
		return this._activities.splice(position,1)[0];
	};
	
	// moves activity inside one day
	// this method will be called when needed from the model
	// don't call it directly
	this._moveActivity = function(oldposition,newposition) {
		// In case new position is greater than the old position and we are not moving
		// to the last position of the array
		if(newposition > oldposition && newposition < this._activities.length - 1) {
			newposition--;
		}
		var activity = this._removeActivity(oldposition);
		this._addActivity(activity, newposition);
	};
}


// this is our main module that contians days and praked activites
meetingPlannerApp.factory('Meeting',function ($resource){

    this.newEvent = $resource('https://www.googleapis.com/calendar/v3/calendars/primary/events');

	this.days = [];
	this.parkedActivities = [];
	// adds a new day. if startH and startM (start hours and minutes)
	// are not provided it will set the default start of the day to 08:00
	this.addDay = function (YYYY,MM,DD,startH,startM) {
		var day;
		if(startH){
			day = new Day(startH,startM,YYYY,MM,DD);
		} else {
			day = new Day(8,0,YYYY,MM,DD);
		}
		this.days.push(day);
		return day;
	};
	
	// add an activity to model
	this.addActivity = function (activity,day,position) {
		if(day != null) {
			this.days[day]._addActivity(activity,position);
		} else {
			if (position != null) {
				this.parkedActivities.splice(position,0,activity);
			}
			else this.parkedActivities.push(activity);
		}
	}
	
	// add an activity to parked activities
	this.addParkedActivity = function(activity,position){
		this.addActivity(activity,null,position);
	};
	
	// remove an activity on provided position from parked activites 
	this.removeParkedActivity = function(position) {
		act = this.parkedActivities.splice(position,1)[0];
		return act;
	};
	
	// moves activity between the days, or day and parked activities.
	// to park activity you need to set the new day to null
	// to move a parked activity to let's say day 0 you set oldday to null
	// and new day to 0
	this.moveActivity = function(oldday, oldposition, newday, newposition) {
		if(oldday !== null && oldday == newday) {
			this.days[oldday]._moveActivity(oldposition,newposition);
		}else if(oldday == null && newday == null) {
			var activity = this.removeParkedActivity(oldposition);
			this.addParkedActivity(activity,newposition);
		}else if(oldday == null) {
			var activity = this.removeParkedActivity(oldposition);
			this.days[newday]._addActivity(activity,newposition);
		}else if(newday == null) {
			var activity = this.days[oldday]._removeActivity(oldposition);
			this.addParkedActivity(activity,newposition);
		} else {
			var activity = this.days[oldday]._removeActivity(oldposition);
			this.days[newday]._addActivity(activity,newposition);
		}
	};
	
	return this;
});