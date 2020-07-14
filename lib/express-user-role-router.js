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

const aclSchemaValidator = require("./acl-schema");
const assert = require("assert");
const express = require("express");
const extend = require("extend");
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const uuid = require("uuid");

const defaultOptions = {
    roles: ["Administrator"],
    administratorRole: "Administrator",
    render: (req, res, template) => res.render(template),
    continueUrl: (req) => "/",
    inviteTtl: "24h"
};

class ExpressUserRoleRouter {

    /**
    creates a new ExpressUserRoleRouter.
    @param {string[]} options.roles - An array of role names. Default `["Administrator"]`.
    @param {string} options.administratorRole - The name used for administrators. Default "Administrator".
    @param {function} options.render - A function that renders the user interface page, of the form function(req, res, template).
    @param {function} options.continueUrl - A function that takes the request object and returns the continuation URL where new users are sent after responding to an invitation.
    @param options.store - A data store implementing get/put, such as `PouchDbStore`. See `PouchDbStore` for defaults.
    */
    constructor(options) {
        // Set simple defaults.
        options = extend({}, defaultOptions, options);

        // We do this here because creating the default store has side-effects.
        options.store = options.store || new PouchDb();

        this._emailTransport = nodemailer.createTransport({
            host: "localhost",
            port: 25,
            tls: {
                rejectUnauthorized: false
            }
        });

        // Automatic conversion of HTML to text emails.
        this._emailTransport.use("compile", htmlToText());

        this._options = options;

        // Create a unique place to pass data through the request pipeline.
        this._uuid = uuid.v4();
    }

    /*
    Creates the middleware that provides the `userRole` on the request object.
    */
    createMiddleware() {
        const ret = new express.Router();

        // Create a unique place to pass data through the request pipeline.
        ret.use(this._initialiseRequest.bind(this));

        // Bind the role-finding functionality.
        ret.use(this._findRole.bind(this));

        return ret;
    }

    /*
    Creates an Express sub-application that provides the user interface for
    managing users and accepting invitations.
    */
    createUserInterface() {
        const ret = new express.Router();

        // Create a unique place to pass data through the request pipeline.
        ret.use(this._initialiseRequest.bind(this));

        ret.use(this._makeUserInterface());
        return ret;
    }

    _initialiseRequest(req, res, next) {
        // Ensure we have a context.
        const context = req[this._uuid] = req[this._uuid] || {};
        context.continueUrl = this._options.continueUrl(req);

        // Check this here because the whole module is useless without this
        // secret that is used to sign invitations.
        if (!req.secret) {
            return next(new Error("Middleware that sets `req.secret` is required, such as `cookie-parser`."));
        }

        next();
    }

    _findRole(req, res, next) {
        const context = req[this._uuid];
        Promise.resolve().then(() => {
            context.user = req.user;
            context.userId = (context.user || {}).id;
            return new Promise((resolve, reject) => {
                this._loadAcl((err, ret) => err ? reject(err) : resolve(ret));
            });
        }).then((acl) => {
            // Find our ACE.
            context.acl = acl;
            var ace = context.acl.find(x => x.user.id === context.userId);
            if (ace) {
                req.userRole = ace.role;
                context.ace = ace;
            }
        }).then(() => {
            // Update the user information if it has changed.

            // If we don't have a user we can't.
            if (!context.ace) return;

            // Update and clean up the ACL.
            var currentAcl = JSON.stringify(context.acl);
            context.ace.user = context.user;
            aclSchemaValidator(context.acl);

            if (JSON.stringify(context.acl) !== currentAcl) {
                return new Promise((resolve, reject) => {
                    this._saveAcl(
                        context.acl,
                        err => err ? reject(err) : resolve()
                    );
                });
            }
        }).then(next, next);
    }

    _loadAcl(callback) {
        this._options.store.get((err, ret) => {
            if (!err) {
                var valid = aclSchemaValidator(ret);
                if (!valid) {
                    err = new Error(JSON.stringify(aclSchemaValidator.errors));
                }
            }
            callback(err, ret);
        });
    }

    _saveAcl(acl, callback) {
        var valid = aclSchemaValidator(acl);
        if (!valid) {
            err = new Error(JSON.stringify(aclSchemaValidator.errors));
        }
        this._options.store.put(acl, callback);
    }

    _makeUserInterface() {
        return require("./ui")(this);
    }

    _requireAdministrator(req, res, next) {
        const context = req[this._uuid];
        if (!context.ace || context.ace.role !== this._options.administratorRole) {
            res.status(401, "Not authorized.");
            this._options.render(req, res, "401");
        } else {
            next();
        }
    }

    _sign(req, payload) {
        var secret;
        if (typeof req.secret === "string") {
            secret = req.secret;
        } else if (typeof req.secret[0] === "string") {
            secret = req.secret
        }
        return jwt.sign({
            data: payload
        }, secret);
    }

    _verify(req, token) {
        assert(req);
        assert(req.secret);
        assert(token);
        if (typeof req.secret === "string") {
            try {
                var result = jwt.verify(token, req.secret);
                return result.data;
            } catch (err) {
                return null;
            }
        } else {
            for (var i in req.secret) {
                var secret = req.secret[i];
                try {
                    var result = jwt.verify(token, secret, {
                        maxAge: this._options.inviteTtl
                    });

                    // If we get here it's valid;
                    return result.data;
                } catch (err) {
                    // Move to next.
                }
            }
            return null;
        }
    }
}

module.exports = ExpressUserRoleRouter;
