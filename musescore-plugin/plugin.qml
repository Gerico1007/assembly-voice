// MuseScore 4.x QML Plugin Skeleton (Qt6)
// Dialog-type plugin with WebSocket client hooks (skeleton only)
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtWebSockets 1.15

// NOTE: This is a skeleton for development; actual Plugin API imports and
// execution calls (curScore, cmd, etc.) are added in later phases.

ApplicationWindow {
  id: root
  title: "Assembly Voice Bridge"
  visible: true
  width: 420
  height: 300

  property string serverUrl: "wss://localhost:3000" // adjust port
  property string authToken: ""

  Column {
    anchors.fill: parent
    anchors.margins: 16
    spacing: 8

    TextField {
      id: urlField
      placeholderText: "WebSocket URL (wss://...)"
      text: root.serverUrl
      onEditingFinished: root.serverUrl = text
    }

    TextField {
      id: tokenField
      placeholderText: "Auth token (optional)"
      echoMode: TextInput.Password
      text: root.authToken
      onEditingFinished: root.authToken = text
    }

    Row {
      spacing: 8
      Button { text: ws.active ? "Disconnect" : "Connect"; onClicked: ws.active ? ws.active = false : ws.active = true }
      Button { text: "Ping"; onClicked: sendPing() }
    }

    TextArea { id: logArea; readOnly: true; wrapMode: Text.Wrap; height: 160 }
  }

  WebSocket {
    id: ws
    active: false
    url: root.serverUrl
    onStatusChanged: {
      log("Status: " + status)
      if (status === WebSocket.Open) {
        const hello = { type: 'hello', token: root.authToken };
        sendTextMessage(JSON.stringify(hello))
      }
    }
    onTextMessageReceived: function(message) {
      log("RX: " + message)
      // TODO: parse and execute commands using MuseScore Plugin API
    }
    onErrorStringChanged: log("Error: " + errorString)
  }

  function sendPing() {
    if (ws.status === WebSocket.Open) {
      const msg = { type: 'ping', ts: Date.now() }
      ws.sendTextMessage(JSON.stringify(msg))
      log("TX: ping")
    } else {
      log("WS not open")
    }
  }

  function log(s) {
    logArea.text = (new Date()).toISOString() + " | " + s + "\n" + logArea.text
  }
}

