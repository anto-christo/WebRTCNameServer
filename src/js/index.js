const frappe = require('frappejs');
const common = require('frappejs/common')
const coreModels = require('frappejs/models');
const HTTPClient = require('frappejs/backends/http');
const Observable = require('frappejs/utils/observable');

const server = 'localhost:8080';
window.frappe = frappe;
frappe.init();
frappe.registerLibs(common);
frappe.registerModels(coreModels);
frappe.fetch = window.fetch.bind();
frappe.db = new HTTPClient({ server });
frappe.docs = new Observable();

var socket = io.connect();