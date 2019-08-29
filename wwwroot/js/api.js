function apiCall(url, args, cache) {
    return new Promise((resolve, reject) => {
        if (cache && cache[url]) {
            resolve(cache[url]);
        } else {
            var fullURL = url + '?';
            for (var obj in args) {
                fullURL += obj + '=' + encodeURIComponent(args[obj]) + '&';
            }
            var xhr = new XMLHttpRequest();
            xhr.open('GET', fullURL);
            xhr.responseType = "json";
            xhr.onload = (e) => {
                if (cache) {
                    cache[url] = xhr.response;
                }
                resolve(xhr.response);
            };
            xhr.onerror = (e) => {
                reject(e);
            };
            xhr.onabort = (e) => {
                reject(e);
            };
            xhr.send();
        }
    });
}

function apiCallPost(url, args) {
    return new Promise((resolve, reject) => {

        //var form_data = new FormData();
        //for (var key in args) {
        //    form_data.append(key, args[key]);
        //}

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.responseType = "json";
        xhr.onload = (e) => {
            resolve(xhr.response);
        };
        xhr.onerror = (e) => {
            reject(e);
        };
        xhr.onabort = (e) => {
            reject(e);
        };
        xhr.send(JSON.stringify(args));
    });
}