"use strict";

const assert = require("assert");
const async = require("async");
const express = require("express");
const extend = require("extend");
const path = require("path");
const uuid = require("uuid");
const aclSchemaValidator = require("./acl-schema");

const defaultOptions = {
    protectedPath: "/",
    userInterfacePath: "/users",
    roles: ["Administrator"],
    administratorRole: "Administrator",
    render: (req, res, template) => res.render(template)
};

class ExpressUserRoleRouter {

    /**
    creates a new ExpressUserRoleRouter.
    @param options.protectedPath - Anything acceptable to `app.use`. Access is prohibited to users not in the ACL. Default is `"/"`.
    @param options.userInterfacePath - Anything acceptable to `app.use`. Provides the role management user interface. Default is `"/users"`.
    @param {string[]} options.roles - An array of role names. Default `["Administrator"]`.
    @param {string} options.administratorRole - The name used for administrators. Default "Administrator".
    @param options.store - A data store implementing get/put, such as `PouchDbStore`. See `PouchDbStore` for defaults.
    */
    constructor(options) {
        // Set simple defaults.
        options = extend({}, defaultOptions, options);

        // We do this here because creating the default store has side-effects.
        options.store = options.store || new PouchDb();

        this._options = options;
    }

    createRouter() {
        const ret = new express.Router();

        // Create a unique place to pass data through the request pipeline.
        this._uuid = uuid();
        ret.use(this._initialiseRequest.bind(this));

        // The user interface must be used first in case the protection
        // middleware blocks access to it. In particular, it contains the URL
        // that will be used by new users to accept invitations.

        ret.use(this._options.userInterfacePath, this._makeUserInterface());
        ret.use(this._options.protectedPath, this._protect.bind(this));
        return ret;
    }

    _initialiseRequest(req, res, next) {
        // Create a place to store information needed in the request pipeline.
        req[this._uuid] = {};
        next();
    }

    _protect(req, res, next) {
        const context = req[this._uuid];
        async.series([
            next => {
                context.user = req.user;
                context.userId = (context.user || {}).id;
                next();
            },
            next => {
                this._loadAcl((err, ret) => {
                    context.acl = ret;
                    context.acl.forEach(ace => {
                        if (!ace.user.displayName && ace.user.name) {
                            ace.user.displayName = [
                                ace.user.name.givenName,
                                ace.user.name.familyName
                            ].filter(x => x).join();
                        }
                        if (!ace.user.displayName) {
                            ace.user.displayName = ace.user.id;
                        }
                    });
                    next(err);
                });
            },
            next => {
                var ace = context.acl.find(x => x.user.id === context.userId);
                if (!ace) {
                    res.status(401, "Not authorized.");
                    res.render(path.join(this._options.templatePath, "401"));
                } else {
                    req.userRole = ace.role;
                    context.ace = ace;
                    next();
                }
            }
        ], next);
    }

    _loadAcl(callback) {
        this._options.store.get((err, ret) => {
            if (!err) {
                var valid = aclSchemaValidator(ret);
                assert(valid, aclSchemaValidator.errors);
            }
            callback(err, ret);
        });
    }

    _makeUserInterface() {
        return require("./ui")(this);
    }

    _requireAdministrator(req, res, next) {
        const context = req[this._uuid];
        if (!context.ace || context.ace.role !== this._options.administratorRole) {
            res.status(401, "Not authorized.");
            res.render(path.join(this._options.templatePath, "401"));
        } else {
            next();
        }
    }
}

module.exports = function(options) {
    var implementation = new ExpressUserRoleRouter(options);
    return implementation.createRouter();
};