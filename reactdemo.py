#!/usr/bin/python3
from __future__ import print_function

import sys, json, os, random, string, re, time
from random import SystemRandom
from time import time

def debug(*objs):
    print("DEBUG: ", *objs, file=sys.stderr)

print("Content-Type: application/json\n\n")

error = False
try:
    bulletinBoardFile = open('bulletin-board.json')
    bulletinBoard = json.loads(bulletinBoardFile.read())
    bulletinBoardFile.close()
    
    input = json.loads(sys.stdin.read())
except:
    error = True

if error == False:
    for action in input:
        if action['predicate'] == 'delete':
            del bulletinBoard[action['id']]
        
        if action['predicate'] == 'create':
            bulletinBoard[action['id']] = {'text': ''}
        
        if action['predicate'] == 'update':
            bulletinBoard[action['id']][action['property']] = action['value']
    
    if len(bulletinBoard) == 0:
        bulletinBoard = {
            '1': {'text': 'Click anywhere to create a new note', 'x': 25, 'y': 25, 'width': 150, 'height': 150, 'bgColor': '#ffff80'},
            '2': {'text': 'Open two browser windows and watch them sync in real time', 'x': 125, 'y': 200, 'width': 175, 'height': 125, 'bgColor': '#d0ffd0'},
            '3': {'text': 'Hover over a note to see things you can do', 'x': 350, 'y': 100, 'width': 150, 'height': 150, 'bgColor': '#ffd080'},
            '4': {'text': 'Delete all notes to restore the example notes', 'x': 275, 'y': 375, 'width': 125, 'height': 175, 'bgColor': '#b0d0ff'}
        }
    
    if len(input) > 0:
        # try:
        tempName = 'bulletin-board-'
        for i in range(32):
            tempName += SystemRandom().choice(string.ascii_lowercase)
        tempName += '.json'
        bulletinBoardFileNew = open(tempName, 'w')
        bulletinBoardFileNew.write(json.dumps(bulletinBoard))
        bulletinBoardFileNew.flush()
        os.fsync(bulletinBoardFileNew.fileno())
        bulletinBoardFileNew.close()
        os.remove('bulletin-board.json')
        os.rename(tempName, 'bulletin-board.json')
        # except:
            # pass
    
    print(json.dumps({'message': 'success', 'data': bulletinBoard}))

else:
    print("{\"message\": \"error\"}")
