// MasonOS splash — shown by ksplash while the session starts.
import QtQuick

Rectangle {
    id: root
    color: "#08080a"
    property int stage

    // violet bloom behind the mark
    Rectangle {
        anchors.centerIn: parent
        anchors.verticalCenterOffset: -60
        width: parent.width * 0.55
        height: width
        radius: width / 2
        color: "#8b5cf6"
        opacity: 0.16
        scale: 0.7 + Math.min(root.stage, 6) * 0.05
        Behavior on scale { NumberAnimation { duration: 600; easing.type: Easing.OutCubic } }
    }

    Column {
        anchors.centerIn: parent
        spacing: 18

        Rectangle {
            width: 96
            height: 96
            radius: 26
            anchors.horizontalCenter: parent.horizontalCenter
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#a78bfa" }
                GradientStop { position: 1.0; color: "#4c1d95" }
            }
            Text {
                anchors.centerIn: parent
                text: "M"
                color: "#0b0b0d"
                font.pixelSize: 50
                font.bold: true
                font.family: "Syne"
            }
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "MasonOS"
            color: "#f4f4f5"
            font.pixelSize: 46
            font.bold: true
            font.letterSpacing: -1
            font.family: "Syne"
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "gnome-shaped, plasma-powered"
            color: "#c4b5fd"
            font.pixelSize: 15
            font.family: "DM Sans"
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 220
            height: 4
            radius: 2
            color: "#232330"

            Rectangle {
                height: parent.height
                radius: parent.radius
                width: parent.width * Math.min(1, root.stage / 6)
                color: "#8b5cf6"
                Behavior on width { NumberAnimation { duration: 450; easing.type: Easing.OutCubic } }
            }
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "mason-web // masonos 1.0"
            color: "#71717a"
            font.pixelSize: 11
            font.family: "DM Sans"
        }
    }
}
