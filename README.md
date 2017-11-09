Express User Roles
==================

Access Control List Schema
==========================

Storage providers are requires to provide an array containing the access
control list according to the schema contained in `acl.json-schema`. This is
validated on both read and also on write to avoid corruption.

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
* `401` - not authorized.

Raw data is provided to the templates for custom rendering but it is not
documented.
