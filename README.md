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
subject=/C=JP/ST=Tokyo/L=Chiyoda/O=salesforce.com Co.,Ltd./OU=Sales Engineering/CN=xxx.example.com/emailAddress=xxxx@example.com
Getting Private key
```

### ii) 接続アプリケーションの設定

次に、Salesforce の接続アプリケーションを設定します。Lightning であれば、「設定」→「アプリケーション」→「アプリケーションマネージャ」から「新規接続アプリケーション」で作成ください。サンプル例の画面とともに、最低限設定の必要な項目を紹介します。

- 接続アプリケーション名 : 好きな名前をつけてください。組織内でユニークであれば、なんでもいいです
- API参照名 : 今回特に利用しませんが、こちらも組織内でユニークな名前をつけてください。いずれも、あとで判別がつきやすいものを推奨します
- OAuth設定の有効化 : ここにチェックを付けないと何も始まりません。必ずチェックください
- コールバックURL : JWTの場合は特に使わないので、適当に。ただし`https`であることが必要です。困ったら 「 https://login.salesforce.com/services/oauth2/success 」にすれば、現時点では問題ありません
- デジタル署名を使用 : JWT の時はこれが必要です。先程作った SSLの公開鍵を選択してください。先程通りに作ったのならば「myapp.crt」を選択すれば良いです
- 選択した OAuth 範囲 : 次の２つがあれば基本原則問題ないです。「フルアクセス(full)」「ユーザに代わっていつでも要求を実行(refresh\_token,offline\_access)」月に代わっておしおきじゃないです。

![Salesforce 設定画面](https://user-images.githubusercontent.com/2649428/35206714-f30d709c-ff81-11e7-9af5-d0aab9fe0c1a.png)

この接続アプリケーションを保存しておいてください。保管したら、この接続アプリケーションの「Manage」から、更に設定が必要です。管理画面が開いたら「編集」をクリックしてくださいませ。

ここの「OAuthポリシー」内の「許可されているユーザ」を`管理者が承認したユーザは事前承認済み`に変更して「保存」します。

![Salesforce OAuth ポリシー](https://user-images.githubusercontent.com/2649428/35207430-55546900-ff86-11e7-9e8f-e295fb712c7e.png)

「接続アプリケーションの詳細」画面に戻ってきますので、少し下へいって、「プロファイル」から `プロファイルを管理する` をクリックしてどうぞ。今回、アクセスする予定のユーザが登録されているプロファイルをここで追加してあげます。

![Salesforce プロファイル](https://user-images.githubusercontent.com/2649428/35207541-ea435ab2-ff86-11e7-8833-3b0afa29d467.png)

### iii) CORS の設定

接続関係では最後。CORS に、外部WebアプリケーションのURLを登録します。

Lightning 設定画面からは「設定」→「セキュリティ」→「CORS」から、URLを追加します。今回登録する外部WebアプリケーションのURLを、ホスト名まで入力します。ディレクトリ部分となるURIは入力不要です。また、文字列の一番最後の `/` も不要です。ホスト名までです。

ここで、`http://localhost:3000` とローカルホストを指定することもできます。推奨はしませんが、ローカルでのテストを実施する場合には、このような設定も可能です。Heroku のアプリケーションの場合、`https://xxxxxxx.herokuapp.com`という指定になります。まだ、ここでは Heroku アプリケーションを作成していないので、Heroku アプリケーションを適用してから、ここを設定することが確実です。

