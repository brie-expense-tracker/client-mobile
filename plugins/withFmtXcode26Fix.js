const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Xcode 26+ breaks fmt 11.0.2 consteval (react-native#55601).
 * Disables FMT_USE_CONSTEVAL in the installed fmt pod after `pod install`.
 * @see https://github.com/facebook/react-native/issues/55601
 */
const FMT_POST_INSTALL_SNIPPET = `
    # Xcode 26: disable fmt consteval (RN#55601) — patching base.h alone is not enough
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('Xcode 26 forced override')
        patched = content.gsub(
          /^#  define FMT_USE_CONSTEVAL 1$/,
          '#  define FMT_USE_CONSTEVAL 0  // Xcode 26 workaround'
        )
        patched = patched.sub(
          /#endif\\n#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval/,
          "#endif\\n#undef FMT_USE_CONSTEVAL\\n#define FMT_USE_CONSTEVAL 0  // Xcode 26 forced override\\n#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval"
        )
        if patched != content
          File.chmod(0644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |config|
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        unless defs.any? { |d| d.to_s.include?('FMT_USE_CONSTEVAL=0') }
          defs << 'FMT_USE_CONSTEVAL=0'
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
`;

function patchPodfile(podfilePath) {
	if (!fs.existsSync(podfilePath)) {
		return;
	}

	let contents = fs.readFileSync(podfilePath, 'utf8');
	if (contents.includes('Xcode 26 workaround')) {
		return;
	}

	const anchor =
		'# This is necessary for Xcode 14, because it signs resource bundles by default';
	if (contents.includes(anchor)) {
		contents = contents.replace(
			`    ${anchor}`,
			`${FMT_POST_INSTALL_SNIPPET}\n    ${anchor}`
		);
	} else {
		contents = contents.replace(
			/(\n  end\nend\s*$)/,
			`${FMT_POST_INSTALL_SNIPPET}$1`
		);
	}
	fs.writeFileSync(podfilePath, contents);
}

function withFmtXcode26Fix(config) {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			patchPodfile(
				path.join(config.modRequest.platformProjectRoot, 'Podfile')
			);
			return config;
		},
	]);
}

module.exports = withFmtXcode26Fix;
