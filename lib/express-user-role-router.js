"use strict";

const assert = require("assert");
const async = require("async");
const express = require("express");
const extend = require("extend");
const path = require("path");
const uuid = require("uuid");

const defaultOptions = {
    protectedPath: "/",
    userInterfacePath: "/users",
    templatePath: "user-roles",
    store: null,
    userSource: function(req, res) {
        return req.user;
    },
    roleCallback: function(req, res, role) {
        req["userRole"] = role;
    },
    roles: ["Administrator"],
    administratorRole: "Administrator"
};

class ExpressUserRoleRouter {

    /**
    creates a new ExpressUserRoleRouter.
    @param options.protectedPath - Anything acceptable to `app.use`. Access is prohibited to users not in the ACL. Default is `"/"`.
    @param options.userInterfacePath - Anything acceptable to `app.use`. Provides the role management user interface. Default is `"/users"`.
    @param {string} options.templatePath - The path to templates used to render the user interface. Default is `"user-roles"`.
    @param {function(req, res, callback(err, acl))} options.store.get - A function that returns the current ACL. Required.
    @param {function(req, res, acl, callback(err))} options.store.put - A function that stores a new ACL. Required.
    @param {function(req, res)} options.userSource - a function that returns the current user object. Default gets the user from `req.user`.
    @param {function(req, res, role)} options.roleCallback - a function that receives the role for the current user and stores it on the request or response objects for later use. Default stores the role in `req["userRole"]`.
    @param {string[]} options.roles - An array of role names. Default `["Administrator"]`.
    @param {string} options.administratorRole - The name used for administrators. Default "Administrator".
    */
    constructor(options) {
        assert(options, "options is required");
        assert(options.store, "options.store is required.");
        assert(options.store.get, "options.store.get is required");
        assert(options.store.put, "options.store.put is required");
        options = extend({}, defaultOptions, options);
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
                context.user = this._options.userSource(req, res);
                context.userId = (context.user || {}).id;
                next();
            },
            next => {
                this._options.store.get((err, ret) => {
                    context.acl = ret;
                    next(err);
                });
            },
            next => {
                var ace = context.acl.find(x => x.user.id === context.userId);
                if (!ace) {
                    res.status(401, "Not authorized.");
                    res.render("401");
                } else {
                    this._options.roleCallback(req, res, ace.role);
                    context.ace = ace;
                    next();
                }
            }
        ], next);
    }

    _makeUserInterface() {
        const ui = new express.Router();

        // The middleware used for accepting invitations is loaded before the
        // protection middleware as this is used by new users.
        // TODO: ui.use("accept-invitation", null);

        // The rest of the interface is restricted to administrators.
        ui.use(this._protect.bind(this));
        ui.use(this._requireAdministrator.bind(this));

        ui.get("/", (req, res, next) => {
            const context = req[this._uuid];
            // TODO: ACL view UI
            res.json(context);
        });

        // TODO: Invitation UI
        // TODO: ACE view UI
        // TODO: ACE role change UI
        // TODO: ACE delete UI
        return ui;
    }

    _requireAdministrator(req, res, next) {
        const context = req[this._uuid];
        if (!context.ace || context.ace.role !== this._options.administratorRole) {
            res.status(401, "Not authorized.");
            res.render("401");
        } else {
            next();
        }
    }
}

module.exports = function(options) {
    var implementation = new ExpressUserRoleRouter(options);
    return implementation.createRouter();
};