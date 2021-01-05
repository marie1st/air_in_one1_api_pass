const path = require("path")
const process = require("process")
require('dotenv').config({path: path.resolve(__dirname, '../.env')})

jest.setTimeout(30000);

const { default: place } = require("./place");
const { default: auth } = require("./auth");
const { default: device } = require("./device");

global.deepMode = true;

describe("Test Auth", auth);
describe("Test Places", place)
describe("Test Devices", device)