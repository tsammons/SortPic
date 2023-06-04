"use strict";
var ctx, canvas;
canvas = document.getElementById('myCanvas');
ctx = myCanvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var imgWidth = 0, 
    imgHeight = 0, 
    interval = 100, 
    globalHslArray = [],
    maxPixels = 1000 * 1000,
    myInterval = null,
    myImage = new Image(),
    pixelData;

var sortTracker = {
    width: 1,
    i: 0,
    n: 0,
    transformed: false,
    newImageReady: false,
    sortComplete: false
};

//https://pbs.twimg.com/media/Fxv3tt0WcAItWFE?format=jpg&name=medium
//https://pbs.twimg.com/media/DUgTwnmXcAMQsXB?format=jpg&name=large
//myImage.src = "https://pbs.twimg.com/media/FxmT-FvXwAAMJcb?format=jpg&name=large";
//myImage.src = "./assets/picassoBlue.jpeg";
myImage.src = "./assets/sunset-unsplash.jpg";

myImage.crossOrigin = "Anonymous";

/*
    Sort Strategy:
    - merge sort on each row
    - merge sort on each column


    ToDo:
    - play / pause
    - styling
    - logo
    - high res render?
*/

myImage.onload = () => {
  imgWidth = myImage.width, imgHeight = myImage.height;
  console.log(imgWidth, imgHeight);

  if (imgWidth * imgHeight > maxPixels) {
    console.log("TOO BIG, RESIZING");

    var ratio = Math.sqrt(maxPixels / (imgWidth * imgHeight));
    imgWidth = Math.floor(ratio * imgWidth);
    imgHeight = Math.floor(ratio * imgHeight);
    console.log(imgWidth, imgHeight);

    var oc = document.createElement('canvas'),
        octx = oc.getContext('2d');

    canvas.width = imgWidth * 2; // destination canvas size
    canvas.height = imgWidth * myImage.height / myImage.width;

    var cur = {
        width: Math.floor(myImage.width * 0.5),
        height: Math.floor(myImage.height * 0.5)
    }

    oc.width = cur.width;
    oc.height = cur.height;
    octx.drawImage(myImage, 0, 0, cur.width, cur.height);
    while (cur.width * 0.5 > imgWidth) {
        cur = {
            width: Math.floor(cur.width * 0.5),
            height: Math.floor(cur.height * 0.5)
        };
        octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
    }

    ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, imgWidth, imgHeight);
    ctx.drawImage(oc, 0, 0, cur.width, cur.height, imgWidth, 0, imgWidth, imgHeight);
  } else {
    canvas.width = imgWidth * 2;
    canvas.height = imgHeight;
    ctx.drawImage(myImage, 0,0);
    ctx.drawImage(myImage, imgWidth, 0);
  }



  const imgData = ctx.getImageData(0,0,imgWidth,imgHeight);
  pixelData = [...imgData.data];

  globalHslArray = getHslRowData(pixelData);
  sortTracker.newImageReady = true;
}

function getHslRowData(rgbArray) {
    var hslArray = [];

    for (var i = 0; i < imgHeight; i++) {
        var row = [];
        
        for (var j = 0; j < imgWidth; j++) {
            var index = ((i * imgWidth) + j) * 4;
            var r = rgbArray[index];
            var g = rgbArray[index+1];
            var b = rgbArray[index+2];
            var a = rgbArray[index+3];

            var hsl = rgbToHsl(r, g, b);
            hsl.push(r, g, b, a);

            // Updated to only store hue, r, g, b
            row.push([hsl[0], hsl[3], hsl[4], hsl[5]]);
        }

        var rowData = {A: row, B: []};
        hslArray.push(rowData);
    }
    console.log(hslArray);
    return hslArray;
}

function BottomUpMergeSort(n, transformed = false) {
    sortTracker.n = n;
    sortTracker.transformed = transformed;
    sortTracker.width = 1;
    sortTracker.i = 0;
    sortTracker.sortComplete = false;

    sortInterval();
}

function sortInterval() {
    myInterval = setInterval(() => {

        if (sortTracker.width < sortTracker.n) {
            if (sortTracker.i < sortTracker.n) {
                let comparisonsPerPass = Math.ceil(sortTracker.n / sortTracker.width*2)
                for (var iter = 0; iter < comparisonsPerPass; iter++) {
                    var returnValue = executeInnerLoop(sortTracker.i, sortTracker.width, sortTracker.n);
                    sortTracker.i = returnValue.i;
                    if (sortTracker.i >= sortTracker.n) break;
                }
            } else {
                sortTracker.i = 0;
                sortTracker.width = sortTracker.width * 2;

                for (var x = 0; x < globalHslArray.length; x++) {
                    globalHslArray[x].A = CopyArray(globalHslArray[x].B, globalHslArray[x].A, sortTracker.n);
                    
                    if (!sortTracker.transformed) {
                        plotArrayRow(globalHslArray[x], x);
                    } else {
                        plotArrayColumn(globalHslArray[x], x)
                    }
                }
            }
        } else {
            clearInterval(myInterval);

            if (!sortTracker.transformed) {
                transformToColumnMatrix();
            } else {
                sortTracker.sortComplete = true;
                showPlay(true);
            }
        }
    }, interval);
}

