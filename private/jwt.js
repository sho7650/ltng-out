'use strict'

const jwt = require('jsonwebtoken');
const request = require('request');
const jsforce = require('jsforce');

// JWT setup
const TOKEN_ENDPOINT_URL = process.env.TOKEN_ENDPOINT_URL;
const ISSUER = process.env.ISSUER;
const AUDIENCE = 'https://login.salesforce.com'; // 固定

const cert = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

// JWTに記載されるメッセージの内容
const claim = {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: process.env.SALESFORCE_USER, // 接続するSalesforceのユーザアカウント名
    exp: Math.floor(Date.now() / 1000) + 3 * 60 //現在時刻から3分間のみ有効
};

// JWTの生成と署名
const token = jwt.sign(claim, cert, { algorithm: 'RS256' });

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
        const ret = JSON.parse(body);
        const url = ret.instance_url.replace("my.salesforce", "lightning.force");
        callback(ret.access_token, url);

        const conn = new jsforce.Connection({
            accessToken: ret.access_token,
            instanceUrl: ret.instance_url
        });
    });

}
