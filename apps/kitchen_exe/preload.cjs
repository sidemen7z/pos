const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("printer", { printKOT: (t) => console.log("KOT print", t), testPrint: () => console.log("test print 80mm/58mm") });
contextBridge.exposeInMainWorld("appInfo", { brand: "AiseServe", company: "Aise360" });
