"use strict";

const extend = require("extend");
const express = require("express");
const expressUserRoleRouter = require("../index");
const path = require("path");

const app = new express();

// We're just going to keep our ACL in memory for this example, it will be
// reset to the followiing value when the application is restarted.
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

// We're going to use PUG tempaltes.
app.set("views", path.join(__dirname, "../templates"));
app.set("view engine", "pug");

// Although not required by the express-user-roles module, we need this for
// our demo.
app.use(require("cookie-parser")("my-secret"));

// Allows users to be faked initially on the query string then sets a cookie
// for subsequent requests.
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
    } else if (req.query.user === "") {
        delete req.user;
        res.cookie("user", null);
    } else {
        req.user = req.cookies.user;
    }
    next();
});

// Configure our express user role router.
app.use(expressUserRoleRouter({
    // We're just storing in a variable, but use JSON to create a clone to
    // avoid it being accidentally manipulated.
    store: {
        get: function(callback) {
            callback(null, JSON.parse(JSON.stringify(acl)));
        },
        put: function(newAcl, callback) {
            acl = JSON.parse(JSON.stringify(newAcl));
            callback();
        }
    },

    // We need this to use the example templates, we're using the same template
    // for everything except a 401.
    render: (req, res, template, callback) => {
        switch (template) {
            case "401":
            case "invite-email":
                res.render(template, callback);
                break;
            default:
                res.render("page-template", callback);
                break;
        }
    },

    // Here we list out user roles, "Adminsitrator" is has permissions to
    // access the user interface by default, "User" can only access our
    // home page.
    roles: ["Administrator", "User"]
}));

// Our home page is nothing special.
app.get("/", function(req, res) {
    res.locals.user = req.user;
    res.locals.userRole = req.userRole;
    res.render("home");
});

app.listen(3000, function() {
    console.warn("Listening on port 3000.");
});