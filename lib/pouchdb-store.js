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
        obj._id = this._options.docId;

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
