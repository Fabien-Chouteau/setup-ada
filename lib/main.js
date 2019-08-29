"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const path = require("path");
const sha1File = require('sha1-file');
const IS_WINDOWS = process.platform === 'win32';
const scripts_base_url = "https://raw.githubusercontent.com/AdaCore/gnat_community_install_script/master/";
const install_script_qs_url = scripts_base_url + "install_script.qs";
const install_package_sh_url = scripts_base_url + "install_package.sh";
const community_configs = require('../src/community_configs.json');
function download(url, dest) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Downloading '" + url + "' -> '" + dest + "'");
        var fileName = yield tc.downloadTool(url);
        yield io.mv(fileName, dest);
    });
}
;
function installGNATCommunity(year, target) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!community_configs[process.platform]) {
            core.setFailed(`Unknown platform '${process.platform}' for GNAT community`);
            return;
        }
        if (!community_configs[process.platform][year]) {
            core.setFailed(`Unknown year '${year}' for GNAT community ${process.platform}`);
            return;
        }
        const release = community_configs[process.platform][year][target];
        if (!release) {
            core.setFailed(`Unknown target '${target}' for GNAT community ${process.platform}.${year}`);
            return;
        }
        var pack = release.pack;
        var url = release.url;
        var sha1 = release.sha1;
        console.log("Downloading '" + url + "'");
        const dlFile = yield tc.downloadTool(url);
        if (sha1File(dlFile) != sha1) {
            core.setFailed("Invalid checksum on downloaded package");
            return;
        }
        const tmpDir = path.dirname(dlFile);
        const installDir = path.join(tmpDir, pack);
        const script_qs = path.join(tmpDir, "install_script.qs");
        const script_sh = path.join(tmpDir, "install_package.sh");
        console.log("Installing: '" + dlFile + "' in '" + installDir + "'");
        yield download(install_script_qs_url, script_qs);
        if (IS_WINDOWS) {
            yield io.mv(dlFile, dlFile + ".exe");
            yield exec.exec(`${dlFile}.exe --verbose --script ${script_qs} InstallPrefix=${installDir}`);
        }
        else {
            yield download(install_package_sh_url, script_sh);
            yield exec.exec(`sh ${script_sh} ${dlFile} ${installDir}`);
        }
        core.addPath(path.join(installDir, 'bin'));
    });
}
function installGNATFSF(target) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.platform != 'linux') {
            core.setFailed(`GNAT FSF not available on ${process.platform}`);
            return;
        }
        if (target != 'native') {
            core.setFailed(`Unknown target '${target}' for GNAT FSF ${process.platform}`);
            return;
        }
        yield exec.exec('sudo apt install gnat gprbuild');
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const distrib = core.getInput('distrib');
            const target = core.getInput('target');
            switch (distrib) {
                case "fsf":
                    yield installGNATFSF(target);
                    break;
                case "community":
                    const year = core.getInput('community_year');
                    yield installGNATCommunity(year, target);
                    break;
                default:
                    core.setFailed(`Unknown distrib: '${distrib}'`);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
