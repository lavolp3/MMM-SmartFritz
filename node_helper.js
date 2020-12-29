/* Magic Mirror
 * Node Helper: {{MODULE_NAME}}
 *
 * By {{AUTHOR_NAME}}
 * {{LICENSE}} Licensed.
 */

var NodeHelper = require("node_helper");
var Fritz = require("fritzapi");
var csv = require("csv");


module.exports = NodeHelper.create({

  start: function() {
  },

  // Override socketNotificationReceived method
  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_FRITZ_DATA") {
      this.config = payload;
      this.log("Notification received: " + notification + " payload: " + payload);
      this.fritz = new Fritz.Fritz(this.config.loginID, this.config.password, this.config.address);
      //this.thermostats = this.getThermostats(fritz);
      /*fritz.getSwitchList().then(function(ains){
      console.log(fritz.getSID());
      console.log("Fritz AINs: "+ains);
      }, function(error) {
      console.log(error);
    });*/
      self = this;
      this.fritz.getOSVersion().then(function(version) {
        console.log("Fritz OS Version: "+version);
        //self.getPhoneList(self.fritz);
        //self.fritz.getLEDStatus().then (function(status) { console.log(status);});
        self.getThermostats(self.fritz);
        /*self.fritz.getTemplateList().then(function(list) {
          console.log("Template List: "+list);
          self.fritz.getDeviceList().then(function(list) {
            console.log("Devices List: "+JSON.stringify(list));
            self.fritz.getPresence().then(function(presence) {
              console.log("Presence: "+presence);
            });
          });
        });*/
      }, function(error) {
        console.log(error);
      });
    }
  },



  getPhoneList: function(fritz) {
    this.log("Getting phone list");
    self = this;
    fritz.getPhoneList().then( function (body) {

        // strip first line with delimiter
        csv.parse(body.split("\n").slice(1).join("\n"), {
            delimiter: ';'
        }, function(err, data) {
            if (err) {
              console.error("Error while converting csv for the phone list!");
            } else {
              var phoneList = JSON.stringify(data);
              console.log("Last calls: "+phoneList);
              self.sendSocketNotification("PHONELIST", phoneList);
            }
        });
    });
  },

  // utility function to sequentialize promises
  sequence: function(promises) {
    var result = Promise.resolve();
    promises.forEach(function(promise,i) {
      result = result.then(promise);
    });
    return result;
  },

  errorHandler: function (error) {
    if (error == "0000000000000000") {
      console.error("Did not get session id- invalid username or password?");
    } else {
      console.error(error);
    }
  },

  // display switch information
  switches: function () {
    self = this;
  	return fritz.getSwitchList().then(function(switches) {
    	console.log("Switches: " + switches + "\n");
      return self.sequence(switches.map(function(sw) {
        return function() {
          return self.sequence([
            function() {
              return fritz.getSwitchName(sw).then(function(name) {
                console.log("[" + sw + "] " + name);
              });
          	},
  					function() {
    					return fritz.getSwitchPresence(sw).then(function(presence) {
      					console.log("[" + sw + "] presence: " + presence);
    					});
  					},
  					function() {
    					return fritz.getSwitchState(sw).then(function(state) {
      					console.log("[" + sw + "] state: " + state);
        			});
            },
            function() {
              return fritz.getTemperature(sw).then(function(temp) {
                temp = isNaN(temp) ? '-' : temp + "°C";
                console.log("[" + sw + "] temp: " + temp + "\n");
              });
          	}
        	]);
        };
      }));
    });
  },

  getThermostats: function(fritz) {
    self = this;
    this.log("Getting Thermostat Data...");
    var thermostats = [];
    fritz.getThermostatList().then( function(thermos) {
      self.log("Thermostats: " + thermos);
      Promise.all(thermos.map( function(thermo, index) {
        //thermostats.push({ id: thermo });
        //return Promise.all([
          // there is no native getThermostatName function- use getDevice instead
          //function() {
            return fritz.getDevice(thermo).then(function(device) {
              //self.log(device);
              self.log("[" + thermo + "] " + device.name);
              thermostats[index] = device;
            });
          //},
          /*function() {
            return fritz.getTemperature(thermo).then(function(temp) {
              temp = isNaN(temp) ? '-' : temp + "°C";
              self.log("[" + thermo + "] temp " + temp);
              thermostats[index].temp = temp;
            });
          },
          function() {
            return fritz.getTempTarget(thermo).then(function(temp) {
              temp = isNaN(temp) ? '-' : temp + "°C";
              self.log("[" + thermo + "] target temp " + temp);
              thermostats[index].tempTarget = temp;
            });
          }*/
        //]);
      })).then( function() {
        self.log(thermostats);
        self.sendSocketNotification("THERMOSTATS", thermostats);
      });
    });
  },


  // display debug information
  debug: function() {
    return fritz.getDeviceList().then(function(devices) {
      console.log("Raw devices\n");
      console.log(devices);
    });
  },


  log: function (msg) {
    if (this.config && this.config.debug) {
      console.log(this.name + ":", JSON.stringify(msg));
    }
  },
});
