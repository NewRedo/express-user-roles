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
    router.use("/edit", require("./ace-edit")(service));

    // Delete UI
    router.use("/delete", require("./ace-delete")(service));


    return router;
};