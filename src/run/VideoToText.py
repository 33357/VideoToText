# -*- coding: utf-8 -*-
import os
import sys
import json
import math
from PIL import Image

gifPath=sys.argv[2]
txtPath=sys.argv[3]
with open(sys.argv[4],'r') as data:
	config = json.load(data)
TxTNum=1

def SavePreToTxT(str,count):
	global TxTNum
	File = open('%s_%d.txt' % (txtPath, TxTNum), 'w')
	File.write(str)
	File.close()
	print('Save %s_%d.txt!' % (txtPath, TxTNum),flush=True,end='')
	TxTNum+=1

def ImageToText(im): #将图片转换为字符画
	w, h = im.size
	x = config['txtZoom']
	h /= x
	w /= x
	h=int(h)
	w=int(w)
	image = im.convert('L').resize((w, h))
	pix = image.load()
	pic_str = ''
	length=len(config['txtColor'])-1

	for i in range(h):
		for j in range(w):
		    pic_str += config['txtColor'][int(pix[j, i] * length / 255)]
		pic_str+='\n\n'
	return pic_str

def SplitGIF(): #将GIF逐帧分割处理
	im = Image.open('%s.gif' % (gifPath))
	print(gifPath)
	count = 1
	im.seek(1)
	Pre=''
	index=int(sys.argv[1])
	global TxTNum

	try:
		while True:
			im.seek(im.tell() + 1)
			count += 1
	except EOFError:
		one=float(count)/float(config['pythonThreads'])
		pages=int(math.ceil(one/float(config['vttSeconds']*config['gifFrame'])))
		first=index*pages*config['gifFrame']*config['vttSeconds']+1
		if index == config['pythonThreads']-1:
			end=count
		else:
			end=(index+1)*pages*config['gifFrame']*config['vttSeconds']
		print('first:%d,end:%d,index:%d,pages:%d' % (first,end,index,pages),flush=True,end='')
		TxTNum=index*pages+1
		
		im.seek(1)
		while True:
			if im.tell()==first:
				break
			if first-im.tell()<=150:
			    im.load()
			im.seek(im.tell() + 1)
			
		while True:
			isExists=os.path.exists('%s_%d.txt' % (txtPath, TxTNum))
			if isExists:
				print ('Skip %s_%d.txt' % (txtPath, TxTNum))
				first+=config['gifFrame']*config['vttSeconds']
				if first>end:
					break
				while True:
					if im.tell()==first:
						break
					im.load()
					im.seek(im.tell() + 1)
				TxTNum+=1
					
			if not isExists:
				break
				
		if first<end:
			count=first
			while True:
				Pre += ImageToText(im)
				if count % config['gifFrame'] == 0:
					print('%d/%d,%d' % (count-first,pages*config['gifFrame']*config['vttSeconds'],index),flush=True,end='')
				if (float(count)/float(config['gifFrame'])) % config['vttSeconds']==0:
					SavePreToTxT(Pre,count)
					Pre=''
				if(count==end):
					if Pre!='':
						SavePreToTxT(Pre,count)
					print('Success!!',flush=True,end='')
					break;
				im.seek(im.tell() + 1)
				count += 1
		else:
			print('Success!!',flush=True,end='')

SplitGIF()