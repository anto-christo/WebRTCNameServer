module.exports = {
    name: "ServerInfo",
    doctype: "DocType",
    isSingle: 0,

    fields: [
        {
            fieldname: "serverKey",
            label: "Server Key",
            fieldtype: "Data",
            required: 1
        },
        {
            fieldname: "socketID",
            label: "Scoket",
            fieldtype: "Data"
        }
    ]
};