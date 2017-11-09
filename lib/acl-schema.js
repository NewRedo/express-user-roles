"use strict";

const path = require("path");
const fs = require("fs");
const Ajv = require("ajv");

const schemaPath = path.join(__dirname, "../acl.json-schema");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const aclSchemaValidator = (new Ajv()).compile(schema);

module.exports = aclSchemaValidator;