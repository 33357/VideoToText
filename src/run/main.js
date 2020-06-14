const path = require('path');
const fs=require('fs');
const childProcess = require('child_process');
const {Worker} = require('worker_threads');

let rootPath=path.join(__dirname, "../../");//项目根目录路径
let jsonPath=`${rootPath}config.json`;//config.json路径
const CONF=JSON.parse(fs.readFileSync(jsonPath));//引入config.json
let videoName=CONF['videoPath'].split('/')[2].split('.')[0];//导入视频名
let videoFolderName=`${videoName}_w${CONF['gifWidth']}_h${CONF['gifHeight']}_f${CONF['gifFrame']}`;//导出视频文件名
let txtName = videoFolderName+`_z${CONF['txtZoom']}_v${CONF['vttSeconds']}_z${CONF['zipSeconds']}`;//txt文件名
let vttName = txtName+`_b${CONF['vttBPage']}`;//vtt文件名
let zipName = vttName;//zip文件名
let gifName =`${videoName}_w${CONF['gifWidth']}_h${CONF['gifHeight']}_f${CONF['gifFrame']}`;//gif文件名
let mp3Name=`${videoName}_${CONF['mp3Bit']}`;//mp3文件名
let configName=`${vttName}_config`;//config文件名
let ffmpegPath=path.join(rootPath,CONF['ffmpegPath']);//ffmpeg.exe路径
let buildFolderPath=`${rootPath}build`;//build路径
let videoRootFolderPath=`${buildFolderPath}/${videoName}-${CONF['videoVersion']}`;//导出视频根目录路径
let sourceFolderPath=`${videoRootFolderPath}/source`;//导出视频依赖资源路径
let videoSourcePath=`${rootPath}${CONF['videoPath']}`;//导入视频资源路径
let gifPath=`${sourceFolderPath}/${gifName}`;//gif路径
let mp3Path=`${sourceFolderPath}/${mp3Name}`;//mp3路径
let pythonPath=`${rootPath}src/run/VideoToText.py`;//python脚本路径
let videoFolderPath=`${videoRootFolderPath}/${videoFolderName}`;//导出视频目录路径
let vttRootFolderPath=`${videoFolderPath}/vtt`;//vtt根目录路径
let txtRootFolderPath=`${videoFolderPath}/txt`;//txt根目录路径
let vttFolderPath=`${vttRootFolderPath}/${vttName}`;//vtt文件夹路径
let zipFolderPath=`${videoFolderPath}/${zipName}`;//zip文件夹路径
let txtFolderPath=`${txtRootFolderPath}/${txtName}`;//txt文件夹路径
let vttPath = `${vttFolderPath}/${vttName}`;//vtt文件路径
let zipPath = `${zipFolderPath}/${zipName}`;//zip文件路径
let txtPath = `${txtFolderPath}/${txtName}`;//txt文件路径
let configPath = `${vttFolderPath}/${configName}`;//config文件路径
let listPath =`${rootPath}src/html/list.json`;//list.json文件路径

