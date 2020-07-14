Express User Roles
==================

Using Docker
============

```
./docker/docker-node npm install
./docker/docker-run
```

View the example at `http://localhost:3000`.

Developers must ensure that `req.user` is set to a valid
[contact schema](https://tools.ietf.org/html/draft-smarr-vcarddav-portable-contacts-00)
which must have an `id` and a `displayName` or `name` set. This must be done
before the code to `use` this module/middleware.

The given role is provided on `req.userRole` by the middleware provided the user
has been assigned a role, otherwise this may be `null` or `undefined`. This is
only accessible for code that is executed after this module/middlware.

Access Control List Schema
==========================

Storage providers are requires to provide an array containing the access
control list according to the schema contained in `acl.json-schema`. This is
validated on both read and also on write to avoid corruption.

See the example for how to write a storage provider. A PouchDb provider has
been included, available as `userRoleMiddleware.PouchDbStore`. See
`./lib/pouchdb-store.js` for documentation.

Templates
=========

Each template is called with the relevant content information as follows in this
abbreviated JSON schema:

```
{
    "template": "acl" || "ace" || "ace-edit" || "ace-delete" || "invite",
    "view": {
        "title": "string",
        "subtitle": "string",
        "links": [{
            "text": "string",
            "href": "url"
        }],
        "paragraph": "string",
        "table": {
            "columns": ["string"],
            "rows": [[{
                text: "string",
                href: "url" // optional
            }]]
        },
        "details": [{
            "label": "string",
            "value": "string"
        }],
        "form": {
            "fields": [{
                // Most properties should be rendered as attributes of the
                // input, textarea or select, except:
                "label": "string",
                "type": "text" || "email" || "select"
                "error": "string",
                "options": [{
                    "value": "string",
                    "text": "string"
                }]
            }],
            "cancelHref": "url"
        },
    },
    "acl": [], // The full access control list
    "ace": {}, // The access control entry in focus.
}
```

By rendering what is inside the `view` property the developer can avoid creating
distinct templates for each type.

The following templates are required:

* `acl` - show the access control listing with links to view ACE details and make new invitations.
* `ace` - shows an access control entry with links to edit and delete it.
* `ace-edit` - shows the access control edit form.
* `ace-delete` - shows the access control entry delete confirmation.
* `invite` - shows the access control entry invitation form.
* `invite-sent` - a confirmation page that the invite has been sent.
* `invite-email` - a special template for emailing, see the example.
* `invite-accepted` - landing page when an invitation is accepted.
* `401` - not authorized.

Raw data is provided to the templates for custom rendering but it is not
documented.

Contributing
============

```
git clone ssh://newredo.com/home/phill/express-user-roles.git
cd express-user-roles
npm install
cd vagrant
vagrant up
vagrant ssh
cd src
node example
```

Licence
=======

See LICENCE.txt
