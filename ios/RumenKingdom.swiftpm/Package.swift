// swift-tools-version: 5.9

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "RumenKingdom",
    platforms: [.iOS("17.0")],
    products: [
        .iOSApplication(
            name: "루멘왕국 공주님의 하루",
            targets: ["AppModule"],
            bundleIdentifier: "com.rumenkingdom.app",
            teamIdentifier: "",
            displayVersion: "1.0.0",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .star),
            accentColor: .presetColor(.purple),
            supportedDeviceFamilies: [.phone, .pad],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ]
        )
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "AppModule",
            dependencies: [],
            path: "Sources"
        )
    ]
)
