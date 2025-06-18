const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");

exports.writeToJSON = async (data, filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

exports.writeToCSV = async (data, filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const headers = Object.keys(data[0] || {}).map((key) => ({ id: key, title: key }));
  const writer = createObjectCsvWriter({ path: filePath, header: headers });
  await writer.writeRecords(data);
};
