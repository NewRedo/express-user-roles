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

const path = require("path");
const Router = require("express").Router;
const extend = require("extend");

module.exports = function(service) {
    const router = new Router();

    router.use(function(req, res, next) {
        res.locals.user = req.user;
        res.locals.userRole = req.userRole;
        next();
    });

    // The middleware used for accepting invitations is loaded before the
    // protection middleware as this is used by new users.
    router.use("/accept-invite", require("./accept-invite")(service));

    // The rest of the interface is restricted to administrators.
    router.use(service._protect.bind(service));
    router.use(service._requireAdministrator.bind(service));

    router.get("/", function(req, res, next) {
        const context = req[service._uuid];
        var acl = context.acl;
        res.locals.acl = acl;
        acl.forEach(ace => {
            ace.href = path.join(req.baseUrl, req.path, "aces", ace.user.id);
        });
        res.locals.view = {};
        res.locals.view.title = "Users";
        res.locals.view.table = {
            columns: ["Name", "Role"],
            rows: res.locals.acl.map(ace => [{
                    href: path.join(req.baseUrl, req.path, "aces", ace.user.id),
                    text: ace.user.displayName
                },
                ace.role
            ])
        };
        res.locals.view.links = [{
            href: path.join(req.baseUrl, req.path, "invite"),
            text: "Invite"
        }];
        service._options.render(req, res, "acl");
    });

    router.param("userid", (req, res, next, id) => {
        const context = req[service._uuid];
        var ace = context.acl.find(x => x.user.id === id);
        res.locals.ace = extend(true, {}, ace);
        next();
    });

    router.use("/aces/:userid", require("./ace")(service));
    router.use("/invite", require("./invite")(service));

    return router;
};