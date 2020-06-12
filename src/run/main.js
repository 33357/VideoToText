const path = require('path');
const jsZip = require('jszip');
const fs=require('fs');
const childProcess = require('child_process');

let rootPath=path.join(__dirname, "../../");
let transcode=require('./transcode');
let jsonPath=`${rootPath}config.json`;
const CONF=JSON.parse(fs.readFileSync(jsonPath));
let videoName=CONF['videoName'].split('.')[0];
let folderName=`${videoName}_w${CONF['gifWidth']}_h${CONF['gifHeight']}_f${CONF['gifFrame']}`;
let txtName = folderName+`_z${CONF['txtZoom']}`;
let vttName = txtName+`_b${CONF['vttBPage']}`;
let zipName = vttName;
let gifName =`${videoName}_w${CONF['gifWidth']}_h${CONF['gifHeight']}_f${CONF['gifFrame']}`;
let mp3Name=`${videoName}_${CONF['mp3Bit']}`;
let ffmpegPath=path.join(rootPath,CONF['ffmpegPath']);
let buildFolderPath=`${rootPath}build`;
let videoRootFolderPath=`${buildFolderPath}/${videoName}-${CONF['codeVersion']}`;
let sourceFolderPath=`${videoRootFolderPath}/source`;
let videoSourcePath=`${rootPath}video/${CONF['videoName']}`;
let gifPath=`${sourceFolderPath}/${gifName}`;
let mp3Path=`${sourceFolderPath}/${mp3Name}`;
let pythonPath=`${rootPath}src/run/VideoToText.py`;
let videoFolderPath=`${videoRootFolderPath}/${folderName}`;
let vttRootFolderPath=`${videoFolderPath}/vtt`;
let zipRootFolderPath=`${videoFolderPath}/zip`;
let txtRootFolderPath=`${videoFolderPath}/txt`;
let vttFolderPath=`${vttRootFolderPath}/${vttName}`;
let zipFolderPath=`${zipRootFolderPath}/${zipName}`;
let txtFolderPath=`${txtRootFolderPath}/${txtName}`;
let vttPath = `${vttFolderPath}/${vttName}`;
let zipPath = `${zipFolderPath}/${zipName}`;
let txtPath = `${txtFolderPath}/${txtName}`;

Main();

async function ZipData(fileName){
    let zip = new jsZip();
    let i=1;
    let codeKeyMaps=[];
    let IPLength=[];
    let IPIndex=[];
    let vttNames=[];
    if (!fs.existsSync(vttRootFolderPath)) {
        fs.mkdirSync(vttRootFolderPath)
    }
    if (!fs.existsSync(vttFolderPath)) {
        fs.mkdirSync(vttFolderPath)
    }
    for(let j=1;;j++){
        if (fs.existsSync(`${zipPath}_${j}.zip`)) {
            i+=CONF['zipSeconds']/CONF['vttSeconds'];
            console.log(`skip ${zipPath}_${j}.zip`)
        }else{
            break
        }
    }
    for(;;i++){
        if (fs.existsSync(`${txtPath}_${i}.txt`)) {
            let transcodeData=transcode.transcodeFile(`${txtPath}_${i}`,`${vttPath}_${i}`,CONF);
            codeKeyMaps.push({IPPage:transcodeData['IPPage'],BPage:transcodeData['BPage']});
            IPLength.push(transcodeData['IPLength']);
            IPIndex.push(transcodeData['IPIndex']);
            let data=fs.readFileSync(`${vttPath}_${i}.vtt`);
            zip.file(`${vttName}_${i}.vtt`, data);
            vttNames.push(`${vttName}_${i}.vtt`);
            if(i%(CONF['zipSeconds']/CONF['vttSeconds'])==0){
                CONF['vttNames']=vttNames;
                CONF['codeKeyMaps']=codeKeyMaps;
                CONF['IPLength']=IPLength;
                CONF['IPIndex']=IPIndex;
                zip.file(`config.json`, JSON.stringify(CONF));
                await doZip(zip,fileName,i/(CONF['zipSeconds']/CONF['vttSeconds']));
                codeKeyMaps=[];
                vttNames=[];
                IPLength=[];
                IPIndex=[];
                zip=new jsZip();
            }
        } else {
            if((i-1)%(CONF['zipSeconds']/CONF['vttSeconds'])!=0){
                CONF['vttNames']=vttNames;
                CONF['codeMaps']=codeKeyMaps;
                CONF['IPLength']=IPLength;
                CONF['IPIndex']=IPIndex;
                zip.file(`config.json`, JSON.stringify(CONF));
                await doZip(zip,fileName,Math.ceil(i/(CONF['zipSeconds']/CONF['vttSeconds'])))
            }
            break;
        }
    }
    copyMP3(fileName)
}


