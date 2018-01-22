# Testing Lightning Out of Spring '18

Lightning Out をつかって、Heroku 上で Salesforce内で稼働する Lightning Component を実行するテストアプリケーションです。

Heroku または、ローカル環境での実行を想定しています。OAuth2.0 での Redirectによる認証ではなく、JWT を利用しています。システム連携やDEMOでの利用など、ユーザを完全に固定して使用する場合を想定しているときに便利です。

# 前提条件

- Salesforce Developer 環境
- Heroku アカウント

# Salesforce 上の設定

Salesforce 側では、次の二点の設定が必要です。

1. 外部との接続設定
2. 外部へ公開する Lightning Application および Lightning Component の設定

## 外部との接続設定

Salesforce が外部のアプリケーションとやり取りを行うために、二箇所の設定が必要です。また、JWTを使うために必要なSSLの鍵の準備が必要です。順番に説明します。

### i) SSL の準備

[OpenSSL](https://www.openssl.org/) のコマンドを実行できるよう準備してください。大抵のLinux/Macには同梱されています。Macの場合、[Homebrew](https://brew.sh/)からインストールされる方が安心です。

適当のディレクトリで、次のコマンドを実行して、各種ファイルを準備してください。途中で、いろいろと組織は何だ、連絡先はどこだと聞かれますので、適当に答えてください。実行結果は、私が試しに実行したサンプルです。この通りにする必要はありませんし、この通りに返ってこなくても、次の３つのファイルができていれば、多分平気です。なお、パスワード入れないほうが楽です。

1. myapp.pem (秘密鍵)
2. myapp.csr (要求ファイル)
3. myapp.crt (公開鍵)

今回利用するのは、1. 秘密鍵 と 3. 公開鍵、です。

```
$ openssl genrsa 2048 > myapp.pem
Generating RSA private key, 2048 bit long modulus
.............................................................................+++
....................................................................................+++
e is 65537 (0x10001)
$ openssl req -new -key myapp.pem -out myapp.csr
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:JP
State or Province Name (full name) [Some-State]:Tokyo
Locality Name (eg, city) []:Chiyoda
Organization Name (eg, company) [Internet Widgits Pty Ltd]:salesforce.com Co.,Ltd.
Organizational Unit Name (eg, section) []:Sales Engineering
Common Name (e.g. server FQDN or YOUR name) []:xxx.example.com
Email Address []:xxxx@example.com

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
$ openssl x509 -req -days 365 -in myapp.csr -signkey myapp.pem -out myapp.crt 
Signature ok
subject=/C=JP/ST=Tokyo/L=Chiyoda/O=salesforce.com Co.,Ltd./OU=Sales Engineering/CN=xxxx.example.com/emailAddress=xxxx@example.com
Getting Private key
```

### ii) 接続アプリケーションの設定

![Salesforce 設定画面](https://user-images.githubusercontent.com/2649428/35206714-f30d709c-ff81-11e7-9af5-d0aab9fe0c1a.png)


# Heroku button

If you install this application then you should click this Heroku deploy button.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)