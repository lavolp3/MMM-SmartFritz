/* Magic Mirror
 * Module: MMM-FritzAPI
 * Author: Dirk Kovert (lavolp3)
 */

/* jshint esversion: 6 */


Module.register("MMM-SmartFritz", {

  defaults: {
    updateInterval: 10 * 60 * 1000,     //10 minutes
    address: "http://192.168.1.1",
    loginID: "admin",
    password: "kamp3babsi",
    showOSVersion: true,
    showLEDSwitch: false,
    showThermostats: true,
    showPhoneList: true,
    touchMode: true,
    debug: true,
    roomFilter: null,
	onlineOnly: true,
	size: 'large'
  },

  ledMode: ["man", "on"],
  loaded: false,
  error: null,
  thermostats: [],

  getStyles: function () {
    return [this.file("smartfritz.css")];
  },

  getScripts: function () {
    return [this.file("thermostats.js")];
},

  /*getTemplate: function () {
    return "templates\\mmm-smartfritz.njk";
},*/

  start: function() {
    console.log("Initializing module: " + this.name);
    //this.addFilters();
    console.log("Sending Socket Notification");
    this.sendSocketNotification("GET_FRITZ_DATA", this.config);
  },

  /*getTemplateData: function() {
    return {
      loading: !this.loaded,
      config: this.config,
      thermostats: this.thermostats,
      //switches: this.switches,
      ledMode: this.ledMode,
    };
  },

  addFilters: function() {
      var env = this.nunjucksEnvironment();
      env.addFilter("setThermostat", this.setThermostat.bind(this));
  },*/

  socketNotificationReceived: function(noti, payload) {
    this.log("Socket Notification Received: " + noti);
    if (noti == "THERMOSTATS") {
      this.thermostats = [];
      for (var i = 0; i < payload.length; i++) {
        this.thermostats.push({
          name: payload[i].name,
          isTemp: (this.api2temp(payload[i].hkr.tist).toFixed(1) || 0.0),
          setTemp: (this.api2temp(payload[i].hkr.tsoll).toFixed(1) || 0.0),
          comfTemp: (this.api2temp(payload[i].hkr.komfort).toFixed(1) || 0),
          saveTemp: (this.api2temp(payload[i].hkr.absenk).toFixed(1) || 0),
          offset: (Math.floor(payload[i].temperature.offset/10).toFixed(1) || 0),
          nextChange: moment(payload[i].hkr.nextchange.endperiod, "X").format("LT"),
          nextSet: (this.api2temp(payload[i].hkr.tsoll) || 0).toFixed(1),
        });
      }
      this.loaded = true;
      this.updateDom();
    }
  },


  getDom: function() {
      var self = this;
      var wrapper = document.createElement('div');

      if (this.error) {
          wrapper.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg viewBox="0 0 19.5 18.2" width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path transform="translate(-6.2 -6.7)" d="M18.1,24.9H13.8V19.4a2.1,2.1,0,0,1,4.2,0v5.5Zm6-8.1-1.8-1.5v9.5H19.9V19.3a3.9,3.9,0,1,0-7.8,0v5.5H9.6V15.3L7.8,16.8l-1.6-2L16,6.7l4.3,3.6V9.1h2V12l3.4,2.8Z" fill="#666666"/></svg><br />' + this.error;
          wrapper.className = 'dimmed light small';
          return wrapper;
      }

      if (!this.loaded) {
          wrapper.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg viewBox="0 0 19.5 18.2" width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path transform="translate(-6.2 -6.7)" d="M18.1,24.9H13.8V19.4a2.1,2.1,0,0,1,4.2,0v5.5Zm6-8.1-1.8-1.5v9.5H19.9V19.3a3.9,3.9,0,1,0-7.8,0v5.5H9.6V15.3L7.8,16.8l-1.6-2L16,6.7l4.3,3.6V9.1h2V12l3.4,2.8Z" fill="#666666"/></svg><br />...';
          wrapper.className = 'dimmed light small';
          return wrapper;
      }

      for (var i = 0; i < this.thermostats.length; i++) {

          var dial = document.createElement('div');
          dial.className = 'thermostat thermostat__' + this.config.size;

          var thermostat = new thermostatDial(dial, {
              size: self.config.size,
              temperature_scale: this.thermostats[i].temperature_scale
          });

          thermostat.where_name = this.thermostats[i].where_name;
          thermostat.has_leaf = this.thermostats[i].has_leaf;
          thermostat.hvac_state = this.thermostats[i].hvac_state;
          thermostat.target_temperature = this.thermostats[i].target_temperature;
          thermostat.ambient_temperature = this.thermostats[i].ambient_temperature;

          wrapper.appendChild(dial);
      }

      return wrapper;
  },

  scheduleUpdate: function() {
      var self = this;
      var delay = (!this.loaded) ? 0 : this.config.updateInterval;

      setTimeout(function() {
          self.updateTemps();
      }, delay);
  },


  setThermostat: function(value, t) {
    var oldValue = this.thermostats[t].setTemp;
    var newValue = oldValue + value;
    this.log("Set Temperature for Thermostat" + (t) + "to " + newValue + "°C");

  },

  temp2api: function(temp) {
    var res;
    if (temp == 'on' || temp === true)
      res = 254;
    else if (temp == 'off' || temp === false)
      res = 253;
    else {
      // 0.5C accuracy
      res = Math.round((Math.min(Math.max(temp, 8), 28) - 8) * 2) + 16;
    }
    return res;
  },

  api2temp: function(temp) {
    if (temp == 254)
      return 'on';
    else if (temp == 253)
      return 'off';
    else {
      // 0.5C accuracy
      return (parseFloat(temp) - 16) / 2 + 8;
    }
  },

  log: function(msg) {
      if (this.config && this.config.debug) {
          Log.info(`${this.name}: ` + JSON.stringify(msg));
      }
  }

});
