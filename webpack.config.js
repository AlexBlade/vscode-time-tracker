const extensionBuild = require('./build-config/extension.build');

const wpbuild = (env, args) => {
    console.log('Buidl process started');
    console.info('Checking build mode:');
    let mode = (args.mode || (env && env.mode ? env.mode : 'development')).toLowerCase();
    mode = (mode === 'production' ? mode : 'development');
    console.info(`Build mode: ${mode}`);

    const configs = [];
    configs.push(extensionBuild(mode));
    return configs;
};

module.exports = wpbuild;
