const fs=require('fs');
const huffman=require('./huffman.js');
const { parentPort } = require('worker_threads');
//编码文件
function transcodeFile(txtPath,vttPath,CONF,index) {
    let str = fs.readFileSync(txtPath + '.txt', 'utf8');
    str = str.replace(/\r\n/g, '');
    let value = {};
    let difference = '';
    for (let i = 0; i < CONF['txtColor'].length; i++) {
        value[CONF['txtColor'][i]] = i;
        difference += String.fromCharCode("a".charCodeAt() + i);
    }
    let IPageStr = transcodeIPage(str, value, difference, CONF);
    let data = transcodePPage(str, value, difference, CONF);
    let IPIndex = data['IPIndex'];
    let PPageStr = data['PPageStr'];
    let BPageStr = transcodeBPage(str, value, difference, IPIndex, CONF);
    let IPPageStr = IPageStr + PPageStr;
    let IPHuffman = huffmanStr(IPPageStr, difference);
    let IPBuf = strToBuffer(IPHuffman['bufferStr']);
    let Buf;
    let codeKeyMap;
    if (BPageStr.length != 0) {
        let BHuffman = huffmanStr(BPageStr, difference);
        let BBuf = strToBuffer(BHuffman['bufferStr']);
        Buf = Buffer.concat([IPBuf, BBuf]);
        codeKeyMap = {
            IPPage: IPHuffman['codeKeyMap'],
            BPage: BHuffman['codeKeyMap'],
            IPLength: IPBuf.length,
            IPIndex: IPIndex
        }
    } else {
        Buf = IPBuf;
        codeKeyMap = {IPPage: IPHuffman['codeKeyMap']}
    }
    fs.writeFileSync(`${vttPath}.vtt`, Buf);
    console.log(`save ${vttPath}.vtt` + ' success!');
   parentPort.postMessage({codeKeyMap:codeKeyMap,index:index});
}
//string转buffer
function strToBuffer(bufferStr) {
    let bufferArray=[];
    if(bufferStr.length%8!==0){
        let addlength=8-bufferStr.length%8;
        for (let i=0;i<addlength;i++){
            bufferStr+='0'
        }
    }
    for (var i=0;;i++){
        let byte=bufferStr.substring(i*8,(i+1)*8);
        if(byte!=''){
            bufferArray.push(parseInt( byte,2));
        }else{
            break;
        }
    }
    return Buffer.from(bufferArray);
}
//huffman编码
function huffmanStr(str,difference) {
    let Huffman=new huffman.Huffman(str);
    let bufferStr=Huffman.encode();
    let codeKeyMap=Huffman.codeKeyMap;
    let _codeKeyMa={};
    for(let p in codeKeyMap){
        _codeKeyMa[p]= difference.indexOf(codeKeyMap[p]);
    }
    return{bufferStr:bufferStr,codeKeyMap:_codeKeyMa}
}
//编码I帧
function transcodeIPage(str,value,difference,CONF) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let IPageStr='';
    let beforeChar='';
    for (let i=0;i<width;i++) {
        let thisChar=str[i];
        if(i==0){
            IPageStr+=difference[value[thisChar]];
        }else{
            if (beforeChar==thisChar){
                IPageStr+=difference[0]
            }else{
                let difNum=value[thisChar]-value[beforeChar];
                if(difNum>=0){
                    IPageStr+=difference[difNum]
                }else{
                    IPageStr+=difference[length+difNum]
                }
            }
        }
        beforeChar=thisChar;
    }
    let beforeLine='';
    for (let i=0;i<height;i++) {
        let thisLine=str.substring(i*width,(i+1)*width);
        if(i!=0){
            for(let j=0;j<beforeLine.length;j++){
                if (beforeLine[j]==thisLine[j]){
                    IPageStr+=difference[0]
                }else{
                    let difNum=value[thisLine[j]]-value[beforeLine[j]];
                    if(difNum>=0){
                        IPageStr+=difference[difNum]
                    }else{
                        IPageStr+=difference[length+difNum]
                    }
                }
            }
        }
        beforeLine=thisLine;
    }
    return IPageStr;
}
//编码P帧
function transcodePPage(str,value,difference,CONF) {
    let beforeStr='';
    let PPageStr='';
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let skip=CONF['vttBPage']+1;
    let isBreak=false;
    let IPIndex=[];
    for (let i=0;;) {
        let thisStr=str.substring(i*height*width,(i+1)*height*width);
        if (i==0) {
            beforeStr=thisStr;
        }else{
            for(let j=0;j<beforeStr.length;j++){
                if (beforeStr[j]==thisStr[j]){
                    PPageStr+=difference[0]
                }else{
                    let difNum=value[thisStr[j]]-value[beforeStr[j]];
                    if(difNum>=0){
                        PPageStr+=difference[difNum]
                    }else{
                        PPageStr+=difference[length+difNum]
                    }
                }
            }
            beforeStr=thisStr;
        }
        IPIndex.push(i);
        if(isBreak==true){
            break;
        }
        if(str.substring((i+skip)*height*width,(i+skip+1)*height*width)!=''){
            i+=skip;
        }else{
            i=CONF['gifFrame']*CONF['vttSeconds']-1;
            isBreak=true;
        }
    }
    return {PPageStr:PPageStr,IPIndex:IPIndex};
}
//编码B帧
function transcodeBPage(str,value,difference,IPIndex,CONF) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let BPageStr='';
    for (let i=0;i<IPIndex.length-1;i++) {
        let index=IPIndex[i];
        let beforeStr=str.substring(index*height*width,(index+1)*height*width);
        let afterStr=str.substring(IPIndex[i+1]*height*width,(IPIndex[i+1]+1)*height*width);
        if(i==IPIndex.length-1){
            if(IPIndex[i+1]-index<2){
                break;
            }
        }
        let thisStr=str.substring((index+1)*height*width,IPIndex[i+1]*height*width);
        let BPage=IPIndex[i+1]-index-1;
        for(let j=0;j<BPage;j++){
            for(let k=0;k<height*width;k++){
                if(Math.abs(value[afterStr[k]]-value[beforeStr[k]])>(BPage+1)){
                    let BttNum;
                    if(value[afterStr[k]]>=value[beforeStr[k]]){
                        BttNum=parseInt((value[afterStr[k]]-value[beforeStr[k]])*(j+1)/(BPage+1))+value[beforeStr[k]];
                    }else{
                        BttNum=parseInt((value[beforeStr[k]]-value[afterStr[k]])*(j+1)/(BPage+1))+value[afterStr[k]];
                    }
                    let difNum=value[thisStr[k+height*width*j]]-BttNum;
                    if(difNum>=0){
                        BPageStr+=difference[difNum]
                    }else{
                        BPageStr+=difference[length+difNum]
                    }
                }
            }
        }
    }
    return BPageStr;
}

//transcodeFile('F:\\clone\\VideoToTextServer\\build\\kai-1.0.0\\kai_w1020_h300_f12\\txt\\kai_w1020_h300_f12_z2_v5_z60\\kai_w1020_h300_f12_z2_v5_z60_1','F:\\clone\\VideoToTextServer\\build\\kai-1.0.0\\kai_w1020_h300_f12\\txt\\kai_w1020_h300_f12_z2_v5_z60\\kai_w1020_h300_f12_z2_v5_z60_1',CONF);
//监听
parentPort.on('message', (data) => {
    transcodeFile(data['txtPath'],data['vttPath'],data['CONF'],data['index']);
});