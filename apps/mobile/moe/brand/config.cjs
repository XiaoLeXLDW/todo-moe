const todoMoeBrand = require('./config.json');
function getTodoMoeIdentity(channel) {
    if (channel !== 'development' && channel !== 'stable') throw new Error('Invalid Todo Moe channel.');
    const development = channel === 'development';
    return {
        name: `${todoMoeBrand.name}${development ? ' Dev' : ''}`,
        packageName: `${todoMoeBrand.androidPackage}${development ? '.dev' : ''}`,
        scheme: `${todoMoeBrand.scheme}${development ? '-dev' : ''}`,
        channel,
    };
}
module.exports = { todoMoeBrand, getTodoMoeIdentity };