function executeInnerLoop(i, width, n) {
    for (var x = 0; x < globalHslArray.length; x++) {
        globalHslArray[x].B = BottomUpMerge(globalHslArray[x].A, i, Math.min(i+width, n), Math.min(i+2*width, n), globalHslArray[x].B);
    }

    var returnValue = {
        i: i+2*width,
    };
    return returnValue;
}

function BottomUpMerge(A, iLeft, iRight, iEnd, B) {
    var i = iLeft;
    var j = iRight;

    for (var k = iLeft; k < iEnd; k++) {
        if (i < iRight && (j >= iEnd || A[i][0] <= A[j][0])) {
            B[k] = [...A[i]];
            i++;
        } else {
            B[k] = [...A[j]];
            j++;
        }
    }
    return B;
}

function CopyArray(B, A, n) {
    for (var i = 0; i < n; i++) {
        A[i] = [...B[i]];
    }
    return A;
}

function transformToColumnMatrix() {
    var newArray = [];

    for (var i = 0; i < imgWidth; i++) {
        var jsonData = {A: [], B: []}
        newArray.push(jsonData);
    }

    for (var i = 0; i < imgWidth; i++) {
        for (var j = 0; j < imgHeight; j++) {
            newArray[i].A.push(globalHslArray[j].A[i]);
        }
    }

    globalHslArray = newArray;
    BottomUpMergeSort(imgHeight, true);
}

function plotArrayRow(obj, rowNumber) {
    ctx.clearRect(imgWidth, obj.rowNumber, obj.A.length, 1);
    for (var i = 0; i < obj.A.length; i++) {
        var x = i;
        var y = rowNumber;
        //ctx.fillStyle = 'hsl(' + obj.A[i][0]+ ',' + obj.A[i][1] + '%, ' + obj.A[i][2] + '%)';
        ctx.fillStyle = 'rgb(' + obj.A[i][1]+ ',' + obj.A[i][2] + ', ' + obj.A[i][3] + ')';
        ctx.beginPath();
        ctx.fillRect(x + imgWidth, y, 1, 1);
        ctx.fill();
    }
}

function plotArrayColumn(obj, columNum) {
    ctx.clearRect(columNum + imgWidth, 0, 1, obj.A.length);

    for (var i = 0; i < obj.A.length; i++) {
        var x = columNum;
        var y = i;
        //ctx.fillStyle = 'hsl(' + obj.A[i][0]+ ',' + obj.A[i][1] + '%, ' + obj.A[i][2] + '%)';
        //ctx.fillStyle = 'rgb(' + obj.A[i][3]+ ',' + obj.A[i][4] + ', ' + obj.A[i][5] + ',' + obj.A[i][6] / 255 + ')';
        ctx.fillStyle = 'rgb(' + obj.A[i][1]+ ',' + obj.A[i][2] + ', ' + obj.A[i][3] + ')';
        ctx.beginPath();
        ctx.fillRect(x + imgWidth, y, 1, 1);
        ctx.fill();
    }
}

const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
      ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
      : 0;
    return [
      60 * h < 0 ? 60 * h + 360 : 60 * h,
      100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
      (100 * (2 * l - s)) / 2,
    ];
  };

  // controls
  function start() {
    if (sortTracker.sortComplete) {
        globalHslArray = getHslRowData(pixelData);
        BottomUpMergeSort(imgWidth);
        showPlay(false);
        return;
    }

    if (sortTracker.newImageReady) {
        BottomUpMergeSort(imgWidth);
        sortTracker.newImageReady = false;
        showPlay(false);
        return;
    }

    if (myInterval === null) {
        sortInterval();
        showPlay(false);
    }
  }

  function stop() {
    clearInterval(myInterval);
    myInterval = null;

    showPlay(true);
  }

  function showPlay(showPlay) {
    var playEl = document.getElementById("playContainer");
    var pauseEl = document.getElementById("pauseContainer");

    if (showPlay) {
        playEl.style.display = "flex";
        pauseEl.style.display = "none";
    } else {
        playEl.style.display = "none";
        pauseEl.style.display = "flex";
    }
  }

  // drag + drop
  function dropHandler(ev) {
    clearInterval(myInterval);
    ev.preventDefault();
  
    if (ev.dataTransfer.items) {
      [...ev.dataTransfer.items].forEach((item, i) => {

        if (item.kind === "file") {
          const file = item.getAsFile();
          myImage.src = URL.createObjectURL(file);
          console.log(`… file[${i}].name = ${file.name}`);
        }
      });
    }
  }

  function dragOverHandler(ev) {
    ev.preventDefault();
  }

  function getUrl(e) {
    if(e.key === 'Enter') {
        var url = document.getElementById("inputUrl").value;
        clearInterval(myInterval);
        myImage.src = url;

        document.getElementById("inputUrl").value = "";
    }
  }
