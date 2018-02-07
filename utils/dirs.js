const fs = require('fs');
const { app } = require('electron');
const path = require('path');

const WORKING_DIRECTORY = "electronrtmp"
const DIRECTORY_PREFIX = "test"

module.exports = {
    setupWorkingDirectory,
    getNextDirectoryName,
    WORKING_DIRECTORY
}

function setupWorkingDirectory() {
    // Check if WORKING_DIRECTORY exits, if not, create it
    if (!fs.existsSync(path.join(app.getPath('desktop'), WORKING_DIRECTORY))) {
        fs.mkdirSync(path.join(app.getPath('desktop'), WORKING_DIRECTORY));
    }
}

function getNextDirectoryName(app) {
    const dirs = fs.readdirSync(
        path.join(
            app.getPath('desktop'),
            WORKING_DIRECTORY
        )
    );

    const newDirectory = `${DIRECTORY_PREFIX}-${dirs.length + 1}`;
    fs.mkdirSync(path.join(app.getPath('desktop'), WORKING_DIRECTORY, newDirectory));
    return newDirectory
}

