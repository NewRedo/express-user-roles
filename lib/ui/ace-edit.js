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

const Router = require("express").Router;
const multer = require("multer");
const path = require("path");

module.exports = function(service) {
    const router = new Router();

    router.use("/", multer().fields([{
        name: "role",
        maxCount: 1
    }]));
    router.all("/", (req, res, next) => {
        req.body = req.body || {
            role: res.locals.ace.role
        };
        res.locals.view = {};
        res.locals.view.title = "Edit " + res.locals.ace.user.displayName;
        res.locals.view.form = {
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
        res.locals.view.form.fields.forEach(field => {
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
    router.post("/", (req, res, next) => {
        const context = req[service._uuid];
        if (res.locals.view.form.fields.some(field => field.error)) {
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
                    res.redirect(res.locals.view.form.cancelHref);
                }
            });
        }
    });
    router.all("/", (req, res, next) => {
        service._options.render(req, res, "ace-edit");
    });

    return router;
};