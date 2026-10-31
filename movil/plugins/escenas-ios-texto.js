// La parte pura del complemento de escenas (C-APP-IOS-3): el texto de SceneDelegate, el manifiesto de
// Info.plist y el cambio del AppDelegate. Sin require de Expo, para que la prueba de la raíz corra en GitHub.
const ESCENA = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const MANIFIESTO = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

/** El arranque sin ventana propia (el texto exacto de la plantilla de Expo 57). */
function conEscenas(codigo) {
  let c = codigo.replace(
    /class AppDelegate: ExpoAppDelegate \{/,
    'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
  );
  c = c.replace(
    /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n[\s\S]*?\)\n#endif\n/,
    '    // La ventana la crea SceneDelegate y ahí arranca React Native (escenas, exigidas por iOS 27).\n',
  );
  return c;
}

module.exports = { ESCENA, MANIFIESTO, conEscenas };
