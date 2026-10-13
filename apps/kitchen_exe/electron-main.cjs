const { app, BrowserWindow } = require("electron");
const path = require("path");
function create() {
  const w = new BrowserWindow({ width: 1280, height: 800, autoHideMenuBar: true, title: "Aise Bites Kitchen", icon: path.join(__dirname, "build/icon.png"), webPreferences: { preload: path.join(__dirname, "preload.cjs") } });
  if (process.env.VITE_DEV_SERVER_URL) w.loadURL(process.env.VITE_DEV_SERVER_URL);
  else w.loadFile(path.join(__dirname, "dist/index.html"));
}
app.whenReady().then(() => { create(); app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && create()); });
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
// Printer bridge stub: renderer calls window.printer.printKOT(ticket) -> ESC/POS here (usb/lan/bt)
