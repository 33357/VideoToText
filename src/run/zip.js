const jsZip = require('jszip');
const fs=require('fs');
const { parentPort } = require('worker_threads');
//VTT转ZIP
async function VTTToZIP(_index,zipFolderPath,zipPath,vttPath,configPath,vttName,CONF) {
    let zip = new jsZip();
    let codeKeyMaps=[];
    let IPLength=[];
    let IPIndex=[];
    let vttNames=[];
    let index;
    for(let j=0;j<CONF['zipSeconds']/CONF['vttSeconds'];j++){
        index=_index+j;
        if (fs.existsSync(`${vttPath}_${index}.vtt`)&&fs.existsSync(`${configPath}_${index}.json`)) {
            let data=fs.readFileSync(`${vttPath}_${index}.vtt`);
            let json=JSON.parse(fs.readFileSync(`${configPath}_${index}.json`));
            codeKeyMaps.push({IPPage:json['IPPage'],BPage:json['BPage']});
            IPLength.push(json['IPLength']);
            IPIndex.push(json['IPIndex']);
            vttNames.push(`${vttName}_${index}.vtt`);
            zip.file(`${vttName}_${index}.vtt`, data);
        } else {
            break;
        }
    }
    if(vttNames.length!=0) {
        CONF['vttNames'] = vttNames;
        CONF['codeKeyMaps'] = codeKeyMaps;
        CONF['IPLength'] = IPLength;
        CONF['IPIndex'] = IPIndex;
        zip.file(`config.json`, JSON.stringify(CONF));
        let data = await doZIP(zipFolderPath, zipPath, zip, Math.ceil(index / (CONF['zipSeconds'] / CONF['vttSeconds'])));
        parentPort.postMessage({data: data});
    }else{
        console.log('no zip');
        parentPort.postMessage({data: 'success'});
    }
}
//执行zip压缩
function doZIP(zipFolderPath,zipPath,zip,index) {
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
            console.log("progression: " + metadata.percent.toFixed(2) + " %",index);
        }).then(function(content) {
            fs.writeFileSync(`${zipPath}_${index}.zip`, content);
            console.log('save '+`${zipPath}_${index}.zip`+' success!');
            reslove('success');
        });
    })
}

parentPort.on('message', (data) => {
    VTTToZIP(data['index'], data['zipFolderPath'], data['zipPath'], data['vttPath'], data['configPath'], data['vttName'], data['CONF']);
});