function copyMP3() {
    fs.copyFile(`${mp3Path}.mp3`,`${zipFolderPath}/${videoName}.mp3`,function(err){
        if(err) console.log(err);
        else console.log('save '+`${zipFolderPath}/${videoName}.mp3`+' succeed');
    })
}

function doZip(zip,fileName,index) {
    if (!fs.existsSync(zipRootFolderPath)) {
        fs.mkdirSync(zipRootFolderPath)
    }
    if (!fs.existsSync(zipFolderPath)) {
        fs.mkdirSync(zipFolderPath)
    }
    return new Promise(function(reslove) {
        zip.generateAsync({
            type:"nodebuffer",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        }, function updateCallback(metadata) {
            console.log("progression: " + metadata.percent.toFixed(2) + " %");
        }).then(function(content) {
            fs.writeFileSync(`${zipPath}_${index}.zip`, content);
            console.log('save '+`${zipPath}_${index}.zip`+' success!');
            reslove('success');
        });
    })
}

function VideoToGIF(ffmpegPath,videoPath,width,height,frame,gifPath){
    return new Promise(function(reslove){
        var workerProcess = childProcess.spawn(ffmpegPath,['-i',videoPath, '-s',`${width}*${height}` ,'-r',frame,gifPath]);
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

function VideoToMP3(ffmpegPath,videoPath,mp3Bit,mp3Path){
    return new Promise(function(reslove){
        var workerProcess = childProcess.spawn(ffmpegPath,['-i', videoPath, '-vn', '-acodec','libmp3lame','-ac', '2', '-ab', mp3Bit ,'-ar' ,'48000', mp3Path]);
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

function SplitGIF(){
    var out=0;
    var time=new Date();
    if (!fs.existsSync(txtRootFolderPath)) {
        fs.mkdirSync(txtRootFolderPath)
    }
    if(!fs.existsSync(txtFolderPath)){
        fs.mkdirSync(txtFolderPath)
    }
    for(var i=0;i<CONF['pythonThreads'];i++){
        var workerProcess = childProcess.spawn('python',[pythonPath,i,gifPath,txtPath,jsonPath]);
        console.log('start'+(i+1)+'thread');
        workerProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });
        workerProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
        workerProcess.on('exit', function () {
            out++;
            console.log('save txt success!'+out);
            if(out==CONF['pythonThreads']){
                console.log((new Date()-time)/(1000*60)+'min');
                ZipData()
            }
        });
    }
}

async function Main() {
    if(!fs.existsSync(buildFolderPath)){
        fs.mkdirSync(buildFolderPath)
    }
    if(!fs.existsSync(videoRootFolderPath)){
        fs.mkdirSync(videoRootFolderPath)
    }
    if(!fs.existsSync(sourceFolderPath)){
        fs.mkdirSync(sourceFolderPath)
    }
    if(!fs.existsSync(gifPath+'.gif')) {
        await VideoToGIF(ffmpegPath,videoSourcePath,CONF['gifWidth'],CONF['gifHeight'],CONF['gifFrame'],gifPath+'.gif')
    }
    if(!fs.existsSync(mp3Path+'.mp3')) {
        await VideoToMP3(ffmpegPath,videoSourcePath,CONF['mp3Bit'],mp3Path+'.mp3')
    }
    if(!fs.existsSync(videoFolderPath)){
        fs.mkdirSync(videoFolderPath)
    }
    SplitGIF();
}