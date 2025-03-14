import type { DialConf } from '@viamrobotics/sdk';

export const dialConfigs: Record<string, DialConf> = {
  '9be903c6-73fe-4512-9dae-f5b1f51c4697': {
    host: 'fleet-rover-01-main.ve4ba7w5qr.viam.cloud',
    credentials: {
      type: 'api-key',
      authEntity: 'b92dcf25-63b9-455d-b0ee-81c36a711eae',
      payload: 'dt2geesdok0gy2xfwa3dwx8tacwy7r0k',
    },
    signalingAddress: 'https://app.viam.com:443',
    disableSessions: true,
  },
  'cfc5404e-e269-425d-b1f9-ad7ce18790e9': {
    host: 'fleet-rover-02-main.ytobojb44p.viamstg.cloud',
    credentials: {
      type: 'api-key',
      authEntity: '345298d8-5f12-488f-8bdb-ea9d06b8c182',
      payload: 'uhfart8dg11rbp49v1u2jekois0xlflg',
    },
    signalingAddress: 'https://app.viam.dev:443',
    disableSessions: true,
  },
  '8541ec43-f48b-40b1-a2c9-1ca3695689ad': {
    host: 'bob-main.vhv61cqcmk.viam.cloud',
    credentials: {
      type: 'api-key',
      payload: 'd8c570e0bdvl6rux8orrxbetr9vceycr',
      authEntity: '30e0999c-546c-4091-8bc0-36dba13ba8fa',
    },
    signalingAddress: 'http://localhost:8080',
    disableSessions: true,
  },
};
