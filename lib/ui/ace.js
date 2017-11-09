"use strict";

const Router = require("express").Router;
const multer = require("multer");
const extend = require("extend");
const path = require("path");

module.exports = function(service) {
    const router = new Router();

    router.get("/", (req, res, next) => {
        const context = req[service._uuid];

        // Data clean-up and prep.
        var ace = res.locals.ace;
        var user = extend({
            name: {},
            emails: []
        }, ace.user);
        var name = (user.name && user.givenName) ? [
            user.name.givenName,
            user.name.familyName
        ].filter(x => x).join() : null;
        var emails = user.emails.map(x => x.value).join(" ");

        // Titles
        res.locals.title = user.displayName;
        res.locals.subtitle = ace.role;

        // Links
        res.locals.links = [];
        res.locals.links.push({
            text: "Back",
            href: path.join(req.baseUrl, req.path, "../..")
        });
        if (req.user.id !== res.locals.ace.user.id) {
            res.locals.links.push({
                text: "Edit",
                href: path.join(req.baseUrl, req.path, "edit")
            });
            res.locals.links.push({
                text: "Delete",
                href: path.join(req.baseUrl, req.path, "delete")
            });
        }

        // Details
        res.locals.details = [{
                label: "Identifier",
                value: user.id
            },
            {
                label: "Display Name",
                value: user.displayName
            },
            {
                label: "Name",
                value: name
            },
            {
                label: "Emails",
                value: emails
            },
            {
                label: "Role",
                value: ace.role
            }
        ].filter(x => x.value);

        // Render
        service._options.render(req, res, "ace");
    });

    // User interface for changing the role.        
    router.use("/edit", multer().fields([{
        name: "role",
        maxCount: 1
    }]));
    router.all("/edit", (req, res, next) => {
        req.body = req.body || {
            role: res.locals.ace.role
        };
        res.locals.title = "Edit " + res.locals.ace.user.displayName;
        res.locals.form = {
            fields: [{
                name: "role",
                label: "Role",
                type: "select",
                options: service._options.roles.map(item => ({
                    value: item,
                    text: item
                })),
                value: req.body.role
            }],
            cancelHref: path.join(req.baseUrl, req.path, "..")
        };
        res.locals.form.fields.forEach(field => {
            if (field.type === "select") {
                if (!field.options.some(option => option.value === field.value)) {
                    field.error = "required";
                }
            }
            if (field.required) {
                if (!field.value) {
                    field.error = "required";
                }
            }
        });
        next();
    });
    router.post("/edit", (req, res, next) => {
        const context = req[service._uuid];
        if (res.locals.form.fields.some(field => field.error)) {
            next(err);
        } else {
            context.acl.forEach(ace => {
                if (ace.user.id === res.locals.ace.user.id) {
                    ace.role = req.body.role;
                }
            });
            service._options.store.put(context.acl, (err) => {
                if (err) {
                    next(err);
                } else {
                    res.redirect(res.locals.form.cancelHref);
                }
            });
        }
    });
    router.all("/edit", (req, res, next) => {
        service._options.render(req, res, "ace-edit");
    });

    // Delete UI
    router.use("/delete", multer().fields([{
        name: "confirm"
    }]));
    router.all("/delete", (req, res, next) => {
        req.body = req.body || {
            confirm: ""
        };
        res.locals.title = "Delete " + res.locals.ace.user.displayName;
        res.locals.form = {
            fields: [{
                name: "confirm",
                label: "Confirm",
                type: "select",
                options: [{
                        value: "",
                        text: ""
                    },
                    {
                        value: "YES",
                        text: "Yes, I want to remove access for this user."
                    }
                ],
                required: true,
                value: req.body.confirm
            }],
            cancelHref: path.join(req.baseUrl, req.path, "..")
        };
        res.locals.form.fields.forEach(field => {
            if (field.type === "select") {
                if (!field.options.some(option => option.value === field.value)) {
                    field.error = "required";
                }
            }
            if (field.required) {
                if (!field.value) {
                    field.error = "required";
                }
            }
        });
        next();
    });
    router.post("/delete", (req, res, next) => {
        const context = req[service._uuid];
        if (res.locals.form.fields.some(field => field.error)) {
            next(err);
        } else {
            context.acl = context.acl.filter(ace => {
                return ace.user.id !== res.locals.ace.user.id;;
            });
            service._options.store.put(context.acl, (err) => {
                if (err) {
                    next(err);
                } else {
                    res.redirect(path.join(
                        req.baseUrl,
                        req.path,
                        "../../.."
                    ));
                }
            });
        }
    });
    router.all("/delete", (req, res, next) => {
        service._options.render(req, res, "ace-delete");
    });


    return router;
};