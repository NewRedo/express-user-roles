/*
MIT Licence

Copyright (c) 2017 NewRedo Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
"use strict";

const multer = require("multer");
const path = require("path");
const Router = require("express").Router;
const url = require("url");
const emailPattern = new RegExp('^(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$','i');

module.exports = function(service) {
    const router = new Router();

    router.use("/", multer().any());
    router.all("/", (req, res, next) => {
        req.body = req.body || {};
        res.locals.view = {};
        res.locals.view.title = "Invite";
        res.locals.view.form = {
            fields: [{
                name: "role",
                label: "Role",
                type: "select",
                options: [{
                    value: "",
                    text: ""
                }].concat(
                    service._options.roles.map(item => ({
                        value: item,
                        text: item
                    }))
                ),
                required: true,
                value: req.body.role || ""
            }, {
                name: "name",
                label: "Name",
                type: "text",
                required: true,
                value: req.body.name
            }, {
                name: "email",
                label: "Email",
                type: "email",
                required: true,
                value: req.body.email
            }],
            cancelHref: path.join(req.baseUrl, req.path, "..")
        };
        res.locals.view.form.fields.forEach(field => {
            if (field.type === "select") {
                if (!field.options.some(option => option.value === field.value)) {
                    field.error = "required";
                }
            }
            if (field.type === "email") {
	            if (field.value && !emailPattern.test(field.value)) {
		            field.error = "email";
	            };
            }
            if (field.required) {
                if (!field.value) {
                    field.error = "required";
                }
            }
        });
        next();
    });
    router.post("/", (req, res, next) => {
        const context = req[service._uuid];
        if (res.locals.view.form.fields.some(field => field.error)) {
            next();
        } else {
            res.locals.invitor = req.user;
            res.locals.invitee = {
                displayName: req.body.name,
                emails: [{
                    value: req.body.email
                }],
                role: req.body.role
            };
            res.locals.invitationHref = url.format({
                protocol: req.protocol,
                host: req.get("host"),
                pathname: path.join(
                    req.baseUrl,
                    "../accept-invite"
                ),
                query: {
                    token: service._sign(req, {
                        invitee: res.locals.invitee,
                        sent: (new Date()).toISOString()
                    })
                }
            });
            res.locals.email = {
                to: {
                    name: req.body.name,
                    address: req.body.email
                },
                cc: {
                    name: req.user.displayName,
                    address: req.user.emails[0].value
                },
                replyTo: {
                    name: req.user.displayName,
                    address: req.user.emails[0].value
                }
            };
            service._options.render(req, res, "invite-email", (err, html) => {
                if (err) {
                    next(err);
                    return;
                }
                res.locals.email.html = html;
                service._emailTransport.sendMail(res.locals.email, (err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    res.locals.view = {
                        title: "Invitation Sent",
                        links: [{
                            text: "Back",
                            href: path.join(req.baseUrl, req.path, "..")
                        }],
                        paragraph: "Your invitation has been sent."
                    };
                    service._options.render(req, res, "invite-sent");
                });
            });
        }
    });
    router.all("/", (req, res, next) => {
        service._options.render(req, res, "invite");
    });

    return router;
};
