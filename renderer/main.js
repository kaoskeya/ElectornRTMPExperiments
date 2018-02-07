const electron = require('electron')
const fs = require('fs')
const path = require('path')
const {app} = require('electron').remote

const {getNextDirectoryName, WORKING_DIRECTORY} = require("../utils/dirs")

var audioInputSelect = document.querySelector('select#audio-source')
var videoSelect = document.querySelector('select#video-source')
var selectors = [audioInputSelect, videoSelect]
var videoDirectory

document.querySelector('#start-recording').addEventListener('click', () => {
    const recording_directory = getNextDirectoryName(app)
    videoDirectory = path.join(app.getPath('desktop'), WORKING_DIRECTORY, recording_directory)
    startRecording();
});

document.querySelector('#stop-recording').addEventListener('click', () => {
    stopRecording();
});

var recorder;
var blobs = [];

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
        return select.value;
    });
    selectors.forEach(function(select) {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || 'microphone ' + (audioInputSelect.length + 1);
            audioInputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
            videoSelect.appendChild(option);
        }
    }
    selectors.forEach(function(select, selectorIndex) {
        if (Array.prototype.slice.call(select.childNodes).some(function(n) {
            return n.value === values[selectorIndex];
        })) {
            select.value = values[selectorIndex];
        }
    });
}

navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
    });

function startRecording() {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    var audioSource = audioInputSelect.value;
    if(audioSource) {
        var constraints = {
            audio: {
                deviceId: audioSource ? {exact: audioSource} : undefined,
                echoCancellation: true
            },
            video: false
        };
        navigator.mediaDevices.getUserMedia(constraints).
            then(function(audioStream) {
                navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            minWidth: width,
                            maxWidth: width,
                            minHeight: height,
                            maxHeight: height
                        }
                    }
                }).then(handleVideoStream(audioStream)).catch(handleUserMediaError);
            }).then(function(){}).catch(handleAudioError);
    } else {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    minWidth: width,
                    maxWidth: width,
                    minHeight: height,
                    maxHeight: height
                }
            }
        }).then(handleVideoStream(null)).catch(handleUserMediaError)
    }
}

function handleAudioError (err) {
    console.error("Audio error: ", err)
}

function handleVideoStream (audioStream) {
    return function(videoStream) {
        if(audioStream) {
            let audioTracks = audioStream.getAudioTracks();
            if (audioTracks.length > 0) {
                videoStream.addTrack(audioTracks[0]);
            }
        }
        recorder = new MediaRecorder(videoStream);
        blobs = [];
        recorder.ondataavailable = function(event) {
            blobs.push(event.data);
            saveFile();
        };
        recorder.start();
    }
}

function saveFile() {
    toArrayBuffer(new Blob(blobs, {type: 'video/webm'}), function(ab) {
        var buffer = toBuffer(ab);
        var file = path.join(videoDirectory, 'video.webm');
        fs.writeFile(file, buffer, function(err) {
            if (err) {
                console.error('Failed to save video ' + err);
            } else {
                // console.log('Saved video: ' + file);
            }
        });
    });
}

function stopRecording() {
    recorder.stop();
}

function handleUserMediaError(error) {
    console.error('navigator.getUserMedia error: ', error);
}

function toArrayBuffer(blob, cb) {
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let arrayBuffer = this.result;
        cb(arrayBuffer);
    };
    fileReader.readAsArrayBuffer(blob);
}

function toBuffer(ab) {
    let buffer = new Buffer(ab.byteLength);
    let arr = new Uint8Array(ab);
    for (let i = 0; i < arr.byteLength; i++) {
        buffer[i] = arr[i];
    }
    return buffer;
}