//执行mian函数
main();
//TXT转VTT
function TXTtoVTT() {
    return new Promise(function(reslove) {
        let out = 0;
        let time = new Date();
        let index = 1;
        for(let j=1;;j++){
            if (fs.existsSync(`${vttPath}_${j}.vtt`)&&fs.existsSync(`${configPath}_${j}.json`)) {
                index+=1;
                console.log(`skip ${vttPath}_${j}.vtt`)
            }else{
                break
            }
        }
        for (let i = 0; i < CONF['nodeThreads']; i++) {
            if (fs.existsSync(`${txtPath}_${index}.txt`)) {
                const worker = new Worker(`${rootPath}/src/run/transcode.js`);
                worker.on('message', (data) => {
                    let transcodeData=data;
                    fs.writeFileSync(`${configPath}_${transcodeData['index']}.json`,JSON.stringify(transcodeData['codeKeyMap']));
                    if (fs.existsSync(`${txtPath}_${index}.txt`)) {
                        worker.postMessage({txtPath: `${txtPath}_${index}`,vttPath:`${vttPath}_${index}`, CONF: CONF, index: index});
                        index++;
                    } else {
                        worker.terminate();
                        out++;
                        if(out==CONF['nodeThreads']){
                            console.log((new Date() - time) / (1000 * 60) + 'min');
                            reslove('success');
                        }
                    }
                });
                worker.postMessage({txtPath: `${txtPath}_${index}`, vttPath:`${vttPath}_${index}`, CONF: CONF, index: index});
                index++;
            } else {
                out++;
                if(out==CONF['nodeThreads']){
                    console.log((new Date() - time) / (1000 * 60) + 'min');
                    reslove('success');
                }
            }
        }
    });
}
//VTT转ZIP
async function VTTToZIP() {
    return new Promise(function(reslove) {
        let out = 0;
        let time = new Date();
        let index=1;
        for(let j=1;;j++){
            if (fs.existsSync(`${zipPath}_${j}.zip`)) {
                index+=CONF['zipSeconds']/CONF['vttSeconds'];
                console.log(`skip ${zipPath}_${j}.zip`)
            }else{
                break;
            }
        }
        for (let j = 0; j < CONF['nodeThreads']; j++) {
            if (fs.existsSync(`${vttPath}_${index}.vtt`)&&fs.existsSync(`${configPath}_${index}.json`)) {
                const worker = new Worker(`${rootPath}/src/run/zip.js`);
                worker.on('message', () => {
                    if (fs.existsSync(`${vttPath}_${index}.vtt`)&&fs.existsSync(`${configPath}_${index}.json`)) {
                        worker.postMessage({index:index,zipFolderPath:zipFolderPath,zipPath:zipPath,vttPath:vttPath,configPath:configPath,vttName:vttName,CONF:CONF});
                        index+=CONF['zipSeconds']/CONF['vttSeconds'];
                    } else {
                        worker.terminate();
                        out++;
                        if(out==CONF['nodeThreads']){
                            console.log((new Date() - time) / (1000 * 60) + 'min');
                            reslove('success');
                        }
                    }
                });
                worker.postMessage({index:index,zipFolderPath:zipFolderPath,zipPath:zipPath,vttPath:vttPath,configPath:configPath,vttName:vttName,CONF:CONF});
                index+=CONF['zipSeconds']/CONF['vttSeconds'];
            } else {
                out++;
                if(out==CONF['nodeThreads']){
                    console.log((new Date() - time) / (1000 * 60) + 'min');
                    reslove('success');
                }
            }
        }
    });
}
//复制mp3
function copyMP3() {
    fs.copyFile(`${mp3Path}.mp3`,`${zipFolderPath}/${videoName}.mp3`,function(err){
        if(err){
            console.log(err);
        }else {
            console.log('save '+`${zipFolderPath}/${videoName}.mp3`+' succeed');
        }
    })
}
//video转gif
function VideoToGIF(ffmpegPath,videoPath,width,height,frame,gifPath){
    return new Promise(function(reslove){
        let workerProcess = childProcess.spawn(ffmpegPath,['-i',videoPath, '-s',`${width}*${height}` ,'-r',frame,gifPath]);
        workerProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        workerProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
        workerProcess.on('exit', function (code) {
            console.log('save '+gifPath+' success!');
            reslove(code);
        });
    })
}
//video转mp3
function VideoToMP3(ffmpegPath,videoPath,mp3Bit,mp3Path){
    return new Promise(function(reslove){
        let workerProcess = childProcess.spawn(ffmpegPath,['-i', videoPath, '-vn', '-acodec','libmp3lame','-ac', '2', '-ab', mp3Bit ,'-ar' ,'48000', mp3Path]);
        workerProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        workerProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
        workerProcess.on('exit', function (code) {
            console.log('save '+mp3Path+' success!');
            reslove(code);
        });
    });
}
//gif转txt
function GIFToTXT(){
    return new Promise(function(reslove) {
        let out = 0;
        let time = new Date();
        for (let i = 0; i < CONF['pythonThreads']; i++) {
            let workerProcess = childProcess.spawn('python', [pythonPath, i, gifPath, txtPath, jsonPath]);
            console.log('start' + (i + 1) + 'thread');
            workerProcess.stdout.on('data', function (data) {
                console.log('stdout: ' + data);
            });
            workerProcess.stderr.on('data', function (data) {
                console.log('stderr: ' + data);
            });
            workerProcess.on('exit', function () {
                out++;
                console.log('save txt success!' + out);
                if (out == CONF['pythonThreads']) {
                    console.log((new Date() - time) / (1000 * 60) + 'min');
                    reslove('success');
                }
            });
        }
    })
}
//检查文件夹
function checkFolder(){
    if(!fs.existsSync(buildFolderPath)){
        fs.mkdirSync(buildFolderPath)
    }
    if(!fs.existsSync(videoRootFolderPath)){
        fs.mkdirSync(videoRootFolderPath)
    }
    if(!fs.existsSync(sourceFolderPath)){
        fs.mkdirSync(sourceFolderPath)
    }
    if(!fs.existsSync(videoFolderPath)){
        fs.mkdirSync(videoFolderPath)
    }
    if (!fs.existsSync(txtRootFolderPath)) {
        fs.mkdirSync(txtRootFolderPath)
    }
    if (!fs.existsSync(txtFolderPath)) {
        fs.mkdirSync(txtFolderPath)
    }
    if (!fs.existsSync(vttRootFolderPath)) {
        fs.mkdirSync(vttRootFolderPath)
    }
    if (!fs.existsSync(vttFolderPath)) {
        fs.mkdirSync(vttFolderPath)
    }
    if (!fs.existsSync(zipFolderPath)) {
        fs.mkdirSync(zipFolderPath)
    }
}
//添加video到list
function addVideoToList(){
    let list;
    if(fs.existsSync(listPath)){
        list=JSON.parse(fs.readFileSync(listPath));
    }else{
        list={videos:[]};
    }
    let src=zipFolderPath.replace(`${rootPath}build`,'.');
    let isAdd=true;
    for(let i=0;i<list['videos'].length;i++){
        if(list['videos'][i]['src']==src){
            isAdd=false;
            break;
        }
    }
    if(isAdd==true){
        list['videos'].push({
            name:zipName,
            src:src+'/'
        });
        fs.writeFileSync(listPath,JSON.stringify(list));
        console.log('add video',src);
    }else {
        console.log('skip video',src);
    }
}
//main函数,程序主逻辑
async function main() {
    let time = new Date();
    //检查文件夹
    checkFolder();
    //生成gif
    if(!fs.existsSync(gifPath+'.gif')) {
        await VideoToGIF(ffmpegPath,videoSourcePath,CONF['gifWidth'],CONF['gifHeight'],CONF['gifFrame'],gifPath+'.gif')
    }
    //生成mp3
    if(!fs.existsSync(mp3Path+'.mp3')) {
        await VideoToMP3(ffmpegPath,videoSourcePath,CONF['mp3Bit'],mp3Path+'.mp3')
    }
    //gif转txt
    await GIFToTXT();
    //txt转vtt
    await TXTtoVTT();
    //vtt转zip
    await VTTToZIP();
    //复制mp3
    await copyMP3();
    //添加video路径
    addVideoToList();
    //显示时间
    console.log((new Date() - time) / (1000 * 60) + 'min');
}