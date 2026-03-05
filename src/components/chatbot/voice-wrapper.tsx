'use client';

/**
 * @fileOverview Wrapper that connects the Voice FAB + Voice Assistant Modal
 * to the ChatProvider context. Placed in the global layout next to ChatFab/ChatModal.
 */

import { useChatbot } from './chat-provider';
import VoiceFab from './voice-fab';
import VoiceAssistantModal from './voice-assistant-modal';

export default function VoiceWrapper() {
    const { isOpen, isVoiceOpen, openVoice, closeVoice } = useChatbot();

    return (
        <>
            {/* Voice FAB — hidden when chat or voice modal is open */}
            <VoiceFab
                onClick={openVoice}
                isHidden={isOpen || isVoiceOpen}
            />
            {/* Full-screen voice assistant modal */}
            <VoiceAssistantModal
                isOpen={isVoiceOpen}
                onClose={closeVoice}
            />
        </>
    );
}
