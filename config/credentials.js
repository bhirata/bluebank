(function () {

    "use strict"

    var vcapServices = require( 'vcap_services' );
    var localEnv = {};
    var dashCredentials = {};

    dashCredentials = require('node-env-file')(__dirname + '/.env', {raise: false});

    localEnv.dbUsername = dashCredentials.dbUsername;
    localEnv.dbPwd = dashCredentials.dbPwd;
    localEnv.dbHostname = dashCredentials.dbHostname;
    localEnv.dbPort = dashCredentials.dbPort;
    localEnv.db = dashCredentials.db;


    module.exports = {
        dashDB : {
            username : localEnv.dbUsername,
            password : localEnv.dbPwd,
            hostname : localEnv.dbHostname,
            port : localEnv.dbPort,
            db : localEnv.db,
            connectionString : "DRIVER={DB2};DATABASE="+localEnv.db+";UID="+localEnv.dbUsername+";PWD="+localEnv.dbPwd+";HOSTNAME="+localEnv.dbHostname+";port="+localEnv.dbPort
        },
        getCredentials : function (service_name) {
            return this[service_name];
        }
    }

}());