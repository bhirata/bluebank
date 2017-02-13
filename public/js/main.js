var app = angular.module('bluebank', []);
app.controller('formTransf', function($scope) {
    $scope.transferencia = {
        remetente : {
            agencia: "1000",
            conta: "2"
        },
        destinatario : {
            agencia: "1000",
            conta: "1"
        },
        valor: "5"
    };

    $scope.enviar = function (transferencia) {
        console.log(transferencia);
        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "/transfere",
            "data": $scope.transferencia,
            "method": "POST",
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "cache-control": "no-cache",
                "postman-token": "5a0f8593-06f2-8f6e-e0f6-fbcb09ed9529"
            }
        };
        $.ajax(settings).done(function (response) {
            console.log(response);
            alert(response);
        }).fail(function (err) {
            console.log(err.responseJSON);
            alert(err.responseJSON.error);
        });
    };

    $scope.reset = function () {
        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "/reset",
            "method": "POST",
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "cache-control": "no-cache",
                "postman-token": "5a0f8593-06f2-8f6e-e0f6-fbcb09ed9529"
            }
        };
        $.ajax(settings).done(function (response) {
            console.log(response);
        });
    };

    $scope.select = function () {
        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "/select",
            "method": "POST",
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "cache-control": "no-cache",
                "postman-token": "5a0f8593-06f2-8f6e-e0f6-fbcb09ed9529"
            }
        };
        $.ajax(settings).done(function (response) {
            console.log(response);
        });
    }
});