![CORS](https://user-images.githubusercontent.com/2649428/35207646-8b751dc6-ff87-11e7-9a74-ec77fc99978e.png)

## 外部へ公開する Lightning Application および Lightning Component の設定

外部に公開したい Lightning コンポーネントの `コンポーネント名` を準備してください。すでに開発済みでも、これから作成するでも、どちらでも構いませんが、固有の Lightning コンポーネントを示す `c:xxxxxx` というコンポーネント名が必要です。

次に、このコンポーネントを外部へ公開するための Lightning アプリケーションを作成します。`開発者コンソール` を開きます。

`開発者コンソール`で「File」→「New」→「Lightning Application」をクリックしましょう。必須項目は一つだけです。

- Name : 外部からアクセスするときのアプリケーション名になります
- Lightning Out Dependency App : ここにチェックを付けておくと、Lightning Out に必要な設定を付けてくれます

![新規Lightning Application](https://user-images.githubusercontent.com/2649428/35207953-06e81a0c-ff89-11e7-97f5-487f09b26f69.png)

チェックを付けてもつけなくても、たいした設定ではないのでお好きにどうぞ。

必要なものは次の3行だけです。必要な箇所だけ説明します。

```
<aura:application access="GLOBAL" extends="ltng:outApp" >
    <aura:dependency resource="c:Test01" />
</aura:application>
```

- extends : 先程のチェックを入れておくと自動的に入れてくれる箇所です。`ltng:outApp` を指定すると、そのアプリケーションは `Salesforce Lightning Design System`(SLDS) のスタイルが設定されます。SLDS を使わず、外部Webアプリケーションのスタイルに連動させる場合には `ltng:outAppUnstyled` と指定します
- resource : ここに、外部で実行させたい Lightning コンポーネントを指定します

Heroku アプリケーションを設定する際に、ここで作成した `Lightningアプリケーション名` と、実行させる `Lightning コンポーネント名` が必要になります。

# Heroku アプリケーションの導入

下の `Herokuボタン` をクリックすれば、さっさと導入が可能です。ここで、入力すべき環境変数について説明します。

- TOKEN\_ENDPOINT\_URL : 設定した個別のドメイン名 + `/services/oauth2/token` です。わからなかったら、 `https://login.salesforce.com/services/oauth2/token` にしておけば、大抵の人はOKです。「私のドメイン」を設定して、かつ「login.salesforce.comからのアクセス」を「禁止」にしている場合は、正しいドメイン名の設定が必要です。
- ISSUER : 作成した「接続アプリケーション」を参照すると出てくる `コンシューマ鍵` を指定します
- SALESFORCE\_USER : 接続する Salesforce ユーザ名を指定します
- LIGHTNING\_APP : 作成した `Lightningアプリケーション名` を指定します。たいてい `c:xxxxxx` みたいな名前です
- LIGHTNING\_COMPONENT : 外部実行させる `Lightningコンポーネント名` を指定します。これも、たいてい `c:xxxxxx` となっています
- PRIVATE\_KEY : だいぶ前に作成した「秘密鍵」の内容をここに記します。厄介なので、個別に説明します

これらをすべて入力して、`Deploy app` ボタンをクリックすれば、Heroku へアプリケーションをデプロイできます。

## 環境変数 `PRIVATE_KEY` の設定について

ここで入力すべきは、SSL の秘密鍵の内容です。手順通りに作成した場合は「myapp.pem」となっています。このファイルの中身を見ていただくとわかりますが、複数の行から成り立っています。環境変数は 1行で設定しなければなりませんから、このままでは設定できません。

したがって、複数行となっているものを、1行にして改行のあった部分を改行であった痕跡を残して置かなければなりません。JWT のライブラリ側の使用で、秘密鍵の内容が、そのようになっていないとならないからです。次の日本語の意味が理解できて、それをなすことができる方は、それを実行してください。わからない方は、その先へ進んでください。

```
「myapp.pem の改行を '\n' へ変換して、すべて 1行にする」
```

### 変換ツールの話

先程の処理をおこなうためのスキルと能力が足りない方は、この git リポジトリから [bin/pem2env.sh](https://github.com/tabesfdc/ltng-out/blob/master/bin/pem2env.sh) を取得してください。Linux/Mac でうごきます。Windows の人はごめんなさい。bash on Linux on Windows をお試しください。

おもむろに、次のコマンドを打つと、環境変数へ入れるべきものが表示されます。

```
$ ./pem2env.sh myapp.pem
PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQE(中略)uS4kRQ=\n-----END RSA PRIVATE KEY-----
```

環境変数へコピペしたい場合は、`PRIVATE_KEY=` よりあとの '-----BEGIN' から最後の 'PRIVATE KEY-----'をコピペしてください。

もし、heroku コマンド使えるよという方であれば、多分、次のコマンドを実行すれば動くはずです(試してない)。

```
$ heroku config:set `./pem2env.sh myapp.pem`
```

Heroku の Deployが完了したら、Heroku アプリの URL を [CORS](https://github.com/tabesfdc/ltng-out#iii-cors-%E3%81%AE%E8%A8%AD%E5%AE%9A) へ設定すれば、全て完了です。Heroku アプリへアクセスすると、指定した Lightning コンポーネントが表示されるはずです。

If you install this application then you should click this Heroku deploy button.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)