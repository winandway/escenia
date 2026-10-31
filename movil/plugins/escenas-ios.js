// Ciclo de vida por escenas en iPhone (C-APP-IOS-3, 31 oct 2026). Tomado del complemento ya probado
// en Divoox (C-ESCENAS-IOS): iOS 27 cierra al abrir toda app que no adopte las escenas (UIScene); la
// plantilla nativa de Expo 57 todavía arranca sin ellas. Pasó de verdad: la primera compilación de
// Escenia se cerraba sola en el simulador con iOS 27. Se quita apenas la app pase a Expo 58.
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const { ESCENA, MANIFIESTO, conEscenas } = require('./escenas-ios-texto');

function escenasIos(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = MANIFIESTO;
    return c;
  });
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift')
      throw new Error('escenas-ios: se esperaba AppDelegate en Swift');
    const nuevo = conEscenas(c.modResults.contents);
    if (!nuevo.includes('ExpoReactNativeFactoryProvider') || nuevo.includes('UIWindow(frame:'))
      throw new Error('escenas-ios: la plantilla de AppDelegate cambió; revisar el complemento');
    c.modResults.contents = nuevo;
    return c;
  });
  config = withDangerousMod(config, [
    'ios',
    (c) => {
      const nombre = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
      // La ruta sale del propio proyecto de Expo, no de una entrada externa.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(
        path.join(c.modRequest.platformProjectRoot, nombre, 'SceneDelegate.swift'),
        ESCENA,
      );
      return c;
    },
  ]);
  config = withXcodeProject(config, (c) => {
    const nombre = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    const archivo = `${nombre}/SceneDelegate.swift`;
    if (!c.modResults.hasFile(archivo))
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: archivo,
        groupName: nombre,
        project: c.modResults,
      });
    return c;
  });
  return config;
}

module.exports = escenasIos;
module.exports.conEscenas = conEscenas;
module.exports.MANIFIESTO = MANIFIESTO;
