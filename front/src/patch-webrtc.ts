// WebRTC Patch for VPN/Network issues
// This ensures the external TURN server is used to bypass VPN/DNS issues

const patchRTCPeerConnection = () => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
        console.warn('[TURN PATCH] RTCPeerConnection not available');
        return;
    }

    if ((window as any).__RTCPeerConnectionPatched) {
        // console.log('[TURN PATCH] Already patched, skipping');
        return;
    }

    const OriginalRTCPeerConnection = window.RTCPeerConnection;

    const ExternalTurnServer: RTCIceServer = {
        urls: ['turn:212.192.217.217:3478'],
        username: 'turnuser',
        credential: '4089f0b7dffe89ccb5e08998d371939c'
    };

    console.log('[TURN PATCH] Patching RTCPeerConnection, external TURN:', ExternalTurnServer);

    const PatchedRTCPeerConnection = function (this: RTCPeerConnection, configuration?: RTCConfiguration): RTCPeerConnection {
        const existingIceServers = configuration?.iceServers || [];

        console.log('[TURN PATCH] RTCPeerConnection created, existing ICE servers:', existingIceServers);

        const customIceServers: RTCIceServer[] = [
            ExternalTurnServer,
            ...existingIceServers
        ];

        console.log('[TURN PATCH] Patched ICE servers:', customIceServers);

        const patchedConfiguration: RTCConfiguration = {
            ...configuration,
            iceServers: customIceServers
        };

        return new OriginalRTCPeerConnection(patchedConfiguration);
    } as unknown as { new(configuration?: RTCConfiguration): RTCPeerConnection; prototype: RTCPeerConnection; };

    PatchedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    Object.setPrototypeOf(PatchedRTCPeerConnection, OriginalRTCPeerConnection);

    Object.getOwnPropertyNames(OriginalRTCPeerConnection).forEach(name => {
        if (name !== 'prototype' && name !== 'length' && name !== 'name') {
            try {
                (PatchedRTCPeerConnection as any)[name] = (OriginalRTCPeerConnection as any)[name];
            } catch (e) {
                // Ignore errors
            }
        }
    });

    window.RTCPeerConnection = PatchedRTCPeerConnection as any;
    (window as any).__RTCPeerConnectionPatched = true;
    console.log('[TURN PATCH] RTCPeerConnection patched successfully');
};

// Execute immediately
patchRTCPeerConnection();
