"use strict";

const extend = require("extend");
const PouchDb = require("pouchdb");

/*
A PouchDb ACL Store.

@param {object} options - Any PouchDb construtor options.
@param {string} options.name - Default "http://localhost:5984/user-roles".
@param {string} options.docId - Default "acl".
*/
class PouchDbStore {
    constructor(options) {
        this._options = extend({
            name: "http://localhost:5984/user-roles",
            docId: "acl"
        }, options);
        this._db = new PouchDb(this._options);
    }

    /*
    Gets the ACL.
    
    @param {function(err, user)} callback - called on completion.
    */
    get(callback) {
        const id = this._options.docId;
        this._db.get(id, (err, doc) => {
            if (!err) {
                doc = doc.list;
            } else if (err.status === 404) {
                err = null
                doc = [];
            }
            callback(err, doc);
        });
    }

    /*
    Updates the ACL.
    
    @param {object} acl - The ACL record.
    @param {function(err)} calllback - Called on completion.
    */
    put(acl, callback) {
        var obj = {
            list: acl
        };
        obj = extend(true, {}, obj);
        obj._id = this._options.docid;

        this._db.get(obj._id, (err, user) => {
            if (!err) {
                obj._rev = user._rev
                this._db.put(obj, err => callback(err));
            } else if (err.status === 404) {
                this._db.put(obj, err => callback(err));
            } else {
                callback(new Error(JSON.stringify(err)));
            }
        });
    }
}

module.exports = PouchDbStore;