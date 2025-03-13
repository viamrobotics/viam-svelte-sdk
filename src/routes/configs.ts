import type { DialConf } from '@viamrobotics/sdk';

export const partID1 = '9be903c6-73fe-4512-9dae-f5b1f51c4697';
export const partID2 = 'cfc5404e-e269-425d-b1f9-ad7ce18790e9';

export const dialConfigs: Record<string, DialConf> = {
	[partID1]: {
		host: 'fleet-rover-01-main.ve4ba7w5qr.viam.cloud',
		credentials: {
			type: 'api-key',
			authEntity: '<API-KEY-ID>',
			payload: '<API-KEY>',
		},
		signalingAddress: 'https://app.viam.com:443',
		disableSessions: true,
	},
	[partID2]: {
		host: 'fleet-rover-02-main.ytobojb44p.viamstg.cloud',
		credentials: {
			type: 'api-key',
			authEntity: '<API-KEY-ID>',
			payload: '<API-KEY>',
		},
		signalingAddress: 'https://app.viam.dev:443',
		disableSessions: true,
	},
};
