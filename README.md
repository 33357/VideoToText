# VideoToText
视频转字符画

效果预览：http://videototext.top  （建议使用PC firefox浏览器浏览该网站）

本服务基于python3和nodejs，要想使用请先配置好环境

安装依赖：

pip3 install pillow

npm install

config.json配置:

videoPath：导入视频的相对路径

videoVersion：视频版本

gifWidth：导出gif的宽（px）

gifHeight：导出gif的高（px）

gifFrame：导出gif的帧数

txtZoom：导出txt相对于gif的缩放比例

vttSeconds：单个vtt文件保存的视频秒数

zipSeconds：单个zip文件保存的视频秒数

txtColor：视频转文本使用的字符

mp3Bit：视频转mp3的比特率

pythonThreads：python脚本执行的进程数

nodeThreads：nodejs脚本执行的进程数

vttBPage：1个I/P帧所连接的B帧数量

ffmpegPath：ffmpeg.exe的相对路径

执行视频转文本：node src/run/main.js

预览网页：node src/server/fileServer.js
