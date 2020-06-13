self.addEventListener('message', function (e) {
    decodeData(e.data.array,e.data.config,e.data.vttIndex,e.data.zipIndex);
}, false);

self.addEventListener("error",errorHandler,true);

function errorHandler(e) {
    console.log(e.message.e)
}
//解码方法
function decodeData(array,config,vttIndex,zipIndex) {
    let CONF=config;
    let value={};
    for(let i=0;i<CONF['txtColor'].length;i++){
        value[CONF['txtColor'][i]]=i;
    }
    let bufferStr=arrayToStr(array);
    let PageArrays=strToArray(bufferStr,vttIndex-1,CONF);
    let IPageStr=decodeIPage(PageArrays['IPageArray'],value,CONF);
    let PPageStrs=decodePPage(IPageStr,PageArrays['PPageArray'],value,CONF);
    let BPageStrs=decodeBPage(IPageStr,PPageStrs,PageArrays['BPageArray'],value,CONF,vttIndex-1);
    let HTML=strToHtml(IPageStr,PPageStrs,BPageStrs,CONF);
    postMessage({html:HTML,vttIndex:vttIndex,zipIndex:zipIndex});
    return HTML
}
//array转string
function arrayToStr(array) {
    let bufferStr='';
    for(let i=0;i<array.length;i++){
        let str=array[i].toString(2);
        if(str.length!=8){
            let _str='';
            for(let j=0;j<8-str.length;j++){
                _str+='0'
            }
            str=_str+str;
        }
        bufferStr+=str;
    }
    return bufferStr
}
//string转html
function strToHtml(IPageStr,PPageStrs,BPageStrs,CONF) {
    let html='';
    let pageStr='';
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let PPageStrsIndex=0;
    let BPageStrsIndex=0;
    for(let i=0;i<CONF['gifFrame']*CONF['vttSeconds'];i++){
        if(i==0){
            pageStr+=IPageStr;
        }else {
            if(i%(CONF['vttBPage']+1)==0){
                pageStr+=PPageStrs[PPageStrsIndex];
                PPageStrsIndex++;
            }else if(BPageStrsIndex<BPageStrs.length){
                pageStr+=BPageStrs[BPageStrsIndex];
                BPageStrsIndex++;
            }else{
                pageStr+=PPageStrs[PPageStrsIndex];
                PPageStrsIndex++;
            }
        }
    }
    for(let i=0;i<CONF['gifFrame']*CONF['vttSeconds'];i++){
        html+=`<pre style="display: none;" id="pre${i+1}">`;
        for(let j=0;j<height;j++){
            html+=pageStr.substring(width*j+i*height*width,width*(j+1)+i*height*width)+`\n\n`;
        }
        html+='</pre>';
    }
    return html
}
//string转array
function strToArray(str,index,CONF) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let IPageArray=[];
    let PPageArray=[];
    let BPageArray=[];
    let code='';
    let IPStr=str.substring(0,CONF['IPLength'][index]*8);
    let BStr=str.substring(CONF['IPLength'][index]*8);
    for(let i=0;i<IPStr.length;i++) {
        code += IPStr[i];
        if (CONF['codeKeyMaps'][index]['IPPage'][code] != undefined) {
            if (IPageArray.length != height * width) {
                IPageArray.push(parseInt(CONF['codeKeyMaps'][index]['IPPage'][code]));
            } else {
                PPageArray.push(parseInt(CONF['codeKeyMaps'][index]['IPPage'][code]));
            }
            code = '';
        }
    }
    code = '';

    for(let i=0;i<BStr.length;i++) {
        code += BStr[i];
        if(CONF['codeKeyMaps'][index]['BPage']!=undefined){
            if(CONF['codeKeyMaps'][index]['BPage'][code]!=undefined){
                BPageArray.push(parseInt(CONF['codeKeyMaps'][index]['BPage'][code]));
                code='';
            }
        }
    }
    return {IPageArray:IPageArray,PPageArray:PPageArray,BPageArray:BPageArray}
}
//解码I帧
function decodeIPage(IPageArray,value,CONF) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let IPageStr='';
    let beforeChar='';
    for (let i=0;i<width;i++) {
        let thisChar;
        if(i==0){
            thisChar=CONF['txtColor'][IPageArray[i]];
        }else{
            if (IPageArray[i]==0){
                thisChar=beforeChar;
            }else{
                let newNum=value[beforeChar]+IPageArray[i];
                if(newNum<length){
                    thisChar=CONF['txtColor'][newNum]
                }else{
                    thisChar=CONF['txtColor'][newNum-length]
                }
            }
        }
        beforeChar=thisChar;
        IPageStr+=thisChar;
    }
    let beforeLine='';
    for (let i=0;i<height;i++) {
        let thisLine='';
        if(i==0){
            beforeLine=IPageStr;
        }else{
            for(let j=0;j<beforeLine.length;j++){
                if (IPageArray[j+i*width]==0){
                    thisLine+=beforeLine[j]
                }else{
                    let newNum=value[beforeLine[j]]+IPageArray[j+i*width];
                    let thisChar;
                    if(newNum<length){
                        thisChar=CONF['txtColor'][newNum]
                    }else{
                        thisChar=CONF['txtColor'][newNum-length]
                    }
                    thisLine+=thisChar;
                }
            }
            beforeLine=thisLine;
            IPageStr+=thisLine;
        }
    }
    return IPageStr;
}
//解码P帧
function decodePPage(IPageStr,PPageArray,value,CONF) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let PLength=CONF['gifFrame']*CONF['vttSeconds']/(CONF['vttBPage']+1);
    let PPageStrs=[];
    let beforeStr=IPageStr;
    for (let i=0;i<PLength;i++) {
        let thisStr='';
        for(let j=0;j<beforeStr.length;j++) {
            let thisChar;
            if (PPageArray[j + i * width * height] == 0) {
                thisChar= beforeStr[j]
            } else {
                let newNum = value[beforeStr[j]] + PPageArray[j + i * width * height];
                if (newNum < length) {
                    thisChar = CONF['txtColor'][newNum]
                } else {
                    thisChar = CONF['txtColor'][newNum - length]
                }
            }
            thisStr+=thisChar;
        }
        beforeStr=thisStr;
        PPageStrs.push(thisStr)
    }
    return PPageStrs;
}
//解码B帧
function decodeBPage(IPageStr,PPageStrs,BPageArray,value,CONF,index) {
    let height=CONF['gifHeight']/CONF['txtZoom'];
    let width=CONF['gifWidth']/CONF['txtZoom'];
    let length=CONF['txtColor'].length;
    let IPIndex=CONF['IPIndex'][index];
    let BvttIndex=0;
    let BPageStrs=[];
    let beforeStr='';
    let afterStr='';
    for (let i=0;i<IPIndex.length-1;i++) {
        let thisStr='';
        if(i==0){
            beforeStr=IPageStr;
        }else{
            beforeStr=afterStr;
        }
        afterStr=PPageStrs[i];
        if(i==IPIndex.length-1){
            if(IPIndex[i+1]-IPIndex[i]<2){
                break;
            }
        }
        let BPage=IPIndex[i+1]-IPIndex[i]-1;
        for(let j=0;j<BPage;j++){
            for(let k=0;k<height*width;k++){
                let newNum;
                let abs=Math.abs(value[afterStr[k]]-value[beforeStr[k]]);
                if(abs<=BPage+1){
                    if(abs>1){
                        if(value[afterStr[k]]>=value[beforeStr[k]]){
                            if(j<abs-1){
                                newNum=value[beforeStr[k]]+j+1;
                            }else{
                                newNum=value[afterStr[k]]
                            }
                        }else{
                            if(j<abs-1){
                                newNum=value[afterStr[k]]+j+1;
                            }else{
                                newNum=value[afterStr[k]]
                            }
                        }
                    }else{
                        newNum=value[afterStr[k]];
                    }
                }else{
                    let BttNum;
                    if(value[afterStr[k]]>=value[beforeStr[k]]){
                        BttNum=parseInt(abs*(j+1)/(BPage+1))+value[beforeStr[k]];
                    }else{
                        BttNum=parseInt(abs*(j+1)/(BPage+1))+value[afterStr[k]];
                    }
                    newNum = BttNum + BPageArray[BvttIndex];
                    BvttIndex++;
                }
                if (newNum < length) {
                    thisStr += CONF['txtColor'][newNum]
                } else {
                    thisStr += CONF['txtColor'][newNum - length]
                }
            }
            BPageStrs.push(thisStr);
            thisStr='';
        }
    }
    return BPageStrs;
}


