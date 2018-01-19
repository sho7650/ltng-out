function init() {
    var access_token = document.getElementById('token').textContent;
    var url          = document.getElementById('url').textContent;

    console.log("access token: " + access_token);
    $Lightning.use("c:LtngOut",
    function() {
        $Lightning.createComponent("c:Test01", {}, "lightning");
    }, url, access_token);
}