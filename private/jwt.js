var jwt = require('jsonwebtoken');
var request = require('request');
var jsforce = require('jsforce');

// JWT setup
var TOKEN_ENDPOINT_URL = process.env.TOKEN_ENDPOINT_URL;
var ISSUER = process.env.ISSUER;
var AUDIENCE = 'https://login.salesforce.com'; // 固定

var cert = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

var access_token;
var instance_url;

// JWTに記載されるメッセージの内容
var claim = {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: process.env.SALESFORCE_USER, // 接続するSalesforceのユーザアカウント名
    exp: Math.floor(Date.now() / 1000) + 3 * 60 //現在時刻から3分間のみ有効
};

// JWTの生成と署名
var token = jwt.sign(claim, cert, { algorithm: 'RS256' });

exports.authenticate = function (callback) {
    request({
        method: 'POST',
        url: TOKEN_ENDPOINT_URL,
        form: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: token
        }
    }, function (err, response, body) {
        if (err) {
            return console.error("request エラー" + err);
        }
        var ret = JSON.parse(body);
        var url = ret.instance_url.replace("my.salesforce", "lightning.force");
        callback(ret.access_token, url);

        var conn = new jsforce.Connection({
            accessToken: ret.access_token,
            instanceUrl: ret.instance_url
        });
    });

}
