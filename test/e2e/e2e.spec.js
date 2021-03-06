import { Application } from 'spectron';
// import electronPath from 'electron';
import path from 'path';

let electronPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron');
if (process.platform === 'win32') electronPath += '.cmd';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

const delay = time => new Promise(resolve => setTimeout(resolve, time));

describe('main window', function spec() {
  beforeAll(async () => {
    // console.log('electronPath', electronPath);
    this.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '..', '..', 'app')]
    });

    return this.app.start();
  });

  afterAll(() => {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  it('should open window', async () => {
    const { client, browserWindow } = this.app;

    await client.waitUntilWindowLoaded();
    await delay(500);
    const title = await browserWindow.getTitle();
    expect(title).toBe('Electron TTF');
  });

  it("should haven't any logs in console of main window", async () => {
    const { client } = this.app;
    const logs = await client.getRenderProcessLogs();
    // Print renderer process logs
    logs.forEach(log => {
      console.log(log.message);
      console.log(log.source);
      console.log(log.level);
      expect(log.level).not.toEqual('SEVERE');
    });
    // @NOTE: Temporarily have to disable this assertion because there are some warnings in
    //        electron@2. Loading files from localhost in development uses http and this causes
    //        electron to throw warnings
    // expect(logs).toHaveLength(0);
  });
});
