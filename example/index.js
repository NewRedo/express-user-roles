"use strict";

const extend = require("extend");
const express = require("express");
const expressUserRoleRouter = require("../index");

const app = new express();

var acl = [{
    user: {
        id: "root"
    },
    role: "Administrator"
}, {
    user: {
        id: "pleb"
    },
    role: "Pleb"
}];

app.use(function(req, res, next) {
    // Fake the request user from the query string.
    req.user = {
        id: req.query.user
    };
    res.render = function(name) {
        res.json({
            view: name,
            locals: res.locals,
            user: req.user,
            userRole: req.userRole
        });
    };
    next();
});

app.use(expressUserRoleRouter({
    templatePath: "../templates",
    store: {
        get: function(callback) {
            callback(null, extend(true, [], acl));
        },
        put: function(newAcl, callback) {
            acl = extend(true, [], newAcl);
        }
    }
}));

app.get("/", function(req, res) {
    res.render("/");
});

app.listen(3000, function() {
    console.warn("Listening on port 3000.");
});