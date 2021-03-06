!function (global) {
	'use strict';

	var previousCyberChart = global.CyberChart;

	function CyberChart(el, data, options) {
		this._element = (typeof(el) == 'string') ? $('#' + el) : $(el);
		this._data = data;
		this.options = {
			width: 1000, // UI列印時用250x210, UI螢幕顯示用 *1.4, 此處繪製時用 *4 (畫高解析,印時才不會鋸齒)
			height: 840,
			barWidth: 0.6, // 柱狀圖, bar的寬度%
			chartTitle: '', // 大標題
			xTitle: '',
			yTitle: '',
			// xLength: 760, // X軸長
			// yLength: 500, // Y軸長
			margin: [100, 50, 240, 190], // XY軸區塊, 離上/右/下/左邊界距離
			xyLineWidth: 2, // X,Y軸粗細
			yScale: [0, 5, 10, 15, 20, 25, 30], // 未特別指定者,Y軸於此刻度處畫橫線及label
			yScaleSize: 20, // Y軸上刻度標線凸出長度
			xScaleSize: 10, // X軸上刻度標線凸出長度
			xScalePos: 'between', // X軸上刻度標線位置, cener:居中, between:相鄰兩數據間
			xMinSegment: 5, // X軸最少項數(ex.5, 表示最少會有5個刻度, 即使data沒那麼多組)
			type: 'bar', // 支援 bar, line 兩種
			barColor: 'rgba(180,180,180,0.7)', // 預設bar底色
			barLabel: 'none', // bar上不要標示數值, 'in'標在bar內, 'out'標在bar外
			barLabelRotateDegree: 0,
			canvasColor: '#ffffff',
			brokenLineColor: 'rgba(160,160,160,0.7)', // 折線圖, 折線顏色
			brokenLineWidth: 16,
			alwaysLine: true, // 折線圖, 遇到缺值時, 自動將前一個值連線到下一個值
			dot: true, // 要不要在數值處加點
			dotColor: '#ffffff',
			dotStrokeWidth: 12,
			dotStrokeColor: 'rgba(100,100,100,0.7)',
			dotRadius: 7, // dot半徑
			scaleLineColor: '#000000', // X,Y軸及刻度線顏色
			scaleLineWidth: 2, // 刻度線粗細
			xLabel: function(label){return [label];}, // 可自訂X軸刻度標示function, 回傳array, 可依array長度標示多行
			xLabelRotateDegree: 0,
			fontColor: '#000000', // X,Y軸標題文字, 刻度標示數字顏色
			verticalLine: [],	// 傳入欲於圖上何處標上水平線, ex.[52,77]表示於y軸52及72位置拉出一水平線, 顏色暫固定用紅色
			textBlock: null // 特殊狀況: 有傳textBlock內容, 則不用data作圖, 直接將textBlock文字內容印出
		};
		this.yScaleLabelMaxWidth = 0; // 記Y軸刻度標示數字最大寬度(計算Y軸標題位置需要)
		this.xScaleLabelMaxHeight = 0; // 記X軸刻度標示最大高度(計算X軸標題位置需要)
		$.extend(this.options, options);
		//setTimeout($.proxy(this._prepare,this),0); /* IE使用explorercanvas, 以動態產生canvas, 同thread立即執行getContext()會有錯 */
		this._prepare();
	}
	CyberChart.prefixZero = function (n) {
		return n >= 10 ? n : '0' + n;
	};
	CyberChart.noConflict = function () {
		global.CyberChart = previousCyberChart;
		return CyberChart;
	};
	CyberChart.prototype = {
		_prepare: function () {
			var margin = this.get('margin'),
				jCanvas,
				textBlock = this.get('textBlock');

			this.set({xLength: this.get('width') - margin[3] - margin[1], yLength: this.get('height') - margin[0] - margin[2]});

			jCanvas = $('<canvas/>').attr({width: this.get('width'), height: this.get('height')}).appendTo(this._element);
			// 預設以width*height顯示, 若需縮小顯示, 可自行於html中css, 設定canvas的寬高

			//	if(!jCanvas[0].getContext){ // 不考慮IE舊版
			//		G_vmlCanvasManager.initElement(jCanvas[0]);
			//	}
			this._context2d = jCanvas.get(0).getContext('2d');

			if (!this._context2d.setLineDash) {
				this._context2d.setLineDash = $.proxy(function (ary) {
					this._context2d.mozDash = ary;
					this._context2d.webkitLineDash = ary; // safari無效??
				}, this);
			}


			if(textBlock === null){
				this._drawBase();
				this._drawXTitle();
				this._drawYTitle();
				this._drawData();
				this._drawVerticalLine();
			}else{ // 有傳textBlock, 直接將textBlock輸出到jCanvas
					//  預設fontSize:38, lineHeight:70, 初始位置 x:80, y:120
				var fontSize = textBlock.fontSize || 38,
					lineHeight = textBlock.lineHeight || 70,
					x = textBlock.x || 80,
					y = textBlock.y || 120,
					content = textBlock.content; // array中每項為一行

				this._context2d.save();
				this._context2d.font = fontSize + 'px sans-serif';
				this._context2d.textBaseline = 'top';
				for (var i = 0; i < content.length; i++) {
					this._context2d.fillText(content[i], x, i * lineHeight + y);
				}

				this._context2d.restore();
			}
			this._drawChartTitle();
		},
		_setLineDashOffset: function (n) {
			this._context2d.lineDashOffset = n;
			this._context2d.mozDashOffset = n;
			this._context2d.webkitLineDashOffset = n;
		},
		set: function (obj) {
			for (var p in obj) {
				if (obj.hasOwnProperty(p)) {
					this.options[p] = obj[p];
				}
			}
		},
		get: function (p) {
			return this.options[p];
		},
		_drawBase: function () {
			var margin = this.get('margin'),
				xLength = this.get('xLength'),
				yLength = this.get('yLength'),
				yScale = this.get('yScale'),
				factor = yLength / (yScale[yScale.length - 1] - yScale[0]),
				xDistance = Math.floor(xLength / Math.max(this.get('xMinSegment'), this._data.length)), // X軸刻度間距, 至少5項
				y,
				i,
				dim; // 記字的寬高用

			this._context2d.save();

			// 白色背景
			this._context2d.fillStyle = this.get('canvasColor');
			this._context2d.fillRect(0, 0, this.get('width') + 1, this.get('height') + 1);

			// 文字樣式
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '34px sans-serif';

			this._context2d.translate(margin[3] + 0.5, margin[0] + 0.5); // 原點移至Y軸最高點處

			this._context2d.strokeStyle = this.get('scaleLineColor');

			// X軸 (下面畫Y軸刻度線時會一併畫出, 所以不必畫了)
			// this._context2d.moveTo(-20, 500);
			// this._context2d.lineTo(760, 500);

			// Y軸
			this._context2d.beginPath();
			this._context2d.lineWidth = this.get('xyLineWidth');
			this._context2d.moveTo(0, 0);
			this._context2d.lineTo(0, yLength + this.get('xScaleSize'));
			this._context2d.stroke();

			// Y軸上刻度線
			dim = {width: null, height: this._context2d.measureText('H').width};
			for (i = 0; i < yScale.length; i++) {
				y = Math.round(yLength - (yScale[i] - yScale[0]) * factor);
				this._context2d.beginPath();

				this._context2d.save(); // Y軸用到虛線, 之後須恢復直線

				this._context2d.moveTo(-this.get('yScaleSize'), y); // 往左凸出20為Y軸刻度標線
				this._context2d.lineTo(xLength, y);

				dim.width = this._context2d.measureText(yScale[i]).width;

				//this._context2d.fillText(yScale[i], -70, y + 10);

				this.yScaleLabelMaxWidth = Math.max(this.yScaleLabelMaxWidth, dim.width);
				this._context2d.fillText(yScale[i], -this.get('yScaleSize') - dim.width - 10, y + dim.height / 2); // 刻度線與文字間距10

				if (i > 0) {
					this._context2d.setLineDash([5, 5]);
					this._context2d.lineWidth = this.get('scaleLineWidth');
				} else { // i=0即X軸
					this._context2d.lineWidth = this.get('xyLineWidth');
				}
				this._context2d.stroke();

				this._context2d.restore();
			}

			// X軸刻度間距 750/5=150
			if (this.get('xScaleSize')) {
				this._context2d.beginPath();
				i = this.get('xScalePos') == 'center' ? Math.round(xDistance / 2) : xDistance;
				while (i <= xLength) {
					this._context2d.moveTo(i, yLength);
					this._context2d.lineTo(i, yLength + this.get('xScaleSize')); // 往下凸出20為X軸刻度標線
					i += xDistance;
				}
				this._context2d.stroke();
			}

			this._context2d.restore();
		},
		_drawData: function () {
			var xLength = this.get('xLength'),
				yLength = this.get('yLength'),
				yScale = this.get('yScale'),
				margin = this.get('margin'),
				xLabelRotateDegree = this.get('xLabelRotateDegree'),
				data = this._data, // [{label:'2013-12-12',value:20},{},...]
				factor = yLength / (yScale[yScale.length - 1] - yScale[0]),
				i = 0,
				j = 0,
				xDistance = Math.floor(xLength / Math.max(this.get('xMinSegment'), this._data.length)), // X軸刻度間距
				barWidth = this.get('barWidth') * xDistance, //    Math.round(xDistance / 4 * 2),
				barSpace = (1 - this.get('barWidth')) / 2 * xDistance, // Math.round(xDistance / 4 * 1),
				x, y,
				datePart,
				fontDim,
				linePos = [], // 畫折線時記線的座標[[x,y],[x1,y1],...]
				xLabel = [],
				barLabelRotateDegree = this.get('barLabelRotateDegree'),
				barLabelX,
				barLabelY;

			this._context2d.save();

			this._context2d.translate(margin[3] + 0.5, margin[0] + 0.5); // 原點移至Y軸最高點處

			for (i = 0; i < data.length; i++) {
				// if (data[i].value === '') {
				// 	if (!this.get('alwaysLine')) { // 畫折線時, 若遇缺值, 前後2點不必連貫
				// 		linePos.push(null);
				// 	}


				// 	continue;
				// }

				if (data[i].value !== '') {
					y = Math.round(yLength - (data[i].value - yScale[0]) * factor);
					if (this.get('type') == 'bar') {
						x = barSpace + i * xDistance;

						// bar顏色
						this._context2d.fillStyle = this.get('barColor');
						this._context2d.lineWidth = 5;

						if(data[i].value == 'no comment'){ // 長庚護研所, 選"無法回答", 非數值無法畫bar, 但須秀文字
							this._context2d.save();
							this._context2d.font = '38px sans-serif';
							this._context2d.textAlign = 'center';
							this._context2d.textBaseline = 'bottom';
							this._context2d.fillStyle = '#ff0000';
							this._context2d.fillText("無法回答", xDistance / 2 + i * xDistance, yLength - 5);
							this._context2d.restore();
						}else{
							this._context2d.fillRect(x, y, barWidth, data[i].value * factor);
							this._context2d.strokeRect(x, y, barWidth, data[i].value * factor);
						}

					} else if (this.get('type') == 'line') {
						x = Math.round((xDistance / 2) + (i * xDistance));
						linePos.push([x, y]); // 先記下各點座標, 之後一次畫
					}

				} else {
					if (this.get('type') == 'line' && !this.get('alwaysLine')) { // 畫折線時, 指定遇缺值, 前後2點不必連貫者
						linePos.push(null);
					}
				}

				// time label
				this._context2d.fillStyle = this.get('fontColor');
				this._context2d.font = '34px sans-serif';

				xLabel = this.get('xLabel')(data[i].label);
				this.xScaleLabelMaxHeight = this._context2d.measureText('H').width * xLabel.length;
				// datePart = data[i].label.split('-');
				// fontDim = this._context2d.measureText(datePart[1] + '/' + datePart[2]);

				// this._context2d.fillText(datePart[1] + '/' + datePart[2], Math.round(i * xDistance + (xDistance - fontDim.width) / 2), yLength + 60);
				// fontDim = this._context2d.measureText(datePart[0]);
				// this._context2d.fillText(datePart[0], Math.round(i * xDistance + (xDistance - fontDim.width) / 2), yLength + 100);

				if (xLabelRotateDegree === 0) { // x軸刻度標示不旋轉
					for (j = 0; j < xLabel.length; j++) { // 支援多行的標示
						fontDim = this._context2d.measureText(xLabel[j]);
						x = Math.round(i * xDistance + (xDistance - fontDim.width) / 2);
						// 刻度線與文字間距10, 刻度往下凸出this.get('xScaleSize')
						// 各行高度this._context2d.measureText('H').width * (j + 1)
						// 各行間距10 => (j * 10)
						y = yLength + this.get('xScaleSize') + 10 + this._context2d.measureText('H').width * (j + 1) + (j * 10);

						this._context2d.fillText(xLabel[j], x, y);
					}
				} else { // 指定x軸刻度標示旋轉角度, 不支援多行的標示
					x = Math.round((xDistance / 2) + (i * xDistance));
					y = yLength + this.get('xScaleSize') + 10;

					this._context2d.save();
					this._context2d.translate(x, y);
					this._context2d.rotate(xLabelRotateDegree * (Math.PI / 180));
					this._context2d.textAlign = "end";
					this._context2d.textBaseline = "middle";
					this._context2d.fillText(xLabel[0], 0, 0);
					this._context2d.restore();
				}
			}

			// 畫折線
			if (this.get('type') == 'line' && linePos.length) {
				this._drawBrokenLine(linePos);
				if (this.get('dot')) {
					this._drawDot(linePos);
				}
			}

			// 折線或bar上標數值, 在bar及折線畫完後才標, 免得數值被bar或折線遮到
			for (i = 0; i < data.length; i++) {
				if (data[i].value !== '') {
					y = Math.round(yLength - (data[i].value - yScale[0]) * factor);
					if (this.get('type') == 'bar') {
						x = barSpace + i * xDistance;
					} else if (this.get('type') == 'line') {
						x = Math.round((xDistance / 2) + (i * xDistance));
					}

					this._context2d.save();
					this._context2d.fillStyle = this.get('fontColor');
					this._context2d.font = '36px sans-serif';
					var w = this._context2d.measureText(data[i].value).width;

					if (this.get('type') == 'bar') {
						if (this.get('barLabel')=='top'){ // 標示數值在點的上方或bar的外面
							if (barLabelRotateDegree === 0 || Math.abs(barLabelRotateDegree) == 180) {
								this._context2d.fillText(data[i].value, x + (barWidth - w) / 2, y - 10);
							} else {
								barLabelX = x + (barWidth / 2);
								barLabelY = y - 10;

								this._context2d.save();
								this._context2d.translate(barLabelX, barLabelY);
								this._context2d.rotate(barLabelRotateDegree * (Math.PI / 180));
								if(barLabelRotateDegree<0){
									this._context2d.textAlign = "start";
								}else{
									this._context2d.textAlign = "end";
								}
								this._context2d.textBaseline = "middle";
								this._context2d.fillText(data[i].value, 0, 0);
								this._context2d.restore();
							}
							if (data[i].star) { // 長庚護研所需求, 如果傳入資料有star屬性, 需在數值右上角標示 "*"
								this._context2d.fillText(('***').substr(0, data[i].star), x + (barWidth - w) / 2 + w + 4, y - 10 - 2);
							}
						} else if(this.get('barLabel') == 'bottom'){ // 標示數值在點的下方或bar的裏面
							if (barLabelRotateDegree === 0 || Math.abs(barLabelRotateDegree) == 180) { // 180等沒旋轉
								this._context2d.fillText(data[i].value, x + (barWidth - w) / 2, y + 40);
							} else {
								barLabelX = x + (barWidth / 2);
								if(Math.abs(barLabelRotateDegree)==90){
									barLabelY = y + (w / 2) + 10;
								}else{
									barLabelY = y + Math.sin(Math.abs(barLabelRotateDegree) * (Math.PI / 180)) * w / 2 + 10;
								}

								this._context2d.save();
								this._context2d.translate(barLabelX, barLabelY);
								this._context2d.rotate(barLabelRotateDegree * (Math.PI / 180));
								this._context2d.textAlign = "center";
								this._context2d.textBaseline = "middle";
								this._context2d.fillText(data[i].value, 0, 0);
								this._context2d.restore();
							}
							if (data[i].star) { // 長庚護研所需求, 如果傳入資料有star屬性, 需在數值右上角標示 "*"
								this._context2d.fillText(('***').substr(0, data[i].star), x + (barWidth - w) / 2 + w + 4, y + 40 - 2);
							}
						}
					} else if (this.get('type') == 'line') {
						if (this.get('barLabel')=='top'){
							this._context2d.save();
							if(barLabelRotateDegree === 0 || Math.abs(barLabelRotateDegree) == 180) {
								this._context2d.translate(x, y - 10);
								this._context2d.textAlign = "center";
								this._context2d.textBaseline = "bottom";
								this._context2d.fillText(data[i].value, 0, 0);
							} else {
								barLabelX = x;
								barLabelY = y - 10;

								this._context2d.translate(barLabelX, barLabelY);
								this._context2d.rotate(barLabelRotateDegree * (Math.PI / 180));
								if(barLabelRotateDegree<0){
									this._context2d.textAlign = "start";
								}else{
									this._context2d.textAlign = "end";
								}
								this._context2d.textBaseline = "middle";
								this._context2d.fillText(data[i].value, 0, 0);
							}
							this._context2d.restore();
							if (data[i].star) { // 長庚護研所需求, 如果傳入資料有star屬性, 需在數值右上角標示 "*"
								this._context2d.fillText(('***').substr(0, data[i].star), x + 10 + w + 4, y - 10 - 2);
							}
						} else if (this.get('barLabel')=='bottom') {
							this._context2d.save();
							this._context2d.textAlign = "center";
							if(barLabelRotateDegree === 0 || Math.abs(barLabelRotateDegree) == 180) {
								this._context2d.translate(x, y + 10);
								this._context2d.textBaseline = "top";
								this._context2d.fillText(data[i].value, 0, 0);
							} else {
								barLabelX = x;
								if(Math.abs(barLabelRotateDegree)==90){
									barLabelY = y + (w / 2) + 10;
								}else{
									barLabelY = y + Math.sin(Math.abs(barLabelRotateDegree) * (Math.PI / 180)) * w / 2 + 10;
								}

								this._context2d.translate(barLabelX, barLabelY);
								this._context2d.rotate(barLabelRotateDegree * (Math.PI / 180));
								this._context2d.textBaseline = "middle";
								this._context2d.fillText(data[i].value, 0, 0);
							}
							this._context2d.restore();

							if (data[i].star) { // 長庚護研所需求, 如果傳入資料有star屬性, 需在數值右上角標示 "*"
								this._context2d.fillText(('***').substr(0, data[i].star), x + (barWidth - w) / 2 + w + 4, y + 40 - 2);
							}
						}
					}
					this._context2d.restore();
				}
			}

			this._context2d.restore();
		},
		_drawBrokenLine: function (linePos) {
			this._context2d.save();

			this._context2d.strokeStyle = this.get('brokenLineColor');
			this._context2d.lineWidth = this.get('brokenLineWidth');
			this._context2d.lineJoin = 'round';

			var newStart = true;
			this._context2d.beginPath();
			for (var i = 0; i < linePos.length; i++) {
				if (newStart) {
					this._context2d.moveTo(linePos[i][0], linePos[i][1]);
					newStart = false;
				} else if(linePos[i] === null) {
					newStart = true;
				} else {
					this._context2d.lineTo(linePos[i][0], linePos[i][1]);
				}
			}
			this._context2d.stroke();

			this._context2d.restore();
		},
		_drawVerticalLine: function () {
			var pos = this.get('verticalLine'),
				xLength = this.get('xLength'),
				yLength = this.get('yLength'),
				yScale = this.get('yScale'),
				margin = this.get('margin'),
				factor = yLength / (yScale[yScale.length - 1] - yScale[0]);

			if (pos.length === 0) {
				return;
			}

			this._context2d.save();

			this._context2d.translate(margin[3] + 0.5, margin[0] + 0.5); // 原點移至Y軸最高點處
			this._context2d.strokeStyle = '#ff0000'; //this.get('brokenLineColor');
			this._context2d.lineWidth = 4; //this.get('brokenLineWidth');

			for (var i = 0; i < pos.length; i++){
				pos[i]=Math.round(yLength - (pos[i] - yScale[0]) * factor);
				this._context2d.beginPath();
				this._context2d.moveTo(0, pos[i]);
				this._context2d.lineTo(xLength, pos[i]);
				this._context2d.stroke();
			}
			this._context2d.restore();
		},
		_drawDot: function (linePos) {
			this._context2d.save();

			this._context2d.strokeStyle = this.get('dotStrokeColor');
			this._context2d.lineWidth = this.get('dotStrokeWidth');
			this._context2d.fillStyle = this.get('dotColor');

			for (var i = 0; i < linePos.length; i++) {
				if (linePos[i] !== null) {
					this._context2d.beginPath();
					this._context2d.arc(linePos[i][0], linePos[i][1], this.get('dotRadius'), 0, Math.PI * 2, false);
					this._context2d.closePath();
					this._context2d.stroke();
					this._context2d.fill();
				}
			}

			this._context2d.restore();
		},
		_drawYTitle: function () { // Y軸標題
			this._context2d.save();
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '44px sans-serif';
			var w = this._context2d.measureText(this.get('yTitle')).width,
				h = this._context2d.measureText('H').width,
				margin = this.get('margin');

			// 刻度線與文字間距10, 刻度往左凸出this.get('yScaleSize'), Y軸刻度標示數值最寬this.yScaleLabelMaxWidth
			this._context2d.translate((margin[3] - 10 - this.get('yScaleSize') - this.yScaleLabelMaxWidth - h) / 2 + h, Math.round(w + (this.get('yLength') - w) / 2) + margin[0]);

			this._context2d.rotate(-90 * (Math.PI / 180));

			this._context2d.fillText(this.get('yTitle'), 0, 0);
			this._context2d.restore();
		},
		_drawXTitle: function () { // X軸標題
			this._context2d.save();
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '44px sans-serif';
			var w = this._context2d.measureText(this.get('xTitle')).width,
				margin = this.get('margin');

			this._context2d.fillText(this.get('xTitle'), Math.round(margin[3] + (this.get('xLength') - w) / 2), this.get('height') - 60);
			this._context2d.restore();
		},
		_drawChartTitle: function () { // 圖上方放大標題(左右對中)
			this._context2d.save();
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '48px sans-serif';
			var chartTitle = this.get('chartTitle'),
				w = this._context2d.measureText(chartTitle).width,
				margin = this.get('margin');

			this._context2d.fillText(chartTitle, Math.round((this.get('width') - w) / 2), margin[0]/2);
			this._context2d.restore();
		}
	};

	global.CyberChart = CyberChart;
}(this);
