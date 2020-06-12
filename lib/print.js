const path = require('path');
const fs=require('fs');

function printStr(str,CONF) {
    let height=CONF['height']/CONF['zoom'];
    let width=CONF['width']/CONF['zoom'];
    for(let i=0;i<height;i++){
        console.log(str.substring(i*width,(i+1)*width))
    }
}

function printArray(array,CONF) {
    let height=CONF['height']/CONF['zoom'];
    let width=CONF['width']/CONF['zoom'];
    for(let i=0;i<height;i++){
        let str='';
        for(let j=0;j<width;j++){
            str+=array[j+i*width];
            str+=','
        }
        console.log(str)
    }
}

module.exports = {
    printStr,
    printArray
};