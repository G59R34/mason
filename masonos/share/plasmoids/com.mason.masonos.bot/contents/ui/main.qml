// MasonOS · Mason Bot panel widget
// Styled from mason-web (src/styles/mason-bot.css + global.css tokens):
// #101014 card, #f4f4f5 ink, #a1a1aa muted, #c4b5fd accent, #8b5cf6 strong,
// violet radial avatar, 13-16px radii. Talks to the local bridge on :8765.

import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid

PlasmoidItem {
    id: root

    readonly property color inkColor: "#f4f4f5"
    readonly property color mutedColor: "#a1a1aa"
    readonly property color accentColor: "#c4b5fd"
    readonly property color accentStrong: "#8b5cf6"
    readonly property color cardColor: "#101014"
    readonly property color lineColor: Qt.rgba(1, 1, 1, 0.08)
    // This Qt build only exposes the single-family grouped property; missing
    // families fall back through fontconfig to Noto Sans.
    readonly property string displayFamily: "Syne"
    readonly property string bodyFamily: "DM Sans"

    readonly property string greeting: "I'm Mason Bot. Mason is a real man with real sessions and a 4-to-12-business-day texting problem. I'm the part of the business that answers."
    readonly property var starters: ["What does it cost?", "How fast do you reply?", "Can you book me?"]

    property var thread: []
    property bool busy: false

    function pushMessage(role, content) {
        const next = root.thread.slice();
        next.push({ role: role, content: content });
        root.thread = next;
    }

    function send(text) {
        const content = String(text || "").trim();
        if (!content || root.busy) {
            return;
        }
        const outgoing = root.thread.slice();
        outgoing.push({ role: "user", content: content });
        root.thread = outgoing;
        root.busy = true;

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://127.0.0.1:8765/ask");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }
            root.busy = false;
            let payload = null;
            try {
                payload = JSON.parse(xhr.responseText);
            } catch (error) {
                payload = null;
            }
            if (xhr.status === 200 && payload && payload.reply) {
                root.pushMessage("assistant", payload.reply);
            } else if (payload && payload.error) {
                root.pushMessage("assistant", "Line's dead. " + payload.error);
            } else if (xhr.status === 0) {
                root.pushMessage("assistant", "The Mason Bot bridge is not running. Run `masonosctl on` and try again.");
            } else {
                root.pushMessage("assistant", "Line's dead. No answer.");
            }
        };
        xhr.send(JSON.stringify({ messages: outgoing }));
    }

    Component.onCompleted: root.pushMessage("assistant", root.greeting)

    toolTipMainText: "Mason Bot"
    toolTipSubText: root.busy ? "typing…" : "The 3% that replies"
    preferredRepresentation: compactRepresentation

    // ── Panel pill ────────────────────────────────────────────────────────
    compactRepresentation: MouseArea {
        id: compact
        implicitWidth: pill.implicitWidth
        implicitHeight: pill.implicitHeight
        // Panels lay applets out inside a Layout, so the width has to be
        // advertised there too; implicitWidth alone left the applet collapsed
        // to the avatar and the label painted over the system tray.
        Layout.preferredWidth: pill.implicitWidth
        Layout.minimumWidth: pill.implicitWidth
        Layout.preferredHeight: pill.implicitHeight
        Layout.maximumHeight: pill.implicitHeight
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.expanded = !root.expanded

        // Width is computed from the label, not a positioner: the applet's hit
        // area is the pill's implicitWidth, so a collapsed Row made the label
        // paint outside the clickable region.
        Rectangle {
            id: pill
            implicitWidth: avatar.width + 7 + pillLabel.implicitWidth + 22
            implicitHeight: 28
            radius: height / 2
            color: compact.containsMouse ? Qt.rgba(1, 1, 1, 0.10) : Qt.rgba(1, 1, 1, 0.05)
            border.width: 1
            border.color: Qt.rgba(0.768, 0.709, 0.992, 0.30)

            Rectangle {
                id: avatar
                width: 18
                height: 18
                radius: 9
                anchors.left: parent.left
                anchors.leftMargin: 11
                anchors.verticalCenter: parent.verticalCenter
                gradient: Gradient {
                    GradientStop { position: 0.0; color: "#a78bfa" }
                    GradientStop { position: 1.0; color: "#4c1d95" }
                }
                Text {
                    anchors.centerIn: parent
                    text: "MB"
                    color: "#0b0b0d"
                    font.pixelSize: 7
                    font.bold: true
                    font.family: root.displayFamily
                }
            }

            Text {
                id: pillLabel
                anchors.left: avatar.right
                anchors.leftMargin: 7
                anchors.verticalCenter: parent.verticalCenter
                text: "Mason Bot"
                color: root.inkColor
                font.pixelSize: 11
                font.weight: Font.DemiBold
                font.family: root.bodyFamily
            }
        }
    }

    // ── Chat popup ────────────────────────────────────────────────────────
    fullRepresentation: Item {
        implicitWidth: 388
        implicitHeight: 524

        Rectangle {
            anchors.fill: parent
            radius: 16
            color: root.cardColor
            border.width: 1
            border.color: Qt.rgba(0.768, 0.709, 0.992, 0.22)
            clip: true

            Item {
                id: header
                anchors {
                    top: parent.top
                    left: parent.left
                    right: parent.right
                    topMargin: 1
                    leftMargin: 1
                    rightMargin: 1
                }
                height: 60

                Row {
                    id: identity
                    anchors.left: parent.left
                    anchors.leftMargin: 14
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 10

                    Rectangle {
                        width: 34
                        height: 34
                        radius: 17
                        gradient: Gradient {
                            GradientStop { position: 0.0; color: "#a78bfa" }
                            GradientStop { position: 1.0; color: "#4c1d95" }
                        }
                        Text {
                            anchors.centerIn: parent
                            text: "MB"
                            color: "#0b0b0d"
                            font.pixelSize: 11
                            font.bold: true
                            font.family: root.displayFamily
                        }
                    }

                    Column {
                        spacing: 1

                        Row {
                            spacing: 6

                            Text {
                                text: "Mason Bot"
                                color: root.inkColor
                                font.pixelSize: 14
                                font.bold: true
                                font.family: root.displayFamily
                            }

                            Rectangle {
                                width: badge.implicitWidth + 10
                                height: 15
                                radius: 7.5
                                color: Qt.rgba(0.545, 0.361, 0.965, 0.22)

                                Text {
                                    id: badge
                                    anchors.centerIn: parent
                                    text: "AI"
                                    color: root.accentColor
                                    font.pixelSize: 8
                                    font.bold: true
                                    font.family: root.bodyFamily
                                }
                            }
                        }

                        Text {
                            text: root.busy ? "typing…" : "Ready"
                            color: root.mutedColor
                            font.pixelSize: 11
                            font.family: root.bodyFamily
                        }
                    }
                }

                Rectangle {
                    id: closeButton
                    width: 28
                    height: 28
                    radius: 14
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.verticalCenter: parent.verticalCenter
                    color: closeArea.containsMouse ? Qt.rgba(1, 1, 1, 0.08) : "transparent"
                    border.width: 1
                    border.color: root.lineColor

                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        color: root.mutedColor
                        font.pixelSize: 11
                    }

                    MouseArea {
                        id: closeArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.expanded = false
                    }
                }

                Rectangle {
                    anchors {
                        left: parent.left
                        right: parent.right
                        bottom: parent.bottom
                    }
                    height: 1
                    color: root.lineColor
                }
            }

            ListView {
                id: transcript
                anchors {
                    top: header.bottom
                    left: parent.left
                    right: parent.right
                    bottom: starters.top
                    leftMargin: 14
                    rightMargin: 14
                    topMargin: 12
                }
                clip: true
                spacing: 8
                model: root.thread
                onCountChanged: positionViewAtEnd()

                footer: Item {
                    width: transcript.width
                    height: root.busy ? 30 : 0
                    visible: root.busy
                    clip: true

                    Text {
                        x: 2
                        y: 6
                        text: "typing…"
                        color: root.mutedColor
                        font.pixelSize: 11
                        font.italic: true
                        font.family: root.bodyFamily
                    }
                }

                delegate: Item {
                    width: ListView.view.width
                    height: bubble.height + 8

                    TextMetrics {
                        id: metrics
                        font: body.font
                        text: modelData.content
                    }

                    Rectangle {
                        id: bubble
                        width: Math.min(metrics.width + 26, transcript.width * 0.84)
                        height: body.implicitHeight + 18
                        x: modelData.role === "user" ? parent.width - width : 0
                        radius: 13
                        color: modelData.role === "user"
                            ? Qt.rgba(0.545, 0.361, 0.965, 0.22)
                            : Qt.rgba(1, 1, 1, 0.05)
                        border.width: 1
                        border.color: modelData.role === "user"
                            ? Qt.rgba(0.545, 0.361, 0.965, 0.55)
                            : root.lineColor

                        Text {
                            id: body
                            x: 13
                            y: 9
                            width: bubble.width - 26
                            text: modelData.content
                            color: root.inkColor
                            wrapMode: Text.Wrap
                            font.pixelSize: 12
                            font.family: root.bodyFamily
                        }
                    }
                }
            }

            Flow {
                id: starters
                anchors {
                    left: parent.left
                    right: parent.right
                    bottom: composer.top
                    leftMargin: 14
                    rightMargin: 14
                    bottomMargin: 10
                }
                spacing: 8
                visible: root.thread.length < 2 && !root.busy
                height: visible ? implicitHeight : 0

                Repeater {
                    model: root.starters

                    delegate: Rectangle {
                        width: starterLabel.implicitWidth + 22
                        height: 28
                        radius: 14
                        color: "transparent"
                        border.width: 1
                        border.color: root.lineColor

                        Text {
                            id: starterLabel
                            anchors.centerIn: parent
                            text: modelData
                            color: root.accentColor
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                            font.family: root.bodyFamily
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.send(modelData)
                        }
                    }
                }
            }

            Item {
                id: composer
                anchors {
                    left: parent.left
                    right: parent.right
                    bottom: parent.bottom
                }
                height: 58

                Rectangle {
                    anchors {
                        top: parent.top
                        left: parent.left
                        right: parent.right
                    }
                    height: 1
                    color: root.lineColor
                }

                Row {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    QQC2.TextField {
                        id: input
                        width: parent.width - sendButton.width - parent.spacing
                        height: 38
                        anchors.verticalCenter: parent.verticalCenter
                        placeholderText: "Ask the cheap version of Mason"
                        placeholderTextColor: "#71717a"
                        color: root.inkColor
                        font.pixelSize: 12
                        font.family: root.bodyFamily
                        enabled: !root.busy
                        selectByMouse: true
                        onAccepted: {
                            root.send(text);
                            text = "";
                        }
                        background: Rectangle {
                            radius: 10
                            color: "#0b0b0e"
                            border.width: 1
                            border.color: input.activeFocus ? root.accentStrong : root.lineColor
                        }
                    }

                    Rectangle {
                        id: sendButton
                        width: 62
                        height: 34
                        radius: 17
                        anchors.verticalCenter: parent.verticalCenter
                        color: root.busy || input.text.trim() === ""
                            ? Qt.rgba(0.545, 0.361, 0.965, 0.30)
                            : root.accentColor

                        Text {
                            anchors.centerIn: parent
                            text: "Send"
                            color: "#0b0b0d"
                            font.pixelSize: 11
                            font.bold: true
                            font.family: root.bodyFamily
                        }

                        MouseArea {
                            anchors.fill: parent
                            enabled: !root.busy && input.text.trim() !== ""
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                root.send(input.text);
                                input.text = "";
                            }
                        }
                    }
                }
            }
        }
    }
}
