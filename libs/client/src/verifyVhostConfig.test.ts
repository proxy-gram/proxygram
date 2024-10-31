import { verifyVhostConfig } from './verifyVhostConfig';

describe('verifyVhostConfig', () => {
  test('duplicate subdomain', () => {
    const vhostconfig = ['example-omics42:3000', 'example-omics42:4200'];
    expect(() => verifyVhostConfig(vhostconfig)).toThrowError(
      'Invalid vhost configuration: example-omics42:4200, duplicate subdomain'
    );
  });
  test('missing username suffix', () => {
    const vhostconfig = ['example:3000'];
    expect(() => verifyVhostConfig(vhostconfig)).toThrowError(
      'Invalid vhost configuration: example:3000, subdomain must be suffixed with a username'
    );
  });
  test('different usernames', () => {
    const vhostconfig = ['example-omics42:3000', 'example-omics43:4200'];
    expect(() => verifyVhostConfig(vhostconfig)).toThrowError(
      'Invalid vhost configuration: example-omics43:4200, all vhosts must have the same username'
    );
  });
  test('correct vhost configuration', () => {
    const vhostconfig = ['backend-omics42:3000', 'frontend-omics42:4200'];
    expect(verifyVhostConfig(vhostconfig)).toEqual([
      { subdomain: 'backend-omics42', port: 3000 },
      { subdomain: 'frontend-omics42', port: 4200 },
    ]);
  });
});
