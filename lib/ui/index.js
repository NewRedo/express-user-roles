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
    // TODO: ui.use("accept-invitation", null);

    // The rest of the interface is restricted to administrators.
    router.use(service._protect.bind(service));
    router.use(service._requireAdministrator.bind(service));

    // TODO: Invitation UI
    // GET /invite
    // POST /invite

    // TODO: ACE delete UI
    // GET: /aces/:user-id/delete
    // POST: /aces/:user-id/delete

    router.get("/", function(req, res, next) {
        const context = req[service._uuid];
        var acl = context.acl;
        res.locals.acl = acl;
        acl.forEach(ace => {
            ace.href = path.join(req.baseUrl, req.path, "aces", ace.user.id);
        });
        res.locals.title = "Users";
        res.locals.table = {
            columns: ["Name", "Role"],
            rows: res.locals.acl.map(ace => [{
                    href: path.join(req.baseUrl, req.path, "aces", ace.user.id),
                    text: ace.user.displayName
                },
                ace.role
            ])
        };
        res.locals.links = [{
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

    return router;
};