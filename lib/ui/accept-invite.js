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

module.exports = function(service) {
    const router = new Router();

    router.get("/", function(req, res, next) {

        // The user must be logged in and not anonymous
        if (!req.user || !req.user.emails || !req.user.emails.length) {
            res.status(401, "Not authorized");
            service._options.render(req, res, "401");
            return;
        }

        // The token must be present.
        const context = req[service._uuid];
        if (!req.query.token) {
            res.status(401, "Not authorized");
            service._options.render(req, res, "401");
            return;
        }

        // The token must be valid.
        var claim = service._verify(req, req.query.token);
        if (!claim) {
            res.status(401, "Not authorized");
            service._options.render(req, res, "401");
            return;
        }

        res.locals.claim = claim;

        service._options.store.get((err, acl) => {
            context.acl = acl;
            next(err);
        });
    });

    router.get("/", function(req, res, next) {
        const context = req[service._uuid];

        // Check for an existing ACE.
        var existingAce = context.acl.find(x => x.user.id === req.user.id);

        // If the ACE is new then create and add the stub for it.
        if (!existingAce) {
            existingAce = {};
            context.acl.push(existingAce);
        }

        // Set the user data on the ACE.
        existingAce.user = req.user;
        existingAce.role = res.locals.claim.invitee.role;

        // Save it.
        service._saveAcl(context.acl, next);
    });

    router.get("/", function(req, res, next) {
        const context = req[service._uuid];
        res.locals.view = {
            links: [{
                text: "Continue",
                href: context.continueUrl
            }],
            paragraph: "You have accepted this invitation as a " +
                res.locals.claim.invitee.role + "."
        };

        service._options.render(req, res, "invite-accepted");
    });

    return router;
};
