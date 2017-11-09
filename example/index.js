"use strict";

const extend = require("extend");
const express = require("express");
const expressUserRoleRouter = require("../index");
const path = require("path");

const app = new express();

var acl = [{
    user: {
        id: "root"
    },
    role: "Administrator"
}, {
    user: {
        id: "user1"
    },
    role: "User"
}];

app.set("views", path.join(__dirname, "../templates"));
app.set("view engine", "pug");

app.use(require("cookie-parser")());

app.use(function(req, res, next) {
    // Fake the request user from the query string.
    if (req.query.user) {
        req.user = {
            id: req.query.user,
            displayName: req.query.user,
            emails: [{
                value: req.query.user + "@localhost"
            }]
        };
        res.cookie("user", req.user);
    } else {
        req.user = req.cookies.user;
    }
    next();
});

app.use(expressUserRoleRouter({
    store: {
        get: function(callback) {
            callback(null, JSON.parse(JSON.stringify(acl)));
        },
        put: function(newAcl, callback) {
            acl = JSON.parse(JSON.stringify(newAcl));
            callback();
        }
    },
    render: (req, res, template) => {
        if (template === "401") {
            res.render("401");
        } else {
            res.render("page-template");
        }
    },
    roles: ["Administrator", "User"]
}));

app.get("/", function(req, res) {
    res.render("templates/page-template");
});

app.listen(3000, function() {
    console.warn("Listening on port 3000.");
});