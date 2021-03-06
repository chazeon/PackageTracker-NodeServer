const express = require('express');
const User = require('./models/User');
let router = express.Router();
const Tasks = require('./tasks');

/**
 * POST method: /add
 * Query parameters:
 * token - user device's firebase token (unique)
 * id - package id
 * com - delivery company id
 */
router.post('/add', function(req, response, next) {
    let userToken = req.body['token'];
    let itemId = req.body['id'];
    let company = req.body['com'];

    if (!userToken || !itemId) {
        response.json({message: 'Wrong parameters', code: -3});
        return
    }

    let where = {deviceToken: userToken};

    User.find(where, function (err, res) {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else if (res.length < 1) {
            response.json({message: 'This token hasn\'t been registered.', code: -2});
        } else {
            let subscribes = res[0].subscribes;
            if (company) {
                itemId += "+" + company;
            }
            if (subscribes.indexOf(itemId) !== -1) {
                response.json({message: 'The item has been added already.', code: 1});
            } else {
                subscribes.push(itemId);
                User.update(where, {'subscribes': subscribes}, function (err, res) {
                    if (err) {
                        response.json({message: 'Failed to add item. ' + err.message, code: -1});
                    } else {
                        response.json({message: 'Succeed.', code: 0});
                    }
                });
            }
        }
    });
});

/**
 * POST method: /remove
 * Query parameters:
 * token - user device's firebase token (unique)
 * id - package id want to remove
 */
router.post('/remove', function(req, response, next) {
    let userToken = req.body['token'];
    let itemId = req.body['id'];

    if (!userToken || !itemId) {
        response.json({message: 'Wrong parameters', code: -3});
        return
    }

    let where = {deviceToken: userToken};

    User.find(where, function (err, res) {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else if (res.length < 1) {
            response.json({message: 'This token hasn\'t been registered.', code: -2});
        } else {
            let removeCount = res[0].subscribes.length;
            let subscribes = res[0].subscribes.filter(function (item) { return item.indexOf(itemId) === -1 });
            removeCount -= subscribes.length;
            User.update(where, {'subscribes': subscribes}, function (err, res) {
                if (err) {
                    response.json({message: 'Failed to remove item. ' + err.message, code: -1});
                } else {
                    response.json({message: 'Succeed.', code: 0, remove_count: removeCount});
                }
            });
        }
    });
});

/**
 * POST method: /sync
 * Query parameters:
 * token - user devices's firebase token (unique)
 * Post body:
 * Json array
 */
router.post('/sync', function (req, response, next) {
   let userToken = req.query['token'];
   let array = req.body;

    if (!userToken) {
        response.json({message: 'Missing \"token\" param.', code: -3});
        return
    }
    if (!(array instanceof Array)) {
        response.json({message: 'Please post a json array.', code: -3});
        return
    }
    for (let i = 0; i < array.length; i++) {
        if (typeof array[i] !== 'string') {
            response.json({message: 'Invalid data.', code: -2});
            return
        }
    }

    let where = {deviceToken: userToken};

    User.find(where, function (err, res) {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else if (res.length < 1) {
            response.json({message: 'This token hasn\'t been registered.', code: -2});
        } else {
            User.update(where, {'subscribes': array}, function (err, res) {
                if (err) {
                    console.log(err);
                    response.json({message: err.message, code: -1});
                } else {
                    response.json({message: 'Synced.', code: 0});
                }
            });
        }
    });
});

/**
 * GET method: /list
 * Query parameters:
 * token - user devices's firebase token (unique)
 */
router.get('/list', function (req, response, next) {
    let userToken = req.query['token'];

    if (!userToken) {
        response.json({message: 'Missing \"token\" param.', code: -3});
        return
    }

    let where = {deviceToken: userToken};

    User.find(where, function (err, res) {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else if (res.length < 1) {
            response.json({message: 'This token hasn\'t been registered.', code: -2});
        } else {
            response.json(res[0].subscribes);
        }
    });
});

/**
 * POST method: /register
 * Post body:
 * token - the firebase token of device want to register (unique)
 */
router.post('/register', function (req, response, next) {
    let userToken = req.body['token'];

    if (!userToken) {
        response.json({message: 'Missing \"token\" param.', code: -3});
        return
    }

    let where = {deviceToken: userToken};

    User.find(where, function (err, res) {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else {
            let user;
            if (res.length < 1) {
                user = new User({
                    deviceToken: userToken,
                    registerTime: Date.now(),
                    subscribes: []
                });
            } else {
                user = res[0];
                user.registerTime = Date.now()
            }

            user.save(function (err, res) {
                if (err) {
                    response.json({message: 'Failed to register user. ' + err.message, code: -1});
                } else {
                    response.json({message: 'Succeed.', code: 0, token: userToken, time: res.registerTime});
                }
            })
        }
    });

});

/**
 * GET method: /request_push
 * Query parameters:
 * token - user devices's firebase token (unique)
 */
router.get("/request_push", (req, response, next) => {
    let userToken = req.query['token'];

    if (!userToken) {
        response.json({message: 'Missing \"token\" param.', code: -3});
        return
    }

    let where = {deviceToken: userToken};

    User.find(where, (err, res) => {
        if (err) {
            console.log(err);
            response.json({message: err.message, code: -1});
        } else if (res.length < 1) {
            response.json({message: 'This token hasn\'t been registered.', code: -2});
        } else {
            Tasks.queryUsers(res);
            response.json({message: 'Requested.', code: 0});
        }
    });
});

module.exports = router;
