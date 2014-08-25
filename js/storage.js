(function () {
    var db = {};
    db.save = function (key, data) {
        try {
            window.localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.log(err);
        }
    };
    db.load = function (key) {
        try {
            var data = null;
            data = window.localStorage.getItem(key);
            if (data !== null && data !== '') {
                data = JSON.parse(data);
                return data;
            }
        } catch (err) {
            console.log(err);
            return null;
        }
        return null;
    }
    window.storage = db;
})();
