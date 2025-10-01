import React, { useState, useCallback, useEffect, useRef } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    imageData?: { base64ImageData: string; imageMimeType: string; fileName?: string },
    audioData?: { audioDataUrl: string; audioMimeType: string }
  ) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; dataUrl: string; base64Data: string } | null>(null);

  // Audio Recording State
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioRecordingDuration, setAudioRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ dataUrl: string; mimeType: string; blob: Blob } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerIntervalRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textBeforeSpeechStartRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    browserSupportsSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (isListening) {
      let interimTranscript = transcript;

      // Spoken punctuation placeholders
      const PERIOD_PLACEHOLDER = "__PERIOD__";
      const COMMA_PLACEHOLDER = "__COMMA__";
      const QUESTION_MARK_PLACEHOLDER = "__QUESTION_MARK__";
      const EXCLAMATION_MARK_PLACEHOLDER = "__EXCLAMATION_MARK__";

      // Replace spoken punctuation with placeholders
      interimTranscript = interimTranscript.replace(/\bperiod\b/gi, ` ${PERIOD_PLACEHOLDER} `);
      interimTranscript = interimTranscript.replace(/\bcomma\b/gi, ` ${COMMA_PLACEHOLDER} `);
      interimTranscript = interimTranscript.replace(/\bquestion mark\b/gi, ` ${QUESTION_MARK_PLACEHOLDER} `);
      interimTranscript = interimTranscript.replace(/\bexclamation mark\b/gi, ` ${EXCLAMATION_MARK_PLACEHOLDER} `);
      interimTranscript = interimTranscript.replace(/\bexclamation point\b/gi, ` ${EXCLAMATION_MARK_PLACEHOLDER} `);

      // Replace placeholders with actual punctuation
      interimTranscript = interimTranscript.replace(new RegExp(PERIOD_PLACEHOLDER, 'g'), '.');
      interimTranscript = interimTranscript.replace(new RegExp(COMMA_PLACEHOLDER, 'g'), ',');
      interimTranscript = interimTranscript.replace(new RegExp(QUESTION_MARK_PLACEHOLDER, 'g'), '?');
      interimTranscript = interimTranscript.replace(new RegExp(EXCLAMATION_MARK_PLACEHOLDER, 'g'), '!');

      // Clean up spacing
      interimTranscript = interimTranscript.replace(/\s+/g, ' ');
      interimTranscript = interimTranscript.replace(/\s+\./g, '.');
      interimTranscript = interimTranscript.replace(/\s+,/g, ',');
      interimTranscript = interimTranscript.replace(/\s+\?/g, '?');
      interimTranscript = interimTranscript.replace(/\s+!/g, '!');
      interimTranscript = interimTranscript.replace(/\.(?=[a-zA-Z0-9])/g, '. ');
      interimTranscript = interimTranscript.replace(/,(?=[a-zA-Z0-9])/g, ', ');
      interimTranscript = interimTranscript.replace(/\?(?=[a-zA-Z0-9])/g, '? ');
      interimTranscript = interimTranscript.replace(/!(?=[a-zA-Z0-9])/g, '! ');

      const finalProcessedTranscript = interimTranscript.trim();
      const base = textBeforeSpeechStartRef.current;
      setInputValue(base + finalProcessedTranscript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const textToSend = inputValue.trim();

    let fileDataToSend;
    if (selectedFile) {
      fileDataToSend = {
        base64ImageData: selectedFile.base64Data,
        imageMimeType: selectedFile.type,
        fileName: selectedFile.name,
      };
    }

    let audioDataToSend;
    if (recordedAudio) {
      audioDataToSend = {
        audioDataUrl: recordedAudio.dataUrl,
        audioMimeType: recordedAudio.mimeType,
      };
    }

    if ((textToSend || fileDataToSend || audioDataToSend) && !isLoading) {
      onSendMessage(textToSend, fileDataToSend, audioDataToSend);
      setInputValue('');
      setSelectedFile(null);
      setRecordedAudio(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      resetTranscript();
      textBeforeSpeechStartRef.current = '';
      if (isListening) stopListening();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, isLoading, onSendMessage, resetTranscript, selectedFile, recordedAudio, isListening, stopListening]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSpeechToTextMicClick = () => {
    if (isAudioRecording) return;
    if (isListening) {
      stopListening();
    } else {
      let currentInput = inputValue;
      let nextBaseText = "";

      const trimmedInputCheck = currentInput.trimRight();

      if (trimmedInputCheck !== "") {
        if (/[.!?]$/.test(trimmedInputCheck)) {
          if (!/\s$/.test(currentInput)) {
            nextBaseText = currentInput + ' ';
          } else {
            nextBaseText = currentInput;
          }
        } else {
          nextBaseText = trimmedInputCheck + '. ';
        }
      } else {
        nextBaseText = "";
      }

      setInputValue(nextBaseText);
      textBeforeSpeechStartRef.current = nextBaseText;
      startListening();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, GIF, WebP).');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSelectedFile({
          name: file.name,
          type: file.type,
          dataUrl: dataUrl,
          base64Data: dataUrl.split(',')[1],
        });
        setRecordedAudio(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startAudioRecording = async () => {
    if (isListening) stopListening();
    setSelectedFile(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });

        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudio({
            dataUrl: reader.result as string,
            mimeType: audioBlob.type,
            blob: audioBlob
          });
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
        if (audioTimerIntervalRef.current !== null) {
          window.clearInterval(audioTimerIntervalRef.current);
          audioTimerIntervalRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsAudioRecording(true);
      setAudioRecordingDuration(0);
      audioTimerIntervalRef.current = window.setInterval(() => {
        setAudioRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting audio recording:", err);
      alert("Could not start audio recording. Please ensure microphone access is allowed.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isAudioRecording) {
      mediaRecorderRef.current.stop();
      setIsAudioRecording(false);
      if (audioTimerIntervalRef.current !== null) {
        window.clearInterval(audioTimerIntervalRef.current);
        audioTimerIntervalRef.current = null;
      }
    }
  };

  const handleAudioRecordButtonClick = () => {
    if (isAudioRecording) {
      stopAudioRecording();
    } else {
      startAudioRecording();
    }
  };

  const discardRecordedAudio = () => {
    setRecordedAudio(null);
    setAudioRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="glass mx-4 mb-4 p-3 sm:p-4 rounded-2xl w-auto">
      {(selectedFile || recordedAudio) && (
        <div className="mb-2 p-2 glass rounded-lg flex items-center justify-between text-sm text-gray-200">
          <div className="flex items-center overflow-hidden">
            {selectedFile && selectedFile.type.startsWith('image/') && (
              <img src={selectedFile.dataUrl} alt="Preview" className="w-10 h-10 mr-2 rounded object-cover shadow-md" />
            )}
            {recordedAudio && (
              <div className="mr-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-assembly-purple mr-1">
                  <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                  <path d="M5.5 8.5A.5.5 0 016 8h1.146a.5.5 0 000-1H6a.5.5 0 01-.5-.5V4.653a2.502 2.502 0 00-1.5-.486V4a3 3 0 013-3h2a3 3 0 013 3v.167a2.502 2.502 0 00-1.5.486V7.5a.5.5 0 01-.5.5H14a.5.5 0 000 1h.146A3.502 3.502 0 0117.5 12v.097a3.5 3.5 0 01-3.422 3.473l-.05.002-.032.001h-.032A3.5 3.5 0 0110.5 19h-.47A3.5 3.5 0 016.5 16v-.5a.5.5 0 01.5-.5h1.53a.5.5 0 000-1H6.5a1.5 1.5 0 01-1.5-1.5V12A3.5 3.5 0 015.5 8.5zM16 12a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
                </svg>
                <audio src={recordedAudio.dataUrl} controls className="h-8 max-w-[150px] sm:max-w-xs"></audio>
                <span className="ml-2 text-gray-300 text-xs">({formatDuration(audioRecordingDuration)})</span>
              </div>
            )}
            {selectedFile && (
              <>
                <span className="truncate" title={selectedFile.name}>{selectedFile.name}</span>
                <span className="ml-2 text-gray-300 text-xs">({selectedFile.type})</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={selectedFile ? clearSelectedFile : discardRecordedAudio}
            className="p-1 text-gray-300 hover:text-white rounded-full transition-colors"
            aria-label={selectedFile ? "Clear selected file" : "Discard recorded audio"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-end glass-strong rounded-xl p-2 sm:p-2.5 shadow-lg">
        {browserSupportsSpeechRecognition && (
          <button
            type="button"
            onClick={handleSpeechToTextMicClick}
            disabled={isLoading || isAudioRecording}
            className={`p-2.5 rounded-full text-white transition-all duration-300 ease-in-out mr-1.5 sm:mr-2 self-center shadow-lg transform hover:scale-110
              ${isListening ? 'bg-gradient-mic-listening animate-pulse-slow'
                : (isAudioRecording ? 'bg-gray-500 bg-opacity-50 cursor-not-allowed opacity-50' : 'bg-gradient-mic hover:shadow-xl')}`}
            aria-label={isListening ? "Stop speech-to-text" : "Start speech-to-text"}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5 3.75a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM14.25 3.75a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" /><path d="M5.5 8.5A.5.5 0 016 8h8a.5.5 0 010 1H6a.5.5 0 01-.5-.5z" /><path d="M9 12.5a.5.5 0 001 0V11a.5.5 0 00-1 0v1.5z" /></svg>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleAudioRecordButtonClick}
          disabled={isLoading || isListening}
          className={`p-2.5 rounded-full text-white transition-all duration-300 ease-in-out mr-1.5 sm:mr-2 self-center shadow-lg transform hover:scale-110
            ${isAudioRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse-slow'
              : (isListening ? 'bg-gray-500 bg-opacity-50 cursor-not-allowed opacity-50' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-xl')}`}
          aria-label={isAudioRecording ? "Stop audio message recording" : "Record audio message"}
        >
          {isAudioRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" /></svg>
          )}
        </button>
        {isAudioRecording && (
          <span className="text-xs text-assembly-pink font-medium self-center ml-1 mr-1">{formatDuration(audioRecordingDuration)}</span>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label="Upload file"
          disabled={isAudioRecording || isListening}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isAudioRecording || isListening}
          className={`p-2.5 rounded-full text-white transition-all duration-300 ease-in-out mr-1.5 sm:mr-2 self-center shadow-lg transform hover:scale-110
            ${isLoading || isAudioRecording || isListening ? 'bg-gray-600 bg-opacity-50 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl'}`}
          aria-label="Attach file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 117.44 12.56l3.45-3.554a.75.75 0 011.06 1.06l-3.45 3.554a1.125 1.125 0 001.591 1.591l3.455-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            if (!isListening && !isAudioRecording) {
              setInputValue(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening ? "Listening... (say 'period', 'comma', etc.)"
              : isAudioRecording ? "Recording audio message..."
                : "Type, speak, or attach..."
          }
          className="flex-grow p-2 bg-transparent text-gray-100 placeholder-gray-400 focus:outline-none resize-none min-h-[2.5rem] max-h-48 overflow-y-auto"
          rows={1}
          readOnly={isListening || isAudioRecording}
          aria-label="Chat message input"
          style={{ lineHeight: '1.5rem' }}
        />
        <button
          type="submit"
          disabled={isLoading || (!inputValue.trim() && !selectedFile && !recordedAudio) || isAudioRecording}
          className={`ml-1 sm:ml-2 p-2.5 rounded-full text-white transition-all duration-300 ease-in-out self-center shadow-lg transform hover:scale-110
            ${isLoading || (!inputValue.trim() && !selectedFile && !recordedAudio) || isAudioRecording ? 'bg-gray-600 bg-opacity-50 cursor-not-allowed opacity-50' : 'bg-assembly-green-dark hover:bg-assembly-green hover:shadow-xl'}`}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3.105 3.105a.5.5 0 01.707 0L19.5 18.293V13.5a.5.5 0 011 0v6a.5.5 0 01-.5.5h-6a.5.5 0 010-1h4.793L3.105 3.812a.5.5 0 010-.707z" />
            </svg>
          )}
        </button>
      </div>
      {speechError && <p className="text-xs text-red-400 mt-2 text-center font-medium">{speechError}</p>}
      {!browserSupportsSpeechRecognition && !speechError && (
        <p className="text-xs text-yellow-400 mt-2 text-center font-medium">
          Voice input is not supported by your browser. Try Chrome or Edge.
        </p>
      )}
    </form>
  );
});

export default ChatInput;
