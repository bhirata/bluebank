/*eslint-env node*/

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

var http = require('http');
var Promise = require('promise');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//nome da tabela
var tableName = "bluebank";

// Credenciais são lidas do .env
var credentials = function () {
    var localEnv = {};
    var dashCredentials;

    dashCredentials = require('node-env-file')(__dirname + '/.env', {raise: false});

    localEnv.dbUsername = dashCredentials.dbUsername;
    localEnv.dbPwd = dashCredentials.dbPwd;
    localEnv.dbHostname = dashCredentials.dbHostname;
    localEnv.dbPort = dashCredentials.dbPort;
    localEnv.db = dashCredentials.db;

    var dashDB = {};
    dashDB.username = localEnv.dbUsername;
    dashDB.password = localEnv.dbPwd;
    dashDB.hostname = localEnv.dbHostname;
    dashDB.port = localEnv.dbPort;
    dashDB.db = localEnv.db;
    dashDB.connectionString = "DRIVER={DB2};DATABASE="+localEnv.db+";UID="+localEnv.dbUsername+";PWD="+localEnv.dbPwd+";HOSTNAME="+localEnv.dbHostname+";port="+localEnv.dbPort;

    return dashDB;
};

var ibmdb = require('ibm_db');

// getAccount recebe como parametro o nome da tabela onde irá executar o sql, a agencia e a conta informadas pelo usuario
// Caso encontre a conta do usuario, retornará a agencia, conta e saldo
// Caso contrário, resultará em erro de Conta inexistente
var getAccount = function (db, agencia, conta) {
    return new Promise(function (resolve, reject) {
        ibmdb.open(credentials().connectionString, function (err, conn) {
            if(err){
                console.log(err);
                reject();
            }
            else {
                var query = "select * from " + db + " where agencia="+ agencia + " and conta=" + conta;
                conn.query(
                    query, function (err, rows) {
                        if (!err){
                            if (rows.length != 0){
                                console.log("Get Account: " + JSON.stringify(rows[0]));
                                resolve(rows[0]);
                            }
                            else {
                                reject();
                            }
                        }
                        else {
                            console.log({message: err.message});
                            reject();
                        }
                        conn.close(function () {
                            console.log("Connection Closed");
                        })
                    }
                );
            }
        });
    });
};


//calcSaldo recebe como parametro um objeto com contas de origem e destino e o valor a ser transferido
// Realiza a verificacao da viabilidade da transação. Caso o valor a ser transferdo seja maior do que o saldo, então não permitirá a transação
// e resultara erro de Saldo insuficiente
// Caso tenha saldo suficiente para a transação, então será calculado o novo saldo para ambas as partes e em seguida atualizado no objeto contas.
var calcSaldo = function (contas, montante) {
    return new Promise (function (resolve, reject) {
        var novoSaldo = 0;
        if (parseInt(contas.remetente.SALDO) == 0){
            reject();
            throw new Error("Saldo insuficiente para realizar a transacao");
            return;
        }
        if (parseInt(contas.remetente.SALDO) < parseInt(montante)){
            reject();
            throw new Error("Saldo insuficiente para realizar a transacao");
            return;
        }
        else if (parseInt(contas.remetente.SALDO) >= parseInt(montante)){
            novoSaldo = parseInt(contas.remetente.SALDO) - parseInt(montante);
            contas.remetente.SALDO = novoSaldo;
        }
        novoSaldo = parseInt(contas.destinatario.SALDO) + parseInt(montante);
        contas.destinatario.SALDO = novoSaldo;
        resolve(contas);
    });
};


// set Saldo recebe como parametro o nome da tabela que irá atualizar o saldo além de receber um objeto com as contas de origem e destino contendo os saldos atualizados
var setSaldo = function (db, contas) {
    return new Promise(function (resolve, reject) {
        ibmdb.open(credentials().connectionString, function (err, conn) {
            if(err){
                reject();
            }
            else {
                for (var conta in contas) {
                    var query = "update " + db + " set saldo = " + contas[conta].SALDO + " where agencia="+ contas[conta].AGENCIA + " and conta=" + contas[conta].CONTA;
                    conn.query(
                        query, function (err, rows) {
                            if (!err){
                                resolve(rows);
                            }
                            else {
                                console.log({message: err.message});
                                reject();
                            }
                            conn.close(function () {
                                console.log("Saldo Atualizado");
                            })
                        }
                    );
                }
            }
        });
    });
};

//Function to test if credentials are correctly loaded from .env
app.get('/credentials', function (req, res) {
    console.log(credentials().connectionString);
    res.send(credentials());
});

//Function to test if it is been retriven data from dashDB
app.post('/select', function (req, res) {
    console.log("select");
    ibmdb.open(credentials().connectionString, function (err, conn) {
        if(err){
            res.status(400).json({message: err.message});
        }
        else {
            var query = "select * from "+ tableName;
            console.log(query);
            conn.query(
                query, function (err, rows) {
                    if (!err){
                        res.json(rows);
                    }
                    else {
                        res.status(400).json({message: err.message});
                    }
                    conn.close(function () {
                        console.log("Connection Closed");
                    })
                }
            );
        }
    });
});


//Função utilizada para resetar as contas para o saldo 10
app.post('/reset', function (req, res) {
    var obj = { remetente: { ID: 1, CPF: '20000000000', AGENCIA: 1000, CONTA: 2, SALDO: 10 },
        destinatario: { ID: 2, CPF: '10000000000', AGENCIA: 1000, CONTA: 1, SALDO: 10 } };

    setSaldo(tableName, obj).then(
        res.send("Reset")
    );
});

//Recebe como parametro um objeto contendo as contas de origem e destino e o valor a ser transferido
//Atribui o valor a ser transferido a variavel montante
//Depois busca no banco de dados as contas informadas. Tendo algum erro, retorna erro de Conta inexistente
//Caso as contas informadas existam, então é calculado o novo saldo e, em seguida, atualizado o saldo de ambas as contas
//assim efetivando a transação.
app.post('/transfere', function (req, res) {
    var contas = {};
    var montante = 0;

    console.log(req.body);
    montante = req.body.valor;

    getAccount(tableName, req.body.remetente.agencia, req.body.remetente.conta)
        .then(function (account) {
                contas.remetente = account;
                return getAccount(tableName, req.body.destinatario.agencia, req.body.destinatario.conta);
            }, function () {
                console.log("Conta Origem Inexistente");
                res.status(400).json({error: "Conta Origem Inexistente"});
            }
        ).then(function (account) {
        contas.destinatario = account;
        return calcSaldo(contas, montante);
    }, function () {
        res.status(400).json({error: "Conta Destino Inexistente"});
        console.log("Conta Destino Inexistente");
    }).then(function (contas) {
        return setSaldo(tableName, contas);
    }, function () {
        res.status(400).json({error: "Saldo insuficiente para realizar a transacao"});
        console.log("Saldo insuficiente para realizar a transacao");
    }).then(function(){
        console.log("Foi");
        res.status(200).send("Transferência Realizada com sucesso");
    });
});


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});
