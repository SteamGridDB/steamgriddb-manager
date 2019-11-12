export class Remote {
    constructor(remote) {
        this.remote = remote;
        this.platform = process.platform;
        this.systemPreferences = new SystemPreferences(this.remote);
    }

    getCurrentWindow() {
        return this.remote.getCurrentWindow();
    }
}

class SystemPreferences {
    constructor(remote) {
        this.remote = remote;
    }

    getAccentColor() {
        if (process.platform === 'win32') {
            return this.remote.getAccentColor();
        } else {
            // TODO: change this hard-coded colour
            return '00FF00';
        }
    }
}

export default Remote;